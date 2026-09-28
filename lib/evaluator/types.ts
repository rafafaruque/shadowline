import { z } from "zod";
import { checkRecordSchema, evaluationResultSchema } from "../domain/schemas";

export const benchmarkRequestSchema = z.strictObject({
  patchId: z.enum(["baseline", "pagination-breaking", "pagination-compatible"]),
});
export type BenchmarkRequest = z.infer<typeof benchmarkRequestSchema>;
export type PatchId = BenchmarkRequest["patchId"];
export type CheckRecord = z.infer<typeof checkRecordSchema>;

export const benchmarkExecutionSchema = z.object({
  id: z.string(),
  source: z.literal("BENCHMARK_EXECUTION"),
  taskId: z.literal("customers-pagination"),
  patchId: benchmarkRequestSchema.shape.patchId,
  purpose: z.enum(["BASELINE_READINESS", "PAGINATION_ACCEPTANCE"]),
  startedAt: z.iso.datetime(),
  durationMs: z.number().int().nonnegative(),
  baselineFingerprint: z.string(),
  patchFingerprint: z.string().nullable(),
  filesChanged: z.array(z.string()),
  workspaceId: z.string(),
  workspaceCleanedUp: z.literal(true),
  evaluation: evaluationResultSchema,
});
export type BenchmarkExecution = z.infer<typeof benchmarkExecutionSchema>;
export interface DeterministicEvaluator {
  evaluate(request: BenchmarkRequest): Promise<BenchmarkExecution>;
}
