import { taskSchema, agentConfigSchema } from "@/lib/domain/schemas";
import type { Task } from "@/lib/domain/types";

const definitions: Pick<
  Task,
  "id" | "title" | "description" | "category" | "riskLevel" | "allowedFiles"
>[] = [
  {
    id: "customers-pagination",
    title: "Add pagination support to GET /customers",
    description:
      "Support optional page and pageSize parameters on the customer endpoint. Preserve existing behavior for callers that do not opt into pagination.",
    category: "API_CHANGE",
    riskLevel: "MEDIUM",
    allowedFiles: ["src/routes/customers.ts", "tests/customers.test.ts"],
  },
  {
    id: "date-tests",
    title: "Cover date normalization edge cases",
    description:
      "Add tests for leap years, invalid inputs, and UTC boundaries in the existing date normalization utility.",
    category: "TEST_GENERATION",
    riskLevel: "LOW",
    allowedFiles: ["tests/dates.test.ts"],
  },
  {
    id: "empty-search",
    title: "Fix empty customer search results",
    description:
      "Return an empty list when a customer search has no matches instead of throwing a null-reference error.",
    category: "BUG_FIX",
    riskLevel: "LOW",
    allowedFiles: ["src/search.ts", "tests/search.test.ts"],
  },
  {
    id: "filter-ui",
    title: "Preserve filters across navigation",
    description:
      "Keep the selected customer filters in URL state and restore them on browser back navigation.",
    category: "FRONTEND_CHANGE",
    riskLevel: "MEDIUM",
    allowedFiles: ["src/components/filters.tsx", "tests/filters.test.tsx"],
  },
  {
    id: "email-index",
    title: "Add a unique customer email index",
    description:
      "Introduce an email uniqueness constraint with a reversible migration and explicit handling of existing duplicates.",
    category: "DATABASE_CHANGE",
    riskLevel: "HIGH",
    allowedFiles: [
      "migrations/004_email_index.sql",
      "tests/migrations.test.ts",
    ],
  },
  {
    id: "retry-policy",
    title: "Extract a shared retry policy",
    description:
      "Consolidate duplicate retry logic while retaining retry counts, backoff timing, and error propagation.",
    category: "REFACTOR",
    riskLevel: "MEDIUM",
    allowedFiles: ["src/retry.ts", "src/client.ts", "tests/retry.test.ts"],
  },
  {
    id: "auth-boundary",
    title: "Separate tenant authorization",
    description:
      "Move tenant authorization into a shared boundary without allowing cross-tenant reads or changing authentication semantics.",
    category: "ARCHITECTURE",
    riskLevel: "CRITICAL",
    allowedFiles: [
      "src/auth/tenant.ts",
      "src/routes/customers.ts",
      "tests/tenant.test.ts",
    ],
  },
  {
    id: "validation-tests",
    title: "Add customer validation tests",
    description:
      "Cover malformed email addresses, missing names, and duplicate submissions with regression tests.",
    category: "TEST_GENERATION",
    riskLevel: "LOW",
    allowedFiles: ["tests/validation.test.ts"],
  },
  {
    id: "sort-order",
    title: "Fix unstable customer sort order",
    description:
      "Use customer ID as a deterministic tiebreaker for identical display names.",
    category: "BUG_FIX",
    riskLevel: "LOW",
    allowedFiles: ["src/sort.ts", "tests/sort.test.ts"],
  },
  {
    id: "empty-state",
    title: "Improve the customer empty state",
    description:
      "Distinguish an empty customer account from a filtered search with no results, including accessible action labels.",
    category: "FRONTEND_CHANGE",
    riskLevel: "LOW",
    allowedFiles: [
      "src/components/empty-state.tsx",
      "tests/empty-state.test.tsx",
    ],
  },
  {
    id: "error-tests",
    title: "Cover API error serialization",
    description:
      "Add deterministic tests for validation, authorization, and unexpected error response shapes.",
    category: "TEST_GENERATION",
    riskLevel: "LOW",
    allowedFiles: ["tests/errors.test.ts"],
  },
];

export const tasks = definitions.map((task) =>
  taskSchema.parse({
    ...task,
    expectedContext:
      task.id === "customers-pagination"
        ? [
            "src/routes/customers.ts",
            "docs/api-conventions.md",
            "src/lib/pagination.ts",
            "tests/customers.test.ts",
          ]
        : [task.allowedFiles[0], "docs/architecture.md"],
    acceptanceCriteria:
      task.id === "customers-pagination"
        ? [
            "Existing callers without pagination parameters must receive Customer[].",
            "Explicit page and pageSize parameters return a paginated envelope.",
            "Reject invalid pagination values with a 400 response.",
          ]
        : [
            task.description,
            "Existing behavior and public contracts remain unchanged.",
            "All required checks pass within the permitted file scope.",
          ],
    requiredChecks: ["TYPECHECK", "UNIT", "INTEGRATION", "CONTRACT", "SCOPE"],
  }),
);

export const agentConfigs = [
  {
    id: "baseline",
    name: "Baseline",
    model: "coding-model / fixture",
    contextFiles: [],
    acceptanceCriteria: [],
    requiredChecks: ["TYPECHECK", "UNIT"],
    notes:
      "Task title only. No supporting files or explicit acceptance criteria were supplied. The agent may inspect the benchmark workspace; the evaluator still runs the full task-owned check suite.",
  },
  {
    id: "context",
    name: "Context + criteria",
    model: "coding-model / fixture",
    contextFiles: ["docs/architecture.md"],
    acceptanceCriteria: [
      "Preserve public behavior and stay within the task's permitted files.",
    ],
    requiredChecks: ["TYPECHECK", "UNIT", "INTEGRATION", "CONTRACT", "SCOPE"],
    notes:
      "Relevant architecture context and explicit acceptance criteria. This exact snapshot is shown for each run.",
  },
  {
    id: "pagination-improved",
    name: "Context + criteria",
    model: "coding-model / fixture",
    contextFiles: [
      "src/routes/customers.ts",
      "docs/api-conventions.md",
      "src/lib/pagination.ts",
      "tests/customers.test.ts",
    ],
    acceptanceCriteria: [
      "Existing callers without pagination parameters must preserve the old Customer[] response shape.",
      "Use the existing pagination utility for explicit page and pageSize parameters.",
      "Contract and integration tests must pass.",
    ],
    requiredChecks: ["TYPECHECK", "UNIT", "INTEGRATION", "CONTRACT", "SCOPE"],
    notes:
      "Illustrative intervention snapshot for the pagination rerun. No live model was invoked.",
  },
].map((config) => agentConfigSchema.parse(config));

export function getTask(id: string) {
  const task = tasks.find((item) => item.id === id);
  if (!task) throw new Error(`Unknown fixture task: ${id}`);
  return task;
}
export function getConfig(id: string) {
  const config = agentConfigs.find((item) => item.id === id);
  if (!config) throw new Error(`Unknown fixture configuration: ${id}`);
  return config;
}
