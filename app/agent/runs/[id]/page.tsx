import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge, PageHeading, SectionHeading } from "@/components/ui";
import { RunResultSummary } from "@/components/run-result-summary";
import { evidenceReaders } from "@/lib/evidence/readers";
import { canViewRealEvidence, isDemoMode } from "@/lib/demo-mode";
import { DemoEvidenceNote } from "@/components/demo-evidence-note";
import { DiagnoseButton } from "@/components/experiment-controls";

export const dynamic = "force-dynamic";
export const metadata = { title: "Real agent run" };
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
  return (
    <div className="benchmark-verification">
      <PageHeading
        eyebrow={`REAL AGENT RUN · ${run.configId.toUpperCase()} · ATTEMPT ${run.attemptNumber}`}
        title="Pagination implementation"
        description={run.context.task}
      >
        <Link className="button secondary" href="/agent">
          All real runs
        </Link>
      </PageHeading>
      <DemoEvidenceNote />
      {(experiments.length > 0 ||
        (run.configId === "baseline" &&
          run.status === "FAILED" &&
          run.evaluation)) && (
        <section className="panel">
          <SectionHeading title="Diagnosis and intervention evidence" />
          <div className="card-content">
            <p>
              Linked experiment evidence preserves this historical run
              unchanged. AI diagnoses are hypotheses; only deterministic checks
              decide acceptance.
            </p>
            {experiments.map((record) => (
              <p key={record.id}>
                <Link href={`/experiments/real/${record.id}`}>
                  Inspect real intervention experiment · {record.status}
                </Link>
              </p>
            ))}
            {run.configId === "baseline" &&
              run.status === "FAILED" &&
              run.evaluation &&
              experiments.length === 0 && (
                <DiagnoseButton
                  baselineRunId={run.id}
                  readOnly={isDemoMode()}
                />
              )}
          </div>
        </section>
      )}
      <section className="panel">
        <SectionHeading title="Engineering decision">
          <Badge value={run.status} />
        </SectionHeading>
        <div className="card-content">
          <h3>
            {run.status === "PROVIDER_ERROR"
              ? "Provider unavailable · no coding outcome"
              : run.requiresHumanReview
                ? "Human review required"
                : "Accepted by benchmark checks"}
          </h3>
          <p>
            {run.status === "PROVIDER_ERROR"
              ? "Excluded from coding-agent failures, benchmark failures, first-pass acceptance, and autonomy evidence. No code review is required because no patch was generated."
              : run.requiresHumanReview
                ? "Inspect the evidence below before taking further action."
                : "All deterministic acceptance checks passed. This is benchmark acceptance, not a production deployment approval."}
          </p>
          <dl className="benchmark-evidence">
            <dt>Provider / model</dt>
            <dd>
              {run.provider} / {run.resolvedModel ?? run.model}
            </dd>
            <dt>Critical regression observed</dt>
            <dd>
              {run.criticalFailure ? "Yes" : "No"}
              {!run.evaluation && " · evaluation unavailable"}
            </dd>
            <dt>First-pass acceptance</dt>
            <dd>
              {run.status === "PROVIDER_ERROR"
                ? "Not applicable · provider error"
                : run.firstPassAccepted === null
                  ? "Undetermined"
                  : run.firstPassAccepted
                    ? "Yes"
                    : "No"}
            </dd>
            <dt>Attempt numbering</dt>
            <dd>
              Request history includes provider errors; first-pass acceptance
              excludes them.
            </dd>
            <dt>Files proposed</dt>
            <dd>
              {run.proposedFiles.map((file) => file.path).join(", ") || "None"}
            </dd>
            <dt>Files applied</dt>
            <dd>{run.appliedFiles.join(", ") || "None"}</dd>
            <dt>Paths rejected</dt>
            <dd>{run.rejectedPaths.join(", ") || "None"}</dd>
          </dl>
          {run.status === "RUNNING" && (
            <p>
              Attempt in progress. Refresh to see completion. If the server
              stopped, this record remains incomplete; no pass is inferred.
            </p>
          )}
          {run.errors.map((error, index) => (
            <p className="text-bad" key={index}>
              {error}
            </p>
          ))}
        </div>
      </section>
      {run.evaluation ? (
        <RunResultSummary result={run.evaluation} />
      ) : (
        <div className="info-strip">No completed evaluation is available.</div>
      )}
      {run.evaluation && (
        <section className="panel">
          <SectionHeading title="Checks and failures" />
          <div className="card-content">
            <p>
              Public tests: {run.evaluation.publicTests?.passed} passed /{" "}
              {run.evaluation.publicTests?.failed} failed
            </p>
            {run.evaluation.failureDetails.length ? (
              run.evaluation.failureDetails.map((failure, index) => (
                <pre className="agent-code text-bad" key={index}>
                  {failure}
                </pre>
              ))
            ) : (
              <p>No deterministic failures recorded.</p>
            )}
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
        </section>
      )}
      <section className="panel">
        <SectionHeading
          eyebrow="MODEL OUTPUT · NOT AN EVALUATION"
          title="Proposed changes"
        />
        <div className="card-content">
          <p>{run.summary || "No valid proposal received."}</p>
          {run.proposedFiles.map((file) => (
            <details className="benchmark-check" key={file.path}>
              <summary>
                {file.path} ·{" "}
                {run.appliedFiles.includes(file.path)
                  ? "applied in temporary workspace"
                  : "not applied"}
              </summary>
              <h3>Before</h3>
              <pre className="agent-code">
                {run.context.files.find((item) => item.path === file.path)
                  ?.content ?? "Not supplied in context"}
              </pre>
              <h3>Proposed replacement</h3>
              <pre className="agent-code">{file.content}</pre>
            </details>
          ))}
        </div>
      </section>
      <section className="panel">
        <SectionHeading
          eyebrow="EXACT INPUT SNAPSHOT"
          title="What the agent knew"
        />
        <div className="card-content">
          <p>
            <strong>Task:</strong> {run.context.task}
          </p>
          <p>
            <strong>Explicit criteria:</strong>{" "}
            {run.context.acceptanceCriteria.join(" ") || "None supplied"}
          </p>
          <p>
            <strong>Requested validation:</strong>{" "}
            {run.context.requiredChecks.join(" · ")}
          </p>
          <p>
            <strong>Allowed modifications:</strong>{" "}
            {run.context.allowedPaths.join(", ")}
          </p>
          {run.context.files.map((file) => (
            <details className="benchmark-check" key={file.path}>
              <summary>{file.path}</summary>
              <p className="benchmark-hash">SHA-256: {file.sha256}</p>
              <pre className="agent-code">{file.content}</pre>
            </details>
          ))}
          <details className="benchmark-check">
            <summary>Exact system and user prompts</summary>
            <pre className="agent-code">{run.context.systemPrompt}</pre>
            <pre className="agent-code">{run.context.userPrompt}</pre>
            <p className="benchmark-hash">
              Prompt SHA-256: {run.context.promptSha256}
            </p>
          </details>
        </div>
      </section>
      <section className="panel">
        <SectionHeading title="Measured execution metadata" />
        <div className="card-content">
          {run.providerMetadata && (
            <details className="benchmark-check">
              <summary>Provider execution details</summary>
              <pre className="agent-code">
                {JSON.stringify(run.providerMetadata, null, 2)}
              </pre>
            </details>
          )}
          <dl className="benchmark-evidence">
            <dt>Run ID</dt>
            <dd>{run.id}</dd>
            <dt>Start / end (UTC)</dt>
            <dd>
              {run.startedAt} / {run.endedAt ?? "Pending"}
            </dd>
            <dt>Total runtime</dt>
            <dd>{run.durationMs} ms</dd>
            <dt>Tokens</dt>
            <dd>
              {run.tokenUsage
                ? `${run.tokenUsage.input} input · ${run.tokenUsage.cachedInput} cached · ${run.tokenUsage.output} output (including thinking) · ${run.tokenUsage.total} total`
                : "Not available"}
            </dd>
            <dt>Estimated inference cost</dt>
            <dd>
              {run.estimatedInferenceCost === null
                ? run.provider === "codex-cli"
                  ? "Unknown (local Codex login usage)"
                  : "Unknown (no verified rates configured)"
                : `$${run.estimatedInferenceCost.toFixed(6)}`}{" "}
              {run.costBasis}
            </dd>
            <dt>Remediation effort</dt>
            <dd>Not measured</dd>
            <dt>Temporary workspace</dt>
            <dd>
              {run.workspaceCleanedUp
                ? "Cleaned up"
                : "Not confirmed / not created"}
            </dd>
            <dt>Baseline SHA-256</dt>
            <dd className="benchmark-hash">
              {run.baselineFingerprint ?? "Not available"}
            </dd>
          </dl>
        </div>
      </section>
    </div>
  );
}
