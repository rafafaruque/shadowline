// Repository intent only. Diagnostic prose and test failures never become coding instructions.
export const contextChoices = [
  "docs/api-conventions.md",
  "src/lib/pagination.ts",
] as const;
export const criteriaChoices = {
  PAGINATION_PARAMETERS:
    "Pagination uses page and pageSize query parameters, with opt-in behavior as documented in docs/api-conventions.md.",
  REPOSITORY_CONTRACT:
    "Use src/lib/pagination.ts and follow the repository's documented defaults, validation rules, response shape, and error contract.",
} as const;
export const validationChoices = [
  "TYPECHECK",
  "PUBLIC",
  "INTEGRATION",
  "CONTRACT",
] as const;
