import Link from "next/link";
import { Badge, SectionHeading } from "./ui";
import { loadEngagementEvidence } from "@/lib/engagement/evidence";
import { canViewRealEvidence } from "@/lib/demo-mode";

export async function RealExperimentSummary({
  overview = false,
}: {
  overview?: boolean;
}) {
  const evidence = await loadEngagementEvidence();
  const counts = (suite?: {
    passed: number;
    failed: number;
    skipped: number;
  }) =>
    suite
      ? `${suite.passed} / ${suite.passed + suite.failed + suite.skipped}`
      : "Not evaluated";
  return (
    <section className="panel real-summary" aria-label="Real experiment">
      <SectionHeading eyebrow="REAL EXPERIMENT" title="API pagination">
        {evidence.available && canViewRealEvidence() && (
          <Link
            className="button primary"
            href={`/experiments/real/${evidence.experiment.id}`}
          >
            {overview ? "See what changed →" : "View experiment"}
          </Link>
        )}
      </SectionHeading>
      {evidence.available ? (
        <>
          <div className="table-scroll">
            <table className="operational-table summary-table">
              <caption className="sr-only">
                Real baseline versus context-rich result
              </caption>
              <thead>
                <tr>
                  <th scope="col">Outcome</th>
                  <th scope="col">Baseline</th>
                  <th scope="col">Context-rich</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <th scope="row">Result</th>
                  {[evidence.baseline, evidence.after].map((run) => (
                    <td key={run.id}>
                      <Badge value={run.status} />
                    </td>
                  ))}
                </tr>
                <tr>
                  <th scope="row">Public</th>
                  <td>{counts(evidence.baseline.evaluation?.publicTests)}</td>
                  <td>{counts(evidence.after.evaluation?.publicTests)}</td>
                </tr>
                <tr>
                  <th scope="row">Contract</th>
                  <td>{counts(evidence.baseline.evaluation?.contractTests)}</td>
                  <td>{counts(evidence.after.evaluation?.contractTests)}</td>
                </tr>
                <tr>
                  <th scope="row">Review</th>
                  {[evidence.baseline, evidence.after].map((run) => (
                    <td key={run.id}>
                      {run.status === "PROVIDER_ERROR"
                        ? "No patch"
                        : run.requiresHumanReview
                          ? "Required"
                          : "Not required*"}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
          {overview && (
            <p className="card-content">
              Same model. Same task. Same evaluator. Adding repository
              conventions and explicit acceptance criteria turned a failed run
              into a passing one.
            </p>
          )}
          <div className="panel-footnote">
            *Controlled benchmark result. Not a production auto-merge
            recommendation.
          </div>
        </>
      ) : (
        <p className="card-content muted">
          Saved experiment unavailable. No substitute measurements.
        </p>
      )}
    </section>
  );
}
