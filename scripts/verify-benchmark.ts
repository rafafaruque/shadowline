import { evaluateBenchmark } from "../lib/evaluator/runner";
import { benchmarkRequestSchema } from "../lib/evaluator/types";

async function main() {
  const requested = process.argv[2];
  const ids = requested
    ? [benchmarkRequestSchema.shape.patchId.parse(requested)]
    : (["baseline", "pagination-breaking", "pagination-compatible"] as const);
  for (const patchId of ids) {
    const run = await evaluateBenchmark({ patchId });
    const { evaluation: result } = run;
    console.log(JSON.stringify(run, null, 2));
    const expected = patchId === "pagination-breaking" ? "FAILED" : "PASSED";
    if (
      result.overallResult !== expected ||
      result.criticalFailure !== (patchId === "pagination-breaking")
    )
      process.exitCode = 1;
  }
}
main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
