import Link from "next/link";
import type { RealAgentRun } from "@/lib/agent/schemas";
import { notFound } from "next/navigation";
import { PageHeading, SectionHeading } from "@/components/ui";
import { loadEngagementEvidence } from "@/lib/engagement/evidence";
import { canViewRealEvidence, canExecuteLocally } from "@/lib/demo-mode";

export const metadata = { title: "New experiment" };
export default async function NewExperimentPage({
  searchParams,
}: {
  searchParams: Promise<{ step?: string; config?: string }>;
}) {
  if (!canViewRealEvidence()) notFound();
  const query = await searchParams;
  const setup = query.step === "setup";
  const saved = await loadEngagementEvidence();
  if (!saved.available)
    return (
      <>
        <PageHeading title="New experiment" description="Choose a task" />
        <p>Saved experiment unavailable.</p>
        {canExecuteLocally() && (
          <Link href="/agent">Open local execution controls →</Link>
        )}
      </>
    );
  const run = query.config === "context-rich" ? saved.after : saved.baseline;
  return (
    <div className="workspace-stack">
      <PageHeading
        title={setup ? "Agent setup" : "New experiment"}
        description={
          setup ? "Add pagination to GET /customers" : "Choose a task"
        }
      >
        <span className="small-chip">Step {setup ? "2" : "1"} / 2</span>
      </PageHeading>
      {!setup ? (
        <section className="panel">
          <SectionHeading title="Add pagination to GET /customers">
            <span className="config-tag">API change · Medium risk</span>
          </SectionHeading>
          <div className="card-content">
            <p>
              Support optional pagination while preserving existing API
              behavior.
            </p>
            <div className="row-actions">
              <Link
                className="button primary"
                href="/experiments/new?step=setup"
              >
                Continue →
              </Link>
            </div>
          </div>
        </section>
      ) : (
        <>
          <section className="panel">
            <SectionHeading title="Provider & model" />
            <div className="card-content">
              <strong>
                {run.provider === "codex-cli" ? "Codex" : run.provider}
              </strong>{" "}
              ·{" "}
              {(run.resolvedModel ?? run.model) === "gpt-6-astra"
                ? "GPT-6 Astra"
                : (run.resolvedModel ?? run.model)}
              <small className="muted"> · Recorded configuration</small>
            </div>
          </section>
          <div className="workspace-grid" aria-label="Task configurations">
            {(
              [
                ["baseline", "Baseline", "Task + implementation files"],
                [
                  "context-rich",
                  "Context-rich",
                  "+ repository conventions · shared pagination utility · explicit acceptance criteria · required validation",
                ],
              ] as const
            ).map(([id, title, description]) => (
              <section
                key={id}
                className={`panel setup-choice ${run.configId === id ? "selected" : ""}`}
                aria-label={`${title} configuration`}
              >
                <strong>{title}</strong>
                <p>{description}</p>
                {id === "baseline" && (
                  <ul className="context-manifest">
                    {saved.baseline.context.files.map((file) => (
                      <li key={file.path}>
                        <code>{file.path}</code>
                      </li>
                    ))}
                  </ul>
                )}
                <Link
                  className="text-link"
                  href={`/experiments/new?step=setup&config=${id}`}
                  aria-current={run.configId === id ? "true" : undefined}
                  aria-label={`${title} ${run.configId === id ? "Selected" : "Select setup"}`}
                >
                  {run.configId === id ? "Selected" : "Select setup →"}
                </Link>
                <ContextDetails
                  run={id === "baseline" ? saved.baseline : saved.after}
                />
              </section>
            ))}
          </div>
          <div className="row-actions">
            <Link className="button primary" href={`/agent/runs/${run.id}`}>
              Open recorded run →
            </Link>
            <Link href="/experiments/new">Back to task</Link>
            {canExecuteLocally() && (
              <Link href="/agent">Open local execution controls →</Link>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function ContextDetails({ run }: { run: RealAgentRun }) {
  return (
    <details className="inline-details">
      <summary>View context · {run.context.files.length} files</summary>
      <div className="card-content">
        {run.context.files.map((file) => (
          <details className="file-disclosure" key={file.path}>
            <summary>
              <code>{file.path}</code>
            </summary>
            <pre className="agent-code">
              <code>{file.content}</code>
            </pre>
          </details>
        ))}
        <h3>Acceptance criteria</h3>
        <ul className="compact-list">
          {run.context.acceptanceCriteria.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
        {!run.context.acceptanceCriteria.length && (
          <p className="muted">None supplied</p>
        )}
        <h3>Required checks</h3>
        <p>{run.context.requiredChecks.join(" · ") || "None supplied"}</p>
        <details className="inline-details">
          <summary>View full coding prompt</summary>
          <pre className="agent-code">
            <code>{run.context.systemPrompt}</code>
          </pre>
          <pre className="agent-code">
            <code>{run.context.userPrompt}</code>
          </pre>
        </details>
      </div>
    </details>
  );
}
