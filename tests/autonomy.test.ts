import assert from "node:assert/strict";
import { test } from "node:test";
import { recommendAutonomy } from "../lib/policy/autonomy";
import type { AutonomyEvidence } from "../lib/domain/types";

const sufficient: AutonomyEvidence = {
  category: "TEST_GENERATION",
  riskLevel: "LOW",
  sampleSize: 30,
  deterministicVerificationCoverage: 0.95,
  criticalFailureCount: 0,
  historicalReliability: 0.95,
};

test("AUTO requires every evidence gate, including sufficient sample and verification", () => {
  const result = recommendAutonomy(sufficient);
  assert.equal(result.level, "AUTO");
  assert.equal(result.provisional, true);
  for (const change of [
    { sampleSize: 0 },
    { sampleSize: 29 },
    { deterministicVerificationCoverage: 0.94 },
    { historicalReliability: 0.94 },
    { riskLevel: "MEDIUM" as const },
  ]) {
    const restricted = recommendAutonomy({ ...sufficient, ...change });
    assert.equal(restricted.level, "REVIEW");
    assert.ok(restricted.reasons.length);
  }
});

test("risk and critical failures override perfect reliability", () => {
  for (const change of [
    { riskLevel: "HIGH" as const },
    { riskLevel: "CRITICAL" as const },
    { criticalFailureCount: 1 },
  ]) {
    assert.equal(
      recommendAutonomy({
        ...sufficient,
        sampleSize: 1000,
        historicalReliability: 1,
        deterministicVerificationCoverage: 1,
        ...change,
      }).level,
      "HUMAN",
    );
  }
});

test("out-of-range policy evidence is rejected at the boundary", () => {
  assert.throws(() =>
    recommendAutonomy({ ...sufficient, historicalReliability: 1.1 }),
  );
  assert.throws(() => recommendAutonomy({ ...sufficient, sampleSize: -1 }));
});
