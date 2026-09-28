import { experimentSchema, autonomyEvidenceSchema } from "@/lib/domain/schemas";
import { recommendAutonomy } from "@/lib/policy/autonomy";

export const experiment = experimentSchema.parse({
  id: "EXP-004",
  title: "Context changes the outcome",
  description: "Baseline vs Context + Acceptance Criteria",
  baseline: {
    label: "Baseline",
    sampleSize: 100,
    successCount: 71,
    regressionCount: 17,
    averageIterations: 2.1,
    averageTokens: 24000,
    averageCost: 0.14,
    humanRemediationMinutes: 8.2,
  },
  improved: {
    label: "Context + criteria",
    sampleSize: 100,
    successCount: 91,
    regressionCount: 4,
    averageIterations: 1.3,
    averageTokens: 32000,
    averageCost: 0.19,
    humanRemediationMinutes: 2.1,
  },
  baselineRunId: "SL-1042",
  improvedRunId: "SL-1043",
  caveat:
    "Illustrative matched cohorts of 100 task attempts per configuration, separate from the 12 inspectable runs. These are authored fixtures, not measured results or evidence of causality. More context is not always better; relevance, task mix, and validation coverage matter.",
});

/** Separate illustrative historical window, not an aggregation of the run explorer. */
export const autonomyRecommendations = [
  {
    category: "TEST_GENERATION",
    riskLevel: "LOW",
    sampleSize: 86,
    deterministicVerificationCoverage: 1,
    criticalFailureCount: 0,
    historicalReliability: 0.977,
  },
  {
    category: "BUG_FIX",
    riskLevel: "LOW",
    sampleSize: 64,
    deterministicVerificationCoverage: 0.98,
    criticalFailureCount: 0,
    historicalReliability: 0.953,
  },
  {
    category: "API_CHANGE",
    riskLevel: "MEDIUM",
    sampleSize: 42,
    deterministicVerificationCoverage: 0.94,
    criticalFailureCount: 0,
    historicalReliability: 0.857,
  },
  {
    category: "FRONTEND_CHANGE",
    riskLevel: "MEDIUM",
    sampleSize: 38,
    deterministicVerificationCoverage: 0.87,
    criticalFailureCount: 0,
    historicalReliability: 0.895,
  },
  {
    category: "REFACTOR",
    riskLevel: "MEDIUM",
    sampleSize: 24,
    deterministicVerificationCoverage: 0.92,
    criticalFailureCount: 0,
    historicalReliability: 0.875,
  },
  {
    category: "DATABASE_CHANGE",
    riskLevel: "HIGH",
    sampleSize: 18,
    deterministicVerificationCoverage: 0.89,
    criticalFailureCount: 2,
    historicalReliability: 0.722,
  },
  {
    category: "ARCHITECTURE",
    riskLevel: "CRITICAL",
    sampleSize: 12,
    deterministicVerificationCoverage: 0.75,
    criticalFailureCount: 1,
    historicalReliability: 0.667,
  },
].map((input) => recommendAutonomy(autonomyEvidenceSchema.parse(input)));
