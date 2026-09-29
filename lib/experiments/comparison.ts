import type { RealAgentRun } from "../agent/schemas";

export function measuredRows(run?: RealAgentRun) {
  const tests = (
    value?: { passed: number; failed: number; skipped: number } | null,
  ) =>
    value
      ? `${value.passed} passed / ${value.failed} failed${value.skipped ? ` / ${value.skipped} skipped` : ""}`
      : "Not evaluated";
  if (!run)
    return Array.from({ length: 12 }, () => "Not available — no attempt");
  return [
    `${run.provider} / ${run.resolvedModel ?? run.model}`,
    run.status === "PROVIDER_ERROR"
      ? "PROVIDER_ERROR"
      : run.resolvedModel
        ? "Succeeded"
        : "Not completed",
    run.evaluation?.typecheck ?? "Not evaluated",
    tests(run.evaluation?.publicTests),
    tests(run.evaluation?.contractTests),
    run.appliedFiles.join(", ") || "None",
    `${run.durationMs.toLocaleString()} ms`,
    run.tokenUsage
      ? `${run.tokenUsage.input.toLocaleString()} input / ${run.tokenUsage.output.toLocaleString()} output / ${run.tokenUsage.cachedInput.toLocaleString()} cached`
      : "Not available",
    run.estimatedInferenceCost === null
      ? "Unknown — no measured price"
      : `$${run.estimatedInferenceCost.toFixed(6)}`,
    run.firstPassAccepted === null
      ? "Not applicable / undetermined"
      : run.firstPassAccepted
        ? "Yes"
        : "No",
    run.status === "PROVIDER_ERROR"
      ? "No patch to review"
      : run.requiresHumanReview
        ? "Required"
        : "Not required by benchmark",
    run.evaluation ? (run.criticalFailure ? "Yes" : "No") : "Not evaluated",
  ];
}
export const measurementLabels = [
  "Provider / model",
  "Provider outcome",
  "Typecheck",
  "Public tests",
  "Contract tests",
  "Files applied",
  "Total coding-attempt runtime",
  "Token usage",
  "Estimated inference cost",
  "First coding attempt accepted",
  "Human review",
  "Critical failure",
];
export function experimentConclusion(
  baseline: RealAgentRun,
  after?: RealAgentRun,
) {
  if (!after)
    return "The intervention has not been evaluated. Review and approve the proposal before the single controlled rerun.";
  if (after.status === "PROVIDER_ERROR")
    return "The provider failed before evaluation. There is no evidence yet that the intervention helped or hurt coding quality; this is not a coding-agent failure.";
  if (!after.evaluation)
    return "No completed deterministic evaluation is available. No improvement can be claimed.";
  if (after.baselineFingerprint !== baseline.baselineFingerprint)
    return "The starting repositories differ. This is not a comparable intervention result.";
  if (after.status === "PASSED")
    return "The context-rich attempt passed the same benchmark that the baseline failed. This is evidence that the intervention helped on this benchmark, not proof that the diagnosis is universally correct.";
  const count = (run: RealAgentRun) =>
    (run.evaluation?.publicTests?.failed ?? 0) +
    (run.evaluation?.contractTests.failed ?? 0);
  return `The intervention still failed acceptance: ${count(after)} failed assertions versus ${count(baseline)} in the baseline. ${count(after) < count(baseline) ? "Some measured failures improved, but the patch still requires review." : "This attempt does not establish an improvement."}`;
}
