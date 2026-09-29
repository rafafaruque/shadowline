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
        description="Improve how coding agents are given work, then measure whether the changes actually make them more reliable."
      />
      <RealExperimentSummary overview />
      <ol className="homepage-workflow" aria-label="Shadowline workflow">
        <li>Run agent</li>
        <li>Verify with tests</li>
        <li>Test an improvement</li>
        <li>Update review policy</li>
      </ol>
      <section className="panel" aria-label="Current recommendation">
        <SectionHeading title="Current recommendation">
          <span className="config-tag">API changes · PILOT</span>
        </SectionHeading>
        <p className="card-content">
          Use the context-rich task template. Keep human review enabled while
          more evidence accumulates.
        </p>
      </section>
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
      <details className="panel disclosure">
        <summary>Illustrative policy preview</summary>
        <AutonomyMap />
      </details>
      <Link className="workspace-link" href="/engagement">
        <strong>Northstar Software</strong>
        <span>API workflow pilot</span>
        <span>Open engagement →</span>
      </Link>
    </div>
  );
}
