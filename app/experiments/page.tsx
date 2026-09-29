import Link from "next/link";
import { PageHeading } from "@/components/ui";
import { RealExperimentSummary } from "@/components/real-experiment-summary";
import { ExperimentChart } from "@/components/experiment-chart";
import { experiment } from "@/lib/fixtures/experiments";
import { money, percent } from "@/lib/format";
import { canViewRealEvidence } from "@/lib/demo-mode";
export const metadata = { title: "Experiments" };
export default function ExperimentsPage() {
  const { baseline: a, improved: b } = experiment;
  const rows = [
    [
      "First-pass success",
      percent(a.successCount / a.sampleSize),
      percent(b.successCount / b.sampleSize),
    ],
    [
      "Regression rate",
      percent(a.regressionCount / a.sampleSize),
      percent(b.regressionCount / b.sampleSize),
    ],
    ["Average iterations", a.averageIterations, b.averageIterations],
    ["Average tokens", a.averageTokens, b.averageTokens],
    ["Inference cost", money(a.averageCost), money(b.averageCost)],
    [
      "Remediation",
      `${a.humanRemediationMinutes} min`,
      `${b.humanRemediationMinutes} min`,
    ],
  ];
  return (
    <div className="workspace-stack">
      <PageHeading
        title="Experiments"
        description="Compare coding-agent configurations against the same benchmark."
      >
        {canViewRealEvidence() && (
          <Link className="button secondary" href="/experiments/real">
            All real experiments
          </Link>
        )}
      </PageHeading>
      <RealExperimentSummary />
      <details className="panel disclosure">
        <summary>Illustrative cohort · {experiment.id}</summary>
        <div className="card-content">
          <p className="muted">
            Authored simulation · {a.sampleSize} tasks per configuration ·
            separate from measured runs.
          </p>
          <ExperimentChart experiment={experiment} />
          <div className="table-scroll">
            <table className="operational-table">
              <caption className="sr-only">
                Illustrative cohort comparison
              </caption>
              <thead>
                <tr>
                  <th>Metric</th>
                  <th>Baseline</th>
                  <th>Context + criteria</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(([name, before, after]) => (
                  <tr key={name}>
                    <th scope="row">{name}</th>
                    <td>{before}</td>
                    <td>{after}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="row-actions">
            <Link href={`/runs/${experiment.baselineRunId}`}>
              Baseline fixture →
            </Link>
            <Link href={`/runs/${experiment.improvedRunId}`}>
              Improved fixture →
            </Link>
          </div>
          <details className="inline-details">
            <summary>Cohort provenance</summary>
            <p>{experiment.caveat}</p>
          </details>
        </div>
      </details>
    </div>
  );
}
