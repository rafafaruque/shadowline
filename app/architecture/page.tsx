import Link from "next/link";
import { PageHeading, SectionHeading } from "@/components/ui";
import { canViewRealEvidence, isDemoMode } from "@/lib/demo-mode";

export const metadata = { title: "Architecture" };

export default function ArchitecturePage() {
  return (
    <div className="benchmark-verification">
      <PageHeading
        eyebrow="ARCHITECTURE · TRUST BOUNDARIES"
        title="AI proposes. Deterministic software verifies."
        description="The hosted product displays evidence. The local runner generates and evaluates it."
      />
      <section className="panel">
        <SectionHeading title="Local experiment → recorded evidence → hosted inspection" />
        <div className="card-content">
          <ol className="architecture-flow">
            <li>
              <strong>Local execution</strong>
              <p>
                Curated context → provider proposal → validated paths → isolated
                workspace → deterministic checks.
              </p>
            </li>
            <li>
              <strong>Saved experiment</strong>
              <p>
                Inputs, generated files, evaluator results, diagnosis
                hypothesis, human approval, and measured telemetry.
              </p>
            </li>
            <li>
              <strong>Read-only hosted demo</strong>
              <p>
                A bundled, reviewed snapshot serves the same real results
                without CLI access, benchmark processes, credentials, or runtime
                file writes.
              </p>
            </li>
          </ol>
        </div>
      </section>
      <section className="panel">
        <SectionHeading title="Existing local boundaries remain intact" />
        <div className="card-content">
          <h3>Generic coding provider</h3>
          <p>
            Gemini and Codex CLI return the same Zod-validated file-proposal
            schema. Providers cannot apply changes directly. The Codex adapter
            disables tools and isolates the process from the benchmark
            repository.
          </p>
          <h3>Deterministic acceptance</h3>
          <p>
            Shadowline owns allowed paths, isolated writes, trusted commands,
            public and hidden contract checks, and critical-failure decisions.
            Hidden evaluation infrastructure stays outside the coding-agent
            prompt and workspace.
          </p>
          <h3>Diagnosis and intervention</h3>
          <p>
            AI diagnosis is a hypothesis. An engineer reviews and explicitly
            approves an intervention before a single controlled rerun. The
            evaluator decides the result; no LLM judge can overwrite it.
          </p>
          <h3>Evidence and review policy</h3>
          <p>
            Provider errors are excluded from coding failures, first-pass
            acceptance, and autonomy evidence. Passing one benchmark does not
            establish general reliability or permit automatic production
            merging.
          </p>
        </div>
      </section>
      <section className="panel">
        <SectionHeading title="Separate data sources, explicit provenance" />
        <div className="card-content">
          <ul>
            <li>
              Dashboard aggregates and fixture run comparisons remain labeled
              illustrative.
            </li>
            <li>
              Real agent runs and the approved Phase 4 experiment retain actual
              recorded outcomes.
            </li>
            <li>
              Northstar business assumptions and ROI remain illustrative,
              separate from measured benchmark evidence.
            </li>
            <li>
              Hosted copies redact local machine paths from logs. Original
              hashes refer to local originals; public-copy hashes are recorded
              in the export manifest.
            </li>
          </ul>
          <p>
            {isDemoMode()
              ? "Current mode: hosted demo. Agent generation, diagnosis, approval, editing, and benchmark execution endpoints are disabled server-side."
              : "Current mode: local. Development execution controls and the original local stores remain available."}
          </p>
          {canViewRealEvidence() && (
            <p>
              <Link className="text-link" href="/experiments/real">
                Inspect the real intervention evidence →
              </Link>
            </p>
          )}
          <p>
            <Link className="text-link" href="/engagement">
              Explore the customer engagement →
            </Link>
          </p>
        </div>
      </section>
    </div>
  );
}
