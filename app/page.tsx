import Link from "next/link";
import { PageHeading, SectionHeading } from "@/components/ui";
import { RealExperimentSummary } from "@/components/real-experiment-summary";
import { RealRunTable } from "@/components/real-run-log";
import { AutonomyMap } from "@/components/autonomy-map";
import { loadEngagementEvidence } from "@/lib/engagement/evidence";
import { runRows } from "@/lib/presentation/run-rows";
import { canViewRealEvidence } from "@/lib/demo-mode";

export default async function Dashboard() {
  const evidence = await loadEngagementEvidence();
  return (
    <div className="workspace-stack">
      <PageHeading
        title="Shadowline"
        description="Coding-agent workflow health"
      />
      <RealExperimentSummary />
      <AutonomyMap />
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
      <Link className="workspace-link" href="/engagement">
        <strong>Northstar Software</strong>
        <span>API workflow pilot</span>
        <span>Open engagement →</span>
      </Link>
    </div>
  );
}
