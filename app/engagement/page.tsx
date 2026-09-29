import { PageHeading, SectionHeading } from "@/components/ui";
import { RealExperimentSummary } from "@/components/real-experiment-summary";
export const dynamic = "force-dynamic";
export const metadata = { title: "Northstar Software" };
const workflow = [
  "Linear ticket",
  "Assemble context",
  "Coding agent",
  "CI",
  "Senior review",
  "Rework or merge",
];
const requirements = [
  ["Existing contracts cannot break", "Contract tests + compatibility checks"],
  [
    "No access to hidden evaluation criteria",
    "Hidden tests isolated from coding agents",
  ],
  [
    "No arbitrary shell execution",
    "Agent tools disabled; fixed validation commands",
  ],
  [
    "Existing CI remains authoritative",
    "Deterministic evaluator; no LLM verdict",
  ],
  ["Existing agent stack remains usable", "Generic provider abstraction"],
  ["High-risk work requires humans", "Bounded review policy"],
];
export default function EngagementPage() {
  const assumptions = {
    tasks: 210,
    hours: 63,
    rework: 23,
    eligible: 90,
    before: 18,
    after: 8,
  };
  const recovered =
    (assumptions.eligible * (assumptions.before - assumptions.after)) / 60;
  return (
    <div className="workspace-stack engagement-workspace">
      <PageHeading
        title="Northstar Software"
        description="25-person SaaS engineering team · Coding-agent workflow pilot"
      >
        <span className="config-tag">Fictional customer</span>
      </PageHeading>
      <section className="panel" aria-label="Existing workflow">
        <SectionHeading title="Existing workflow" />
        <div className="card-content">
          <ol className="workflow-flow" aria-label="Customer workflow">
            {workflow.map((step, index) => (
              <li key={step}>
                <span>{index + 1}</span>
                {step}
              </li>
            ))}
          </ol>
          <ul className="bottlenecks">
            <li>Context assembled manually</li>
            <li>Uniform review burden</li>
            <li>Repeated failures do not improve future tasks</li>
          </ul>
        </div>
      </section>
      <div className="workspace-grid">
        <section className="panel" aria-label="Customer requirements">
          <SectionHeading title="Customer requirements" />
          <div className="table-scroll">
            <table className="operational-table">
              <thead>
                <tr>
                  <th>Requirement</th>
                  <th>Shadowline design</th>
                </tr>
              </thead>
              <tbody>
                {requirements.map(([requirement, design]) => (
                  <tr key={requirement}>
                    <th scope="row">{requirement}</th>
                    <td>{design}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
        <section className="panel">
          <SectionHeading title="Hypothesis" />
          <div className="card-content">
            <p>
              API tasks may be failing because agents lack repository-specific
              context and explicit acceptance criteria.
            </p>
            <span className="config-tag">Hypothesis · not a verdict</span>
          </div>
        </section>
      </div>
      <RealExperimentSummary />
      <div className="workspace-grid">
        <section className="panel" aria-label="Recommended pilot policy">
          <SectionHeading title="Recommended pilot policy" />
          <div className="card-content">
            <p className="policy-status">LIGHT HUMAN REVIEW — PILOT</p>
            <div className="workspace-grid">
              <div>
                <h3>API context</h3>
                <ul className="compact-list">
                  <li>Repository conventions</li>
                  <li>Shared pagination helper</li>
                  <li>Relevant implementation files</li>
                  <li>Explicit compatibility requirements</li>
                </ul>
              </div>
              <div>
                <h3>Validation</h3>
                <ul className="compact-list">
                  <li>Typecheck</li>
                  <li>Public / unit</li>
                  <li>Integration</li>
                  <li>Contract</li>
                </ul>
              </div>
            </div>
            <p className="muted">
              One successful controlled experiment is evidence for a pilot, not
              autonomous merging.
            </p>
          </div>
        </section>
        <section className="panel" aria-label="Rollout plan">
          <SectionHeading title="Rollout" />
          <div className="card-content">
            <ol className="rollout-steps">
              <li>Run on 20–30 API tasks under current review.</li>
              <li>
                Measure first-pass acceptance, critical regressions, review
                time, and rework.
              </li>
              <li>
                Reduce low-risk review only above customer-defined reliability
                requirements, with zero critical regressions.
              </li>
            </ol>
            <p className="compact-callout">
              Any critical regression → return to full review.
            </p>
            <p className="muted">High-risk work remains human-reviewed.</p>
          </div>
        </section>
      </div>
      <section className="panel" aria-label="Illustrative ROI">
        <SectionHeading title="Illustrative ROI">
          <span className="small-chip">Customer assumptions</span>
        </SectionHeading>
        <div className="card-content">
          <dl className="compact-metrics">
            <div>
              <dt>Current review</dt>
              <dd>{assumptions.hours} hrs/month</dd>
            </div>
            <div>
              <dt>Pilot assumption</dt>
              <dd>{assumptions.eligible} lighter-review tasks</dd>
            </div>
            <div>
              <dt>Potentially recovered</dt>
              <dd>{recovered} hrs/month</dd>
            </div>
          </dl>
          <p className="muted">
            Customer assumptions, not benchmark-measured ROI.
          </p>
          <details className="inline-details">
            <summary>Assumptions &amp; calculation</summary>
            <p>
              {assumptions.tasks} agent tasks/month · {assumptions.hours} review
              hours/month · {assumptions.rework}% meaningful rework — all
              illustrative.
            </p>
            <p>
              {assumptions.eligible} tasks × ({assumptions.before} −{" "}
              {assumptions.after}) review minutes ÷ 60 = {recovered}{" "}
              hours/month.
            </p>
            <p>
              Other review time unchanged. Excludes rollout overhead, inference
              costs, and rework savings. No measured customer savings or dollar
              ROI.
            </p>
          </details>
        </div>
      </section>
    </div>
  );
}
