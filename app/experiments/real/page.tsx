import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeading, SectionHeading, Badge } from "@/components/ui";
import { evidenceReaders } from "@/lib/evidence/readers";
import { canViewRealEvidence, isDemoMode } from "@/lib/demo-mode";
import { DiagnoseButton } from "@/components/experiment-controls";
export const dynamic = "force-dynamic";
export const metadata = { title: "Real experiments" };
export default async function RealExperimentsPage() {
  if (!canViewRealEvidence()) notFound();
  const readers = await evidenceReaders();
  const records = await readers.experiments.list();
  const baselines = (await readers.runs.list()).filter(
    (run) =>
      run.configId === "baseline" && run.status === "FAILED" && run.evaluation,
  );
  return (
    <div className="benchmark-verification">
      <PageHeading
        title="Real intervention experiments"
        description="Saved comparisons and baseline diagnoses."
      />
      <section className="panel">
        <SectionHeading title="Saved experiments" />
        <div className="card-content">
          {records.length ? (
            records.map((record) => (
              <p key={record.id}>
                <Link href={`/experiments/real/${record.id}`}>
                  Pagination · {record.createdAt}
                </Link>{" "}
                <Badge value={record.status} />
              </p>
            ))
          ) : (
            <p>No real experiments recorded yet.</p>
          )}
        </div>
      </section>
      <details className="panel disclosure">
        <summary>Failed baselines · diagnosis controls</summary>
        <div className="card-content">
          {baselines.map((run) => (
            <div className="experiment-baseline" key={run.id}>
              <h3>
                <Link href={`/agent/runs/${run.id}`}>
                  {run.provider} / {run.resolvedModel ?? run.model}
                </Link>
              </h3>
              <p>
                {run.id} · {run.evaluation!.publicTests?.failed} public failures
                · {run.evaluation!.contractTests.failed} contract failures
              </p>
              <DiagnoseButton baselineRunId={run.id} readOnly={isDemoMode()} />
            </div>
          ))}
          {!baselines.length && (
            <p>No evaluated failed baseline is available.</p>
          )}
        </div>
      </details>
    </div>
  );
}
