import { autonomyRecommendations } from "@/lib/fixtures/experiments";
import { categoryLabels, percent } from "@/lib/format";
import { Badge, SectionHeading } from "./ui";

export function AutonomyMap() {
  return (
    <section className="panel" id="autonomy">
      <SectionHeading title="Illustrative workflow policy">
        <span className="small-chip">Fixture-based</span>
      </SectionHeading>
      <div className="autonomy-header">
        <span>Task category</span>
        <span>Reliability</span>
        <span>Level</span>
      </div>
      {autonomyRecommendations.map((item) => (
        <details className="autonomy-row" key={item.category}>
          <summary>
            <span>{categoryLabels[item.category]}</span>
            <span className="reliability">
              <span className="mini-track">
                <span
                  style={{
                    width: percent(item.evidence.historicalReliability),
                  }}
                />
              </span>
              <span className="mono">
                {percent(item.evidence.historicalReliability)}
              </span>
            </span>
            <Badge value={item.level} />
          </summary>
          <div className="autonomy-evidence">
            <p>{item.reasons.join(" ")}</p>
            <span>
              {item.evidence.sampleSize} observations ·{" "}
              {percent(item.evidence.deterministicVerificationCoverage)}{" "}
              verification coverage · {item.evidence.criticalFailureCount}{" "}
              critical failures · {item.evidence.riskLevel.toLowerCase()} risk
            </span>
          </div>
        </details>
      ))}
    </section>
  );
}
