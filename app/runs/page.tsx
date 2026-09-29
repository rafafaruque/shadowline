import { PageHeading } from "@/components/ui";
import { RealRunLog } from "@/components/real-run-log";
import { RunExplorer } from "@/components/run-explorer";
import { evidenceReaders } from "@/lib/evidence/readers";
import { runRows } from "@/lib/presentation/run-rows";
import { canViewRealEvidence } from "@/lib/demo-mode";
export const metadata = { title: "Runs" };
export default async function RunsPage() {
  const runs = await (await evidenceReaders()).runs.list();
  return (
    <div className="workspace-stack">
      <PageHeading
        title="Runs"
        description="Provider outcomes and deterministic results."
      />
      <RealRunLog rows={runRows(runs)} inspect={canViewRealEvidence()} />
      <details className="panel disclosure">
        <summary>Illustrative runs · 12 fixtures</summary>
        <RunExplorer />
      </details>
    </div>
  );
}
