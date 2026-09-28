import assert from "node:assert/strict";
import { before, test } from "node:test";
import { access, realpath, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { evaluateBenchmark } from "../lib/evaluator/runner";
import { checkScope, parseTestReport, runCheck } from "../lib/evaluator/checks";
import {
  snapshotFiles,
  withBenchmarkWorkspace,
} from "../lib/evaluator/workspace";
import type { BenchmarkExecution } from "../lib/evaluator/types";
import { getRun } from "../lib/fixtures/runs";

let baseline: BenchmarkExecution;
let breaking: BenchmarkExecution;
let compatible: BenchmarkExecution;
let originalFiles: Record<string, string>;
before(
  async () => {
    originalFiles = await snapshotFiles(
      path.join(process.cwd(), "benchmark-repo"),
    );
    baseline = await evaluateBenchmark({ patchId: "baseline" });
    breaking = await evaluateBenchmark({ patchId: "pagination-breaking" });
    compatible = await evaluateBenchmark({ patchId: "pagination-compatible" });
  },
  { timeout: 120_000 },
);

test("unchanged baseline passes readiness checks without claiming pagination is implemented", () => {
  assert.equal(baseline.purpose, "BASELINE_READINESS");
  assert.equal(baseline.evaluation.overallResult, "PASSED");
  assert.equal(baseline.evaluation.typecheck, "PASSED");
  assert.deepEqual(baseline.evaluation.publicTests, {
    passed: 7,
    failed: 0,
    skipped: 0,
  });
  assert.deepEqual(baseline.evaluation.unitTests, {
    passed: 4,
    failed: 0,
    skipped: 0,
  });
  assert.deepEqual(baseline.evaluation.contractTests, {
    passed: 1,
    failed: 0,
    skipped: 0,
  });
  assert.deepEqual(baseline.filesChanged, []);
});

test("breaking patch implements pagination but fails exactly the legacy contracts as critical", () => {
  assert.equal(breaking.evaluation.typecheck, "PASSED");
  assert.deepEqual(breaking.evaluation.publicTests, {
    passed: 11,
    failed: 0,
    skipped: 0,
  });
  assert.deepEqual(breaking.evaluation.contractTests, {
    passed: 14,
    failed: 2,
    skipped: 0,
  });
  assert.equal(breaking.evaluation.overallResult, "FAILED");
  assert.equal(breaking.evaluation.criticalFailure, true);
  const failures = breaking.evaluation
    .checkRecords!.flatMap((record) => record.assertions)
    .filter((assertion) => assertion.status === "failed");
  assert.equal(failures.length, 2);
  assert.ok(
    failures.every((assertion) =>
      assertion.name.includes("[critical:legacy-contract]"),
    ),
  );
  assert.equal(
    breaking.evaluation.checkRecords!.find(
      (record) => record.id === "CONTRACT",
    )!.exitCode,
    1,
  );
});

test("compatible patch passes the same public and hidden acceptance checks", () => {
  assert.equal(compatible.purpose, "PAGINATION_ACCEPTANCE");
  assert.equal(compatible.evaluation.typecheck, "PASSED");
  assert.deepEqual(compatible.evaluation.publicTests, {
    passed: 11,
    failed: 0,
    skipped: 0,
  });
  assert.deepEqual(compatible.evaluation.contractTests, {
    passed: 16,
    failed: 0,
    skipped: 0,
  });
  assert.equal(compatible.evaluation.overallResult, "PASSED");
  assert.equal(compatible.evaluation.criticalFailure, false);
  assert.equal(compatible.baselineFingerprint, breaking.baselineFingerprint);
  assert.notEqual(compatible.patchFingerprint, breaking.patchFingerprint);
  assert.deepEqual(compatible.filesChanged, ["src/routes/customers.ts"]);
  for (const [actual, id] of [
    [breaking, "SL-1042"],
    [compatible, "SL-1043"],
  ] as const) {
    const fixture = getRun(id)!.evaluation!;
    for (const key of [
      "unitTests",
      "integrationTests",
      "contractTests",
      "criticalFailure",
      "scopeAdherence",
      "overallResult",
    ] as const)
      assert.deepEqual(actual.evaluation[key], fixture[key]);
  }
});

test("real runs always remove their isolated workspaces and leave the source repository unchanged", async () => {
  const temporaryRoot = await realpath(tmpdir());
  for (const run of [baseline, breaking, compatible]) {
    assert.equal(run.workspaceCleanedUp, true);
    await assert.rejects(access(path.join(temporaryRoot, run.workspaceId)));
    assert.ok(run.durationMs > 0);
    assert.ok(
      run.evaluation.checkRecords!.every(
        (record) =>
          typeof record.stdout === "string" &&
          typeof record.stderr === "string",
      ),
    );
  }
  assert.deepEqual(
    await snapshotFiles(path.join(process.cwd(), "benchmark-repo")),
    originalFiles,
  );
});

test("arbitrary commands, extra keys, and path-like patch IDs cannot enter the evaluator", async () => {
  for (const payload of [
    { patchId: "pagination-compatible", command: "touch /tmp/not-permitted" },
    { patchId: "pagination-compatible", args: ["--passWithNoTests"] },
    { patchId: "../../outside" },
    { patchId: "baseline; echo wrong" },
    { patchId: "baseline", workspacePath: "/tmp" },
    null,
  ]) {
    await assert.rejects(evaluateBenchmark(payload));
  }
});

test("hidden checks stay outside editable source; scope violations are detected and exceptions still clean up", async () => {
  let temporaryRoot = "";
  await assert.rejects(
    withBenchmarkWorkspace("baseline", async (workspace) => {
      temporaryRoot = workspace.root;
      await assert.rejects(access(path.join(workspace.source, "hidden-tests")));
      await access(
        path.join(workspace.harness, "hidden/customer-contract.test.ts"),
      );
      await writeFile(path.join(workspace.source, "package.json"), "{}");
      const scope = await checkScope(workspace);
      assert.equal(scope.record.status, "FAILED");
      assert.deepEqual(scope.forbiddenFilesChanged, ["package.json"]);
      // Reject unrecognized check IDs at runtime as well as at the TypeScript boundary.
      await assert.rejects(
        // @ts-expect-error Deliberately exercising an invalid external value.
        runCheck("echo unsafe", workspace),
        /not allowlisted/,
      );
      throw new Error("Deliberate callback failure");
    }),
    /Deliberate callback failure/,
  );
  assert.ok(temporaryRoot);
  await assert.rejects(access(temporaryRoot));
});

test("empty or inconsistent test reports cannot create a passing evaluation", () => {
  assert.throws(() => parseTestReport({}, 11, "/trusted"));
  assert.throws(
    () =>
      parseTestReport(
        {
          numTotalTests: 0,
          numPassedTests: 0,
          numFailedTests: 0,
          success: true,
          testResults: [],
        },
        11,
        "/trusted",
      ),
    /Expected 11/,
  );
});
