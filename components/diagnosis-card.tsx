import type { Diagnosis } from "@/lib/domain/types";
import { SectionHeading } from "./ui";

export function DiagnosisCard({ diagnoses }: { diagnoses: Diagnosis[] }) {
  return (
    <section className="panel">
      <SectionHeading eyebrow="WHY IT MAY HAVE FAILED" title="Diagnosis" />
      <div className="card-content">
        <div className="hypothesis-note">
          Hypothesis · fixture-authored, not model-generated
        </div>
        {diagnoses.length ? (
          diagnoses.map((diagnosis, index) => (
            <article className="diagnosis" key={diagnosis.classification}>
              <div className="diagnosis-label">
                <span>{index === 0 ? "Primary" : "Secondary"}</span>
                <code>{diagnosis.classification}</code>
              </div>
              <p>{diagnosis.explanation}</p>
              <ul className="evidence-bullets">
                {diagnosis.evidence.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </article>
          ))
        ) : (
          <p className="muted">
            No diagnosis has been authored for this fixture. Passing checks
            alone do not establish a cause or guarantee correctness.
          </p>
        )}
      </div>
    </section>
  );
}
