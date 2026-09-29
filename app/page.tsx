import Link from "next/link";
import { Badge, PageHeading, SectionHeading } from "@/components/ui";
import { loadEngagementEvidence } from "@/lib/engagement/evidence";
import { canViewRealEvidence } from "@/lib/demo-mode";

export default async function ProductHome() {
  const evidence = await loadEngagementEvidence();
  const inspect = canViewRealEvidence();
  const counts = (suite?: {
    passed: number;
    failed: number;
    skipped: number;
  }) =>
    suite
      ? `${suite.passed}/${suite.passed + suite.failed + suite.skipped}`
      : "Not evaluated";
  return (
    <div className="workspace-stack">
      <PageHeading
        title="Shadowline"
        description="Test and improve coding-agent workflows."
      >
        {inspect && (
          <Link className="button primary" href="/experiments/new">
            Start experiment
          </Link>
        )}
      </PageHeading>
      <section className="panel" aria-label="Recent experiment">
        <SectionHeading title="Recent experiment" />
        {evidence.available ? (
          <div className="card-content activity-row">
            <div>
              <strong>API pagination</strong>
              <p className="muted">Context-rich</p>
            </div>
            <div>
              <Badge value={evidence.after.status} />
              <p className="muted">
                {counts(evidence.after.evaluation?.publicTests)} public ·{" "}
                {counts(evidence.after.evaluation?.contractTests)} contract
              </p>
            </div>
            {inspect && (
              <Link
                className="button secondary"
                href={`/experiments/real/${evidence.experiment.id}`}
              >
                View experiment →
              </Link>
            )}
          </div>
        ) : (
          <p className="card-content muted">No saved experiment available.</p>
        )}
      </section>
      <section className="panel" aria-label="Recent runs">
        <SectionHeading title="Recent runs">
          <Link className="text-link" href="/runs">
            All runs →
          </Link>
        </SectionHeading>
        {evidence.available ? (
          <ul className="recent-run-list" aria-label="Recent real runs">
            {[evidence.baseline, evidence.after].map((run) => (
              <li key={run.id}>
                <div>
                  {inspect ? (
                    <Link
                      className="run-task-link"
                      href={`/agent/runs/${run.id}`}
                    >
                      API pagination ·{" "}
                      {run.configId === "baseline"
                        ? "Baseline"
                        : "Context-rich"}
                    </Link>
                  ) : (
                    <strong>
                      API pagination ·{" "}
                      {run.configId === "baseline"
                        ? "Baseline"
                        : "Context-rich"}
                    </strong>
                  )}
                  <p className="muted">
                    {run.provider === "codex-cli" ? "Codex" : run.provider} /{" "}
                    {(run.resolvedModel ?? run.model) === "gpt-6-astra"
                      ? "GPT-6 Astra"
                      : (run.resolvedModel ?? run.model)}
                  </p>
                </div>
                <Badge value={run.status} />
              </li>
            ))}
          </ul>
        ) : (
          <p className="card-content muted">
            No saved experiment runs available.
          </p>
        )}
      </section>
    </div>
  );
}
