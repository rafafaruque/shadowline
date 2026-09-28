import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Baseline readiness only. The evaluator adds pagination acceptance tests after a patch.
export default defineConfig({
  resolve: {
    alias: { "@benchmark": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    include: ["hidden-tests/customer-contract.test.ts"],
    environment: "node",
    maxWorkers: 1,
  },
});
