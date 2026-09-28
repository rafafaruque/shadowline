import { Check, CircleAlert, X } from "lucide-react";
import type { EvaluationResult } from "@/lib/domain/types";
import { SectionHeading } from "./ui";

export function RunResultSummary({ result }: { result: EvaluationResult }) {
  const rows = [
    {
      label: "Typecheck",
      value:
        result.typecheck === "NOT_RUN"
          ? "Not run"
          : result.typecheck === "PASSED"
            ? "Passed"
            : "Failed",
      state: result.typecheck,
    },
    ...(
      [
        ["Unit tests", result.unitTests],
        ["Integration tests", result.integrationTests],
        ["Contract tests", result.contractTests],
      ] as const
    ).map(([label, suite]) => ({
      label,
      value: `${suite.passed}/${suite.passed + suite.failed + suite.skipped}${suite.skipped ? ` · ${suite.skipped} skipped` : ""}`,
      state: suite.failed
        ? "FAILED"
        : suite.skipped || suite.passed === 0
          ? "WARNING"
          : "PASSED",
    })),
    {
      label: "Scope adherence",
      value: result.scopeAdherence.toLowerCase().replaceAll("_", " "),
      state: result.scopeAdherence,
    },
    {
      label: "Forbidden files",
      value: result.forbiddenFilesChanged.length
        ? result.forbiddenFilesChanged.join(", ")
        : "None changed",
      state: result.forbiddenFilesChanged.length ? "FAILED" : "PASSED",
    },
  ];
  return (
    <section className="panel">
      <SectionHeading
        eyebrow="DETERMINISTIC CHECKS"
        title="Evaluation evidence"
      />
      <div className="evidence-list">
        {rows.map(({ label, value, state }) => {
          const Icon =
            state === "PASSED" ? Check : state === "FAILED" ? X : CircleAlert;
          return (
            <div className="evidence-row" key={label}>
              <span>{label}</span>
              <strong
                className={
                  state === "PASSED"
                    ? "text-good"
                    : state === "FAILED"
                      ? "text-bad"
                      : "text-warn"
                }
              >
                {value}
                <Icon size={15} />
              </strong>
            </div>
          );
        })}
      </div>
      <div className="panel-footnote">
        Evaluator-owned checks: {result.checksRun.join(" · ")}
        <br />
        Critical failure:{" "}
        <strong className={result.criticalFailure ? "text-bad" : ""}>
          {result.criticalFailure ? "Yes" : "No"}
        </strong>
      </div>
    </section>
  );
}
