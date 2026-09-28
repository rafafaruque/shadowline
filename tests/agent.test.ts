import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";
import { runCodingAgent } from "../lib/agent/coding-agent";
import { applyProposedFiles, PatchValidationError } from "../lib/agent/paths";
import { buildContext } from "../lib/agent/prompt";
import {
  configuredModel,
  geminiProvider,
  ProviderError,
  type ModelProvider,
} from "../lib/agent/provider";
import {
  countsAsCodingAttempt,
  isAutonomyEvidence,
} from "../lib/agent/evidence";
import { agentProposalSchema } from "../lib/agent/schemas";
import { RunStore } from "../lib/agent/store";
import { sandboxProfile } from "../lib/evaluator/sandbox";
import { withAgentWorkspace } from "../lib/evaluator/workspace";

test("baseline context is explicit and contains no hidden tests, conventions, helper, or compatibility criterion", async () => {
  const baseline = await buildContext("baseline", "test-model");
  assert.deepEqual(
    baseline.files.map((file) => file.path),
    [
      "src/app.ts",
      "src/routes/customers.ts",
      "src/data/customers.ts",
      "tests/customers.test.ts",
    ],
  );
  assert.deepEqual(baseline.acceptanceCriteria, []);
  assert.doesNotMatch(
    baseline.userPrompt,
    /hidden-tests|api-conventions|src\/lib\/pagination|Existing callers without pagination/,
  );
  const rich = await buildContext("context-rich", "test-model");
  assert.equal(rich.files.length, 6);
  assert.equal(rich.acceptanceCriteria.length, 1);
  assert.ok(rich.requiredChecks.includes("CONTRACT"));
  for (const context of [baseline, rich]) {
    assert.doesNotMatch(
      context.systemPrompt + context.userPrompt,
      /hidden-tests|critical:legacy-contract/,
    );
    assert.equal(context.promptSha256.length, 64);
  }
});

test("strict proposal schema and batch path checks reject all forbidden writes before applying anything", async () => {
  assert.equal(
    agentProposalSchema.safeParse({
      summary: "x",
      files: [],
      command: "unsafe",
    }).success,
    false,
  );
  await withAgentWorkspace(async (workspace) => {
    const route = "src/routes/customers.ts";
    const original = await readFile(path.join(workspace.source, route), "utf8");
    for (const forbidden of [
      "/tmp/escape",
      "../escape",
      "src/../package.json",
      "src\\routes\\customers.ts",
      "C:\\escape",
      "hidden-tests/x.ts",
      "package.json",
      "package-lock.json",
      "tests/customers.test.ts",
      "src//routes/customers.ts",
      "app/page.tsx",
    ]) {
      await assert.rejects(
        applyProposedFiles(
          [
            { path: route, content: "changed" },
            { path: forbidden, content: "bad" },
          ],
          workspace.source,
        ),
        PatchValidationError,
      );
      assert.equal(
        await readFile(path.join(workspace.source, route), "utf8"),
        original,
      );
    }
    await assert.rejects(
      applyProposedFiles(
        [
          { path: route, content: "a" },
          { path: route, content: "b" },
        ],
        workspace.source,
      ),
      PatchValidationError,
    );
    await rm(path.join(workspace.source, route));
    await symlink(
      path.join(process.cwd(), "benchmark-repo", route),
      path.join(workspace.source, route),
    );
    await assert.rejects(
      applyProposedFiles([{ path: route, content: "bad" }], workspace.source),
      PatchValidationError,
    );
  });
});

test("sandbox denies hidden-test reads, host writes, network, and credential inheritance", async () => {
  await withAgentWorkspace(async (workspace) => {
    const profile = sandboxProfile(
      [workspace.source],
      workspace.source + "/scratch",
    );
    const hostSecret = path.join(workspace.root, "host-secret");
    await writeFile(hostSecret, "private test sentinel");
    const script = `const fs = require('node:fs'); const net = require('node:net');
      for (const file of ${JSON.stringify([path.join(workspace.harness, "hidden/customer-contract.test.ts"), hostSecret])}) {
        try { fs.readFileSync(file); process.exit(21); } catch(e) { if (!['EPERM','EACCES'].includes(e.code)) process.exit(22); }
      }
      try { fs.writeFileSync(${JSON.stringify(path.join(workspace.root, "hidden-report.json"))}, '{}'); process.exit(23); } catch(e) { if (!['EPERM','EACCES'].includes(e.code)) process.exit(24); }
      if (process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY) process.exit(25);
      const socket = net.connect(9, '127.0.0.1'); socket.on('connect', () => process.exit(26));
      socket.on('error', e => { if (!['EPERM','EACCES'].includes(e.code)) process.exit(27); process.stdout.write('denied'); });
    `;
    const probe = spawnSync(
      "/usr/bin/sandbox-exec",
      ["-p", profile, process.execPath, "-e", script],
      {
        cwd: "/",
        env: { PATH: "/usr/bin:/bin", NODE_ENV: "test" },
        encoding: "utf8",
        timeout: 5000,
      },
    );
    assert.equal(probe.status, 0, probe.stderr);
    assert.equal(probe.stdout, "denied");
  });
});

test(
  "real evaluator owns acceptance and review policy with controlled provider outputs; attempts persist without retries",
  { timeout: 120000 },
  async () => {
    const directory = await mkdtemp(
      path.join(tmpdir(), "shadowline-agent-test-"),
    );
    const store = new RunStore(directory);
    let calls = 0;
    let content = await readFile(
      "benchmarks/patches/pagination-breaking/customers.ts",
      "utf8",
    );
    const provider: ModelProvider = {
      id: "test-stub",
      async generate() {
        calls++;
        return {
          text: JSON.stringify({
            summary: "Controlled test output",
            files: [{ path: "src/routes/customers.ts", content }],
          }),
          model: "test-model",
          responseId: null,
          tokenUsage: null,
          error: null,
        };
      },
    };
    try {
      const request = { taskId: "customers-pagination", configId: "baseline" };
      const breaking = await runCodingAgent(request, {
        provider,
        store,
        model: "test-model",
      });
      assert.equal(breaking.status, "FAILED");
      assert.equal(breaking.criticalFailure, true);
      assert.equal(breaking.requiresHumanReview, true);
      assert.equal(breaking.evaluation?.publicTests?.passed, 11);
      assert.equal(breaking.evaluation?.contractTests.failed, 2);
      assert.equal(breaking.workspaceCleanedUp, true);
      assert.equal(breaking.firstPassAccepted, false);
      content = await readFile(
        "benchmarks/patches/pagination-compatible/customers.ts",
        "utf8",
      );
      const compatible = await runCodingAgent(request, {
        provider,
        store,
        model: "test-model",
      });
      assert.equal(compatible.status, "PASSED");
      assert.equal(compatible.requiresHumanReview, false);
      assert.equal(compatible.firstPassAccepted, false);
      assert.equal(compatible.attemptNumber, 2);
      assert.equal(compatible.evaluation?.contractTests.passed, 16);
      assert.equal(calls, 2);
      assert.equal((await store.list()).length, 2);
      assert.deepEqual(await store.get(compatible.id), compatible);
      assert.equal(compatible.estimatedRemediationMinutes, null);
      const rejected = await runCodingAgent(request, {
        store,
        model: "test-model",
        provider: {
          ...provider,
          async generate() {
            return {
              text: JSON.stringify({
                summary: "Invalid",
                files: [{ path: "hidden-tests/x.ts", content: "bad" }],
              }),
              model: "test-model",
              responseId: null,
              tokenUsage: null,
              error: null,
            };
          },
        },
      });
      assert.equal(rejected.status, "FAILED");
      assert.deepEqual(rejected.appliedFiles, []);
      assert.deepEqual(rejected.rejectedPaths, ["hidden-tests/x.ts"]);
      assert.equal(rejected.evaluation, null);
      assert.equal(rejected.requiresHumanReview, true);
      assert.equal(rejected.workspaceCleanedUp, true);
      const invalid = await runCodingAgent(request, {
        store,
        model: "test-model",
        provider: {
          ...provider,
          async generate() {
            return {
              text: "not json",
              model: "test-model",
              responseId: null,
              tokenUsage: null,
              error: null,
            };
          },
        },
      });
      assert.equal(invalid.status, "REVIEW_REQUIRED");
      assert.equal(invalid.firstPassAccepted, null);
      assert.deepEqual(invalid.appliedFiles, []);
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  },
);

test("Gemini sends one server-side structured request, maps usage, and never retries upstream failures", async () => {
  const originalFetch = globalThis.fetch;
  const originalKey = process.env.GEMINI_API_KEY;
  process.env.GEMINI_API_KEY = "unit-test-key";
  let calls = 0;
  try {
    const context = await buildContext("baseline", "gemini-3.7-flash");
    globalThis.fetch = async (url, options) => {
      calls++;
      assert.match(
        String(url),
        /^https:\/\/generativelanguage.googleapis.com\//,
      );
      assert.equal(
        (options?.headers as Record<string, string>)["x-goog-api-key"],
        "unit-test-key",
      );
      const body = JSON.parse(options?.body as string);
      assert.equal(body.contents[0].parts[0].text, context.userPrompt);
      assert.equal(body.systemInstruction.parts[0].text, context.systemPrompt);
      assert.ok(body.generationConfig.responseFormat.text.schema);
      assert.equal(
        body.generationConfig.responseFormat.text.mimeType,
        "APPLICATION_JSON",
      );
      assert.equal(body.tools, undefined);
      return Response.json({
        candidates: [
          { finishReason: "STOP", content: { parts: [{ text: "{}" }] } },
        ],
        modelVersion: "resolved-model",
        usageMetadata: {
          promptTokenCount: 20,
          candidatesTokenCount: 10,
          thoughtsTokenCount: 5,
          totalTokenCount: 35,
        },
      });
    };
    const response = await geminiProvider().generate(context);
    assert.equal(response.model, "resolved-model");
    assert.equal(response.tokenUsage?.output, 15);
    assert.equal(calls, 1);
    for (const status of [429, 500, 503]) {
      const callsBefore: number = calls;
      globalThis.fetch = async () => {
        calls++;
        return new Response("sensitive provider error", { status });
      };
      await assert.rejects(
        geminiProvider().generate(context),
        (error) =>
          error instanceof ProviderError &&
          error.httpStatus === status &&
          !error.message.includes("sensitive"),
      );
      assert.equal(calls, callsBefore + 1);
    }
  } finally {
    globalThis.fetch = originalFetch;
    if (originalKey === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = originalKey;
  }
});

test("Gemini defaults to 3.7 while retaining environment overrides", () => {
  const previous = process.env.SHADOWLINE_MODEL;
  try {
    delete process.env.SHADOWLINE_MODEL;
    assert.equal(configuredModel(), "gemini-3.7-flash");
    process.env.SHADOWLINE_MODEL = "gemini-3.8-flash";
    assert.equal(configuredModel(), "gemini-3.8-flash");
  } finally {
    if (previous === undefined) delete process.env.SHADOWLINE_MODEL;
    else process.env.SHADOWLINE_MODEL = previous;
  }
});

test(
  "provider errors preserve history but cannot consume first-pass acceptance or become autonomy evidence",
  { timeout: 60000 },
  async () => {
    const directory = await mkdtemp(
      path.join(tmpdir(), "shadowline-provider-test-"),
    );
    const store = new RunStore(directory);
    const request = { taskId: "customers-pagination", configId: "baseline" };
    let calls = 0;
    const provider: ModelProvider = {
      id: "test-stub",
      async generate() {
        calls++;
        throw new ProviderError(
          "Gemini returned HTTP 503. No automatic retry was made.",
          503,
        );
      },
    };
    try {
      const outage = await runCodingAgent(request, {
        provider,
        store,
        model: "test-model",
      });
      assert.equal(outage.status, "PROVIDER_ERROR");
      assert.equal(outage.firstPassAccepted, null);
      assert.equal(outage.evaluation, null);
      assert.equal(outage.requiresHumanReview, false);
      assert.equal(outage.workspaceCleanedUp, null);
      assert.deepEqual(outage.appliedFiles, []);
      assert.equal(countsAsCodingAttempt(outage), false);
      assert.equal(isAutonomyEvidence(outage), false);
      assert.equal(calls, 1);
      // A legacy record is classified only when read; its original bytes remain intact.
      await store.save({
        ...outage,
        status: "REVIEW_REQUIRED",
        requiresHumanReview: true,
      });
      const filename = path.join(directory, `${outage.id}.json`);
      const original = await readFile(filename, "utf8");
      assert.equal((await store.get(outage.id))?.status, "PROVIDER_ERROR");
      assert.equal((await store.list())[0].status, "PROVIDER_ERROR");
      assert.equal(await readFile(filename, "utf8"), original);

      const content = await readFile(
        "benchmarks/patches/pagination-compatible/customers.ts",
        "utf8",
      );
      const passed = await runCodingAgent(request, {
        store,
        model: "test-model",
        provider: {
          ...provider,
          async generate() {
            calls++;
            return {
              text: JSON.stringify({
                summary: "Controlled test",
                files: [{ path: "src/routes/customers.ts", content }],
              }),
              model: "test-model",
              responseId: null,
              tokenUsage: null,
              error: null,
            };
          },
        },
      });
      assert.equal(passed.attemptNumber, 2);
      assert.equal(passed.status, "PASSED");
      assert.equal(passed.firstPassAccepted, true);
      assert.equal(isAutonomyEvidence(passed), true);
      assert.equal(
        (await store.list()).filter(countsAsCodingAttempt).length,
        1,
      );
      assert.equal(calls, 2);
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  },
);
