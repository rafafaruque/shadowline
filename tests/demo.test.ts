import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";
import bundle from "../data/demo/evidence.json";
import { bundledEvidence } from "../lib/evidence/bundled";
import { evidenceReaders } from "../lib/evidence/readers";
import {
  canExecuteLocally,
  canViewRealEvidence,
  isDemoMode,
} from "../lib/demo-mode";
import { loadEngagementEvidence } from "../lib/engagement/evidence";
import { RunStore } from "../lib/agent/store";
import { POST as agentPost } from "../app/api/agent/route";
import { POST as benchmarkPost } from "../app/api/benchmark/route";
import { POST as experimentPost } from "../app/api/experiments/route";

test("demo gates override development execution; false/unset retains existing local behavior", async () => {
  const previous = {
    NODE_ENV: process.env.NODE_ENV,
    SHADOWLINE_DEMO_MODE: process.env.SHADOWLINE_DEMO_MODE,
  };
  try {
    for (const nodeEnv of ["development", "production"]) {
      Object.assign(process.env, {
        NODE_ENV: nodeEnv,
        SHADOWLINE_DEMO_MODE: "true",
      });
      assert.equal(isDemoMode(), true);
      assert.equal(canViewRealEvidence(), true);
      assert.equal(canExecuteLocally(), false);
      for (const [post, payload] of [
        [
          agentPost,
          {
            taskId: "customers-pagination",
            configId: "baseline",
            providerId: "codex-cli",
          },
        ],
        [benchmarkPost, { patchId: "pagination-compatible" }],
        ...["diagnose", "edit", "approve", "execute"].map(
          (action) => [experimentPost, { action }] as const,
        ),
      ] as const) {
        const request = new Request("http://localhost:3000/api/test", {
          method: "POST",
          headers: {
            origin: "http://localhost:3000",
            host: "localhost:3000",
            "content-type": "application/json",
          },
          body: JSON.stringify(payload),
        });
        const response = await post(request);
        assert.equal(response.status, 403);
        assert.match(
          (await response.json()).error,
          /disabled in the hosted demo/,
        );
        assert.equal(
          request.bodyUsed,
          false,
          "Reject before processing a writable/executable action",
        );
      }
    }
    Object.assign(process.env, {
      NODE_ENV: "development",
      SHADOWLINE_DEMO_MODE: "false",
    });
    assert.equal(canExecuteLocally(), true);
    assert.ok((await evidenceReaders()).runs instanceof RunStore);
    delete process.env.SHADOWLINE_DEMO_MODE;
    assert.equal(isDemoMode(), false);
    assert.equal(canExecuteLocally(), true);
    Object.assign(process.env, { NODE_ENV: "production" });
    assert.equal(canExecuteLocally(), false);
    assert.equal(canViewRealEvidence(), false);
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});

test("bundled real evidence is complete and readable without any local files or writes", async () => {
  const previousDirectory = process.cwd();
  const previousMode = process.env.SHADOWLINE_DEMO_MODE;
  const directory = await mkdtemp(
    path.join(tmpdir(), "shadowline-hosted-test-"),
  );
  try {
    process.chdir(directory);
    process.env.SHADOWLINE_DEMO_MODE = "true";
    const evidence = await loadEngagementEvidence();
    assert.equal(evidence.available, true);
    if (!evidence.available) throw new Error("Missing bundled evidence");
    assert.equal(evidence.matchedControls, true);
    assert.deepEqual(
      [evidence.baseline.status, evidence.after.status],
      ["FAILED", "PASSED"],
    );
    assert.deepEqual(
      [
        evidence.baseline.evaluation?.publicTests,
        evidence.after.evaluation?.publicTests,
      ],
      [
        { passed: 7, failed: 4, skipped: 0 },
        { passed: 11, failed: 0, skipped: 0 },
      ],
    );
    assert.deepEqual(
      [
        evidence.baseline.evaluation?.contractTests,
        evidence.after.evaluation?.contractTests,
      ],
      [
        { passed: 2, failed: 14, skipped: 0 },
        { passed: 16, failed: 0, skipped: 0 },
      ],
    );
    assert.deepEqual(
      [evidence.baseline.durationMs, evidence.after.durationMs],
      [19429, 11187],
    );
    assert.deepEqual(
      [evidence.baseline.tokenUsage?.total, evidence.after.tokenUsage?.total],
      [3720, 4221],
    );
    const readers = await evidenceReaders();
    const records = await readers.runs.list();
    assert.equal(records.length, 8);
    const errors = records.filter(
      (record) => record.status === "PROVIDER_ERROR",
    );
    assert.equal(errors.length, 6);
    assert.ok(
      errors.every(
        (record) =>
          record.firstPassAccepted === null &&
          !record.criticalFailure &&
          !record.requiresHumanReview &&
          record.evaluation === null,
      ),
    );
    assert.equal(await readers.runs.get("../../.env.local"), undefined);
    assert.deepEqual(await readdir(directory), []);
  } finally {
    process.chdir(previousDirectory);
    if (previousMode === undefined) delete process.env.SHADOWLINE_DEMO_MODE;
    else process.env.SHADOWLINE_DEMO_MODE = previousMode;
    await rm(directory, { recursive: true, force: true });
  }
});

test("published copies have verifiable provenance, no local paths, and cannot mutate shared records", async () => {
  assert.doesNotMatch(
    JSON.stringify(bundle),
    /\/Users\/|\/private\/var\/|AIza[\w-]{20,}|sk-[\w-]{20,}|eyJ[\w-]{30,}/,
  );
  for (const entry of bundle.manifest) {
    const records = entry.kind === "runs" ? bundle.runs : bundle.experiments;
    const record = records.find((record) => record.id === entry.id);
    assert.ok(record);
    assert.equal(
      createHash("sha256").update(JSON.stringify(record)).digest("hex"),
      entry.publicRecordSha256,
    );
  }
  assert.equal(
    bundle.experiments[0].baselineRecordSha256,
    bundle.manifest.find(
      (entry) => entry.id === bundle.experiments[0].baselineRunId,
    )?.sourceSha256,
  );
  const first = await bundledEvidence.runs.get(
    bundle.experiments[0].baselineRunId,
  );
  assert.ok(first);
  first.status = "PASSED";
  first.context.files.length = 0;
  const second = await bundledEvidence.runs.get(first.id);
  assert.equal(second?.status, "FAILED");
  assert.ok(second?.context.files.length);
});
