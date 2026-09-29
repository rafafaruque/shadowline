import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeading, SectionHeading, Badge } from "@/components/ui";
import { ExperimentControls } from "@/components/experiment-controls";
import { evidenceReaders } from "@/lib/evidence/readers";
import { canViewRealEvidence, isDemoMode } from "@/lib/demo-mode";
import { DemoEvidenceNote } from "@/components/demo-evidence-note";
import {
  experimentConclusion,
  measuredRows,
  measurementLabels,
} from "@/lib/experiments/comparison";
export const dynamic = "force-dynamic";
export const metadata = { title: "Real intervention evidence" };
export default async function RealExperimentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  if (!canViewRealEvidence()) notFound();
  const readers = await evidenceReaders();
  const record = await readers.experiments.get((await params).id);
  if (!record) notFound();
  const store = readers.runs;
  const baseline = await store.get(record.baselineRunId);
  if (!baseline) notFound();
  const after = record.interventionRunId
    ? await store.get(record.interventionRunId)
    : undefined;
  const beforeRows = measuredRows(baseline);
  const afterRows = measuredRows(after);
  const diagnosis = record.diagnosis.output;
  return (
    <div className="benchmark-verification real-experiment">
      <PageHeading
        eyebrow="ONE REAL BASELINE · ONE CONTROLLED INTERVENTION"
        title="Did better context help?"
        description="AI proposes a failure hypothesis. An engineer approves the inputs. Deterministic tests decide whether the new patch meets the benchmark."
      >
        <Link className="button secondary" href="/experiments/real">
          All real experiments
        </Link>
      </PageHeading>
      <DemoEvidenceNote />
      <section className="panel">
        <SectionHeading eyebrow="1 · OBSERVED FAILURE" title="What failed?">
          <Badge value={baseline.status} />
        </SectionHeading>
        <div className="card-content">
          <p>{baseline.context.task}</p>
          <p>
            Baseline: typecheck {baseline.evaluation?.typecheck};{" "}
            {baseline.evaluation?.publicTests?.failed} public and{" "}
            {baseline.evaluation?.contractTests.failed} contract assertions
            failed.{" "}
            {baseline.criticalFailure
              ? "A critical regression was observed."
              : "No critical legacy-contract regression was observed."}
          </p>
          <p>{baseline.summary}</p>
          <Link href={`/agent/runs/${baseline.id}`}>
            Inspect the original baseline and failures
          </Link>
        </div>
      </section>
      <section className="panel">
        <SectionHeading
          eyebrow="2 · AI HYPOTHESIS — NOT A VERDICT"
          title="What might have caused it?"
        />
        <div className="card-content">
          {diagnosis ? (
            <>
              <h3>{diagnosis.primaryClassification.replaceAll("_", " ")}</h3>
              <p>{diagnosis.explanation}</p>
              {diagnosis.secondaryClassifications.length > 0 && (
                <p>
                  Also considered:{" "}
                  {diagnosis.secondaryClassifications.join(" · ")}
                </p>
              )}
              <ul>
                {diagnosis.supportingEvidence.map((item, index) => (
                  <li key={index}>
                    <strong>{item.evidenceId}</strong>: {item.observation}
                  </li>
                ))}
              </ul>
              <p>
                The model&apos;s explanation cannot change the baseline verdict.
                Re-evaluation tests the intervention, not the universal truth of
                the explanation.
              </p>
            </>
          ) : (
            <p>
              {record.diagnosis.error ??
                "Diagnosis is in progress; refresh to see the saved result."}
            </p>
          )}
        </div>
      </section>
      <section className="panel">
        <SectionHeading
          eyebrow={
            after ? "3 · APPROVED INTERVENTION" : "3 · REVIEW BEFORE EXECUTION"
          }
          title={after ? "What did we change?" : "What will we change?"}
        />
        <div className="card-content">
          <ExperimentControls
            key={`${record.id}:${record.revision}`}
            experiment={record}
            readOnly={isDemoMode()}
          />
          {record.intervention && (
            <>
              <h3>Saved coding-agent input</h3>
              <p>
                Same task and original benchmark. The generated baseline patch
                is not reused.
              </p>
              <p>
                Files:{" "}
                {record.intervention.context.files
                  .map((file) => file.path)
                  .join(", ")}
              </p>
              {record.intervention.context.files
                .filter(
                  (file) =>
                    !baseline.context.files.some(
                      (original) => original.path === file.path,
                    ),
                )
                .map((file) => (
                  <details className="benchmark-check" key={file.path}>
                    <summary>Added context: {file.path}</summary>
                    <pre className="agent-code">{file.content}</pre>
                    <p className="benchmark-hash">SHA-256: {file.sha256}</p>
                  </details>
                ))}
              <details className="benchmark-check">
                <summary>Exact proposed coding prompt</summary>
                <pre className="agent-code">
                  {record.intervention.context.systemPrompt}
                </pre>
                <pre className="agent-code">
                  {record.intervention.context.userPrompt}
                </pre>
              </details>
            </>
          )}
        </div>
      </section>
      <section className="panel">
        <SectionHeading
          eyebrow="4 · DETERMINISTIC EVIDENCE"
          title="Did the intervention help?"
        >
          {after && <Badge value={after.status} />}
        </SectionHeading>
        <div className="card-content">
          <p className="experiment-conclusion">
            {experimentConclusion(baseline, after)}
          </p>
          {record.error && <p className="text-bad">{record.error}</p>}
          {after && (
            <p>
              <Link href={`/agent/runs/${after.id}`}>
                Inspect the context-rich run, patch, and check records
              </Link>
            </p>
          )}
          <div className="table-scroll">
            <table className="evidence-comparison">
              <caption>Measured baseline versus context-rich evidence</caption>
              <thead>
                <tr>
                  <th scope="col">Measurement</th>
                  <th scope="col">Baseline</th>
                  <th scope="col">Context-rich</th>
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
          <p>
            First-pass acceptance is scoped to each configuration and excludes
            provider errors. Costs and missing telemetry stay unknown. These
            measurements never update fixture aggregates.
          </p>
        </div>
      </section>
      <section className="panel">
        <SectionHeading
          eyebrow="5 · INTERPRETATION"
          title="What should the engineer learn?"
        />
        <div className="card-content">
          <p>
            {after?.evaluation
              ? "Compare the actual failures and acceptance checks above before adopting this input change. Repository conventions and existing helpers provide intent the baseline did not receive."
              : "The diagnosis is a candidate explanation. Wait for a completed deterministic rerun before drawing an outcome conclusion."}
          </p>
          <p>
            One before/after pair cannot establish general reliability, prove
            causality, identify which individual context addition mattered, or
            justify autonomous production merges. Model sampling variability
            remains a possible contributor. A passing benchmark never grants
            deployment permission.
          </p>
        </div>
      </section>
      <details className="panel card-content">
        <summary>Provenance and diagnosis telemetry</summary>
        <p>Experiment: {record.id}</p>
        <p>
          Diagnosis: {record.provider} /{" "}
          {record.diagnosis.resolvedModel ?? record.model} ·{" "}
          {record.diagnosis.durationMs} ms ·{" "}
          {record.diagnosis.tokenUsage?.total ?? "Unknown"} tokens · cost{" "}
          {record.diagnosis.estimatedInferenceCost === null
            ? "Unknown"
            : `$${record.diagnosis.estimatedInferenceCost}`}
        </p>
        <p>
          Approval:{" "}
          {record.approval
            ? `${record.approval.source} at ${record.approval.approvedAt}`
            : "Not approved"}
        </p>
        <p className="benchmark-hash">
          Approved proposal: {record.approval?.proposalSha256 ?? "None"}
        </p>
        <p className="benchmark-hash">
          Baseline record SHA-256: {record.baselineRecordSha256}
        </p>
        <p className="benchmark-hash">
          Protected inputs SHA-256: {record.protectedInputsSha256}
        </p>
        <details>
          <summary>
            Exact diagnosis input (never supplied to the coding rerun)
          </summary>
          <pre className="agent-code">
            {record.diagnosis.context.systemPrompt}
          </pre>
          <pre className="agent-code">
            {record.diagnosis.context.userPrompt}
          </pre>
        </details>
      </details>
    </div>
  );
}
