import { mkdir, readFile, readdir, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { RunStore } from "../agent/store";
import { experimentSchema, type RealExperiment } from "./schemas";

export class ExperimentStore {
  constructor(
    readonly directory = path.join(process.cwd(), ".shadowline/experiments"),
  ) {}
  async get(id: string) {
    if (!experimentSchema.shape.id.safeParse(id).success) return undefined;
    try {
      return experimentSchema.parse(
        JSON.parse(
          await readFile(path.join(this.directory, `${id}.json`), "utf8"),
        ),
      );
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return undefined;
      throw error;
    }
  }
  async list() {
    await mkdir(this.directory, { recursive: true, mode: 0o700 });
    const entries = await Promise.all(
      (await readdir(this.directory))
        .filter((name) => /^[a-f0-9-]{36}\.json$/.test(name))
        .map((name) => this.get(name.slice(0, -5))),
    );
    return entries
      .filter((entry): entry is RealExperiment => Boolean(entry))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
  async save(value: RealExperiment) {
    const record = experimentSchema.parse(value);
    await mkdir(this.directory, { recursive: true, mode: 0o700 });
    const target = path.join(this.directory, `${record.id}.json`);
    await writeFile(`${target}.tmp`, JSON.stringify(record, null, 2), {
      mode: 0o600,
    });
    await rename(`${target}.tmp`, target);
  }
  async exclusive<T>(id: string, work: () => Promise<T>) {
    experimentSchema.shape.id.parse(id);
    return new RunStore(path.join(this.directory, ".locks", id)).exclusive(
      work,
    );
  }
}
