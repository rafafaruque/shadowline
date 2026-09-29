import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";
import { runCodingAgent } from "../lib/agent/coding-agent";
import { ProviderError, type ModelProvider } from "../lib/agent/provider";
import { RunStore } from "../lib/agent/store";
import { diagnosisInput } from "../lib/diagnosis/real";
import { ExperimentStore } from "../lib/experiments/store";
import {
  approveIntervention,
  buildIntervention,
  diagnoseBaseline,
  editIntervention,
  executeIntervention,
} from "../lib/experiments/service";
import {
  diagnosisOutputSchema,
  experimentActionSchema,
} from "../lib/experiments/schemas";
import {
  experimentConclusion,
  measuredRows,
} from "../lib/experiments/comparison";

const hypothesis = {
  primaryClassification: "CONTEXT_GAP",
  secondaryClassifications: ["ACCEPTANCE_CRITERIA"],
  explanation: "Controlled diagnosis fixture, not model evidence.",
  supportingEvidence: [
    {
      evidenceId: "context",
      observation: "The baseline omitted the conventions and helper.",
    },
  ],
  recommendedIntervention: {
    contextToAdd: ["docs/api-conventions.md", "src/lib/pagination.ts"],
    acceptanceCriteriaToAdd: ["PAGINATION_PARAMETERS", "REPOSITORY_CONTRACT"],
    requiredValidation: ["TYPECHECK", "PUBLIC", "INTEGRATION", "CONTRACT"],
    rationale: "Add repository intent, then re-evaluate.",
  },
};
const draft = diagnosisOutputSchema.parse(hypothesis).recommendedIntervention;

test("experiment actions cannot inject files, criteria, commands, providers, or a model verdict", () => {
  const base = {
    action: "edit",
    id: "00000000-0000-4000-8000-000000000000",
    revision: 0,
    draft,
  };
  for (const extra of [
    { command: "unsafe" },
    { model: "other" },
    { provider: "other" },
    { context: {} },
  ])
    assert.equal(
      experimentActionSchema.safeParse({ ...base, ...extra }).success,
      false,
    );
  for (const change of [
    { contextToAdd: ["hidden-tests/secret.ts"] },
    { acceptanceCriteriaToAdd: ["Exact hidden test answer"] },
  ])
    assert.equal(
      experimentActionSchema.safeParse({
        ...base,
        draft: { ...draft, ...change },
      }).success,
      false,
    );
  assert.equal(
    diagnosisOutputSchema.safeParse({ ...hypothesis, overallResult: "PASSED" })
      .success,
    false,
  );
  assert.equal(
    experimentActionSchema.safeParse({
      action: "approve",
      id: base.id,
      revision: 0,
      proposalSha256: "a".repeat(64),
      confirmed: false,
    }).success,
    false,
  );
});

test(
  "diagnosis, approval, isolation, one-shot execution, and measured comparison preserve historical evidence",
  { timeout: 120000 },
  async (t) => {
    const directory = await mkdtemp(
      path.join(tmpdir(), "shadowline-experiment-test-"),
    );
    const runs = new RunStore(path.join(directory, "runs"));
    const experiments = new ExperimentStore(
      path.join(directory, "experiments"),
    );
    const broken = await readFile(
      "benchmarks/patches/pagination-breaking/customers.ts",
      "utf8",
    );
    const compatible = await readFile(
      "benchmarks/patches/pagination-compatible/customers.ts",
      "utf8",
    );
    const response = (text: string) => ({
      text,
      model: "test-model",
      responseId: "controlled",
      tokenUsage: null,
      error: null,
    });
    const patch = (content: string) =>
      JSON.stringify({
        summary: "Controlled test only",
        files: [{ path: "src/routes/customers.ts", content }],
      });
    const baseline = await runCodingAgent(
      {
        taskId: "customers-pagination",
        configId: "baseline",
        providerId: "codex-cli",
      },
      {
        store: runs,
        model: "test-model",
        provider: {
          id: "codex-cli",
          async generate() {
            return response(patch(broken));
          },
        },
      },
    );
    const baselineFile = path.join(runs.directory, `${baseline.id}.json`);
    const original = await readFile(baselineFile, "utf8");
    let diagnosisCalls = 0;
    let codingCalls = 0;
    const provider: ModelProvider = {
      id: "codex-cli",
      async generate(context, options) {
        if (options) {
          diagnosisCalls++;
          assert.ok(
            (options.outputSchema.properties as Record<string, unknown>)
              .primaryClassification,
          );
          return response(JSON.stringify(hypothesis));
        }
        codingCalls++;
        assert.doesNotMatch(
          context.userPrompt,
          /critical:legacy-contract|harness|hidden-tests|SENTINEL_HIDDEN_ASSERTION|Controlled diagnosis fixture/,
        );
        assert.match(context.userPrompt, /pageSize/);
        return response(patch(compatible));
      },
    };
    const deps = { runs, experiments, provider };
    try {
      await t.test(
        "diagnosis receives exact historical inputs and bounded failure summaries, without test source",
        async () => {
          const input = await diagnosisInput(baseline);
          assert.deepEqual(
            JSON.parse(
              input.evidence.find((item) => item.id === "context")!.detail,
            ),
            baseline.context,
          );
          assert.ok(
            input.evidence.some((item) => item.id.startsWith("contract:")),
          );
          assert.ok(
            input.evidence.some(
              (item) => item.id === "repository:docs/api-conventions.md",
            ),
          );
          assert.doesNotMatch(
            input.context.userPrompt,
            /harness\/hidden|hidden-tests\/|vitest\/dist/,
          );
          // Public tests legitimately belong to the original context, so inspect summaries separately.
          for (const item of input.evidence.filter((item) =>
            /^(public|contract):/.test(item.id),
          ))
            assert.doesNotMatch(item.detail, /\n|\/private\/|\bexpect\(/);
        },
      );
      let record = await diagnoseBaseline(baseline.id, deps);
      await t.test(
        "diagnosis alone cannot execute or alter the original verdict",
        async () => {
          assert.equal(record.status, "DRAFT");
          assert.equal(record.diagnosis.isHypothesis, true);
          assert.equal(diagnosisCalls, 1);
          assert.equal(codingCalls, 0);
          assert.equal(await readFile(baselineFile, "utf8"), original);
          assert.equal(record.interventionRunId, null);
          await assert.rejects(
            executeIntervention(record.id, record.intervention!.sha256, deps),
            /approval/i,
          );
          await assert.rejects(
            approveIntervention(
              record.id,
              record.revision,
              "0".repeat(64),
              "UI",
              deps,
            ),
          );
          assert.match(experimentConclusion(baseline), /not been evaluated/);
          assert.ok(
            measuredRows().every((value) => value.includes("Not available")),
          );
        },
      );
      await t.test(
        "approval binds exact inputs; editing invalidates it and rationale never enters the coding prompt",
        async () => {
          record = await approveIntervention(
            record.id,
            record.revision,
            record.intervention!.sha256,
            "UI",
            deps,
          );
          assert.equal(record.status, "APPROVED");
          assert.equal(codingCalls, 0);
          const previous = record.intervention!.sha256;
          record = await editIntervention(
            record.id,
            record.revision,
            { ...draft, rationale: "SENTINEL_HIDDEN_ASSERTION" },
            deps,
          );
          assert.equal(record.approval, null);
          assert.notEqual(record.intervention!.sha256, previous);
          assert.doesNotMatch(
            record.intervention!.context.userPrompt,
            /SENTINEL_HIDDEN_ASSERTION/,
          );
          await assert.rejects(executeIntervention(record.id, previous, deps));
          await assert.rejects(
            editIntervention(record.id, record.revision - 1, draft, deps),
          );
          const context = (await buildIntervention(baseline, draft)).context;
          assert.deepEqual(
            context.files.map((file) => file.path),
            [
              ...baseline.context.files.map((file) => file.path),
              "docs/api-conventions.md",
              "src/lib/pagination.ts",
            ],
          );
          assert.equal(context.acceptanceCriteria.length, 3);
          assert.ok(context.requiredChecks.includes("CONTRACT"));
        },
      );
      await t.test("changed baseline evidence blocks approval", async () => {
        await writeFile(baselineFile, original + "\n");
        await assert.rejects(
          approveIntervention(
            record.id,
            record.revision,
            record.intervention!.sha256,
            "UI",
            deps,
          ),
          /Historical baseline/,
        );
        await writeFile(baselineFile, original);
      });
      await t.test(
        "one approved attempt uses the unchanged evaluator and cannot run twice",
        async () => {
          record = await approveIntervention(
            record.id,
            record.revision,
            record.intervention!.sha256,
            "UI",
            deps,
          );
          record = await executeIntervention(
            record.id,
            record.intervention!.sha256,
            deps,
          );
          const after = await runs.get(record.interventionRunId!);
          assert.equal(after?.status, "PASSED");
          assert.equal(after?.evaluation?.contractTests.passed, 16);
          assert.equal(after?.evaluation?.publicTests?.passed, 11);
          assert.equal(after?.firstPassAccepted, true);
          assert.equal(after?.parentRunId, baseline.id);
          assert.equal(after?.experimentId, record.id);
          assert.equal(
            after?.baselineFingerprint,
            baseline.baselineFingerprint,
          );
          assert.equal(codingCalls, 1);
          assert.equal(record.status, "COMPLETE");
          await assert.rejects(
            executeIntervention(record.id, record.intervention!.sha256, deps),
          );
          assert.equal(codingCalls, 1);
          assert.equal(await readFile(baselineFile, "utf8"), original);
          assert.match(experimentConclusion(baseline, after), /not proof/);
        },
      );
      await t.test(
        "provider error consumes the approved attempt without a coding verdict or retry",
        async () => {
          let outage = await diagnoseBaseline(baseline.id, deps);
          outage = await approveIntervention(
            outage.id,
            outage.revision,
            outage.intervention!.sha256,
            "UI",
            deps,
          );
          let calls = 0;
          outage = await executeIntervention(
            outage.id,
            outage.intervention!.sha256,
            {
              ...deps,
              provider: {
                id: "codex-cli",
                async generate() {
                  calls++;
                  throw new ProviderError("Controlled provider outage");
                },
              },
            },
          );
          const after = await runs.get(outage.interventionRunId!);
          assert.equal(calls, 1);
          assert.equal(after?.status, "PROVIDER_ERROR");
          assert.equal(after?.evaluation, null);
          assert.equal(after?.firstPassAccepted, null);
          await assert.rejects(
            executeIntervention(outage.id, outage.intervention!.sha256, deps),
          );
          assert.match(experimentConclusion(baseline, after), /no evidence/);
          assert.equal(await readFile(baselineFile, "utf8"), original);
        },
      );
      await t.test(
        "unsupported diagnosis evidence and model verdicts are rejected without an intervention",
        async () => {
          const invalid = await diagnoseBaseline(baseline.id, {
            ...deps,
            provider: {
              id: "codex-cli",
              async generate() {
                return response(
                  JSON.stringify({
                    ...hypothesis,
                    supportingEvidence: [
                      { evidenceId: "invented", observation: "fabricated" },
                    ],
                  }),
                );
              },
            },
          });
          assert.equal(invalid.status, "DIAGNOSIS_ERROR");
          assert.equal(invalid.intervention, null);
          assert.equal((await runs.get(baseline.id))?.status, "FAILED");
        },
      );
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  },
);
