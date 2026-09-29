import { notFound } from "next/navigation";
import { AgentControl } from "@/components/agent-control";
import { PageHeading } from "@/components/ui";
import { configuredModel } from "@/lib/agent/provider";
import { evidenceReaders } from "@/lib/evidence/readers";
import { canViewRealEvidence, isDemoMode } from "@/lib/demo-mode";
import { RealRunLog } from "@/components/real-run-log";
import { runRows } from "@/lib/presentation/run-rows";

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
        title="Coding agent"
        description="API pagination · one controlled attempt"
      />
      {demo ? (
        <div className="compact-callout">
          <button className="button secondary" disabled>
            Live coding-agent execution disabled
          </button>
        </div>
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
      <RealRunLog rows={runRows(runs)} />
    </div>
  );
}
