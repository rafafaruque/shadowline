import { spawnSync } from "node:child_process";
import { mkdir, readFile, writeFile, rm, symlink } from "node:fs/promises";
import path from "node:path";
import type { BenchmarkWorkspace } from "./workspace";

export function sandboxProfile(readPaths: string[], scratch: string) {
  const subpaths = readPaths
    .map((item) => `(subpath ${JSON.stringify(item)})`)
    .join(" ");
  return `(version 1)
(deny default)
(allow process-fork)
(allow process-exec)
(allow sysctl-read)
(allow mach-lookup)
(allow file-read-metadata)
(allow file-read* (literal "/") (literal "/opt") (literal "/private") (literal "/private/var") (literal "/tmp"))
(allow file-read* (subpath "/System") (subpath "/usr") (subpath "/opt/homebrew") (literal "/dev/null") (literal "/dev/random") (literal "/dev/urandom") (literal "/private/etc/localtime") ${subpaths} (subpath ${JSON.stringify(scratch)}))
(allow file-write* (literal "/dev/null") (subpath ${JSON.stringify(scratch)}))`;
}

/** No fallback to unrestricted execution. Check before spending on a model request. */
export function assertSandboxAvailable() {
  if (process.platform !== "darwin")
    throw new Error(
      "Generated-code execution currently requires macOS sandbox-exec; no unrestricted fallback is available.",
    );
  const probe = spawnSync(
    "/usr/bin/sandbox-exec",
    [
      "-p",
      sandboxProfile([], "/nonexistent-shadowline-scratch"),
      process.execPath,
      "-e",
      "process.stdout.write('sandbox-ready')",
    ],
    {
      cwd: "/",
      encoding: "utf8",
      timeout: 5000,
      env: { PATH: process.env.PATH, NODE_ENV: "test" },
    },
  );
  if (probe.status !== 0 || probe.stdout !== "sandbox-ready")
    throw new Error(
      "The generated-code sandbox is unavailable. Start Shadowline in an environment that permits macOS sandbox-exec.",
    );
}

export async function prepareSandboxHarness(workspace: BenchmarkWorkspace) {
  const worker = path.join(workspace.root, "application-worker.mjs");
  const scratch = path.join(workspace.root, "application-scratch");
  await mkdir(scratch);
  await writeFile(
    worker,
    await readFile(path.join(process.cwd(), "lib/evaluator/worker.mjs")),
  );
  const profile = sandboxProfile(
    [
      workspace.source,
      workspace.dependencies,
      path.join(process.cwd(), "node_modules"),
      worker,
    ],
    scratch,
  );
  const settings = {
    profile,
    node: process.execPath,
    loader: path.join(process.cwd(), "node_modules/tsx/dist/loader.mjs"),
    worker,
    app: path.join(workspace.source, "src/app.ts"),
    scratch,
  };
  const bridge = await readFile(
    path.join(process.cwd(), "lib/evaluator/bridge.mjs"),
    "utf8",
  );
  const proxy = path.join(workspace.harness, "proxy-src");
  await mkdir(path.join(proxy, "lib"), { recursive: true });
  await writeFile(
    path.join(proxy, "app.ts"),
    `const settings = ${JSON.stringify(settings)};\n${bridge}`,
  );
  // The only writable agent path is the route. The existing utility is immutable trusted input.
  await writeFile(
    path.join(proxy, "lib/pagination.ts"),
    await readFile(path.join(workspace.source, "src/lib/pagination.ts")),
  );
  await rm(path.join(workspace.harness, "public/src"));
  await symlink(proxy, path.join(workspace.harness, "public/src"), "dir");
  for (const suite of ["public", "hidden"]) {
    const file = path.join(workspace.harness, `${suite}.config.mjs`);
    const content = await readFile(file, "utf8");
    await writeFile(
      file,
      content.replace(
        JSON.stringify(path.join(workspace.source, "src")),
        JSON.stringify(proxy),
      ),
    );
  }
}
