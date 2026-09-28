import { constants } from "node:fs";
import { lstat, open, realpath } from "node:fs/promises";
import path from "node:path";
import { agentAllowedPaths } from "./configs";
import type { AgentProposal } from "./schemas";

export class PatchValidationError extends Error {
  constructor(
    message: string,
    public readonly rejectedPaths: string[],
  ) {
    super(message);
  }
}
export async function validateProposedPaths(
  files: AgentProposal["files"],
  workspace: string,
) {
  const rejected: string[] = [];
  const seen = new Set<string>();
  const root = await realpath(workspace);
  for (const file of files) {
    const name = file.path;
    if (
      path.isAbsolute(name) ||
      name.includes("\\") ||
      name.includes("\0") ||
      name.split("/").some((part) => part === ".." || part === "." || !part) ||
      !agentAllowedPaths.includes(name) ||
      seen.has(name)
    ) {
      rejected.push(name);
      continue;
    }
    seen.add(name);
    let current = root;
    for (const part of name.split("/")) {
      current = path.join(current, part);
      const stat = await lstat(current);
      if (stat.isSymbolicLink()) {
        rejected.push(name);
        break;
      }
    }
    const resolved = await realpath(path.join(root, name));
    if (!resolved.startsWith(root + path.sep)) rejected.push(name);
  }
  if (rejected.length)
    throw new PatchValidationError(
      "Proposed paths were rejected; no files were applied.",
      [...new Set(rejected)],
    );
}
export async function applyProposedFiles(
  files: AgentProposal["files"],
  workspace: string,
) {
  await validateProposedPaths(files, workspace); // Complete validation before the first write.
  for (const file of files) {
    const handle = await open(
      path.join(workspace, file.path),
      constants.O_WRONLY | constants.O_TRUNC | constants.O_NOFOLLOW,
    );
    try {
      await handle.writeFile(file.content, "utf8");
    } finally {
      await handle.close();
    }
  }
}
