import type { RealAgentRun } from "../agent/schemas";
import { RunStore } from "../agent/store";
import { ExperimentStore } from "../experiments/store";

export const engagementExperimentId = "1ede9ceb-1c45-4d5f-9c39-9b638f65216d";

// Read-only access to the saved experiment. Never substitute fixture measurements.
export async function loadEngagementEvidence(
  experiments: Pick<ExperimentStore, "get"> = new ExperimentStore(),
  runs: Pick<RunStore, "get"> = new RunStore(),
) {
  const experiment = await experiments.get(engagementExperimentId);
  if (!experiment || !experiment.interventionRunId)
    return { available: false as const };
  const [baseline, after] = await Promise.all([
    runs.get(experiment.baselineRunId),
    runs.get(experiment.interventionRunId),
  ]);
  if (!baseline || !after) return { available: false as const };

  const checks = (run: RealAgentRun) =>
    JSON.stringify(
      run.evaluation?.checkRecords?.map(({ id, command }) => ({ id, command })),
    );
  const matchedControls =
    experiment.status === "COMPLETE" &&
    after.experimentId === experiment.id &&
    after.parentRunId === baseline.id &&
    baseline.configId === "baseline" &&
    after.configId === "context-rich" &&
    baseline.taskId === after.taskId &&
    baseline.context.task === after.context.task &&
    baseline.provider === after.provider &&
    baseline.resolvedModel !== null &&
    baseline.resolvedModel === after.resolvedModel &&
    baseline.baselineFingerprint === experiment.baselineFingerprint &&
    baseline.baselineFingerprint === after.baselineFingerprint &&
    Boolean(
      baseline.evaluation?.checkRecords?.length &&
      after.evaluation?.checkRecords?.length,
    ) &&
    checks(baseline) === checks(after);
  return {
    available: true as const,
    experiment,
    baseline,
    after,
    matchedControls,
  };
}
