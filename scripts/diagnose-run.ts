import { existsSync } from "node:fs";
import { diagnoseBaseline } from "../lib/experiments/service";

if (existsSync(".env.local")) process.loadEnvFile(".env.local");
async function main() {
  const id = process.argv[2];
  if (!id) throw new Error("Supply the ID of an evaluated failed baseline.");
  const record = await diagnoseBaseline(id);
  console.log(
    JSON.stringify(
      {
        id: record.id,
        status: record.status,
        diagnosisStatus: record.diagnosis.status,
        diagnosis: record.diagnosis.output,
        error: record.diagnosis.error,
        proposalSha256: record.intervention?.sha256,
        revision: record.revision,
        url: `/experiments/real/${record.id}`,
      },
      null,
      2,
    ),
  );
}
main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Diagnosis failed.");
  process.exitCode = 1;
});
