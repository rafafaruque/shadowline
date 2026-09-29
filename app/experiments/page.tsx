import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, FlaskConical, Info } from "lucide-react";
import { ExperimentChart } from "@/components/experiment-chart";
import { PageHeading, SectionHeading } from "@/components/ui";
import { experiment } from "@/lib/fixtures/experiments";
import { money, percent } from "@/lib/format";
import { canViewRealEvidence, isDemoMode } from "@/lib/demo-mode";
export const metadata: Metadata = { title: "Experiments" };

export default function ExperimentsPage() {
  const { baseline: a, improved: b } = experiment;
  const rows = [
    [
      "First-pass success",
      percent(a.successCount / a.sampleSize),
      percent(b.successCount / b.sampleSize),
      "+20 pp",
      true,
    ],
    [
      "Regression rate",
      percent(a.regressionCount / a.sampleSize),
      percent(b.regressionCount / b.sampleSize),
      "−13 pp",
      true,
    ],
    [
      "Average iterations",
      a.averageIterations.toFixed(1),
      b.averageIterations.toFixed(1),
      "−0.8",
      true,
    ],
    [
      "Average token usage",
      `${a.averageTokens / 1000}k`,
      `${b.averageTokens / 1000}k`,
      "+8k",
      false,
    ],
    [
      "Average inference cost",
      money(a.averageCost),
      money(b.averageCost),
      "+$0.05",
      false,
    ],
    [
      "Human remediation",
      `${a.humanRemediationMinutes} min`,
      `${b.humanRemediationMinutes} min`,
      "−6.1 min",
      true,
    ],
  ] as const;
  return (
    <>
      <PageHeading
        eyebrow="IMPROVE THE WORKFLOW"
        title="Experiments"
        description="Change how work is given to the agent. Re-evaluate. Inspect what actually improved."
      >
        <span className="small-chip">
          <FlaskConical size={14} />1 illustrative experiment
        </span>
      </PageHeading>
      {canViewRealEvidence() && (
        <section className="panel">
          <SectionHeading title="Real intervention experiments" />
          <div className="card-content">
            <p>
              {isDemoMode()
                ? "Inspect the recorded failure hypothesis, approved intervention, and real deterministic before/after results."
                : "Inspect AI failure hypotheses, approve repository-context interventions, and compare actual deterministic results."}
            </p>
            <Link className="button primary" href="/experiments/real">
              Open real experiments
            </Link>
          </div>
        </section>
      )}
      <section className="experiment-intro">
        <div>
          <div className="eyebrow">
            {experiment.id} · MATCHED TASK COMPARISON
          </div>
          <h2>{experiment.title}</h2>
          <p>{experiment.description}</p>
        </div>
        <div className="cohort-count">
          <strong>
            100 <span>×</span> 2
          </strong>
          <span>task attempts per configuration</span>
        </div>
      </section>
      <div className="experiment-grid">
        <section className="panel">
          <SectionHeading
            eyebrow="OUTCOMES, SIDE BY SIDE"
            title="The reliability tradeoff"
          />
          <ExperimentChart experiment={experiment} />
          <div className="panel-footnote">
            Higher success is better. Lower regression is better.
            <br />
            Illustrative cohorts; no live benchmark has run.
          </div>
        </section>
        <section className="panel">
          <SectionHeading
            eyebrow="ONE CONTROLLED CHANGE"
            title="What changed"
          />
          <div className="card-content experiment-configs">
            <div>
              <span className="config-tag">A · Baseline</span>
              <h3>Task only</h3>
              <p>
                A task prompt with minimal instructions. Typecheck and unit
                tests requested.
              </p>
            </div>
            <ArrowRight size={20} className="muted" />
            <div>
              <span className="config-tag green-tag">
                B · Context + criteria
              </span>
              <h3>Relevant context + clear constraints</h3>
              <p>
                Relevant files, architecture conventions, explicit acceptance
                criteria, and required contract / integration checks.
              </p>
            </div>
            <div className="controlled-note">
              <Info size={15} />
              <span>
                Same illustrative task set and model. The intervention changes
                multiple inputs, so the fixture cannot isolate which input
                helped.
              </span>
            </div>
          </div>
        </section>
      </div>
      <section className="panel">
        <SectionHeading title="Before / after comparison">
          <span className="small-chip">Authored fixture data</span>
        </SectionHeading>
        <div className="table-scroll">
          <table className="comparison-table">
            <caption className="sr-only">
              Comparison of illustrative baseline and improved agent
              configurations
            </caption>
            <thead>
              <tr>
                <th>Metric</th>
                <th>A · Baseline</th>
                <th>B · Context + criteria</th>
                <th>Change</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(([label, before, after, delta, good]) => (
                <tr key={label}>
                  <td>{label}</td>
                  <td className="mono muted">{before}</td>
                  <td className="mono">{after}</td>
                  <td>
                    <span className={`delta ${good ? "good" : "warn"}`}>
                      {delta}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <div className="tradeoff-note">
        <div className="eyebrow">THE TAKEAWAY IN THIS FIXTURE</div>
        <h2>More inference cost. Less human remediation.</h2>
        <p>
          Additional context increased inference cost but substantially reduced
          regressions and human remediation.
        </p>
        <p className="muted">{experiment.caveat}</p>
      </div>
      <section className="paired-runs">
        <div>
          <h2>Inspect one task, end to end</h2>
          <p>
            The pagination contract failure and its illustrative improved
            result.
          </p>
        </div>
        <Link
          className="button secondary"
          href={`/runs/${experiment.baselineRunId}`}
        >
          Baseline failure
          <ArrowRight size={15} />
        </Link>
        <Link
          className="button primary"
          href={`/runs/${experiment.improvedRunId}`}
        >
          Improved fixture
          <ArrowRight size={15} />
        </Link>
      </section>
    </>
  );
}
