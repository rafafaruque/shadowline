import type { Check, EvaluationResult, Task } from "@/lib/domain/types";

export interface EvaluationRequest {
  task: Task;
  workspacePath: string;
  baseRevision: string;
  /** Evaluator-owned checks: an agent config cannot weaken this list. */
  checks: readonly Check[];
}
export interface DeterministicEvaluator {
  evaluate(request: EvaluationRequest): Promise<EvaluationResult>;
}
