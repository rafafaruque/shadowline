import { existsSync } from "node:fs";
import { runCodingAgent } from "../lib/agent/coding-agent";

if (existsSync(".env.local")) process.loadEnvFile(".env.local");
async function main() {
  const run = await runCodingAgent({
    taskId: "customers-pagination",
    configId: process.argv[2] ?? "baseline",
  });
  console.log(
    JSON.stringify(
      {
        id: run.id,
        provider: run.provider,
        model: run.resolvedModel ?? run.model,
        attemptNumber: run.attemptNumber,
        status: run.status,
        proposedFiles: run.proposedFiles.map((file) => file.path),
        appliedFiles: run.appliedFiles,
        publicTests: run.evaluation?.publicTests,
        contractTests: run.evaluation?.contractTests,
        typecheck: run.evaluation?.typecheck,
        criticalFailure: run.criticalFailure,
        requiresHumanReview: run.requiresHumanReview,
        firstPassAccepted: run.firstPassAccepted,
        errors: run.errors,
        url: `/agent/runs/${run.id}`,
      },
      null,
      2,
    ),
  );
}
main().catch((error) => {
  console.error(
    error instanceof Error ? error.message : "Agent attempt failed.",
  );
  process.exitCode = 1;
});
