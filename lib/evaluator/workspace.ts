import { createHash } from "node:crypto";
import {
  access,
  cp,
  lstat,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  realpath,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { benchmarkRequestSchema, type PatchId } from "./types";

const baselineEntries = [
  "src",
  "docs",
  "tests",
  "package.json",
  "package-lock.json",
  "tsconfig.json",
  "vitest.config.ts",
] as const;
const sha256 = (value: string | Buffer) =>
  createHash("sha256").update(value).digest("hex");

export interface BenchmarkWorkspace {
  root: string;
  source: string;
  harness: string;
  dependencies: string;
  baselineFiles: Record<string, string>;
  baselineFingerprint: string;
  patchFingerprint: string | null;
  patchId: PatchId;
}

/** Hash regular files; reject links in editable source. */
export async function snapshotFiles(
  directory: string,
  relative = "",
): Promise<Record<string, string>> {
  const snapshot: Record<string, string> = {};
  for (const name of (await readdir(path.join(directory, relative))).sort()) {
    if (!relative && name === "node_modules") continue;
    const file = path.posix.join(relative, name);
    const absolute = path.join(directory, file);
    const stat = await lstat(absolute);
    if (stat.isSymbolicLink())
      throw new Error(`Unexpected symlink in benchmark source: ${file}`);
    if (stat.isDirectory())
      Object.assign(snapshot, await snapshotFiles(directory, file));
    else if (stat.isFile()) snapshot[file] = sha256(await readFile(absolute));
    else throw new Error(`Unexpected non-file in benchmark source: ${file}`);
  }
  return snapshot;
}

async function prepareWorkspace(patchId: PatchId): Promise<BenchmarkWorkspace> {
  benchmarkRequestSchema.shape.patchId.parse(patchId);
  const project = process.cwd();
  const benchmark = path.join(project, "benchmark-repo");
  const dependencies = path.join(benchmark, "node_modules");
  try {
    await Promise.all([
      access(path.join(dependencies, "typescript/bin/tsc")),
      access(path.join(dependencies, "vitest/vitest.mjs")),
      access(path.join(dependencies, "hono/package.json")),
    ]);
  } catch {
    throw new Error(
      "Benchmark dependencies are missing. Run npm run benchmark:setup first.",
    );
  }
  // Canonicalize /var versus /private/var on macOS so report paths share one identity.
  const root = await realpath(
    await mkdtemp(path.join(tmpdir(), "shadowline-benchmark-")),
  );
  try {
    const source = path.join(root, "workspace");
    const harness = path.join(root, "harness");
    await mkdir(source);
    await mkdir(path.join(harness, "public"), { recursive: true });
    for (const entry of baselineEntries)
      await cp(path.join(benchmark, entry), path.join(source, entry), {
        recursive: true,
        dereference: false,
      });
    const baselineFiles = await snapshotFiles(source);
    const baselineFingerprint = sha256(JSON.stringify(baselineFiles));
    await symlink(dependencies, path.join(source, "node_modules"), "dir");
    await symlink(dependencies, path.join(harness, "node_modules"), "dir");
    // Public tests run from evaluator-owned copies with the original relative imports.
    await cp(
      path.join(benchmark, "tests"),
      path.join(harness, "public/tests"),
      { recursive: true },
    );
    await symlink(
      path.join(source, "src"),
      path.join(harness, "public/src"),
      "dir",
    );
    await mkdir(path.join(harness, "hidden"));
    await cp(
      path.join(benchmark, "hidden-tests/customer-contract.test.ts"),
      path.join(harness, "hidden/customer-contract.test.ts"),
    );
    let patchFingerprint: string | null = null;
    if (patchId !== "baseline") {
      const replacement = await readFile(
        path.join(project, "benchmarks/patches", patchId, "customers.ts"),
      );
      patchFingerprint = sha256(replacement);
      await writeFile(
        path.join(source, "src/routes/customers.ts"),
        replacement,
      );
      await cp(
        path.join(project, "benchmarks/public-tests"),
        path.join(harness, "public/task"),
        { recursive: true },
      );
      await cp(
        path.join(benchmark, "hidden-tests/pagination-contract.test.ts"),
        path.join(harness, "hidden/pagination-contract.test.ts"),
      );
    }
    for (const suite of ["public", "hidden"] as const) {
      const config = {
        root: harness,
        cacheDir: path.join(root, "cache", suite),
        resolve: { alias: { "@benchmark": path.join(source, "src") } },
        test: {
          include: [`${suite}/**/*.test.ts`],
          environment: "node",
          maxWorkers: 1,
          fileParallelism: false,
          testTimeout: 5000,
          hookTimeout: 5000,
          reporters: ["default", "json"],
          outputFile: { json: path.join(root, `${suite}-report.json`) },
        },
      };
      await writeFile(
        path.join(harness, `${suite}.config.mjs`),
        `export default ${JSON.stringify(config, null, 2)};\n`,
      );
    }
    await writeFile(
      path.join(harness, "tsconfig.json"),
      JSON.stringify(
        {
          compilerOptions: {
            target: "ES2022",
            lib: ["ES2022", "DOM"],
            module: "ESNext",
            moduleResolution: "Bundler",
            strict: true,
            skipLibCheck: true,
            noEmit: true,
            types: ["node"],
          },
          include: [path.join(source, "src/**/*.ts")],
        },
        null,
        2,
      ),
    );
    return {
      root,
      source,
      harness,
      dependencies,
      baselineFiles,
      baselineFingerprint,
      patchFingerprint,
      patchId,
    };
  } catch (error) {
    await rm(root, { recursive: true, force: true });
    throw error;
  }
}

/** Cleanup finishes before resolving, including callback and setup failures. */
export async function withBenchmarkWorkspace<T>(
  patchId: PatchId,
  work: (workspace: BenchmarkWorkspace) => Promise<T>,
): Promise<T> {
  const workspace = await prepareWorkspace(patchId);
  try {
    return await work(workspace);
  } finally {
    await rm(workspace.root, { recursive: true, force: true, maxRetries: 3 });
  }
}
