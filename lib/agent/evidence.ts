import type { RealAgentRun } from "./schemas";

/** Read compatibility only: the original historical JSON is never rewritten. */
export function classifyStoredRun(run: RealAgentRun): RealAgentRun {
  if (
    run.status === "REVIEW_REQUIRED" &&
    run.evaluation === null &&
    run.proposedFiles.length === 0 &&
    run.appliedFiles.length === 0 &&
    run.errors.some(
      (error) =>
        /^Gemini returned HTTP \d{3}\./.test(error) ||
        error ===
          "Gemini request failed or timed out. No automatic retry was made.",
    )
  ) {
    return {
      ...run,
      status: "PROVIDER_ERROR",
      firstPassAccepted: null,
      requiresHumanReview: false,
      criticalFailure: false,
    };
  }
  return run;
}

/** Request ordinals retain outages, but coding-attempt denominators exclude them. */
export function countsAsCodingAttempt(run: RealAgentRun) {
  const status = classifyStoredRun(run).status;
  return status !== "PROVIDER_ERROR" && status !== "RUNNING";
}

/** Only actual completed benchmark verdicts can inform reliability/autonomy. */
export function isAutonomyEvidence(run: RealAgentRun) {
  return run.evaluation !== null && ["PASSED", "FAILED"].includes(run.status);
}
