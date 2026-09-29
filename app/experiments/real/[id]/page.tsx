import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeading, SectionHeading, Badge } from "@/components/ui";
import { ExperimentControls } from "@/components/experiment-controls";
import { evidenceReaders } from "@/lib/evidence/readers";
import { canViewRealEvidence, isDemoMode } from "@/lib/demo-mode";
import { DemoEvidenceNote } from "@/components/demo-evidence-note";
import { CriticalStatus } from "@/components/critical-status";
import {
  experimentConclusion,
  measuredRows,
  measurementLabels,
} from "@/lib/experiments/comparison";
export const dynamic = "force-dynamic";
export const metadata = { title: "API pagination experiment" };
export default async function RealExperimentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  if (!canViewRealEvidence()) notFound();
  const readers = await evidenceReaders();
  const record = await readers.experiments.get((await params).id);
  if (!record) notFound();
  const baseline = await readers.runs.get(record.baselineRunId);
  if (!baseline) notFound();
  const after = record.interventionRunId
    ? await readers.runs.get(record.interventionRunId)
    : undefined;
  const beforeRows = measuredRows(baseline),
    afterRows = measuredRows(after);
  const diagnosis = record.diagnosis.output;
  const context = record.intervention?.context;
  const added =
    context?.files.filter(
      (file) =>
        !baseline.context.files.some((original) => original.path === file.path),
    ) ?? [];
  const complete = record.status === "COMPLETE";
  const knownPagination =
    baseline.id === "4b299b77-b63f-4ee3-ae13-06c5e0d2f956";
  return (
    <div className="workspace-stack real-experiment">
      <PageHeading
        eyebrow="REAL EXPERIMENT"
        title="API pagination"
        description="Baseline vs Context-rich"
      >
        <Link className="button secondary" href="/experiments">
          All experiments
        </Link>
      </PageHeading>
      <section className="panel real-summary">
        <SectionHeading title="Outcome" />
        <div className="card-content outcome-pair">
          <div>
            <span>Baseline</span>
            <Badge value={baseline.status} />
            <Link href={`/agent/runs/${baseline.id}`}>View run →</Link>
          </div>
          <div>
            <span>Context-rich</span>
            {after ? (
              <>
                <Badge value={after.status} />
                <Link href={`/agent/runs/${after.id}`}>View run →</Link>
              </>
            ) : (
              <span>Not run</span>
            )}
          </div>
        </div>
      </section>
      <div className="workspace-grid">
        <section className="panel">
          <SectionHeading title="What failed" />
          <div className="card-content">
            <p>
              {knownPagination
                ? "Baseline used limit instead of repository pageSize semantics and violated response/error contracts."
                : `${baseline.evaluation?.publicTests?.failed ?? 0} public failures · ${baseline.evaluation?.contractTests.failed ?? 0} contract failures.`}
            </p>
          </div>
        </section>
        <section className="panel">
          <SectionHeading title="Hypothesis">
            <span className="small-chip">Not a verdict</span>
          </SectionHeading>
          <div className="card-content">
            {diagnosis ? (
              <>
                <strong className="mono">
                  {diagnosis.primaryClassification}
                </strong>
                <div className="tag-list">
                  {diagnosis.secondaryClassifications.map((value) => (
                    <span className="config-tag" key={value}>
                      {value}
                    </span>
                  ))}
                </div>
                <p>{diagnosis.explanation.split(/(?<=\.)\s+/)[0]}</p>
                <details className="inline-details">
                  <summary>Supporting evidence</summary>
                  <p>{diagnosis.explanation}</p>
                  <ul className="compact-list">
                    {diagnosis.supportingEvidence.map((item, index) => (
                      <li key={index}>
                        <strong>{item.evidenceId}</strong>: {item.observation}
                      </li>
                    ))}
                  </ul>
                </details>
              </>
            ) : (
              <p>{record.diagnosis.error ?? "Diagnosis pending."}</p>
            )}
          </div>
        </section>
      </div>
      <section className="panel">
        <SectionHeading title="Intervention">
          <Badge value={record.status} />
        </SectionHeading>
        <div className="card-content">
          {context && (
            <>
              <div className="workspace-grid three">
                <div>
                  <h3>Context added</h3>
                  <ul className="compact-list">
                    {added.map((file) => (
                      <li key={file.path}>
                        <code>{file.path}</code>
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h3>Acceptance criteria</h3>
                  <ul className="compact-list">
                    {context.acceptanceCriteria.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h3>Validation</h3>
                  <ul className="compact-list">
                    {context.requiredChecks.map((item) => (
                      <li key={item}>{item.toLowerCase()}</li>
                    ))}
                  </ul>
                </div>
              </div>
              <details className="inline-details">
                <summary>View full prompt</summary>
                {added.map((file) => (
                  <details key={file.path}>
                    <summary>{file.path}</summary>
                    <pre className="agent-code">
                      <code>{file.content}</code>
                    </pre>
                  </details>
                ))}
                <pre className="agent-code">
                  <code>{context.systemPrompt}</code>
                </pre>
                <pre className="agent-code">
                  <code>{context.userPrompt}</code>
                </pre>
              </details>
            </>
          )}
          {complete || isDemoMode() ? (
            <details className="inline-details">
              <summary>Approved intervention &amp; rationale</summary>
              <ExperimentControls
                key={`${record.id}:${record.revision}`}
                experiment={record}
                readOnly={isDemoMode()}
              />
            </details>
          ) : (
            <ExperimentControls
              key={`${record.id}:${record.revision}`}
              experiment={record}
              readOnly={false}
            />
          )}
        </div>
      </section>
      <section className="panel">
        <SectionHeading title="Evidence">
          <span className="small-chip">
            Same task · provider/model · benchmark · evaluator
          </span>
        </SectionHeading>
        <div className="table-scroll">
          <table className="operational-table">
            <caption className="sr-only">
              Measured baseline versus context-rich evidence
            </caption>
            <thead>
              <tr>
                <th>Measurement</th>
                <th>Baseline</th>
                <th>Context-rich</th>
              </tr>
            </thead>
            <tbody>
              {measurementLabels.map((label, index) => (
                <tr key={label}>
                  <th scope="row">{label}</th>
                  <td>{beforeRows[index]}</td>
                  <td>{afterRows[index]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="panel-footnote">
          <CriticalStatus
            value={after?.evaluation ? after.criticalFailure : null}
          />
        </div>
      </section>
      <section className="panel">
        <SectionHeading title="Conclusion" />
        <div className="card-content">
          <p>
            {after?.status === "PASSED" &&
            baseline.baselineFingerprint === after.baselineFingerprint
              ? "Targeted repository context improved this benchmark from failed to passed."
              : experimentConclusion(baseline, after)}
          </p>
          <p className="muted">
            Evidence is limited to this task; it does not establish general
            production reliability or justify automatic merging.
          </p>
          {record.error && <p className="text-bad">{record.error}</p>}
        </div>
      </section>
      <details className="panel disclosure">
        <summary>View raw evidence</summary>
        <div className="card-content">
          <p>
            Approval:{" "}
            {record.approval
              ? `${record.approval.source} · ${record.approval.approvedAt}`
              : "Not approved"}
          </p>
          <p>
            Diagnosis: {record.provider} /{" "}
            {record.diagnosis.resolvedModel ?? record.model} ·{" "}
            {record.diagnosis.durationMs} ms ·{" "}
            {record.diagnosis.tokenUsage?.total ?? "Unknown"} tokens
          </p>
          <pre className="agent-code">
            <code>{JSON.stringify(record, null, 2)}</code>
          </pre>
          <DemoEvidenceNote />
        </div>
      </details>
    </div>
  );
}
