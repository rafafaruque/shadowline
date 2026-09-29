import { PageHeading, SectionHeading } from "@/components/ui";
import { isDemoMode } from "@/lib/demo-mode";
export const metadata = { title: "Architecture" };
const boundaries = [
  [
    "Provider abstraction",
    [
      "Gemini / Codex CLI → same validated proposal schema",
      "No direct benchmark writes; Codex tools disabled",
    ],
  ],
  [
    "Deterministic evaluator",
    [
      "Allowlisted paths and commands",
      "Typecheck, public, integration, contract, scope checks",
    ],
  ],
  [
    "Hidden test isolation",
    [
      "Outside coding-agent context and editable workspace",
      "Trusted harness owns contract assertions",
    ],
  ],
  [
    "Human approval",
    [
      "Diagnosis is a hypothesis, never a verdict",
      "One approved intervention → one controlled attempt",
    ],
  ],
];
export default function ArchitecturePage() {
  return (
    <div className="workspace-stack">
      <PageHeading
        title="Architecture"
        description="AI proposes. Deterministic software verifies."
      />
      <section className="panel">
        <SectionHeading title="Execution boundary" />
        <div className="card-content">
          <ol className="workflow-flow" aria-label="Architecture flow">
            {[
              "Curated context",
              "Provider proposal",
              "Path validation",
              "Isolated patch",
              "Deterministic checks",
              "Saved evidence",
            ].map((label, index) => (
              <li key={label}>
                <span>{index + 1}</span>
                {label}
              </li>
            ))}
          </ol>
          <p className="muted">
            AI proposes structured contents. Shadowline applies and evaluates
            them.
          </p>
        </div>
      </section>
      <div className="workspace-grid">
        {boundaries.map(([title, items]) => (
          <section className="panel" key={title as string}>
            <SectionHeading title={title as string} />
            <ul className="card-content compact-list">
              {(items as string[]).map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>
        ))}
      </div>
      <section className="panel">
        <SectionHeading title="Local vs hosted">
          <span className="config-tag">
            Current: {isDemoMode() ? "Recorded demo" : "Local"}
          </span>
        </SectionHeading>
        <div className="table-scroll">
          <table className="operational-table">
            <thead>
              <tr>
                <th>Boundary</th>
                <th>Local development</th>
                <th>Hosted demo</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <th>Evidence</th>
                <td>Local saved records</td>
                <td>Bundled, read-only snapshot</td>
              </tr>
              <tr>
                <th>Agent / benchmark execution</th>
                <td>Isolated local processes</td>
                <td>Disabled server-side</td>
              </tr>
              <tr>
                <th>Intervention edits / approval</th>
                <td>Explicit engineer actions</td>
                <td>Recorded only</td>
              </tr>
              <tr>
                <th>Filesystem</th>
                <td>Local stores + temporary workspace</td>
                <td>No application writes</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
      <details className="panel disclosure">
        <summary>Evidence provenance</summary>
        <ul className="card-content compact-list">
          <li>
            Real records: measured results, proposals, diagnosis, and approval.
          </li>
          <li>
            Fixture runs and cohort policies: illustrative, labeled separately.
          </li>
          <li>Northstar ROI: customer assumptions, not measured savings.</li>
          <li>
            Provider errors: excluded from coding failures and acceptance rates.
          </li>
          <li>
            Hosted copies: local paths redacted; original hashes retained.
          </li>
        </ul>
      </details>
    </div>
  );
}
