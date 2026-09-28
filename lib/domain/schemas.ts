import { z } from "zod";

export const taskCategorySchema = z.enum([
  "TEST_GENERATION",
  "BUG_FIX",
  "API_CHANGE",
  "FRONTEND_CHANGE",
  "REFACTOR",
  "DATABASE_CHANGE",
  "ARCHITECTURE",
]);
export const riskLevelSchema = z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]);
export const runStatusSchema = z.enum([
  "PENDING",
  "RUNNING",
  "PASSED",
  "FAILED",
  "REVIEW_REQUIRED",
]);
export const checkSchema = z.enum([
  "TYPECHECK",
  "UNIT",
  "INTEGRATION",
  "CONTRACT",
  "SCOPE",
]);
const count = z.number().int().nonnegative();
const rate = z.number().min(0).max(1);
export const taskSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  description: z.string(),
  category: taskCategorySchema,
  riskLevel: riskLevelSchema,
  expectedContext: z.array(z.string()),
  acceptanceCriteria: z.array(z.string()),
  requiredChecks: z.array(checkSchema).min(1),
  allowedFiles: z.array(z.string()),
});
export const agentConfigSchema = z.object({
  id: z.string(),
  name: z.string(),
  model: z.string(),
  contextFiles: z.array(z.string()),
  acceptanceCriteria: z.array(z.string()),
  requiredChecks: z.array(checkSchema),
  notes: z.string(),
});
export const testCountsSchema = z.object({
  passed: count,
  failed: count,
  skipped: count,
});
export const evaluationResultSchema = z
  .object({
    typecheck: z.enum(["PASSED", "FAILED", "NOT_RUN"]),
    unitTests: testCountsSchema,
    integrationTests: testCountsSchema,
    contractTests: testCountsSchema,
    forbiddenFilesChanged: z.array(z.string()),
    scopeAdherence: z.enum(["PASSED", "WARNING", "FAILED", "NOT_RUN"]),
    criticalFailure: z.boolean(),
    overallResult: z.enum(["PASSED", "FAILED", "REVIEW_REQUIRED"]),
    checksRun: z.array(checkSchema),
    failureDetails: z.array(z.string()),
  })
  .superRefine((result, ctx) => {
    const failed =
      result.typecheck === "FAILED" ||
      result.scopeAdherence === "FAILED" ||
      result.criticalFailure ||
      result.forbiddenFilesChanged.length > 0 ||
      [result.unitTests, result.integrationTests, result.contractTests].some(
        (suite) => suite.failed > 0,
      );
    if (failed && result.overallResult !== "FAILED")
      ctx.addIssue({
        code: "custom",
        message: "Failed deterministic evidence must fail the evaluation.",
      });
    const incomplete =
      result.typecheck === "NOT_RUN" ||
      result.scopeAdherence !== "PASSED" ||
      [result.unitTests, result.integrationTests, result.contractTests].some(
        (suite) => suite.skipped > 0,
      );
    if (incomplete && result.overallResult === "PASSED")
      ctx.addIssue({
        code: "custom",
        message: "Incomplete checks or scope warnings require review.",
      });
  });
export const diagnosisSchema = z.object({
  classification: z.enum([
    "CONTEXT_GAP",
    "TASK_DESIGN",
    "ACCEPTANCE_CRITERIA",
    "VALIDATION_GAP",
    "MODEL_LIMITATION",
    "SCOPE_DRIFT",
    "UNKNOWN",
  ]),
  explanation: z.string(),
  evidence: z.array(z.string()).min(1),
  confidence: rate.optional(),
});
export const interventionSchema = z.object({
  contextFilesToAdd: z.array(z.string()),
  acceptanceCriteriaToAdd: z.array(z.string()),
  validationChecksToRequire: z.array(checkSchema),
  taskDecompositionSuggestions: z.array(z.string()),
  modelChangeSuggestion: z.string().optional(),
  rationale: z.string(),
});
export const runSchema = z
  .object({
    id: z.string(),
    taskId: z.string(),
    configId: z.string(),
    status: runStatusSchema,
    startedAt: z.iso.datetime(),
    durationMs: count,
    tokenCount: count,
    estimatedCost: z.number().nonnegative(),
    filesChanged: z.array(z.string()),
    summary: z.string(),
    attempt: z.number().int().positive(),
    regressionDetected: z.boolean(),
    humanReviewRequired: z.boolean(),
    evaluation: evaluationResultSchema.optional(),
    diagnoses: z.array(diagnosisSchema),
    intervention: interventionSchema.optional(),
  })
  .superRefine((run, ctx) => {
    if (
      ["PASSED", "FAILED", "REVIEW_REQUIRED"].includes(run.status) &&
      (!run.evaluation || run.evaluation.overallResult !== run.status)
    ) {
      ctx.addIssue({
        code: "custom",
        message: "Completed run status must match deterministic evidence.",
      });
    }
  });
export const autonomyEvidenceSchema = z.object({
  category: taskCategorySchema,
  riskLevel: riskLevelSchema,
  sampleSize: count,
  deterministicVerificationCoverage: rate,
  criticalFailureCount: count,
  historicalReliability: rate,
});
export const autonomyRecommendationSchema = z.object({
  category: taskCategorySchema,
  level: z.enum(["AUTO", "REVIEW", "HUMAN"]),
  reasons: z.array(z.string()).min(1),
  evidence: autonomyEvidenceSchema,
  policyVersion: z.string(),
  provisional: z.literal(true),
});
export const experimentCohortSchema = z
  .object({
    label: z.string(),
    sampleSize: z.number().int().positive(),
    successCount: count,
    regressionCount: count,
    averageIterations: z.number().positive(),
    averageTokens: count,
    averageCost: z.number().nonnegative(),
    humanRemediationMinutes: z.number().nonnegative(),
  })
  .refine(
    (cohort) =>
      cohort.successCount <= cohort.sampleSize &&
      cohort.regressionCount <= cohort.sampleSize,
    "Counts cannot exceed cohort size",
  );
export const experimentSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  baseline: experimentCohortSchema,
  improved: experimentCohortSchema,
  baselineRunId: z.string(),
  improvedRunId: z.string(),
  caveat: z.string(),
});
