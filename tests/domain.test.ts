import assert from "node:assert/strict";
import { test } from "node:test";
import { evaluationResultSchema, runSchema } from "../lib/domain/schemas";
import { runs, getRun, getRunMetrics } from "../lib/fixtures/runs";
import { getConfig, getTask } from "../lib/fixtures/tasks";
import { experiment } from "../lib/fixtures/experiments";

test("every run has valid, independently inspectable references and evidence", () => {
  assert.equal(new Set(runs.map((run) => run.id)).size, runs.length);
  for (const run of runs) {
    const task = getTask(run.taskId);
    assert.ok(getConfig(run.configId));
    assert.ok(run.evaluation);
    assert.equal(run.status, run.evaluation.overallResult);
    assert.deepEqual(
      [...run.evaluation.checksRun].sort(),
      [...task.requiredChecks].sort(),
    );
    for (const file of run.filesChanged)
      assert.ok(
        task.allowedFiles.includes(file) ||
          run.evaluation.forbiddenFilesChanged.includes(file),
      );
  }
});

test("pagination pair preserves task identity, exposes contract failure, and adds the missing intervention", () => {
  const baseline = getRun(experiment.baselineRunId)!;
  const improved = getRun(experiment.improvedRunId)!;
  assert.equal(baseline.taskId, improved.taskId);
  assert.equal(baseline.evaluation?.unitTests.failed, 0);
  assert.equal(baseline.evaluation?.contractTests.failed, 2);
  assert.equal(baseline.status, "FAILED");
  assert.equal(improved.status, "PASSED");
  assert.equal(improved.attempt, 2);
  const config = getConfig(improved.configId);
  for (const file of baseline.intervention!.contextFilesToAdd)
    assert.ok(config.contextFiles.includes(file));
  for (const check of baseline.intervention!.validationChecksToRequire)
    assert.ok(config.requiredChecks.includes(check));
});

test("dashboard denominators exclude reruns from first-pass results and include failed attempt costs", () => {
  const metrics = getRunMetrics();
  assert.equal(metrics.firstAttempts, 11);
  assert.equal(metrics.firstPassCount, 6);
  assert.equal(metrics.regressions, 3);
  assert.equal(metrics.reviews, 5);
  assert.equal(metrics.successfulTasks, 7);
  assert.ok(Math.abs(metrics.totalCost - 1.7) < 0.000001);
});

test("known failures cannot be relabeled as passing and terminal runs require evidence", () => {
  const failed = getRun("SL-1042")!;
  assert.equal(
    evaluationResultSchema.safeParse({
      ...failed.evaluation,
      overallResult: "PASSED",
    }).success,
    false,
  );
  assert.equal(
    runSchema.safeParse({ ...failed, evaluation: undefined }).success,
    false,
  );
  assert.equal(
    runSchema.safeParse({ ...failed, status: "PASSED" }).success,
    false,
  );
  const passed = getRun("SL-1041")!.evaluation!;
  assert.equal(
    evaluationResultSchema.safeParse({ ...passed, criticalFailure: true })
      .success,
    false,
  );
  assert.equal(
    evaluationResultSchema.safeParse({
      ...passed,
      forbiddenFilesChanged: ["package.json"],
    }).success,
    false,
  );
  assert.equal(
    evaluationResultSchema.safeParse({
      ...passed,
      unitTests: { passed: 1, failed: 0, skipped: 1 },
    }).success,
    false,
  );
});
