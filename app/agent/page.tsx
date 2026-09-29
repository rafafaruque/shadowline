import Link from "next/link";
import { notFound } from "next/navigation";
import { AgentControl } from "@/components/agent-control";
import { Badge, PageHeading, SectionHeading } from "@/components/ui";
import { configuredModel } from "@/lib/agent/provider";
import { evidenceReaders } from "@/lib/evidence/readers";
import { canViewRealEvidence, isDemoMode } from "@/lib/demo-mode";
import { DemoEvidenceNote } from "@/components/demo-evidence-note";

export const dynamic = "force-dynamic";
export const metadata = { title: "Coding agent" };
export default async function AgentPage() {
  if (!canViewRealEvidence()) notFound();
  const demo = isDemoMode();
  const runs = await (await evidenceReaders()).runs.list();
  const codex = demo
    ? {
        ready: false,
        message: "Local Codex CLI execution is disabled in the hosted demo.",
      }
    : await (await import("@/lib/agent/codex-cli")).codexAvailability();
  const geminiReady = Boolean(process.env.GEMINI_API_KEY?.trim());
  return (
    <div className="benchmark-verification">
      <PageHeading
        eyebrow="PHASE 03 · REAL EXECUTION"
        title="Coding agent"
        description="Inspect what the model knew, what it changed, and whether deterministic checks accepted it."
      />
      <DemoEvidenceNote />
      {demo ? (
        <section className="panel card-content">
          <h2>Recorded coding-agent attempts</h2>
          <p>
            Inspect saved inputs, generated files, provider outcomes, and
            deterministic checks below.
          </p>
          <button className="button secondary" disabled>
            Live coding-agent execution disabled
          </button>
        </section>
      ) : (
        <AgentControl
          providers={[
            {
              id: "gemini",
              name: "Gemini Developer API",
              model: configuredModel("gemini"),
              ready: geminiReady,
              message: geminiReady
                ? "Uses the server-side Gemini API key."
                : "Configure GEMINI_API_KEY in .env.local on the server, then refresh this page.",
            },
            {
              id: "codex-cli",
              name: "Codex CLI",
              model: configuredModel("codex-cli"),
              ...codex,
            },
          ]}
        />
      )}
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
                  {run.provider} / {run.model} · {run.startedAt}
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
