/** Evaluator-owned ground truth. Only the prompt is intended as a task-only agent input. */
export const paginationBenchmark = {
  id: "customers-pagination",
  prompt: "Add pagination support to GET /customers.",
  allowedFiles: ["src/routes/customers.ts"],
  expectedContext: ["docs/api-conventions.md", "src/lib/pagination.ts"],
  acceptanceCriteria: [
    "Requests without page/pageSize retain the complete ordered Customer[] response.",
    "Either page or pageSize opts into { data, page, pageSize, total }.",
    "Invalid pagination returns HTTP 400 with { error: INVALID_PAGINATION }.",
    "Use the existing pagination utility; this is review guidance, not a static pass/fail gate.",
    "All existing public tests and independent contract tests pass.",
  ],
  criticalAssertionMarker: "[critical:legacy-contract]",
  expectedTests: {
    baseline: { public: 7, contract: 1 },
    pagination: { public: 11, contract: 16 },
  },
} as const;
