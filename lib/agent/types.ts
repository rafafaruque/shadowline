import type { AgentConfig, Task } from "@/lib/domain/types";

/** Future adapter contract only. No execution or provider exists in Phase 1. */
export interface AgentRequest {
  task: Task;
  config: AgentConfig;
  workspacePath: string;
  baseRevision: string;
  signal?: AbortSignal;
}
export interface AgentOutput {
  summary: string;
  patch: string;
  tokenCount: number;
  estimatedCost: number;
  durationMs: number;
}
export interface CodingAgent {
  execute(request: AgentRequest): Promise<AgentOutput>;
}
