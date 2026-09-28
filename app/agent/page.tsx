import Link from "next/link";
import { notFound } from "next/navigation";
import { AgentControl } from "@/components/agent-control";
import { Badge, PageHeading, SectionHeading } from "@/components/ui";
import { configuredModel } from "@/lib/agent/provider";
import { RunStore } from "@/lib/agent/store";

export const dynamic = "force-dynamic";
export const metadata = { title: "Coding agent" };
export default async function AgentPage() {
  if (process.env.NODE_ENV !== "development") notFound();
  const runs = await new RunStore().list();
  return (
    <div className="benchmark-verification">
      <PageHeading
        eyebrow="PHASE 03 · REAL EXECUTION"
        title="Coding agent"
        description="Inspect what the model knew, what it changed, and whether deterministic checks accepted it."
      />
      <AgentControl
        model={configuredModel()}
        keyConfigured={Boolean(process.env.GEMINI_API_KEY?.trim())}
      />
      <section className="panel">
        <SectionHeading title="Real agent runs" />
        <div className="card-content">
          {runs.length ? (
            runs.map((run) => (
              <div className="evidence-row" key={run.id}>
                <Link href={`/agent/runs/${run.id}`}>
                  <strong>
                    {run.configId} · attempt {run.attemptNumber}
                  </strong>
                  <br />
                  {run.model} · {run.startedAt}
                </Link>
                <Badge value={run.status} />
              </div>
            ))
          ) : (
            <p>No real attempts recorded yet.</p>
          )}
        </div>
      </section>
    </div>
  );
}
