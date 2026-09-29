// Hosted runtime can read the compiled app, but must never execute children or
// access local-only evidence, benchmark dependencies, Codex state, or credentials.
import childProcess from "node:child_process";
import fs from "node:fs";
import fsPromises from "node:fs/promises";
import { syncBuiltinESMExports } from "node:module";

function deny(reason) {
  throw new Error(`Hosted demo boundary violation: ${reason}`);
}
for (const method of [
  "spawn",
  "spawnSync",
  "exec",
  "execSync",
  "execFile",
  "execFileSync",
  "fork",
])
  childProcess[method] = () => deny(`child_process.${method}`);

function checkPath(value) {
  const name = String(value);
  // Emulate a clean deployment without dotenv files. Next probes these at startup.
  if (/(^|[/\\])\.env(?:\.[^/\\]*)?$/.test(name)) {
    const error = new Error("No dotenv files in hosted test environment");
    error.code = "ENOENT";
    throw error;
  }
  if (
    /(^|[/\\])(?:\.shadowline|\.codex|benchmark-repo|\.env(?:\.[^/\\]*)?)(?:[/\\]|$)/.test(
      name,
    )
  )
    deny("local-only filesystem access");
}
for (const [target, methods] of [
  [
    fs,
    [
      "readFile",
      "readFileSync",
      "readdir",
      "readdirSync",
      "open",
      "openSync",
      "stat",
      "statSync",
      "access",
      "accessSync",
      "mkdir",
      "mkdirSync",
      "writeFile",
      "writeFileSync",
      "createReadStream",
    ],
  ],
  [
    fsPromises,
    ["readFile", "readdir", "open", "stat", "access", "mkdir", "writeFile"],
  ],
]) {
  for (const method of methods) {
    const original = target[method];
    target[method] = function (file, ...args) {
      checkPath(file);
      return original.call(this, file, ...args);
    };
  }
}
syncBuiltinESMExports();
