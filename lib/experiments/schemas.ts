import { z } from "zod";
import {
  contextSnapshotSchema,
  realRunSchema,
  providerIdSchema,
} from "../agent/schemas";
import { contextChoices, validationChoices } from "./catalog";

export const classificationSchema = z.enum([
  "CONTEXT_GAP",
  "ACCEPTANCE_CRITERIA",
  "TASK_DESIGN",
  "VALIDATION_GAP",
  "MODEL_LIMITATION",
  "SCOPE_DRIFT",
  "UNKNOWN",
]);
export const interventionSchema = z.strictObject({
  contextToAdd: z.array(z.enum(contextChoices)).max(2),
  acceptanceCriteriaToAdd: z
    .array(z.enum(["PAGINATION_PARAMETERS", "REPOSITORY_CONTRACT"]))
    .max(2),
  requiredValidation: z.array(z.enum(validationChoices)).min(1).max(4),
  rationale: z.string().min(1).max(4000),
});
export type InterventionDraft = z.infer<typeof interventionSchema>;
export const diagnosisOutputSchema = z.strictObject({
  primaryClassification: classificationSchema,
  secondaryClassifications: z.array(classificationSchema).max(6),
  explanation: z.string().min(1).max(6000),
  supportingEvidence: z
    .array(
      z.strictObject({
        evidenceId: z.string().min(1).max(200),
        observation: z.string().min(1).max(2000),
      }),
    )
    .min(1)
    .max(20),
  recommendedIntervention: interventionSchema,
});
export const experimentSchema = z.object({
  id: z.string().uuid(),
  baselineRunId: z.string().uuid(),
  baselineRecordSha256: z.string(),
  protectedInputsSha256: z.string(),
  baselineFingerprint: z.string(),
  provider: providerIdSchema,
  model: z.string(),
  createdAt: z.iso.datetime(),
  revision: z.number().int().nonnegative(),
  status: z.enum([
    "DIAGNOSING",
    "DIAGNOSIS_ERROR",
    "DRAFT",
    "APPROVED",
    "RUNNING",
    "COMPLETE",
    "EXECUTION_ERROR",
  ]),
  diagnosis: z.object({
    status: z.enum([
      "RUNNING",
      "COMPLETED",
      "PROVIDER_ERROR",
      "INVALID_OUTPUT",
    ]),
    isHypothesis: z.literal(true),
    context: contextSnapshotSchema,
    evidence: z.array(
      z.object({ id: z.string(), source: z.string(), detail: z.string() }),
    ),
    output: diagnosisOutputSchema.nullable(),
    startedAt: z.iso.datetime(),
    endedAt: z.iso.datetime().nullable(),
    durationMs: z.number(),
    resolvedModel: z.string().nullable(),
    responseId: z.string().nullable(),
    tokenUsage: realRunSchema.shape.tokenUsage,
    estimatedInferenceCost: z.number().nullable(),
    providerMetadata: realRunSchema.shape.providerMetadata,
    error: z.string().nullable(),
  }),
  intervention: z
    .object({
      draft: interventionSchema,
      context: contextSnapshotSchema,
      sha256: z.string(),
    })
    .nullable(),
  approval: z
    .object({
      proposalSha256: z.string(),
      approvedAt: z.iso.datetime(),
      source: z.enum(["UI", "USER_MESSAGE"]),
      actor: z.literal("Local engineer"),
    })
    .nullable(),
  interventionRunId: z.string().uuid().nullable(),
  executionStartedAt: z.iso.datetime().nullable(),
  error: z.string().nullable(),
});
export type RealExperiment = z.infer<typeof experimentSchema>;
export const experimentActionSchema = z.discriminatedUnion("action", [
  z.strictObject({
    action: z.literal("diagnose"),
    baselineRunId: z.string().uuid(),
  }),
  z.strictObject({
    action: z.literal("edit"),
    id: z.string().uuid(),
    revision: z.number().int().nonnegative(),
    draft: interventionSchema,
  }),
  z.strictObject({
    action: z.literal("approve"),
    id: z.string().uuid(),
    revision: z.number().int().nonnegative(),
    proposalSha256: z.string().length(64),
    confirmed: z.literal(true),
  }),
  z.strictObject({
    action: z.literal("execute"),
    id: z.string().uuid(),
    proposalSha256: z.string().length(64),
  }),
]);
