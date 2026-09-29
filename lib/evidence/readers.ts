import { isDemoMode } from "../demo-mode";

export async function evidenceReaders() {
  if (isDemoMode()) {
    const { bundledEvidence } = await import("./bundled");
    return bundledEvidence;
  }
  const [{ RunStore }, { ExperimentStore }] = await Promise.all([
    import("../agent/store"),
    import("../experiments/store"),
  ]);
  return { runs: new RunStore(), experiments: new ExperimentStore() };
}
