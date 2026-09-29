import { z } from "zod";
import { evaluationResultSchema } from "../domain/schemas";

export const agentProposalSchema = z.strictObject({
  summary: z.string().min(1).max(4000),
  files: z
    .array(
      z.strictObject({
        path: z.string().min(1).max(200),
        content: z.string().min(1).max(60000),
      }),
    )
    .min(1)
    .max(8),
});
export const providerIdSchema = z.enum(["gemini", "codex-cli"]);
export type ProviderId = z.infer<typeof providerIdSchema>;
export const agentRequestSchema = z.strictObject({
  taskId: z.literal("customers-pagination"),
  configId: z.enum(["baseline", "context-rich"]),
  providerId: providerIdSchema.default("gemini"),
});
export type AgentRequest = z.infer<typeof agentRequestSchema>;
export type AgentProposal = z.infer<typeof agentProposalSchema>;
export const contextFileSchema = z.object({
  path: z.string(),
  sha256: z.string(),
  content: z.string(),
});
export const contextSnapshotSchema = z.object({
  task: z.string(),
  configId: agentRequestSchema.shape.configId,
  model: z.string(),
  files: z.array(contextFileSchema),
  acceptanceCriteria: z.array(z.string()),
  requiredChecks: z.array(z.string()),
  allowedPaths: z.array(z.string()),
  systemPrompt: z.string(),
  userPrompt: z.string(),
  promptSha256: z.string(),
});
export type ContextSnapshot = z.infer<typeof contextSnapshotSchema>;
export const realRunSchema = z.object({
  id: z.string().uuid(),
  source: z.literal("REAL_AGENT"),
  taskId: z.literal("customers-pagination"),
  configId: agentRequestSchema.shape.configId,
  provider: z.string().min(1),
  model: z.string(),
  resolvedModel: z.string().nullable(),
  responseId: z.string().nullable(),
  experimentId: z.string().uuid().optional(),
  parentRunId: z.string().uuid().optional(),
  providerMetadata: z
    .record(z.string(), z.union([z.string(), z.number(), z.boolean()]))
    .optional(),
  attemptNumber: z.number().int().positive(),
  status: z.enum([
    "RUNNING",
    "PASSED",
    "FAILED",
    "REVIEW_REQUIRED",
    "PROVIDER_ERROR",
  ]),
  startedAt: z.iso.datetime(),
  endedAt: z.iso.datetime().nullable(),
  durationMs: z.number().nonnegative(),
  context: contextSnapshotSchema,
  tokenUsage: z
    .object({
      input: z.number(),
      cachedInput: z.number(),
      output: z.number(),
      total: z.number(),
    })
    .nullable(),
  estimatedInferenceCost: z.number().nonnegative().nullable(),
  costBasis: z.string().nullable(),
  estimatedRemediationMinutes: z.number().nullable(),
  summary: z.string(),
  proposedFiles: z.array(z.object({ path: z.string(), content: z.string() })),
  appliedFiles: z.array(z.string()),
  rejectedPaths: z.array(z.string()),
  errors: z.array(z.string()),
  evaluation: evaluationResultSchema.nullable(),
  requiresHumanReview: z.boolean(),
  criticalFailure: z.boolean(),
  firstPassAccepted: z.boolean().nullable(),
  baselineFingerprint: z.string().nullable(),
  workspaceCleanedUp: z.boolean().nullable(),
  sandbox: z.literal("macos-seatbelt-stdio-v1"),
});
export type RealAgentRun = z.infer<typeof realRunSchema>;
