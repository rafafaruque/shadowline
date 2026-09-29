import Link from "next/link";
import { PageHeading, SectionHeading } from "@/components/ui";
import { ExperimentHistory } from "@/components/experiment-history";
import { RealRunTable } from "@/components/real-run-log";
import { loadEngagementEvidence } from "@/lib/engagement/evidence";
import { runRows } from "@/lib/presentation/run-rows";
import { canViewRealEvidence } from "@/lib/demo-mode";

export default async function Dashboard() {
  const evidence = await loadEngagementEvidence();
  return (
    <div className="workspace-stack">
      <PageHeading
        title="Shadowline"
        description="Test and improve coding-agent workflows."
      >
        {canViewRealEvidence() && (
          <Link className="button primary" href="/experiments/new">
            Start experiment
          </Link>
        )}
      </PageHeading>
      <ExperimentHistory recent />
      <section className="panel">
        <SectionHeading title="Recent runs">
          <Link className="text-link" href="/runs">
            All runs →
          </Link>
        </SectionHeading>
        {evidence.available ? (
          <RealRunTable
            rows={runRows([evidence.after, evidence.baseline])}
            inspect={canViewRealEvidence()}
          />
        ) : (
          <p className="card-content muted">
            No saved experiment runs available.
          </p>
        )}
      </section>
    </div>
  );
}
