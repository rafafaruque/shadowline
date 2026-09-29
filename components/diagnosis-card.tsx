import type { Diagnosis } from "@/lib/domain/types";
import { SectionHeading } from "./ui";

export function DiagnosisCard({ diagnoses }: { diagnoses: Diagnosis[] }) {
  return (
    <section className="panel">
      <SectionHeading title="Diagnosis" />
      <div className="card-content">
        <div className="hypothesis-note">Illustrative hypothesis</div>
        {diagnoses.length ? (
          diagnoses.map((diagnosis, index) => (
            <article className="diagnosis" key={diagnosis.classification}>
              <div className="diagnosis-label">
                <span>{index === 0 ? "Primary" : "Secondary"}</span>
                <code>{diagnosis.classification}</code>
              </div>
              <p>{diagnosis.explanation}</p>
              <details className="inline-details">
                <summary>Supporting evidence</summary>
                <ul className="evidence-bullets">
                  {diagnosis.evidence.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </details>
            </article>
          ))
        ) : (
          <p className="muted">No diagnosis recorded.</p>
        )}
      </div>
    </section>
  );
}
