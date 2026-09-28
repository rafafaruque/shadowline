import type {
  AgentConfig,
  Diagnosis,
  EvaluationResult,
  Intervention,
  Run,
  Task,
} from "@/lib/domain/types";

export interface DiagnosisRequest {
  task: Task;
  config: AgentConfig;
  run: Run;
  evaluation: EvaluationResult;
}
/** Hypotheses only. A diagnosis must never overwrite evaluator results. */
export interface DiagnosisProvider {
  diagnose(
    request: DiagnosisRequest,
  ): Promise<{ diagnoses: Diagnosis[]; intervention: Intervention }>;
}
