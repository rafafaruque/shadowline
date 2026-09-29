import Link from "next/link";
import type { RealAgentRun } from "@/lib/agent/schemas";
import { Badge, SectionHeading } from "./ui";

export function ExperimentOutcome({
  baseline,
  after,
  id,
}: {
  baseline: RealAgentRun;
  after: RealAgentRun;
  id: string;
}) {
  const same =
    baseline.taskId === after.taskId &&
    baseline.context.task === after.context.task &&
    baseline.provider === after.provider &&
    (baseline.resolvedModel ?? baseline.model) ===
      (after.resolvedModel ?? after.model) &&
    baseline.baselineFingerprint === after.baselineFingerprint &&
    Boolean(baseline.evaluation?.checkRecords?.length) &&
    JSON.stringify(
      baseline.evaluation?.checkRecords?.map((c) => [c.id, c.command]),
    ) ===
      JSON.stringify(
        after.evaluation?.checkRecords?.map((c) => [c.id, c.command]),
      );
  const count = (suite?: {
    passed: number;
    failed: number;
    skipped: number;
  }) =>
    suite
      ? `${suite.passed} / ${suite.passed + suite.failed + suite.skipped}`
      : "Not evaluated";
  const rows = [
    [
      "Typecheck",
      (r: RealAgentRun) => r.evaluation?.typecheck ?? "Not evaluated",
    ],
    ["Public tests", (r: RealAgentRun) => count(r.evaluation?.publicTests)],
    ["Contract tests", (r: RealAgentRun) => count(r.evaluation?.contractTests)],
    ["Runtime", (r: RealAgentRun) => `${(r.durationMs / 1000).toFixed(3)} s`],
    [
      "Tokens",
      (r: RealAgentRun) =>
        r.tokenUsage?.total.toLocaleString("en-US") ?? "Unavailable",
    ],
    [
      "Review",
      (r: RealAgentRun) =>
        r.status === "PROVIDER_ERROR"
          ? "No patch"
          : r.requiresHumanReview
            ? "Required"
            : "Benchmark passed",
    ],
  ] as const;
  return (
    <>
      <section className="panel real-summary">
        <SectionHeading title="Baseline → Context-rich" />
        <div className="table-scroll">
          <table className="operational-table summary-table">
            <caption className="sr-only">Experiment result</caption>
            <thead>
              <tr>
                <th>Measurement</th>
                <th>Baseline</th>
                <th>Context-rich</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <th scope="row">Result</th>
                <td>
                  <Badge value={baseline.status} />
                </td>
                <td>
                  <Badge value={after.status} />
                </td>
              </tr>
              {rows.map(([label, value]) => (
                <tr key={label}>
                  <th scope="row">{label}</th>
                  <td>{value(baseline)}</td>
                  <td>{value(after)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="panel-footnote">
          {same
            ? "Same task · Same model · Same evaluator · Different task setup"
            : "Check the full evidence before comparing these attempts."}
        </div>
        <div className="card-content row-actions">
          <Link href={`/agent/runs/${baseline.id}`}>View baseline run →</Link>
          <Link href={`/agent/runs/${after.id}`}>View recorded rerun →</Link>
          <Link href={`/experiments/real/${id}/diagnosis`}>
            View diagnosis →
          </Link>
          <Link href={`/experiments/real/${id}/setup`}>
            View approved setup →
          </Link>
        </div>
      </section>
      {same && baseline.status === "FAILED" && after.status === "PASSED" && (
        <section className="panel" aria-label="Recommendation">
          <SectionHeading title="Recommendation">
            <span className="config-tag">API changes · PILOT</span>
          </SectionHeading>
          <div className="card-content">
            <p>
              Use the context-rich task template for similar API work. Keep
              human review enabled while more evidence accumulates.
            </p>
            <h3>Next step</h3>
            <p>
              Run this policy across 20–30 comparable API tasks before
              reconsidering review requirements.
            </p>
            <p className="muted">
              This experiment supports the intervention on this benchmark only.
            </p>
          </div>
        </section>
      )}
    </>
  );
}
