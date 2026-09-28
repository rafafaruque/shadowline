import {
  autonomyEvidenceSchema,
  autonomyRecommendationSchema,
} from "@/lib/domain/schemas";
import type {
  AutonomyEvidence,
  AutonomyRecommendation,
} from "@/lib/domain/types";

/** Illustrative gates, not calibrated production safety thresholds. */
export function recommendAutonomy(
  input: AutonomyEvidence,
): AutonomyRecommendation {
  const evidence = autonomyEvidenceSchema.parse(input);
  let level: AutonomyRecommendation["level"] = "REVIEW";
  const reasons: string[] = [];
  if (evidence.riskLevel === "HIGH" || evidence.riskLevel === "CRITICAL")
    reasons.push("High-impact work requires human ownership.");
  if (evidence.criticalFailureCount > 0)
    reasons.push(
      `${evidence.criticalFailureCount} critical failure(s) in the evidence window.`,
    );
  if (reasons.length) level = "HUMAN";
  else {
    if (evidence.riskLevel !== "LOW")
      reasons.push("Medium-risk changes require review.");
    if (evidence.sampleSize < 30)
      reasons.push("Fewer than 30 observations; evidence is limited.");
    if (evidence.deterministicVerificationCoverage < 0.95)
      reasons.push(
        "Deterministic verification covers less than 95% of required checks.",
      );
    if (evidence.historicalReliability < 0.95)
      reasons.push("Historical reliability is below 95%.");
    if (!reasons.length) {
      level = "AUTO";
      reasons.push(
        "Low risk, at least 30 observations, ≥95% verification and reliability, and no critical failures.",
      );
    }
  }
  return autonomyRecommendationSchema.parse({
    category: evidence.category,
    level,
    evidence,
    reasons,
    policyVersion: "prototype-v1",
    provisional: true,
  });
}
