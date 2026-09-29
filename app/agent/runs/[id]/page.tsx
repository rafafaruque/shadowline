import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge, PageHeading, SectionHeading } from "@/components/ui";
import { RunResultSummary } from "@/components/run-result-summary";
import { evidenceReaders } from "@/lib/evidence/readers";
import { canViewRealEvidence, isDemoMode } from "@/lib/demo-mode";
import { DemoEvidenceNote } from "@/components/demo-evidence-note";
import { DiagnoseButton } from "@/components/experiment-controls";
export const dynamic = "force-dynamic";
export const metadata = { title: "Run evidence" };
export default async function AgentRunPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  if (!canViewRealEvidence()) notFound();
  const readers = await evidenceReaders();
  const run = await readers.runs.get((await params).id);
  if (!run) notFound();
  const experiments = (await readers.experiments.list()).filter(
    (record) =>
      record.baselineRunId === run.id || record.interventionRunId === run.id,
  );
  const related = experiments[0];
  const isBaseline = related?.baselineRunId === run.id;
  const incident = run.status === "PROVIDER_ERROR";
  return (
    <div className="workspace-stack">
      <PageHeading
        title="API pagination"
        description={`${run.configId} · ${run.provider} / ${run.resolvedModel ?? run.model} · ${run.id.slice(0, 8)}`}
      >
        <Badge value={run.status} />
        <Link className="button secondary" href="/runs">
          All runs
        </Link>
      </PageHeading>
      {related && (
        <section className="panel real-summary">
          <SectionHeading
            title={isBaseline ? "What went wrong" : "Rerun complete"}
          />
          <div className="card-content">
            {isBaseline && run.id === "4b299b77-b63f-4ee3-ae13-06c5e0d2f956" ? (
              <p>
                The generated implementation used limit instead of the
                repository’s pageSize contract and violated existing
                response/error behavior.
              </p>
            ) : (
              <p>
                {isBaseline
                  ? "Inspect the recorded failure hypothesis."
                  : "The context-rich setup was evaluated against the same benchmark checks."}
              </p>
            )}
            <div className="row-actions">
              <Link
                className="button primary"
                href={
                  isBaseline
                    ? `/experiments/real/${related.id}/diagnosis`
                    : `/experiments/real/${related.id}`
                }
              >
                {isBaseline ? "Diagnose failure →" : "Compare results →"}
              </Link>
              <span className="muted">
                {isBaseline ? "Opens saved diagnosis" : "Recorded results"}
              </span>
            </div>
          </div>
        </section>
      )}
      <section className="panel">
        <SectionHeading title="Review decision" />
        <div className="card-content decision-row">
          <strong>
            {incident
              ? "Provider unavailable · no coding outcome"
              : run.requiresHumanReview
                ? "Human review required"
                : "Accepted by benchmark checks"}
          </strong>
          <span className="muted">
            {incident
              ? "Excluded from coding failures, acceptance rates, and autonomy evidence."
              : !run.requiresHumanReview
                ? "Benchmark acceptance only; no production merge approval."
                : "Deterministic acceptance failed or remains incomplete."}
          </span>
        </div>
      </section>
      <div className="workspace-grid">
        <section className="panel">
          <SectionHeading title="Task" />
          <div className="card-content">
            <p>{run.context.task}</p>
            <details className="inline-details">
              <summary>Acceptance criteria &amp; scope</summary>
              <ul className="compact-list">
                {run.context.acceptanceCriteria.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
              <p>Allowed paths: {run.context.allowedPaths.join(", ")}</p>
              <p>
                Requested checks:{" "}
                {run.context.requiredChecks.join(" · ") || "None"}
              </p>
            </details>
          </div>
        </section>
        <section className="panel">
          <SectionHeading title="Agent setup">
            <span className="small-chip">
              {run.configId} · {run.context.files.length} files
            </span>
          </SectionHeading>
          <div className="card-content">
            {run.context.files.map((file) => (
              <details className="file-disclosure" key={file.path}>
                <summary>
                  <code>{file.path}</code>
                </summary>
                <pre className="agent-code">
                  <code>{file.content}</code>
                </pre>
                <p className="benchmark-hash">SHA-256: {file.sha256}</p>
              </details>
            ))}
            <details className="inline-details">
              <summary>View full prompt</summary>
              <pre className="agent-code">
                <code>{run.context.systemPrompt}</code>
              </pre>
              <pre className="agent-code">
                <code>{run.context.userPrompt}</code>
              </pre>
              <p className="benchmark-hash">
                SHA-256: {run.context.promptSha256}
              </p>
            </details>
          </div>
        </section>
      </div>
      {run.evaluation ? (
        <>
          <RunResultSummary result={run.evaluation} />
          <details className="panel disclosure">
            <summary>
              View logs · {run.evaluation.failureDetails.length} findings
            </summary>
            <div className="card-content">
              {run.evaluation.failureDetails.map((failure, index) => (
                <pre className="agent-code text-bad" key={index}>
                  <code>{failure}</code>
                </pre>
              ))}
              {run.evaluation.checkRecords?.map((check) => (
                <details className="benchmark-check" key={check.id}>
                  <summary>
                    {check.id} · {check.status} · {check.durationMs} ms
                  </summary>
                  <p className="mono">{check.command}</p>
                  <p>
                    Exit: {check.exitCode ?? "none"} · {check.reportError}
                  </p>
                  <pre className="agent-code">
                    <code>
                      {check.stdout}
                      {check.stderr}
                    </code>
                  </pre>
                </details>
              ))}
            </div>
          </details>
        </>
      ) : (
        <section className="panel">
          <SectionHeading title="Evaluation" />
          <p className="card-content muted">Not evaluated.</p>
        </section>
      )}
      <section className="panel">
        <SectionHeading title="Patch">
          <span className="small-chip">
            {run.proposedFiles.length} proposed · {run.appliedFiles.length}{" "}
            applied
          </span>
        </SectionHeading>
        <div className="card-content">
          {run.proposedFiles.length ? (
            run.proposedFiles.map((file) => (
              <details className="file-disclosure" key={file.path}>
                <summary>
                  <code>{file.path}</code>
                  <span className="small-chip">
                    {run.appliedFiles.includes(file.path)
                      ? "Applied"
                      : "Not applied"}
                  </span>
                </summary>
                <pre className="agent-code">
                  <code>{file.content}</code>
                </pre>
              </details>
            ))
          ) : (
            <p className="muted">No code proposed.</p>
          )}
          {run.rejectedPaths.length > 0 && (
            <p className="text-bad">Rejected: {run.rejectedPaths.join(", ")}</p>
          )}
          <details className="inline-details">
            <summary>Agent summary</summary>
            <p>{run.summary || "Not available"}</p>
          </details>
        </div>
      </section>
      {(experiments.length > 0 ||
        (run.configId === "baseline" && run.status === "FAILED")) && (
        <section className="panel">
          <SectionHeading title="Diagnosis" />
          <div className="card-content">
            {experiments.map((record) => (
              <p key={record.id}>
                <Link
                  className="text-link"
                  href={`/experiments/real/${record.id}`}
                >
                  {record.baselineRunId !== run.id
                    ? "Baseline hypothesis · "
                    : ""}
                  {record.diagnosis.output?.primaryClassification ??
                    record.status}{" "}
                  · View experiment →
                </Link>
              </p>
            ))}
            {!experiments.length && (
              <DiagnoseButton baselineRunId={run.id} readOnly={isDemoMode()} />
            )}
          </div>
        </section>
      )}
      <section className="panel">
        <SectionHeading title="Execution" />
        <div className="card-content">
          <dl className="compact-metrics">
            <div>
              <dt>Runtime</dt>
              <dd>{(run.durationMs / 1000).toFixed(3)}s</dd>
            </div>
            <div>
              <dt>Tokens</dt>
              <dd>
                {run.tokenUsage?.total.toLocaleString("en-US") ?? "Unavailable"}
              </dd>
            </div>
            <div>
              <dt>Inference cost</dt>
              <dd>
                {run.estimatedInferenceCost === null
                  ? "Unknown"
                  : `$${run.estimatedInferenceCost.toFixed(6)}`}
              </dd>
            </div>
          </dl>
          {run.errors.map((error, index) => (
            <p className="text-warn" key={index}>
              {error}
            </p>
          ))}
          <details className="inline-details">
            <summary>View raw evidence</summary>
            <pre className="agent-code">
              <code>{JSON.stringify(run, null, 2)}</code>
            </pre>
          </details>
          <DemoEvidenceNote />
        </div>
      </section>
    </div>
  );
}
