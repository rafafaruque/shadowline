import type { Metadata } from "next";
import { Activity } from "lucide-react";
import Link from "next/link";
import { RunExplorer } from "@/components/run-explorer";
import { PageHeading } from "@/components/ui";
import { canViewRealEvidence, isDemoMode } from "@/lib/demo-mode";
export const metadata: Metadata = { title: "Benchmark runs" };

export default function RunsPage() {
  return (
    <>
      <PageHeading
        eyebrow="THE EVIDENCE TRAIL"
        title="Benchmark runs"
        description="Every attempt, its configuration, and the checks that determined the outcome."
      >
        <span className="small-chip">
          <Activity size={14} />
          12 fixture runs
        </span>
      </PageHeading>
      <div className="info-strip">
        One controlled repository. Independent evaluation. Select a run to
        inspect the complete evidence.
      </div>
      <RunExplorer />
      {canViewRealEvidence() && (
        <div className="paired-runs" style={{ marginTop: 24 }}>
          <div>
            <h2>
              {isDemoMode()
                ? "Recorded real agent runs"
                : "Benchmark verification"}
            </h2>
            <p>
              {isDemoMode()
                ? "Inspect actual provider outcomes, generated patches, and deterministic checks separately from the fixtures above."
                : "Run the real pagination checks in an isolated workspace."}
            </p>
          </div>
          <Link
            className="button secondary"
            href={isDemoMode() ? "/agent" : "/verification"}
          >
            {isDemoMode()
              ? "Open recorded evidence"
              : "Open verification controls"}
          </Link>
        </div>
      )}
    </>
  );
}
