import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  chmod,
  mkdtemp,
  readFile,
  readdir,
  rm,
  writeFile,
  access,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";
import {
  codexCliProvider,
  codexConfigOverrides,
  codexSandboxProfile,
  parseCodexEvents,
  withCodexSession,
} from "../lib/agent/codex-cli";
import { buildContext } from "../lib/agent/prompt";
import { configuredModel, ProviderError } from "../lib/agent/provider";
import { agentRequestSchema } from "../lib/agent/schemas";
import { runCodingAgent } from "../lib/agent/coding-agent";
import { RunStore } from "../lib/agent/store";

test("provider selection is strict and preserves the Gemini default", () => {
  const input = { taskId: "customers-pagination", configId: "baseline" };
  assert.equal(agentRequestSchema.parse(input).providerId, "gemini");
  assert.equal(
    agentRequestSchema.parse({ ...input, providerId: "codex-cli" }).providerId,
    "codex-cli",
  );
  for (const extra of [
    { providerId: "unknown" },
    { binary: "/tmp/bad" },
    { model: "other" },
    { args: ["--dangerously-bypass-approvals-and-sandbox"] },
  ]) {
    assert.equal(
      agentRequestSchema.safeParse({ ...input, ...extra }).success,
      false,
    );
  }
  assert.equal(
    configuredModel("codex-cli"),
    process.env.SHADOWLINE_CODEX_MODEL?.trim() || "gpt-6-astra",
  );
  assert.ok(
    codexConfigOverrides.includes(
      "model_providers.shadowline.request_max_retries=0",
    ),
  );
  assert.ok(
    codexConfigOverrides.includes(
      "model_providers.shadowline.stream_max_retries=0",
    ),
  );
});

test("Codex event evidence requires one completed turn and rejects tools and transport errors", () => {
  const events = [
    { type: "thread.started", thread_id: "test-thread" },
    {
      type: "item.completed",
      item: {
        type: "error",
        message: "Code Mode is unavailable because code-mode host is disabled.",
      },
    },
    { type: "item.completed", item: { type: "agent_message", text: "{}" } },
    {
      type: "turn.completed",
      usage: { input_tokens: 100, cached_input_tokens: 20, output_tokens: 30 },
    },
  ];
  const output = events.map((event) => JSON.stringify(event)).join("\n");
  assert.deepEqual(parseCodexEvents(output), {
    responseId: "test-thread",
    tokenUsage: { input: 100, cachedInput: 20, output: 30, total: 130 },
  });
  for (const bad of [
    "",
    '{"type":"turn.failed"}',
    '{"type":"error"}',
    '{"type":"item.completed","item":{"type":"error","message":"Startup warning"}}',
    '{"type":"item.started","item":{"type":"command_execution"}}',
    output + '\n{"type":"turn.completed"}',
  ]) {
    assert.throws(() => parseCodexEvents(bad), ProviderError);
  }
});

test("Codex staging isolates auth/config, hides the repository, and cleans up after failure", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "shadowline-cli-test-"));
  const authPath = path.join(directory, "auth.json");
  await writeFile(authPath, '{"test":"not-a-real-credential"}');
  let removedRoot = "";
  try {
    await assert.rejects(
      withCodexSession(
        await buildContext("baseline", "test-model"),
        async (session) => {
          removedRoot = session.root;
          assert.deepEqual(await readdir(session.cwd), []);
          assert.equal(session.env.GEMINI_API_KEY, undefined);
          assert.equal(session.env.OPENAI_API_KEY, undefined);
          assert.equal(session.env.NODE_OPTIONS, undefined);
          assert.notEqual(session.env.HOME, process.env.HOME);
          assert.ok(session.args.includes("--ignore-user-config"));
          assert.ok(session.args.includes("--ignore-rules"));
          assert.ok(session.args.includes("--ephemeral"));
          assert.ok(session.args.includes("read-only"));
          const script = `const fs=require('node:fs'); for (const p of ${JSON.stringify([path.join(process.cwd(), "benchmark-repo/hidden-tests/customer-contract.test.ts"), path.join(process.cwd(), "lib/evaluator/runner.ts"), path.join(process.cwd(), "benchmark-repo/src/routes/customers.ts")])}) { try {fs.readFileSync(p);process.exit(20)}catch(e){if(!['EPERM','EACCES'].includes(e.code))process.exit(21)} } try {fs.writeFileSync(${JSON.stringify(path.join(process.cwd(), "benchmark-repo/src/routes/customers.ts"))},'blocked');process.exit(22)}catch(e){if(!['EPERM','EACCES'].includes(e.code))process.exit(23)} process.stdout.write('isolated');`;
          const probe = spawnSync(
            "/usr/bin/sandbox-exec",
            [
              "-p",
              codexSandboxProfile(session.root, process.execPath),
              process.execPath,
              "-e",
              script,
            ],
            {
              cwd: session.cwd,
              env: session.env,
              encoding: "utf8",
              timeout: 5000,
            },
          );
          assert.equal(probe.status, 0, probe.stderr);
          assert.equal(probe.stdout, "isolated");
          throw new Error("test cleanup");
        },
        { binary: process.execPath, authPath },
      ),
      /test cleanup/,
    );
    await assert.rejects(access(removedRoot));
    assert.equal(
      await readFile(authPath, "utf8"),
      '{"test":"not-a-real-credential"}',
    );
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test(
  "CLI adapter transports only the selected prompt and feeds proposals into the unchanged evaluator",
  { timeout: 60000 },
  async () => {
    const directory = await mkdtemp(
      path.join(tmpdir(), "shadowline-cli-stub-"),
    );
    const binary = path.join(directory, "codex-stub");
    const authPath = path.join(directory, "auth.json");
    const store = new RunStore(path.join(directory, "runs"));
    const content = await readFile(
      "benchmarks/patches/pagination-compatible/customers.ts",
      "utf8",
    );
    const proposal = {
      summary: "Controlled CLI test output",
      files: [{ path: "src/routes/customers.ts", content }],
    };
    const context = await buildContext("baseline", "test-model");
    const setup = `#!${process.execPath}
const fs=require('node:fs'); const args=process.argv.slice(2);
if(args[0]==='--version'){console.log('codex-cli test');process.exit(0)}
if(args[0]!=='exec'||!args.includes('--output-schema')||!args.includes('--ignore-user-config'))process.exit(3);
const prompt=fs.readFileSync(0,'utf8'); if(prompt!==${JSON.stringify(context.userPrompt)})process.exit(4);
const schema=JSON.parse(fs.readFileSync(args[args.indexOf('--output-schema')+1],'utf8'));if(schema.additionalProperties!==false)process.exit(5);
`;
    try {
      await writeFile(authPath, "{}");
      await writeFile(
        binary,
        setup +
          `fs.writeFileSync(args[args.indexOf('--output-last-message')+1], ${JSON.stringify(JSON.stringify(proposal))});
console.log(JSON.stringify({type:'thread.started',thread_id:'test-cli'}));
console.log(JSON.stringify({type:'item.completed',item:{type:'error',message:'Code Mode is unavailable because code-mode host is disabled.'}}));
console.log(JSON.stringify({type:'item.completed',item:{type:'agent_message',text:'proposal'}}));
console.log(JSON.stringify({type:'turn.completed',usage:{input_tokens:100,cached_input_tokens:0,output_tokens:50}}));`,
      );
      await chmod(binary, 0o700);
      const provider = codexCliProvider({ binary, authPath });
      const run = await runCodingAgent(
        {
          taskId: "customers-pagination",
          configId: "baseline",
          providerId: "codex-cli",
        },
        { provider, store, model: "test-model" },
      );
      assert.equal(run.provider, "codex-cli");
      assert.equal(run.status, "PASSED", run.errors.join("\n"));
      assert.equal(run.resolvedModel, "test-model");
      assert.equal(run.evaluation?.contractTests.passed, 16);
      assert.equal(run.providerMetadata?.inputCleanedUp, true);
      assert.equal(run.estimatedInferenceCost, null);
      assert.deepEqual(run.appliedFiles, ["src/routes/customers.ts"]);
      assert.equal(run.tokenUsage?.total, 150);
      // A nonzero CLI exit becomes provider error without any evaluator call or retry.
      await writeFile(binary, setup + "process.exit(9);\n");
      const failed = await runCodingAgent(
        {
          taskId: "customers-pagination",
          configId: "baseline",
          providerId: "codex-cli",
        },
        { provider, store, model: "test-model" },
      );
      assert.equal(failed.status, "PROVIDER_ERROR");
      assert.equal(failed.evaluation, null);
      assert.equal(failed.firstPassAccepted, null);
      assert.deepEqual(failed.appliedFiles, []);
      assert.equal((await store.list()).length, 2);
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  },
);
