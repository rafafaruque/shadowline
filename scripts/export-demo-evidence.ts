import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { realRunSchema } from "../lib/agent/schemas";
import { experimentSchema } from "../lib/experiments/schemas";

// An explicit publication allowlist, never a dump of all future local records.
const runIds = [
  "051afcf9-379a-4ed2-8f2f-c4fb56ce15df",
  "7598eb4a-1dab-4bbd-b7f1-f428b333fce2",
  "6ff1f892-c368-4595-93dc-3f236582ea20",
  "5c23f5cc-0034-49df-a357-e45c67af66af",
  "44419f45-4c7e-468e-a4e7-1fdd4b9d9158",
  "2401e5cb-dd75-4d12-880e-d2afc1396839",
  "4b299b77-b63f-4ee3-ae13-06c5e0d2f956",
  "c0cc3ec2-68b7-43d6-8981-42728a91bd38",
];
const experimentId = "1ede9ceb-1c45-4d5f-9c39-9b638f65216d";
const sha256 = (value: string) =>
  createHash("sha256").update(value).digest("hex");

function redact(value: unknown): unknown {
  if (typeof value === "string")
    return value
      .replaceAll(process.cwd(), "<repository>")
      .replace(
        /\/private\/var\/folders\/[^\s"']+?\/T\/shadowline-benchmark-[^/\s"']+/g,
        "<temporary-workspace>",
      );
  if (Array.isArray(value)) return value.map(redact);
  if (value && typeof value === "object")
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, redact(item)]),
    );
  return value;
}

const manifest: {
  kind: string;
  id: string;
  sourceSha256: string;
  publicRecordSha256: string;
}[] = [];
async function readRecord(kind: "runs" | "experiments", id: string) {
  const original = await readFile(
    path.join(".shadowline", kind, `${id}.json`),
    "utf8",
  );
  const raw = JSON.parse(original);
  (kind === "runs" ? realRunSchema : experimentSchema).parse(raw);
  const record = redact(raw);
  const serialized = JSON.stringify(record);
  if (
    /\/Users\/|\/private\/var\/|AIza[\w-]{20,}|sk-[\w-]{20,}|eyJ[\w-]{30,}/.test(
      serialized,
    )
  )
    throw new Error(
      `Review export redactions for ${id}; refusing to publish local paths or credential-like data.`,
    );
  manifest.push({
    kind,
    id,
    sourceSha256: sha256(original),
    publicRecordSha256: sha256(serialized),
  });
  return record;
}

async function main() {
  const runs = [];
  for (const id of runIds) runs.push(await readRecord("runs", id));
  const experiments = [await readRecord("experiments", experimentId)];
  const bundle = {
    version: 1,
    source:
      "Recorded outputs from real local benchmark runs; not fixtures or hosted executions.",
    redactions:
      "Local repository and temporary workspace paths in logs are replaced with <repository> and <temporary-workspace>. Original record/prompt/approval hashes identify the local originals, not the redacted copies. Outcomes, proposals, test counts, timing, usage, and approval evidence are unchanged.",
    manifest,
    runs,
    experiments,
  };
  await mkdir("data/demo", { recursive: true });
  await writeFile(
    "data/demo/evidence.json",
    `${JSON.stringify(bundle, null, 2)}\n`,
  );
  console.log(
    `Exported ${runs.length} recorded attempts and ${experiments.length} experiment; local records unchanged.`,
  );
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
