import type { z } from "zod";
import type * as schemas from "./schemas";

export type TaskCategory = z.infer<typeof schemas.taskCategorySchema>;
export type RiskLevel = z.infer<typeof schemas.riskLevelSchema>;
export type Check = z.infer<typeof schemas.checkSchema>;
export type Task = z.infer<typeof schemas.taskSchema>;
export type AgentConfig = z.infer<typeof schemas.agentConfigSchema>;
export type Run = z.infer<typeof schemas.runSchema>;
export type RunStatus = z.infer<typeof schemas.runStatusSchema>;
export type EvaluationResult = z.infer<typeof schemas.evaluationResultSchema>;
export type Diagnosis = z.infer<typeof schemas.diagnosisSchema>;
export type Intervention = z.infer<typeof schemas.interventionSchema>;
export type AutonomyEvidence = z.infer<typeof schemas.autonomyEvidenceSchema>;
export type AutonomyRecommendation = z.infer<
  typeof schemas.autonomyRecommendationSchema
>;
export type Experiment = z.infer<typeof schemas.experimentSchema>;
