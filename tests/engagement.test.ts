import assert from "node:assert/strict";
import { mkdtemp, readdir, rm, writeFile, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";
import { RunStore } from "../lib/agent/store";
import { ExperimentStore } from "../lib/experiments/store";
import {
  engagementExperimentId,
  loadEngagementEvidence,
} from "../lib/engagement/evidence";

test("engagement without local records reports unavailable without creating records or substituting fixtures", async () => {
  const directory = await mkdtemp(
    path.join(tmpdir(), "shadowline-engagement-"),
  );
  try {
    const result = await loadEngagementEvidence(
      new ExperimentStore(path.join(directory, "experiments")),
      new RunStore(path.join(directory, "runs")),
    );
    assert.deepEqual(result, { available: false });
    assert.deepEqual(await readdir(directory), []);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("engagement rejects invalid saved evidence instead of treating it as a measured success", async () => {
  const directory = await mkdtemp(
    path.join(tmpdir(), "shadowline-engagement-"),
  );
  try {
    const experiments = path.join(directory, "experiments");
    await mkdir(experiments);
    await writeFile(
      path.join(experiments, `${engagementExperimentId}.json`),
      JSON.stringify({ status: "COMPLETE" }),
    );
    await assert.rejects(
      loadEngagementEvidence(
        new ExperimentStore(experiments),
        new RunStore(path.join(directory, "runs")),
      ),
    );
    assert.deepEqual(await readdir(directory), ["experiments"]);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
