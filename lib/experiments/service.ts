import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import { runCodingAgent } from "../agent/coding-agent";
import { buildContext, hash } from "../agent/prompt";
import { agentConfigurations } from "../agent/configs";
import { createProvider } from "../agent/providers";
import {
  ProviderError,
  estimateCost,
  type ModelProvider,
} from "../agent/provider";
import { providerIdSchema, type RealAgentRun } from "../agent/schemas";
import { RunStore } from "../agent/store";
import { assertSandboxAvailable } from "../evaluator/sandbox";
import { snapshotFiles, withAgentWorkspace } from "../evaluator/workspace";
import { diagnosisInput } from "../diagnosis/real";
import { criteriaChoices } from "./catalog";
import {
  diagnosisOutputSchema,
  interventionSchema,
  type InterventionDraft,
  type RealExperiment,
} from "./schemas";
import { ExperimentStore } from "./store";

export interface ExperimentDependencies {
  runs?: RunStore;
  experiments?: ExperimentStore;
  provider?: ModelProvider;
}
const stores = (deps?: ExperimentDependencies) => ({
  runs: deps?.runs ?? new RunStore(),
  experiments: deps?.experiments ?? new ExperimentStore(),
});
export async function protectedInputsDigest() {
  // This digest never goes to a model. No evaluator or benchmark source is modified.
  const inputs = await Promise.all(
    ["benchmark-repo", "benchmarks/public-tests", "lib/evaluator"].map(
      async (dir) => [dir, await snapshotFiles(path.join(process.cwd(), dir))],
    ),
  );
  return hash(JSON.stringify(inputs));
}
async function baselineHash(runs: RunStore, id: string) {
  return hash(await readFile(path.join(runs.directory, `${id}.json`), "utf8"));
}
export async function buildIntervention(
  baseline: RealAgentRun,
  input: InterventionDraft,
) {
  const draft = interventionSchema.parse(input);
  const context = await buildContext(
    "context-rich",
    baseline.resolvedModel ?? baseline.model,
    {
      files: [
        ...agentConfigurations.baseline.files,
        ...new Set(draft.contextToAdd),
      ],
      acceptanceCriteria: [
        ...agentConfigurations["context-rich"].acceptanceCriteria,
        ...new Set(
          draft.acceptanceCriteriaToAdd.map((id) => criteriaChoices[id]),
        ),
      ],
      requiredChecks: [...new Set(draft.requiredValidation)],
    },
  );
  if (context.task !== baseline.context.task)
    throw new Error("Task changed; a matched experiment cannot proceed.");
  return { draft, context, sha256: hash(JSON.stringify({ draft, context })) };
}
export async function diagnoseBaseline(
  id: string,
  deps?: ExperimentDependencies,
) {
  const { runs, experiments } = stores(deps);
  const baseline = await runs.get(id);
  if (
    !baseline ||
    baseline.configId !== "baseline" ||
    baseline.status !== "FAILED" ||
    !baseline.evaluation ||
    !baseline.baselineFingerprint
  )
    throw new Error(
      "Diagnosis requires an evaluated, failed real baseline run.",
    );
  const providerId = providerIdSchema.parse(baseline.provider);
  assertSandboxAvailable();
  return runs.exclusive(async () => {
    await withAgentWorkspace(async (workspace) => {
      if (workspace.baselineFingerprint !== baseline.baselineFingerprint)
        throw new Error(
          "Benchmark baseline no longer matches the historical run.",
        );
    });
    const input = await diagnosisInput(baseline);
    const start = Date.now();
    const record: RealExperiment = {
      id: randomUUID(),
      baselineRunId: id,
      baselineRecordSha256: await baselineHash(runs, id),
      protectedInputsSha256: await protectedInputsDigest(),
      baselineFingerprint: baseline.baselineFingerprint!,
      provider: providerId,
      model: baseline.resolvedModel ?? baseline.model,
      createdAt: new Date(start).toISOString(),
      revision: 0,
      status: "DIAGNOSING",
      diagnosis: {
        ...input,
        status: "RUNNING",
        isHypothesis: true,
        output: null,
        startedAt: new Date(start).toISOString(),
        endedAt: null,
        durationMs: 0,
        resolvedModel: null,
        responseId: null,
        tokenUsage: null,
        estimatedInferenceCost: null,
        error: null,
      },
      intervention: null,
      approval: null,
      interventionRunId: null,
      executionStartedAt: null,
      error: null,
    };
    await experiments.save(record);
    try {
      const provider = deps?.provider ?? createProvider(providerId);
      const result = await provider.generate(input.context, {
        outputSchema: z.toJSONSchema(diagnosisOutputSchema),
      });
      record.diagnosis.resolvedModel = result.model;
      record.diagnosis.responseId = result.responseId;
      record.diagnosis.tokenUsage = result.tokenUsage;
      if (result.metadata) record.diagnosis.providerMetadata = result.metadata;
      if (providerId !== "codex-cli")
        record.diagnosis.estimatedInferenceCost = estimateCost(
          result.tokenUsage,
        ).estimatedInferenceCost;
      if (result.error)
        throw new Error("Diagnosis did not return complete structured output.");
      const output = diagnosisOutputSchema.parse(JSON.parse(result.text));
      if (
        output.supportingEvidence.some(
          (item) =>
            !input.evidence.some((evidence) => evidence.id === item.evidenceId),
        )
      )
        throw new Error("Diagnosis cites an unknown evidence ID.");
      record.diagnosis.output = output;
      record.diagnosis.status = "COMPLETED";
      record.intervention = await buildIntervention(
        baseline,
        output.recommendedIntervention,
      );
      record.status = "DRAFT";
    } catch (error) {
      record.diagnosis.status =
        error instanceof ProviderError ? "PROVIDER_ERROR" : "INVALID_OUTPUT";
      record.diagnosis.error =
        error instanceof ProviderError
          ? error.message
          : "Diagnosis output was invalid or incomplete; no intervention was approved or executed.";
      record.status = "DIAGNOSIS_ERROR";
    }
    record.diagnosis.endedAt = new Date().toISOString();
    record.diagnosis.durationMs = Date.now() - start;
    await experiments.save(record);
    return record;
  });
}
async function verifiedBaseline(record: RealExperiment, runs: RunStore) {
  if (
    (await baselineHash(runs, record.baselineRunId)) !==
    record.baselineRecordSha256
  )
    throw new Error(
      "Historical baseline evidence changed; execution is blocked.",
    );
  if ((await protectedInputsDigest()) !== record.protectedInputsSha256)
    throw new Error("Benchmark or evaluator changed; execution is blocked.");
  const baseline = await runs.get(record.baselineRunId);
  if (!baseline) throw new Error("Baseline no longer exists.");
  return baseline;
}
async function requiredExperiment(store: ExperimentStore, id: string) {
  const record = await store.get(id);
  if (!record) throw new Error("Experiment not found.");
  return record;
}
export async function editIntervention(
  id: string,
  revision: number,
  draft: InterventionDraft,
  deps?: ExperimentDependencies,
) {
  const { runs, experiments } = stores(deps);
  return experiments.exclusive(id, async () => {
    const record = await requiredExperiment(experiments, id);
    if (
      !["DRAFT", "APPROVED"].includes(record.status) ||
      record.revision !== revision
    )
      throw new Error(
        "Intervention is stale or execution has already started.",
      );
    const baseline = await verifiedBaseline(record, runs);
    record.intervention = await buildIntervention(baseline, draft);
    record.approval = null;
    record.status = "DRAFT";
    record.revision++;
    await experiments.save(record);
    return record;
  });
}
export async function approveIntervention(
  id: string,
  revision: number,
  proposalSha256: string,
  source: "UI" | "USER_MESSAGE",
  deps?: ExperimentDependencies,
) {
  const { runs, experiments } = stores(deps);
  return experiments.exclusive(id, async () => {
    const record = await requiredExperiment(experiments, id);
    if (
      record.status !== "DRAFT" ||
      record.revision !== revision ||
      record.intervention?.sha256 !== proposalSha256
    )
      throw new Error("Approve the current saved proposal before execution.");
    const baseline = await verifiedBaseline(record, runs);
    if (
      (await buildIntervention(baseline, record.intervention.draft)).sha256 !==
      proposalSha256
    )
      throw new Error(
        "Proposal inputs changed; save and review a fresh proposal.",
      );
    record.approval = {
      proposalSha256,
      approvedAt: new Date().toISOString(),
      source,
      actor: "Local engineer",
    };
    record.status = "APPROVED";
    record.revision++;
    await experiments.save(record);
    return record;
  });
}
export async function executeIntervention(
  id: string,
  proposalSha256: string,
  deps?: ExperimentDependencies,
) {
  const { runs, experiments } = stores(deps);
  return experiments.exclusive(id, async () => {
    const record = await requiredExperiment(experiments, id);
    if (
      record.status !== "APPROVED" ||
      !record.approval ||
      record.approval.proposalSha256 !== proposalSha256 ||
      record.intervention?.sha256 !== proposalSha256 ||
      record.interventionRunId
    )
      throw new Error(
        "Explicit approval of this proposal is required; an experiment can execute only once.",
      );
    const baseline = await verifiedBaseline(record, runs);
    if (
      (await buildIntervention(baseline, record.intervention.draft)).sha256 !==
      proposalSha256
    )
      throw new Error("Approved inputs changed; execution is blocked.");
    record.interventionRunId = randomUUID();
    record.executionStartedAt = new Date().toISOString();
    record.status = "RUNNING";
    record.revision++;
    await experiments.save(record); // Consume approval before starting, including crashes and provider failures.
    try {
      await runCodingAgent(
        {
          taskId: baseline.taskId,
          configId: "context-rich",
          providerId: record.provider,
        },
        {
          provider: deps?.provider ?? createProvider(record.provider),
          store: runs,
          model: record.model,
          context: record.intervention.context,
          runId: record.interventionRunId,
          experimentId: record.id,
          parentRunId: baseline.id,
        },
      );
      record.status = "COMPLETE";
    } catch {
      record.status = "EXECUTION_ERROR";
      record.error =
        "Execution could not complete. Approval was consumed; no automatic retry is allowed. Inspect any linked run.";
    }
    await experiments.save(record);
    return record;
  });
}
