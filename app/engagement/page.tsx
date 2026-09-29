import Link from "next/link";
import { ArrowLeft, ArrowUpRight, ShieldCheck } from "lucide-react";
import { PageHeading, SectionHeading } from "@/components/ui";
import {
  engagementExperimentId,
  loadEngagementEvidence,
} from "@/lib/engagement/evidence";
import {
  experimentConclusion,
  measuredRows,
  measurementLabels,
} from "@/lib/experiments/comparison";
import type { RealAgentRun } from "@/lib/agent/schemas";
import styles from "./page.module.css";
import { canViewRealEvidence } from "@/lib/demo-mode";

export const dynamic = "force-dynamic";
export const metadata = { title: "Northstar Software" };

const workflow = [
  "Linear ticket",
  "Engineer assembles context",
  "Coding agent",
  "CI",
  "Senior engineer reviews",
  "Rework or merge",
];
const constraints = [
  [
    "Existing API contracts cannot break",
    "Contract tests and compatibility checks gate acceptance; critical regressions block it.",
  ],
  [
    "Agents cannot access hidden evaluation criteria",
    "Curated context and an isolated proposal process keep hidden tests outside the coding agent’s boundary.",
  ],
  [
    "Agents cannot execute arbitrary shell commands",
    "The coding provider returns structured file proposals. Codex tools are disabled and sandboxed; only Shadowline runs trusted validation commands.",
  ],
  [
    "Existing deterministic CI remains authoritative",
    "Executable type, public, integration, and contract checks decide correctness. AI diagnosis is a hypothesis, never the final judge.",
  ],
  [
    "High-risk work remains human-reviewed",
    "Task-level risk and critical-failure gates retain human oversight; recommendations do not grant production permissions.",
  ],
  [
    "Existing coding-agent providers remain usable",
    "A generic provider interface supports both codex-cli and Gemini without changing path validation or evaluation.",
  ],
];

function comparisonValues(run: RealAgentRun) {
  const values = measuredRows(run);
  values[6] = `${(run.durationMs / 1000).toFixed(3)}s`;
  values[7] = run.tokenUsage
    ? `${run.tokenUsage.total.toLocaleString("en-US")} tokens`
    : "Not available";
  return [run.status, ...values];
}

export default async function EngagementPage() {
  const evidence = await loadEngagementEvidence();
  const labels = ["Overall result", ...measurementLabels];
  const baseline = evidence.available
    ? comparisonValues(evidence.baseline)
    : [];
  const after = evidence.available ? comparisonValues(evidence.after) : [];
  // These inputs are customer-scenario assumptions, not experiment measurements.
  const illustrative = {
    tasks: 210,
    hours: 63,
    rework: 23,
    eligible: 90,
    before: 18,
    after: 8,
  };
  const recoveredHours =
    (illustrative.eligible * (illustrative.before - illustrative.after)) / 60;

  return (
    <div className={styles.page}>
      <PageHeading
        eyebrow="CUSTOMER ENGAGEMENT · FICTIONAL SCENARIO"
        title="Northstar Software"
        description="A 25-person B2B SaaS engineering organization. More agent-generated code; the same senior-engineer review queue."
      >
        <Link href="/" className="button secondary">
          <ArrowLeft size={14} />
          Overview
        </Link>
      </PageHeading>

      <section className={styles.brief} aria-labelledby="engagement-brief">
        <div>
          <div className="eyebrow">THE ENGAGEMENT</div>
          <h2 id="engagement-brief">
            Turn recurring rework into better task setup.
          </h2>
          <p>
            Northstar has increased implementation throughput with coding
            agents, but review and rework now constrain delivery. Every
            agent-generated change receives roughly the same review, regardless
            of task type or historical reliability.
          </p>
        </div>
        <div className={styles.briefAside}>
          <ShieldCheck size={22} />
          <strong>Pilot recommendation</strong>
          <span>
            Improve API task inputs.
            <br />
            Keep a human in the loop.
          </span>
        </div>
      </section>

      <section className="panel" aria-labelledby="business-assumptions">
        <SectionHeading
          eyebrow="ILLUSTRATIVE · CUSTOMER ASSUMPTIONS"
          title="The review bottleneck, in business terms"
        />
        <div className={styles.content}>
          <p id="business-assumptions">
            Illustrative business assumptions — not measured by Shadowline
          </p>
          <dl className={styles.metrics}>
            <div>
              <dt>Agent-generated tasks / month</dt>
              <dd>{illustrative.tasks}</dd>
            </div>
            <div>
              <dt>Human review hours / month</dt>
              <dd>{illustrative.hours}</dd>
            </div>
            <div>
              <dt>Require meaningful rework</dt>
              <dd>{illustrative.rework}%</dd>
            </div>
          </dl>
        </div>
      </section>

      <section className="panel" aria-label="Existing workflow">
        <SectionHeading
          eyebrow="01 · DISCOVER THE WORKFLOW"
          title="Where delivery slows down"
        />
        <div className={styles.content}>
          <ol className={styles.workflow} aria-label="Customer workflow">
            {workflow.map((step, index) => (
              <li key={step}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <strong>{step}</strong>
                {[1, 4, 5].includes(index) && <small>Bottleneck</small>}
              </li>
            ))}
          </ol>
          <div className={styles.threeColumns}>
            <article>
              <h3>01 / Inconsistent context</h3>
              <p>
                Engineers assemble context manually. Repository conventions and
                compatibility requirements are easy to miss.
              </p>
            </article>
            <article>
              <h3>02 / Uniform review</h3>
              <p>
                All agent work receives similar review, so reliable low-risk
                work competes for the same senior-engineer attention.
              </p>
            </article>
            <article>
              <h3>03 / Repeated rework</h3>
              <p>
                Recurring failures are fixed individually instead of improving
                the setup of future tasks.
              </p>
            </article>
          </div>
          <p className={styles.note}>
            Illustrative workflow. Linear and CI describe the customer’s
            process; this prototype does not connect to them.
          </p>
        </div>
      </section>

      <section className="panel" aria-label="Customer requirements">
        <SectionHeading
          eyebrow="02 · TRANSLATE CONSTRAINTS"
          title="Customer requirements → architecture decisions"
        />
        <div className={styles.content}>
          <p>
            Existing Shadowline boundaries support these requirements. This
            engagement view adds no execution permissions or production CI
            integration.
          </p>
        </div>
        <div className="table-scroll">
          <table className={styles.table}>
            <caption className={styles.srOnly}>
              Customer requirements mapped to existing Shadowline architecture
            </caption>
            <thead>
              <tr>
                <th scope="col">Customer requirement</th>
                <th scope="col">Existing architecture decision</th>
              </tr>
            </thead>
            <tbody>
              {constraints.map(([requirement, decision]) => (
                <tr key={requirement}>
                  <th scope="row">{requirement}</th>
                  <td>{decision}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section
        className={styles.hypothesis}
        aria-labelledby="technical-hypothesis"
      >
        <div className="eyebrow">03 · TECHNICAL HYPOTHESIS · NOT A VERDICT</div>
        <h2 id="technical-hypothesis">What might be causing the failures?</h2>
        <blockquote>
          “API tasks may be failing because agents lack repository-specific
          context and explicit acceptance criteria, rather than because the
          model is incapable of performing the task.”
        </blockquote>
        <p>
          Test the task setup before drawing conclusions about model capability.
          An AI-generated diagnosis can suggest an intervention; deterministic
          re-evaluation decides whether the new patch passes.
        </p>
      </section>

      <section className="panel" aria-label="Real measured experiment">
        <SectionHeading
          eyebrow="04 · REAL MEASURED EVIDENCE · NOT CUSTOMER METRICS"
          title="One task. Better inputs. A different result."
        />
        <div className={styles.content}>
          <p>
            This saved Shadowline pagination experiment is real. It was not run
            in Northstar’s fictional production environment.
          </p>
          {evidence.available ? (
            <>
              <div className={styles.twoColumns}>
                <article>
                  <h3>What failed?</h3>
                  <p>
                    The baseline used <code>limit</code> instead of the
                    repository’s <code>pageSize</code> semantics and differed
                    from response and error contracts.
                  </p>
                  <p>
                    <strong>Saved diagnosis hypothesis:</strong>{" "}
                    {evidence.experiment.diagnosis.output
                      ?.primaryClassification ?? "Not available"}
                    . This did not change the failed run result.
                  </p>
                </article>
                <article>
                  <h3>What did we change?</h3>
                  <p>
                    Retained the same task and original route, data, app, and
                    public-test context. Added{" "}
                    <code>docs/api-conventions.md</code> and{" "}
                    <code>src/lib/pagination.ts</code>, explicit{" "}
                    <code>page</code>/<code>pageSize</code> semantics,
                    historical <code>Customer[]</code> compatibility, and
                    required validation expectations.
                  </p>
                  <p>
                    The engineer approved the intervention. Hidden tests stayed
                    outside the coding prompt.
                  </p>
                </article>
              </div>
              <p className={styles.controls}>
                {evidence.matchedControls
                  ? "Same task · same provider/model · same benchmark · same deterministic evaluator. Only task/context configuration changed between attempts."
                  : "Matched controls could not be verified from the saved records. Do not attribute differences to the intervention."}
              </p>
            </>
          ) : (
            <p className={styles.controls}>
              Saved experiment unavailable. Restore the local experiment and its
              run records to inspect measured evidence. No fixture values have
              been substituted.
            </p>
          )}
        </div>
        {evidence.available && (
          <>
            <div className="table-scroll">
              <table className={styles.table}>
                <caption className={styles.srOnly}>
                  Measured baseline versus context-rich evidence
                </caption>
                <thead>
                  <tr>
                    <th scope="col">Measurement</th>
                    <th scope="col">BASELINE</th>
                    <th scope="col">CONTEXT-RICH</th>
                  </tr>
                </thead>
                <tbody>
                  {labels.map((label, index) => (
                    <tr key={label}>
                      <th scope="row">{label}</th>
                      <td className={index === 0 ? styles.failed : undefined}>
                        {baseline[index]}
                      </td>
                      <td className={index === 0 ? styles.passed : undefined}>
                        {after[index]}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className={styles.content}>
              <h3>Did it help, and what should the engineer learn?</h3>
              <p>
                {evidence.matchedControls
                  ? experimentConclusion(evidence.baseline, evidence.after)
                  : "These records do not establish a controlled improvement."}{" "}
                Make repository intent reusable in API task templates, then test
                across more tasks.
              </p>
              <p className={styles.note}>
                One attempt per configuration. Generation can vary. First-pass
                acceptance here is a per-attempt result, not a reliability rate.
                Benchmark review status is not permission to merge production
                changes. No production review-time or rework reduction was
                measured; inference cost is unavailable when no price was
                recorded.
              </p>
              <details className={styles.provenance}>
                <summary>
                  Inspect saved evidence and measurement boundaries
                </summary>
                <p>
                  Experiment: <code>{evidence.experiment.id}</code>
                  <br />
                  Baseline: <code>{evidence.baseline.id}</code>
                  <br />
                  Context-rich: <code>{evidence.after.id}</code>
                </p>
                <p>
                  Runtime and token counts cover each coding attempt, excluding
                  the separate diagnosis step and human approval time. No review
                  duration, remediation time, or customer savings were measured.
                </p>
                {canViewRealEvidence() ? (
                  <Link
                    className="text-link"
                    href={`/experiments/real/${engagementExperimentId}`}
                  >
                    Inspect the original experiment <ArrowUpRight size={14} />
                  </Link>
                ) : (
                  <p>
                    Full local run inspection is available in development at{" "}
                    <code>/experiments/real/{engagementExperimentId}</code>.
                  </p>
                )}
              </details>
            </div>
          </>
        )}
      </section>

      <section
        className={`panel ${styles.policy}`}
        aria-label="Recommended Production Policy"
      >
        <SectionHeading
          eyebrow="05 · RECOMMENDATION FOR API CHANGES"
          title="Recommended Production Policy"
        />
        <div className={styles.content}>
          <p className={styles.policyLabel}>LIGHT HUMAN REVIEW — PILOT</p>
          <div className={styles.twoColumns}>
            <article>
              <h3>Agent receives</h3>
              <ul>
                <li>Relevant implementation files</li>
                <li>API conventions</li>
                <li>Shared utilities</li>
                <li>Explicit compatibility requirements</li>
              </ul>
            </article>
            <article>
              <h3>Required validation</h3>
              <ul>
                <li>Typecheck</li>
                <li>Public / unit tests</li>
                <li>Integration tests</li>
                <li>Contract tests</li>
              </ul>
            </article>
          </div>
          <p>
            <strong>Do not automatically merge production changes.</strong> One
            benchmark demonstrates improvement but does not establish general
            reliability. Pilot lighter review only for eligible low-risk API
            work after the rollout gate is met; high-risk work remains fully
            human-reviewed.
          </p>
        </div>
      </section>

      <section className="panel" aria-label="Rollout plan">
        <SectionHeading
          eyebrow="06 · VALIDATE IN THE CUSTOMER WORKFLOW"
          title="Earn a review policy through a pilot"
        />
        <div className={styles.content}>
          <div className={styles.twoColumns}>
            <article>
              <h3>Phase 1 — shadow / pilot on 20–30 API tasks</h3>
              <p>
                Apply the context template while retaining current human review.
                Measure first-pass acceptance, critical regression rate, review
                duration, and remediation / rework time.
              </p>
            </article>
            <article>
              <h3>Phase 2 — reduce review conditionally</h3>
              <p>
                Move eligible low-risk tasks to lighter review only if
                reliability remains above the customer-defined threshold with
                zero critical regressions. Agree on that threshold with
                Northstar before the pilot; no numeric threshold is assumed
                here.
              </p>
            </article>
          </div>
          <p className={styles.rollback}>
            <strong>Rollback rule:</strong> A critical regression returns the
            pilot to full human review. High-risk work remains human-reviewed
            throughout.
          </p>
        </div>
      </section>

      <section className="panel" aria-label="Illustrative ROI">
        <SectionHeading
          eyebrow="07 · ILLUSTRATIVE ROI · CUSTOMER ASSUMPTIONS ONLY"
          title="What lighter review could recover"
        />
        <div className={styles.content}>
          <p>
            Illustrative inputs: {illustrative.tasks} agent-generated
            tasks/month and {illustrative.hours} current review hours/month. If{" "}
            {illustrative.eligible} low-risk tasks/month eventually qualify for
            lighter review and their average review time falls from{" "}
            {illustrative.before} to {illustrative.after} minutes:
          </p>
          <div className={styles.roi}>
            <div>
              <div className="eyebrow">CONDITIONAL, ILLUSTRATIVE CAPACITY</div>
              <strong>≈ {recoveredHours} engineering hours / month</strong>
              <p>
                {illustrative.eligible} tasks × ({illustrative.before} −{" "}
                {illustrative.after}) minutes ÷ 60 = {recoveredHours} hours
                recovered
              </p>
            </div>
            <span>Not measured savings</span>
          </div>
          <p className={styles.note}>
            Every input and this calculated output are
            illustrative/customer-assumption-based. This assumes the other
            tasks’ review time is unchanged and excludes rollout overhead,
            inference costs, and any rework savings. The 23% rework assumption
            is not converted into a benefit. No dollar ROI or production
            productivity gain is claimed.
          </p>
        </div>
      </section>
    </div>
  );
}
