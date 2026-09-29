import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeading, SectionHeading } from "@/components/ui";
import { ExperimentControls } from "@/components/experiment-controls";
import { DemoEvidenceNote } from "@/components/demo-evidence-note";
import { evidenceReaders } from "@/lib/evidence/readers";
import { canViewRealEvidence, isDemoMode } from "@/lib/demo-mode";

export default async function ExperimentStagePage({
  params,
}: {
  params: Promise<{ id: string; stage: string }>;
}) {
  if (!canViewRealEvidence()) notFound();
  const { id, stage } = await params;
  if (stage !== "diagnosis" && stage !== "setup") notFound();
  const readers = await evidenceReaders();
  const record = await readers.experiments.get(id);
  if (!record) notFound();
  const diagnosis = record.diagnosis.output;
  const context = record.intervention?.context;
  const base = `/experiments/real/${record.id}`;
  const title = (value: string) =>
    value.charAt(0) + value.slice(1).toLowerCase().replaceAll("_", " ");
  return (
    <div className="workspace-stack">
      <PageHeading
        title={stage === "diagnosis" ? "Diagnose failure" : "Improved setup"}
        description="API pagination · Baseline → Context-rich"
      >
        <span className="small-chip">
          {stage === "diagnosis"
            ? "Saved diagnosis"
            : record.approval
              ? "Approved in recorded experiment"
              : "Approval required"}
        </span>
      </PageHeading>
      {stage === "diagnosis" ? (
        <>
          <section className="panel">
            <SectionHeading title="Likely cause" />
            <div className="card-content">
              {diagnosis ? (
                <>
                  <strong>{title(diagnosis.primaryClassification)}</strong>
                  <div className="tag-list">
                    {diagnosis.secondaryClassifications.map((item) => (
                      <span className="config-tag" key={item}>
                        {title(item)}
                      </span>
                    ))}
                  </div>
                  <p>
                    {record.baselineRunId ===
                    "4b299b77-b63f-4ee3-ae13-06c5e0d2f956"
                      ? "The agent was not given the repository’s API conventions, existing pagination helper, or explicit compatibility requirements."
                      : diagnosis.explanation.split(/(?<=\.)\s+/)[0]}
                  </p>
                  <details className="inline-details">
                    <summary>View diagnosis evidence</summary>
                    <p>{diagnosis.explanation}</p>
                    <ul className="compact-list">
                      {diagnosis.supportingEvidence.map((item, i) => (
                        <li key={i}>
                          <strong>{item.evidenceId}</strong>: {item.observation}
                        </li>
                      ))}
                    </ul>
                  </details>
                </>
              ) : (
                <p>
                  {record.diagnosis.error ?? "No saved diagnosis available."}
                </p>
              )}
              <p className="muted">
                AI proposes this hypothesis. The engineer decides whether to
                test it.
              </p>
            </div>
          </section>
          {record.intervention && (
            <section className="panel">
              <SectionHeading title="Recommended change" />
              <div className="card-content">
                <ul className="compact-list">
                  {record.intervention.draft.contextToAdd.map((file) => (
                    <li key={file}>
                      <code>{file}</code>
                    </li>
                  ))}
                  {context?.acceptanceCriteria.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                  <li>
                    Required validation: {context?.requiredChecks.join(" · ")}
                  </li>
                </ul>
              </div>
            </section>
          )}
          <div className="row-actions">
            {context && (
              <Link className="button primary" href={`${base}/setup`}>
                Review improved setup →
              </Link>
            )}
            <Link href={`/agent/runs/${record.baselineRunId}`}>
              View baseline run
            </Link>
          </div>
        </>
      ) : (
        <>
          <section className="panel">
            <SectionHeading title="Context-rich configuration" />
            <div className="card-content">
              {record.approval && (
                <p className="muted">
                  Approved in the original local experiment ·{" "}
                  {record.approval.approvedAt}.
                </p>
              )}
              {context && (isDemoMode() || record.status === "COMPLETE") ? (
                <div className="intervention-editor">
                  {[
                    ["Context", context.files.map((file) => file.path)],
                    ["Acceptance criteria", context.acceptanceCriteria],
                    [
                      "Required checks",
                      context.requiredChecks.map((check) =>
                        check.toLowerCase(),
                      ),
                    ],
                  ].map(([legend, items]) => (
                    <fieldset key={legend as string} disabled>
                      <legend>{legend as string}</legend>
                      {(items as string[]).map((item) => (
                        <label className="choice-row" key={item}>
                          <input type="checkbox" checked readOnly />
                          {item}
                        </label>
                      ))}
                    </fieldset>
                  ))}
                  <details className="inline-details">
                    <summary>View rationale</summary>
                    <p>{record.intervention?.draft.rationale}</p>
                  </details>
                </div>
              ) : (
                <ExperimentControls
                  key={`${record.id}:${record.revision}`}
                  experiment={record}
                  compact
                  readOnly={isDemoMode()}
                />
              )}
              {context && (
                <details className="inline-details">
                  <summary>View exact context</summary>
                  {context.files.map((file) => (
                    <details className="file-disclosure" key={file.path}>
                      <summary>{file.path}</summary>
                      <pre className="agent-code">
                        <code>{file.content}</code>
                      </pre>
                    </details>
                  ))}
                  <details className="inline-details">
                    <summary>View full coding prompt</summary>
                    <pre className="agent-code">
                      <code>{context.systemPrompt}</code>
                    </pre>
                    <pre className="agent-code">
                      <code>{context.userPrompt}</code>
                    </pre>
                  </details>
                </details>
              )}
            </div>
          </section>
          <div className="row-actions">
            {record.interventionRunId && (
              <Link
                className="button primary"
                href={`/agent/runs/${record.interventionRunId}`}
              >
                View recorded rerun →
              </Link>
            )}
            <Link href={`${base}/diagnosis`}>Back to diagnosis</Link>
            <Link href={base}>Compare results →</Link>
          </div>
        </>
      )}
      <details className="panel disclosure">
        <summary>View hashes &amp; provenance</summary>
        <div className="card-content">
          <p>Experiment: {record.id}</p>
          <pre className="agent-code">
            <code>{JSON.stringify(record, null, 2)}</code>
          </pre>
          <DemoEvidenceNote />
        </div>
      </details>
    </div>
  );
}
