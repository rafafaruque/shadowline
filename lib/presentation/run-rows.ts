import type { RealAgentRun } from "../agent/schemas";
import type { RunLogRow } from "../../components/real-run-log";

// Only display fields cross the client boundary; prompts and log payloads stay out.
export function runRows(runs: RealAgentRun[]): RunLogRow[] {
  const tests = (suite?: {
    passed: number;
    failed: number;
    skipped: number;
  }) =>
    suite
      ? `${suite.passed} / ${suite.passed + suite.failed + suite.skipped}`
      : "Not evaluated";
  return runs.map((run) => ({
    id: run.id,
    provider: run.provider,
    model: run.resolvedModel ?? run.model,
    configId: run.configId,
    status: run.status,
    startedAt: run.startedAt,
    durationMs: run.durationMs,
    requiresHumanReview: run.requiresHumanReview,
    publicTests: tests(run.evaluation?.publicTests),
    contractTests: tests(run.evaluation?.contractTests),
    incident: run.errors.join(" ").match(/HTTP \d{3}/)?.[0] ?? "Unavailable",
  }));
}
