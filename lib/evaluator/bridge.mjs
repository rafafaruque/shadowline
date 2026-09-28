// Trusted Vitest-side transport. `settings` is supplied by sandbox.ts, never the model.
/* global settings */
import { spawn } from "node:child_process";
import { afterAll } from "vitest";

let child;
let sequence = 0;
let buffer = "";
let errorOutput = "";
const waiting = new Map();
let failed = false;
function failAll(message) {
  failed = true;
  for (const entry of waiting.values()) {
    clearTimeout(entry.timer);
    entry.reject(new Error(message));
  }
  waiting.clear();
  child?.kill("SIGKILL");
}
function start() {
  child = spawn(
    "/usr/bin/sandbox-exec",
    [
      "-p",
      settings.profile,
      settings.node,
      "--import",
      settings.loader,
      settings.worker,
      settings.app,
    ],
    {
      cwd: settings.scratch,
      shell: false,
      stdio: ["pipe", "pipe", "pipe"],
      env: {
        PATH: "/usr/bin:/bin",
        NODE_ENV: "test",
        TMPDIR: settings.scratch,
        TSX_DISABLE_CACHE: "1",
      },
    },
  );
  child.on("error", () => failAll("Sandboxed application could not start"));
  child.on("exit", () =>
    failAll(`Sandboxed application exited: ${errorOutput.slice(0, 2000)}`),
  );
  child.stderr.on("data", (data) => {
    errorOutput += data.toString();
    if (errorOutput.length > 64000)
      failAll("Application output exceeded limit");
  });
  child.stdout.on("data", (data) => {
    buffer += data.toString();
    if (buffer.length > 200000)
      return failAll("Application output exceeded limit");
    let boundary;
    while ((boundary = buffer.indexOf("\n")) !== -1) {
      const line = buffer.slice(0, boundary);
      buffer = buffer.slice(boundary + 1);
      try {
        const response = JSON.parse(line);
        const entry = waiting.get(response.id);
        if (
          !entry ||
          !Number.isInteger(response.status) ||
          response.status < 200 ||
          response.status > 599 ||
          typeof response.body !== "string" ||
          !Array.isArray(response.headers)
        )
          throw new Error("Invalid application response");
        clearTimeout(entry.timer);
        waiting.delete(response.id);
        entry.resolve(
          new Response(response.body, {
            status: response.status,
            headers: response.headers,
          }),
        );
      } catch {
        failAll("Invalid sandboxed application response");
      }
    }
  });
}
export const app = {
  request(url) {
    if (failed)
      return Promise.reject(new Error("Sandboxed application is unavailable"));
    if (!child) start();
    return new Promise((resolve, reject) => {
      const id = ++sequence;
      const timer = setTimeout(
        () => failAll("Sandboxed application request timed out"),
        4000,
      );
      waiting.set(id, { resolve, reject, timer });
      child.stdin.write(JSON.stringify({ id, url }) + "\n");
    });
  },
};
afterAll(async () => {
  if (child && child.exitCode === null) {
    await new Promise((resolve) => {
      child.once("close", resolve);
      child.kill("SIGKILL");
    });
  }
});
