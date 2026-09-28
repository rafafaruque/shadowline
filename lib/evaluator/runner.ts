import { randomUUID } from "node:crypto";
import path from "node:path";
import { performance } from "node:perf_hooks";
import { evaluationResultSchema } from "../domain/schemas";
import { paginationBenchmark } from "./benchmark";
import { checkScope, runCheck } from "./checks";
import {
  benchmarkExecutionSchema,
  benchmarkRequestSchema,
  type CheckRecord,
  type DeterministicEvaluator,
} from "./types";
import { withBenchmarkWorkspace } from "./workspace";

function countAssertions(assertions: CheckRecord["assertions"]) {
  return {
    passed: assertions.filter((item) => item.status === "passed").length,
    failed: assertions.filter((item) => item.status === "failed").length,
    skipped: assertions.filter(
      (item) => item.status !== "passed" && item.status !== "failed",
    ).length,
  };
}

/** Accept unknown at the boundary: extra keys, commands, paths, and unknown IDs are rejected. */
export async function evaluateBenchmark(input: unknown) {
  const { patchId } = benchmarkRequestSchema.parse(input);
  const startedAt = new Date().toISOString();
  const start = performance.now();
  const execution = await withBenchmarkWorkspace(patchId, async (workspace) => {
    const validationStart = performance.now();
    const scopeBefore = await checkScope(workspace);
    const records: CheckRecord[] = [];
    // Sequential and fixed. We retain public/contract evidence even when typecheck fails.
    if (scopeBefore.record.status === "PASSED") {
      for (const check of ["TYPECHECK", "PUBLIC", "CONTRACT"] as const)
        records.push(await runCheck(check, workspace));
    }
    const scope = await checkScope(workspace);
    records.push(scope.record);
    const typecheck = records.find((record) => record.id === "TYPECHECK");
    const publicCheck = records.find((record) => record.id === "PUBLIC");
    const contracts = records.find((record) => record.id === "CONTRACT");
    const publicAssertions = publicCheck?.assertions ?? [];
    const unitAssertions = publicAssertions.filter(
      (assertion) => assertion.file === "public/tests/pagination.test.ts",
    );
    const integrationAssertions = publicAssertions.filter(
      (assertion) => assertion.file !== "public/tests/pagination.test.ts",
    );
    // Critical means an observed legacy API contract regression, never an inference from a process error.
    const criticalFailure =
      contracts?.assertions.some(
        (assertion) =>
          assertion.status === "failed" &&
          assertion.name.includes(paginationBenchmark.criticalAssertionMarker),
      ) ?? false;
    const hasFailure =
      records.some((record) => record.status === "FAILED") ||
      publicAssertions.some((a) => a.status === "failed") ||
      contracts?.assertions.some((a) => a.status === "failed");
    const incomplete =
      records.length !== 4 ||
      records.some(
        (record) => record.status === "ERROR" || record.status === "TIMED_OUT",
      );
    const failureDetails = records.flatMap((record) => [
      ...record.assertions
        .filter((assertion) => assertion.status === "failed")
        .map(
          (assertion) =>
            `${assertion.name}: ${assertion.failureMessages.join("\n")}`,
        ),
      ...(record.status !== "PASSED"
        ? [
            `${record.id}: ${record.reportError ?? record.status}${record.exitCode !== null ? ` (exit ${record.exitCode})` : ""}`,
          ]
        : []),
    ]);
    const evaluation = evaluationResultSchema.parse({
      typecheck:
        typecheck?.status === "PASSED"
          ? "PASSED"
          : typecheck?.status === "FAILED"
            ? "FAILED"
            : "NOT_RUN",
      unitTests: countAssertions(unitAssertions),
      integrationTests: countAssertions(integrationAssertions),
      publicTests: countAssertions(publicAssertions),
      contractTests: countAssertions(contracts?.assertions ?? []),
      forbiddenFilesChanged: scope.forbiddenFilesChanged,
      scopeAdherence: scope.record.status === "PASSED" ? "PASSED" : "FAILED",
      criticalFailure,
      overallResult: hasFailure
        ? "FAILED"
        : incomplete
          ? "REVIEW_REQUIRED"
          : "PASSED",
      checksRun:
        records.length === 4
          ? ["TYPECHECK", "UNIT", "INTEGRATION", "CONTRACT", "SCOPE"]
          : ["SCOPE"],
      failureDetails,
      validationDurationMs: Math.round(performance.now() - validationStart),
      checkRecords: records,
    });
    return {
      id: randomUUID(),
      source: "BENCHMARK_EXECUTION" as const,
      taskId: paginationBenchmark.id,
      patchId,
      purpose:
        patchId === "baseline"
          ? ("BASELINE_READINESS" as const)
          : ("PAGINATION_ACCEPTANCE" as const),
      startedAt,
      baselineFingerprint: workspace.baselineFingerprint,
      patchFingerprint: workspace.patchFingerprint,
      filesChanged: scope.filesChanged,
      workspaceId: path.basename(workspace.root),
      evaluation,
    };
  });
  // Only assert cleanup after the finally block has successfully completed.
  return benchmarkExecutionSchema.parse({
    ...execution,
    durationMs: Math.round(performance.now() - start),
    workspaceCleanedUp: true,
  });
}

export const deterministicEvaluator: DeterministicEvaluator = {
  evaluate: evaluateBenchmark,
};
