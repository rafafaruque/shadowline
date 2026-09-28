import { ArrowRight, FilePlus2, ListChecks, RotateCcw } from "lucide-react";
import type { Intervention } from "@/lib/domain/types";
import { SectionHeading } from "./ui";

export function InterventionCard({
  intervention,
}: {
  intervention: Intervention;
}) {
  return (
    <section className="panel intervention">
      <SectionHeading
        eyebrow="A MORE INFORMED NEXT ATTEMPT"
        title="Recommended intervention"
      />
      <div className="card-content">
        <h3>
          <FilePlus2 size={15} />
          Add relevant context
        </h3>
        <div className="file-list">
          {intervention.contextFilesToAdd.map((file) => (
            <code key={file}>{file}</code>
          ))}
        </div>
        <h3>
          <ListChecks size={15} />
          Make acceptance explicit
        </h3>
        {intervention.acceptanceCriteriaToAdd.map((criterion) => (
          <p key={criterion}>{criterion}</p>
        ))}
        <h3>
          <RotateCcw size={15} />
          Require validation
        </h3>
        <div className="tag-list">
          {intervention.validationChecksToRequire.map((check) => (
            <span className="config-tag" key={check}>
              {check.toLowerCase()} tests
            </span>
          ))}
        </div>
        {intervention.taskDecompositionSuggestions.map((suggestion) => (
          <p className="muted" key={suggestion}>
            {suggestion}
          </p>
        ))}
        {intervention.modelChangeSuggestion && (
          <p>Model suggestion: {intervention.modelChangeSuggestion}</p>
        )}
        <p className="intervention-rationale">{intervention.rationale}</p>
        <button
          className="button primary full-width"
          disabled
          aria-describedby="rerun-note"
        >
          Apply intervention &amp; rerun
          <ArrowRight size={16} />
        </button>
        <p className="button-note" id="rerun-note">
          Available in the next phase. No agent execution is connected.
        </p>
      </div>
    </section>
  );
}
