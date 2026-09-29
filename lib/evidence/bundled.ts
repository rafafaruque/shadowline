import bundle from "../../data/demo/evidence.json";
import { classifyStoredRun } from "../agent/evidence";
import { realRunSchema } from "../agent/schemas";
import { experimentSchema } from "../experiments/schemas";

// Static JSON imports are included in the server bundle; no writable runtime store.
// Parse copies so consumers cannot mutate shared evidence between requests.
export const bundledEvidence = {
  runs: {
    async get(id: string) {
      const record = bundle.runs.find((run) => run.id === id);
      return record
        ? classifyStoredRun(realRunSchema.parse(record))
        : undefined;
    },
    async list() {
      return bundle.runs
        .map((run) => classifyStoredRun(realRunSchema.parse(run)))
        .sort((a, b) => b.startedAt.localeCompare(a.startedAt));
    },
  },
  experiments: {
    async get(id: string) {
      const record = bundle.experiments.find(
        (experiment) => experiment.id === id,
      );
      return record ? experimentSchema.parse(record) : undefined;
    },
    async list() {
      return bundle.experiments
        .map((experiment) => experimentSchema.parse(experiment))
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    },
  },
};
