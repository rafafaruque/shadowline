import {
  mkdir,
  open,
  readFile,
  readdir,
  rename,
  rm,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import { realRunSchema, type RealAgentRun } from "./schemas";
import { classifyStoredRun } from "./evidence";

export class RunStore {
  constructor(
    readonly directory = path.join(process.cwd(), ".shadowline/runs"),
  ) {}
  async list(): Promise<RealAgentRun[]> {
    await mkdir(this.directory, { recursive: true, mode: 0o700 });
    const files = (await readdir(this.directory)).filter((name) =>
      /^[a-f0-9-]{36}\.json$/.test(name),
    );
    return (
      await Promise.all(
        files.map(async (name) =>
          classifyStoredRun(
            realRunSchema.parse(
              JSON.parse(
                await readFile(path.join(this.directory, name), "utf8"),
              ),
            ),
          ),
        ),
      )
    ).sort((a, b) => b.startedAt.localeCompare(a.startedAt));
  }
  async get(id: string) {
    if (!realRunSchema.shape.id.safeParse(id).success) return undefined;
    try {
      return classifyStoredRun(
        realRunSchema.parse(
          JSON.parse(
            await readFile(path.join(this.directory, `${id}.json`), "utf8"),
          ),
        ),
      );
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return undefined;
      throw error;
    }
  }
  async save(run: RealAgentRun) {
    const data = realRunSchema.parse(run);
    await mkdir(this.directory, { recursive: true, mode: 0o700 });
    const target = path.join(this.directory, `${data.id}.json`);
    await writeFile(`${target}.tmp`, JSON.stringify(data, null, 2), {
      mode: 0o600,
    });
    await rename(`${target}.tmp`, target);
  }
  async exclusive<T>(work: () => Promise<T>) {
    await mkdir(this.directory, { recursive: true, mode: 0o700 });
    const lock = path.join(this.directory, ".attempt.lock");
    let handle;
    try {
      handle = await open(lock, "wx", 0o600);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "EEXIST")
        throw new Error(
          "An agent attempt is already running. A crashed process may leave .shadowline/runs/.attempt.lock; see README recovery instructions.",
        );
      throw error;
    }
    try {
      await handle.writeFile(String(process.pid));
      return await work();
    } finally {
      await handle.close();
      await rm(lock, { force: true });
    }
  }
}
