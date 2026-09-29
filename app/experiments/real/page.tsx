import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeading, SectionHeading, Badge } from "@/components/ui";
import { ExperimentStore } from "@/lib/experiments/store";
import { RunStore } from "@/lib/agent/store";
import { DiagnoseButton } from "@/components/experiment-controls";
export const dynamic = "force-dynamic";
export const metadata = { title: "Real experiments" };
export default async function RealExperimentsPage() {
  if (process.env.NODE_ENV !== "development") notFound();
  const records = await new ExperimentStore().list();
  const baselines = (await new RunStore().list()).filter(
    (run) =>
      run.configId === "baseline" && run.status === "FAILED" && run.evaluation,
  );
  return (
    <div className="benchmark-verification">
      <PageHeading
        eyebrow="REAL EVIDENCE · HUMAN APPROVAL"
        title="Real intervention experiments"
        description="Diagnose a failure, review a proposed change to the agent's inputs, and let the same tests measure what happened."
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
      <section className="panel">
        <SectionHeading title="Failed baselines available for diagnosis" />
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
              <DiagnoseButton baselineRunId={run.id} />
            </div>
          ))}
          {!baselines.length && (
            <p>No evaluated failed baseline is available.</p>
          )}
        </div>
      </section>
    </div>
  );
}
