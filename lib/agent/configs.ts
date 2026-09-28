import type { AgentRequest } from "./schemas";

const minimumFiles = [
  "src/app.ts",
  "src/routes/customers.ts",
  "src/data/customers.ts",
  "tests/customers.test.ts",
];
export const agentConfigurations = {
  baseline: {
    name: "Baseline",
    files: minimumFiles,
    acceptanceCriteria: [] as string[],
    requiredChecks: ["TYPECHECK", "PUBLIC"],
  },
  "context-rich": {
    name: "Context-rich",
    files: [
      ...minimumFiles,
      "docs/api-conventions.md",
      "src/lib/pagination.ts",
    ],
    acceptanceCriteria: [
      "Existing callers without pagination query parameters must continue receiving the historical Customer[] response.",
    ],
    requiredChecks: ["TYPECHECK", "PUBLIC", "INTEGRATION", "CONTRACT"],
  },
} satisfies Record<
  AgentRequest["configId"],
  {
    name: string;
    files: string[];
    acceptanceCriteria: string[];
    requiredChecks: string[];
  }
>;

// One task, one existing route. Public tests remain evaluator-owned in this phase.
export const agentAllowedPaths = ["src/routes/customers.ts"];
