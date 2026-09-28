import { runSchema } from "@/lib/domain/schemas";
import type { EvaluationResult, Run } from "@/lib/domain/types";
import { getTask } from "./tasks";

function evidence(
  unit: number,
  integration: number,
  contract: number,
  overrides: Partial<EvaluationResult> = {},
): EvaluationResult {
  return {
    typecheck: "PASSED",
    unitTests: { passed: unit, failed: 0, skipped: 0 },
    integrationTests: { passed: integration, failed: 0, skipped: 0 },
    contractTests: { passed: contract, failed: 0, skipped: 0 },
    forbiddenFilesChanged: [],
    scopeAdherence: "PASSED",
    criticalFailure: false,
    overallResult: "PASSED",
    checksRun: ["TYPECHECK", "UNIT", "INTEGRATION", "CONTRACT", "SCOPE"],
    failureDetails: [],
    ...overrides,
  };
}
type FixtureInput = Pick<
  Run,
  | "id"
  | "taskId"
  | "configId"
  | "durationMs"
  | "tokenCount"
  | "estimatedCost"
  | "summary"
> &
  Partial<Run> & { evaluation: EvaluationResult };
function fixture(input: FixtureInput, index: number): Run {
  return runSchema.parse({
    startedAt: `2026-09-24T${String(16 - Math.floor(index / 2)).padStart(2, "0")}:${index % 2 ? "12" : "42"}:00Z`,
    status: input.evaluation.overallResult,
    attempt: 1,
    regressionDetected: false,
    humanReviewRequired: input.evaluation.overallResult !== "PASSED",
    diagnoses: [],
    filesChanged: getTask(input.taskId).allowedFiles,
    ...input,
  });
}

const inputs: FixtureInput[] = [
  {
    id: "SL-1042",
    taskId: "customers-pagination",
    configId: "baseline",
    durationMs: 142000,
    tokenCount: 24180,
    estimatedCost: 0.14,
    summary:
      "Pagination works for new callers, but changes the response shape for existing consumers.",
    regressionDetected: true,
    evaluation: evidence(14, 4, 2, {
      contractTests: { passed: 2, failed: 1, skipped: 0 },
      scopeAdherence: "WARNING",
      overallResult: "FAILED",
      failureDetails: [
        "Existing callers expected Customer[], but the agent changed the endpoint to return { data, page, total }.",
        "tests/contracts/customers.test.ts:42 — GET /customers without query parameters must return an array.",
        "Scope warning: public API behavior changed beyond the requested opt-in pagination feature.",
      ],
    }),
    diagnoses: [
      {
        classification: "CONTEXT_GAP",
        explanation:
          "The agent was not provided docs/api-conventions.md, which states that existing API behavior must remain backward-compatible.",
        evidence: [
          "Configuration contextFiles is empty.",
          "The convention requires opt-in pagination for existing collection endpoints.",
        ],
        confidence: 0.88,
      },
      {
        classification: "VALIDATION_GAP",
        explanation:
          "The agent's required validation did not include the customer API contract test. Shadowline's independent evaluator caught the regression.",
        evidence: [
          "Agent validation: TYPECHECK, UNIT.",
          "Independent evaluator: customer compatibility contract failed.",
        ],
        confidence: 0.94,
      },
    ],
    intervention: {
      contextFilesToAdd: [
        "docs/api-conventions.md",
        "src/lib/pagination.ts",
        "tests/contracts/customers.test.ts",
      ],
      acceptanceCriteriaToAdd: [
        "Existing callers without pagination parameters must preserve the old Customer[] response shape.",
      ],
      validationChecksToRequire: ["CONTRACT", "INTEGRATION"],
      taskDecompositionSuggestions: [
        "First preserve the legacy route contract; then add opt-in pagination.",
      ],
      rationale:
        "Make compatibility explicit and require the check that exposed the regression before the agent submits its changes.",
    },
  },
  {
    id: "SL-1041",
    taskId: "date-tests",
    configId: "context",
    durationMs: 86000,
    tokenCount: 12400,
    estimatedCost: 0.08,
    summary:
      "Added boundary coverage for leap days and UTC normalization; all checks pass.",
    evaluation: evidence(26, 4, 3),
  },
  {
    id: "SL-1040",
    taskId: "empty-search",
    configId: "context",
    durationMs: 104000,
    tokenCount: 16800,
    estimatedCost: 0.1,
    summary:
      "No-match searches now return an empty list with the existing response contract.",
    evaluation: evidence(18, 6, 3),
  },
  {
    id: "SL-1039",
    taskId: "filter-ui",
    configId: "baseline",
    durationMs: 183000,
    tokenCount: 28700,
    estimatedCost: 0.17,
    summary:
      "URL state is preserved, but keyboard navigation checks remain incomplete.",
    evaluation: evidence(12, 3, 2, {
      integrationTests: { passed: 3, failed: 0, skipped: 1 },
      overallResult: "REVIEW_REQUIRED",
      failureDetails: [
        "Keyboard back-navigation integration check was skipped; manual review is required.",
      ],
    }),
  },
  {
    id: "SL-1038",
    taskId: "email-index",
    configId: "baseline",
    durationMs: 226000,
    tokenCount: 34200,
    estimatedCost: 0.22,
    summary:
      "Migration fails on existing duplicate emails and its rollback drops customer records.",
    regressionDetected: true,
    evaluation: evidence(9, 2, 2, {
      integrationTests: { passed: 2, failed: 2, skipped: 0 },
      criticalFailure: true,
      overallResult: "FAILED",
      failureDetails: [
        "Rollback integrity check detected loss of 3 pre-existing customer records.",
        "Migration rejects a seeded dataset containing duplicate email addresses.",
      ],
    }),
    diagnoses: [
      {
        classification: "TASK_DESIGN",
        explanation:
          "The task needs a separate duplicate-data strategy and a verified rollback before introducing uniqueness.",
        evidence: [
          "Seeded duplicate migration check failed.",
          "Rollback round-trip changed the dataset.",
        ],
        confidence: 0.83,
      },
    ],
  },
  {
    id: "SL-1037",
    taskId: "retry-policy",
    configId: "context",
    durationMs: 158000,
    tokenCount: 23100,
    estimatedCost: 0.15,
    summary:
      "Retry behavior is preserved; a scope warning requires inspection of the shared client change.",
    evaluation: evidence(21, 5, 4, {
      scopeAdherence: "WARNING",
      overallResult: "REVIEW_REQUIRED",
      failureDetails: [
        "Shared client call sites changed; human review must confirm the semantic scope of the refactor.",
      ],
    }),
  },
  {
    id: "SL-1036",
    taskId: "auth-boundary",
    configId: "context",
    durationMs: 312000,
    tokenCount: 48100,
    estimatedCost: 0.31,
    summary:
      "Shared authorization bypasses tenant filtering on one customer read path.",
    regressionDetected: true,
    evaluation: evidence(20, 4, 2, {
      contractTests: { passed: 2, failed: 2, skipped: 0 },
      criticalFailure: true,
      overallResult: "FAILED",
      failureDetails: [
        "Tenant isolation contract: tenant B could read tenant A's customer fixture.",
        "Authorization denial contract: missing tenant context did not fail closed.",
      ],
    }),
    diagnoses: [
      {
        classification: "ACCEPTANCE_CRITERIA",
        explanation:
          "Tenant isolation invariants need to be explicit at every entry point before restructuring authorization.",
        evidence: ["Two independent authorization contracts failed."],
        confidence: 0.79,
      },
    ],
  },
  {
    id: "SL-1035",
    taskId: "validation-tests",
    configId: "baseline",
    durationMs: 71000,
    tokenCount: 10300,
    estimatedCost: 0.06,
    summary:
      "Added invalid input tests without modifying implementation files.",
    evaluation: evidence(24, 5, 3),
  },
  {
    id: "SL-1034",
    taskId: "sort-order",
    configId: "context",
    durationMs: 97000,
    tokenCount: 15100,
    estimatedCost: 0.09,
    summary: "Stable ID tiebreaker preserves deterministic customer ordering.",
    evaluation: evidence(16, 4, 3),
  },
  {
    id: "SL-1033",
    taskId: "empty-state",
    configId: "context",
    durationMs: 128000,
    tokenCount: 19700,
    estimatedCost: 0.12,
    summary:
      "Empty and filtered states now expose distinct, accessible actions.",
    evaluation: evidence(15, 6, 3),
  },
  {
    id: "SL-1032",
    taskId: "error-tests",
    configId: "baseline",
    durationMs: 82000,
    tokenCount: 11600,
    estimatedCost: 0.07,
    summary:
      "Error serialization tests cover all three public error categories.",
    evaluation: evidence(22, 5, 4),
  },
  {
    id: "SL-1043",
    taskId: "customers-pagination",
    configId: "pagination-improved",
    startedAt: "2026-09-24T17:08:00Z",
    durationMs: 168000,
    tokenCount: 32200,
    estimatedCost: 0.19,
    attempt: 2,
    summary:
      "Illustrative rerun preserves Customer[] for existing callers and enables opt-in pagination.",
    evaluation: evidence(17, 5, 3),
  },
];
export const runs = inputs
  .map(fixture)
  .sort((a, b) => b.startedAt.localeCompare(a.startedAt));
export function getRun(id: string) {
  return runs.find((run) => run.id === id);
}

/** Denominators are visible in the dashboard; reruns are excluded from first-pass success. */
export function getRunMetrics() {
  const completed = runs.filter((run) => run.evaluation);
  const firstAttempts = completed.filter((run) => run.attempt === 1);
  const passed = completed.filter((run) => run.status === "PASSED");
  return {
    total: completed.length,
    firstAttempts: firstAttempts.length,
    firstPassCount: firstAttempts.filter((run) => run.status === "PASSED")
      .length,
    regressions: completed.filter((run) => run.regressionDetected).length,
    reviews: completed.filter((run) => run.humanReviewRequired).length,
    successfulTasks: new Set(passed.map((run) => run.taskId)).size,
    totalCost: completed.reduce((sum, run) => sum + run.estimatedCost, 0),
  };
}
