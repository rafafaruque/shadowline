"use client";

import { useState } from "react";
import { Play, Terminal } from "lucide-react";
import {
  benchmarkExecutionSchema,
  type BenchmarkExecution,
  type PatchId,
} from "@/lib/evaluator/types";
import { Badge, SectionHeading } from "./ui";

const patches: { id: PatchId; title: string; description: string }[] = [
  {
    id: "baseline",
    title: "Verify baseline",
    description:
      "Existing repository readiness; pagination is not implemented yet.",
  },
  {
    id: "pagination-breaking",
    title: "Evaluate breaking patch",
    description:
      "Working pagination that also wraps responses for existing callers.",
  },
  {
    id: "pagination-compatible",
    title: "Evaluate compatible patch",
    description:
      "Opt-in pagination that preserves the original Customer[] response.",
  },
];

export function BenchmarkVerification() {
  const [running, setRunning] = useState<PatchId | null>(null);
  const [result, setResult] = useState<BenchmarkExecution | null>(null);
  const [error, setError] = useState("");
  async function evaluate(patchId: PatchId) {
    setRunning(patchId);
    setError("");
    setResult(null);
    try {
      const response = await fetch("/api/benchmark", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patchId }),
      });
      const payload: unknown = await response.json();
      if (!response.ok) {
        const message =
          typeof payload === "object" &&
          payload !== null &&
          "error" in payload &&
          typeof payload.error === "string"
            ? payload.error
            : "The evaluation request failed.";
        throw new Error(message);
      }
      setResult(benchmarkExecutionSchema.parse(payload));
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Unable to run benchmark.",
      );
    } finally {
      setRunning(null);
    }
  }
  return (
    <div className="benchmark-verification">
      <div className="info-strip">
        These controls execute real checks. Dashboard metrics, historical runs,
        and experiment aggregates remain illustrative fixtures. Results below
        are temporary and are not added to those datasets.
      </div>
      <section className="panel">
        <SectionHeading title="Controlled patch fixtures">
          <span className="small-chip">No coding agent connected</span>
        </SectionHeading>
        <div className="benchmark-actions">
          {patches.map((patch) => (
            <div key={patch.id}>
              <button
                className="button secondary"
                disabled={running !== null}
                onClick={() => evaluate(patch.id)}
              >
                <Play size={13} />
                {patch.title}
              </button>
              <p>{patch.description}</p>
            </div>
          ))}
        </div>
      </section>
      <div role="status" aria-live="polite" className="benchmark-status">
        {running
          ? `Running ${running}: preparing workspace, typechecking, testing, and cleaning up…`
          : result
            ? `Completed ${result.patchId}: ${result.evaluation.overallResult}.`
            : "Ready. Each evaluation starts from an unchanged copy of the baseline."}
      </div>
      {error && (
        <div role="alert" className="failure-detail">
          <h2>Evaluation could not complete</h2>
          <p>{error}</p>
          <p>No result has been inferred. Resolve the error and retry.</p>
        </div>
      )}
      {result && <ExecutionResult result={result} />}
    </div>
  );
}

function ExecutionResult({ result }: { result: BenchmarkExecution }) {
  const evidence = result.evaluation;
  const publicTests = evidence.publicTests!;
  const contracts = evidence.contractTests;
  const tests = (suite: typeof contracts) =>
    `${suite.passed} passed / ${suite.failed} failed${suite.skipped ? ` / ${suite.skipped} skipped` : ""}`;
  return (
    <section className="panel" aria-label="Actual benchmark result">
      <SectionHeading
        eyebrow="ACTUAL BENCHMARK EXECUTION"
        title={result.patchId}
      >
        <Badge value={evidence.overallResult} />
      </SectionHeading>
      <div className="card-content">
        <p>
          {result.purpose === "BASELINE_READINESS"
            ? "Baseline readiness only. This does not claim that the pagination task is complete."
            : "Pagination acceptance: existing behavior plus opt-in pagination contracts."}
        </p>
        <dl className="benchmark-evidence">
          <dt>Typecheck</dt>
          <dd>{evidence.typecheck}</dd>
          <dt>Public tests</dt>
          <dd>{tests(publicTests)}</dd>
          <dt>Contract tests</dt>
          <dd>{tests(contracts)}</dd>
          <dt>Critical failure</dt>
          <dd className={evidence.criticalFailure ? "text-bad" : "text-good"}>
            {evidence.criticalFailure
              ? "YES — existing API contract broken"
              : "NO"}
          </dd>
          <dt>Scope</dt>
          <dd>{evidence.scopeAdherence}</dd>
          <dt>Validation duration</dt>
          <dd>{evidence.validationDurationMs} ms</dd>
          <dt>Total duration</dt>
          <dd>{result.durationMs} ms</dd>
          <dt>Workspace</dt>
          <dd>Cleaned up</dd>
          <dt>Changed files</dt>
          <dd>{result.filesChanged.join(", ") || "None (baseline)"}</dd>
        </dl>
        <details className="inline-details">
          <summary>Execution identity and reproducibility</summary>
          <dl className="config-details">
            <dt>Execution ID / UTC start</dt>
            <dd>
              {result.id} · {result.startedAt}
            </dd>
            <dt>Baseline SHA-256</dt>
            <dd className="benchmark-hash">{result.baselineFingerprint}</dd>
            <dt>Patch SHA-256</dt>
            <dd className="benchmark-hash">
              {result.patchFingerprint ?? "No patch"}
            </dd>
          </dl>
        </details>
        <h3>
          <Terminal size={15} />
          Individual checks and captured output
        </h3>
        {evidence.checkRecords?.map((check) => (
          <details className="benchmark-check" key={check.id}>
            <summary>
              <strong>{check.id}</strong>
              <span>
                {check.status} · {check.durationMs} ms ·{" "}
                {check.exitCode === null
                  ? "no process exit"
                  : `exit ${check.exitCode}`}
              </span>
            </summary>
            <p className="mono">{check.command}</p>
            {check.reportError && (
              <p className="text-bad">{check.reportError}</p>
            )}
            {check.assertions.length > 0 && (
              <ul className="benchmark-assertions">
                {check.assertions.map((assertion) => (
                  <li key={`${assertion.file}:${assertion.name}`}>
                    <strong
                      className={
                        assertion.status === "failed" ? "text-bad" : "text-good"
                      }
                    >
                      {assertion.status}
                    </strong>{" "}
                    {assertion.name}
                    {assertion.failureMessages.length > 0 && (
                      <pre className="benchmark-log">
                        {assertion.failureMessages.join("\n")}
                      </pre>
                    )}
                  </li>
                ))}
              </ul>
            )}
            <h3>stdout</h3>
            <pre className="benchmark-log">{check.stdout || "(empty)"}</pre>
            <h3>stderr</h3>
            <pre className="benchmark-log">{check.stderr || "(empty)"}</pre>
            {check.outputTruncated && (
              <p>Output limit reached; this check is incomplete.</p>
            )}
          </details>
        ))}
      </div>
    </section>
  );
}
