import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { performance } from "node:perf_hooks";
import { z } from "zod";
import { paginationBenchmark } from "./benchmark";
import { snapshotFiles, type BenchmarkWorkspace } from "./workspace";
import type { CheckRecord } from "./types";

const TIMEOUT_MS = 30_000;
const OUTPUT_LIMIT = 64 * 1024;
type ExecutableCheck = "TYPECHECK" | "PUBLIC" | "CONTRACT";

/** The complete allowlist. No shell, npm scripts, or payload-defined arguments. */
function commandFor(id: ExecutableCheck, workspace: BenchmarkWorkspace) {
  switch (id) {
    case "TYPECHECK":
      return {
        label:
          "node typescript/bin/tsc --noEmit --project <trusted>/tsconfig.json",
        args: [
          path.join(workspace.dependencies, "typescript/bin/tsc"),
          "--noEmit",
          "--project",
          path.join(workspace.harness, "tsconfig.json"),
        ],
      };
    case "PUBLIC":
      return {
        label:
          "node vitest/vitest.mjs run --config <trusted>/public.config.mjs",
        args: [
          path.join(workspace.dependencies, "vitest/vitest.mjs"),
          "run",
          "--config",
          path.join(workspace.harness, "public.config.mjs"),
        ],
      };
    case "CONTRACT":
      return {
        label:
          "node vitest/vitest.mjs run --config <trusted>/hidden.config.mjs",
        args: [
          path.join(workspace.dependencies, "vitest/vitest.mjs"),
          "run",
          "--config",
          path.join(workspace.harness, "hidden.config.mjs"),
        ],
      };
    default:
      throw new Error("Validation command is not allowlisted.");
  }
}

async function execute(
  id: ExecutableCheck,
  workspace: BenchmarkWorkspace,
): Promise<CheckRecord> {
  const command = commandFor(id, workspace);
  const start = performance.now();
  return new Promise((resolve) => {
    let stdout = "";
    let stderr = "";
    let outputTruncated = false;
    let timedOut = false;
    let spawnError: string | undefined;
    const child = spawn(process.execPath, command.args, {
      cwd: workspace.harness,
      shell: false,
      detached: process.platform !== "win32",
      stdio: ["ignore", "pipe", "pipe"],
      // Intentionally do not inherit credentials, NODE_OPTIONS, or caller-provided environment.
      env: {
        PATH: process.env.PATH,
        SystemRoot: process.env.SystemRoot,
        CI: "true",
        TZ: "UTC",
        NO_COLOR: "1",
        NODE_ENV: "test",
        TMPDIR: workspace.root,
      },
    });
    function stop() {
      if (!child.pid) return;
      try {
        if (process.platform !== "win32") process.kill(-child.pid, "SIGKILL");
        else child.kill("SIGKILL");
      } catch {
        child.kill("SIGKILL");
      }
    }
    const timer = setTimeout(() => {
      timedOut = true;
      stop();
    }, TIMEOUT_MS);
    child.stdout.on("data", (chunk: Buffer) => {
      const text = chunk.toString();
      if (stdout.length + text.length > OUTPUT_LIMIT) {
        outputTruncated = true;
        stop();
      }
      stdout = (stdout + text).slice(0, OUTPUT_LIMIT);
    });
    child.stderr.on("data", (chunk: Buffer) => {
      const text = chunk.toString();
      if (stderr.length + text.length > OUTPUT_LIMIT) {
        outputTruncated = true;
        stop();
      }
      stderr = (stderr + text).slice(0, OUTPUT_LIMIT);
    });
    child.on("error", (error) => {
      spawnError = error.message;
    });
    child.on("close", (exitCode) => {
      clearTimeout(timer);
      resolve({
        id,
        command: command.label,
        exitCode,
        durationMs: Math.round(performance.now() - start),
        stdout,
        stderr: spawnError ? `${stderr}\n${spawnError}` : stderr,
        outputTruncated,
        status: timedOut
          ? "TIMED_OUT"
          : spawnError || outputTruncated || exitCode === null
            ? "ERROR"
            : exitCode === 0
              ? "PASSED"
              : "FAILED",
        assertions: [],
      });
    });
  });
}

const reportSchema = z.object({
  numTotalTests: z.number().int().nonnegative(),
  numPassedTests: z.number().int().nonnegative(),
  numFailedTests: z.number().int().nonnegative(),
  success: z.boolean(),
  testResults: z.array(
    z.object({
      name: z.string(),
      status: z.enum(["passed", "failed"]),
      message: z.string(),
      assertionResults: z.array(
        z.object({
          fullName: z.string(),
          status: z.enum(["passed", "failed", "pending", "skipped", "todo"]),
          failureMessages: z.array(z.string()).nullable(),
        }),
      ),
    }),
  ),
});

/** Fail closed on empty, malformed, partial, or inconsistent reports. */
export function parseTestReport(
  raw: unknown,
  expectedCount: number,
  harness: string,
): CheckRecord["assertions"] {
  const report = reportSchema.parse(raw);
  const assertions = report.testResults.flatMap((suite) =>
    suite.assertionResults.map((assertion) => ({
      name: assertion.fullName,
      file: path.relative(harness, suite.name).split(path.sep).join("/"),
      status: assertion.status,
      failureMessages: assertion.failureMessages ?? [],
    })),
  );
  if (
    assertions.length !== expectedCount ||
    report.numTotalTests !== expectedCount
  )
    throw new Error(
      `Expected ${expectedCount} independent assertions; received ${assertions.length}.`,
    );
  const failed = assertions.filter(
    (assertion) => assertion.status === "failed",
  ).length;
  const passed = assertions.filter(
    (assertion) => assertion.status === "passed",
  ).length;
  if (
    report.numFailedTests !== failed ||
    report.numPassedTests !== passed ||
    report.success !== (passed === expectedCount)
  )
    throw new Error("Test report summary does not match its assertions.");
  if (
    report.testResults.some(
      (suite) =>
        suite.status === "failed" &&
        !suite.assertionResults.some(
          (assertion) => assertion.status === "failed",
        ),
    )
  )
    throw new Error(
      "A suite failed to load or complete; assertion counts are insufficient evidence.",
    );
  return assertions;
}

export async function runCheck(
  id: ExecutableCheck,
  workspace: BenchmarkWorkspace,
): Promise<CheckRecord> {
  const record = await execute(id, workspace);
  if (
    id === "TYPECHECK" ||
    record.status === "ERROR" ||
    record.status === "TIMED_OUT"
  )
    return record;
  const expected =
    paginationBenchmark.expectedTests[
      workspace.patchId === "baseline" ? "baseline" : "pagination"
    ];
  try {
    const report = await readFile(
      path.join(
        workspace.root,
        id === "PUBLIC" ? "public-report.json" : "hidden-report.json",
      ),
      "utf8",
    );
    record.assertions = parseTestReport(
      JSON.parse(report),
      id === "PUBLIC" ? expected.public : expected.contract,
      workspace.harness,
    );
    const hasFailures = record.assertions.some(
      (assertion) => assertion.status === "failed",
    );
    const complete = record.assertions.every(
      (assertion) =>
        assertion.status === "passed" || assertion.status === "failed",
    );
    if (
      !complete ||
      (record.exitCode === 0 && hasFailures) ||
      (record.exitCode !== 0 && !hasFailures)
    )
      throw new Error(
        "Process exit and completed assertion evidence disagree.",
      );
    record.status = hasFailures ? "FAILED" : "PASSED";
  } catch (error) {
    record.status = "ERROR";
    record.reportError =
      error instanceof Error ? error.message : "Unable to read test report.";
  }
  return record;
}

export async function checkScope(workspace: BenchmarkWorkspace): Promise<{
  record: CheckRecord;
  filesChanged: string[];
  forbiddenFilesChanged: string[];
}> {
  const start = performance.now();
  const current = await snapshotFiles(workspace.source);
  const filesChanged = [
    ...new Set([
      ...Object.keys(workspace.baselineFiles),
      ...Object.keys(current),
    ]),
  ]
    .filter((file) => workspace.baselineFiles[file] !== current[file])
    .sort();
  const allowed: readonly string[] =
    workspace.patchId === "baseline" ? [] : paginationBenchmark.allowedFiles;
  const forbiddenFilesChanged = filesChanged.filter(
    (file) => !allowed.includes(file),
  );
  return {
    filesChanged,
    forbiddenFilesChanged,
    record: {
      id: "SCOPE",
      command:
        "Compare SHA-256 file manifests against task-owned allowed paths",
      status: forbiddenFilesChanged.length ? "FAILED" : "PASSED",
      exitCode: null,
      durationMs: Math.round(performance.now() - start),
      stdout: filesChanged.length
        ? filesChanged.join("\n")
        : "No files changed.",
      stderr: forbiddenFilesChanged.length
        ? `Forbidden changes: ${forbiddenFilesChanged.join(", ")}`
        : "",
      outputTruncated: false,
      assertions: [],
    },
  };
}
