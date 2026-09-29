import { randomUUID } from "node:crypto";
import { evaluateWorkspace } from "../evaluator/runner";
import {
  assertSandboxAvailable,
  prepareSandboxHarness,
} from "../evaluator/sandbox";
import { withAgentWorkspace } from "../evaluator/workspace";
import { applyProposedFiles, PatchValidationError } from "./paths";
import { buildContext } from "./prompt";
import {
  configuredModel,
  estimateCost,
  ProviderError,
  type ModelProvider,
} from "./provider";
import {
  agentProposalSchema,
  agentRequestSchema,
  contextSnapshotSchema,
  type ContextSnapshot,
  type RealAgentRun,
} from "./schemas";
import { RunStore } from "./store";
import { countsAsCodingAttempt } from "./evidence";
import { createProvider } from "./providers";

/** Internal dependencies support deterministic tests; neither is accepted from HTTP. */
export async function runCodingAgent(
  input: unknown,
  dependencies?: {
    provider: ModelProvider;
    store: RunStore;
    model: string;
    context?: ContextSnapshot;
    runId?: string;
    experimentId?: string;
    parentRunId?: string;
  },
) {
  const request = agentRequestSchema.parse(input);
  const provider = dependencies?.provider ?? createProvider(request.providerId);
  const store = dependencies?.store ?? new RunStore();
  assertSandboxAvailable();
  return store.exclusive(async () => {
    const model = dependencies?.model ?? configuredModel(request.providerId);
    const context = dependencies?.context
      ? contextSnapshotSchema.parse(dependencies.context)
      : await buildContext(request.configId, model);
    if (context.model !== model || context.configId !== request.configId)
      throw new Error("Approved context does not match this run.");
    if (dependencies?.runId && (await store.get(dependencies.runId)))
      throw new Error(
        "This run ID already exists; execution will not be repeated.",
      );
    const prior = (await store.list()).filter(
      (run) =>
        run.taskId === request.taskId &&
        run.configId === request.configId &&
        run.model === model &&
        run.provider === provider.id,
    );
    const start = Date.now();
    const run: RealAgentRun = {
      id: dependencies?.runId ?? randomUUID(),
      ...(dependencies?.experimentId
        ? {
            experimentId: dependencies.experimentId,
            parentRunId: dependencies.parentRunId,
          }
        : {}),
      source: "REAL_AGENT",
      taskId: request.taskId,
      configId: request.configId,
      provider: provider.id,
      model,
      resolvedModel: null,
      responseId: null,
      attemptNumber: Math.max(0, ...prior.map((run) => run.attemptNumber)) + 1,
      status: "RUNNING",
      startedAt: new Date(start).toISOString(),
      endedAt: null,
      durationMs: 0,
      context,
      tokenUsage: null,
      estimatedInferenceCost: null,
      costBasis: null,
      estimatedRemediationMinutes: null,
      summary: "",
      proposedFiles: [],
      appliedFiles: [],
      rejectedPaths: [],
      errors: [],
      evaluation: null,
      requiresHumanReview: true,
      criticalFailure: false,
      firstPassAccepted: null,
      baselineFingerprint: null,
      workspaceCleanedUp: null,
      sandbox: "macos-seatbelt-stdio-v1",
    };
    await store.save(run);
    try {
      const response = await provider.generate(context);
      Object.assign(
        run,
        {
          resolvedModel: response.model,
          responseId: response.responseId,
          tokenUsage: response.tokenUsage,
          ...(response.metadata ? { providerMetadata: response.metadata } : {}),
        },
        provider.id === "codex-cli"
          ? { estimatedInferenceCost: null, costBasis: null }
          : estimateCost(response.tokenUsage),
      );
      if (response.error) throw new Error(response.error);
      let raw: unknown;
      try {
        raw = JSON.parse(response.text);
      } catch {
        throw new Error(
          "Model output is not valid JSON. No files were applied.",
        );
      }
      const proposal = agentProposalSchema.safeParse(raw);
      if (!proposal.success)
        throw new Error(
          "Model output does not match the structured file proposal schema. No files were applied.",
        );
      run.summary = proposal.data.summary;
      run.proposedFiles = proposal.data.files;
      await store.save(run);
      // Workspace creation and all writes belong to the host. The model has no filesystem access.
      let workspaceError: unknown;
      await withAgentWorkspace(async (workspace) => {
        run.baselineFingerprint = workspace.baselineFingerprint;
        try {
          await applyProposedFiles(proposal.data.files, workspace.source);
          run.appliedFiles = proposal.data.files.map((file) => file.path);
          await prepareSandboxHarness(workspace);
          run.evaluation = (await evaluateWorkspace(workspace)).evaluation;
        } catch (error) {
          workspaceError = error;
        }
      });
      run.workspaceCleanedUp = true;
      if (workspaceError) throw workspaceError;
      run.status = run.evaluation!.overallResult;
      run.criticalFailure = run.evaluation!.criticalFailure;
      run.requiresHumanReview = run.status !== "PASSED" || run.criticalFailure;
      run.firstPassAccepted =
        run.status === "REVIEW_REQUIRED"
          ? null
          : !prior.some(countsAsCodingAttempt) && !run.requiresHumanReview;
    } catch (error) {
      if (error instanceof ProviderError) {
        run.status = "PROVIDER_ERROR";
        run.firstPassAccepted = null;
      } else if (error instanceof PatchValidationError) {
        run.rejectedPaths = error.rejectedPaths;
        run.status = "FAILED";
        run.firstPassAccepted = false;
      } else run.status = "REVIEW_REQUIRED";
      run.requiresHumanReview = run.status !== "PROVIDER_ERROR";
      run.errors.push(
        error instanceof Error
          ? error.message
          : "Agent execution could not complete.",
      );
    }
    // Preserve an observed regression even if cleanup subsequently fails.
    run.criticalFailure = run.evaluation?.criticalFailure ?? false;
    run.endedAt = new Date().toISOString();
    run.durationMs = Date.now() - start;
    await store.save(run);
    return run;
  });
}
