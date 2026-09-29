import { spawn, spawnSync } from "node:child_process";
import { constants } from "node:fs";
import {
  access,
  copyFile,
  chmod,
  mkdir,
  mkdtemp,
  readFile,
  realpath,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import { homedir, tmpdir } from "node:os";
import path from "node:path";
import { z } from "zod";
import { sandboxProfile } from "../evaluator/sandbox";
import { agentProposalSchema, type ContextSnapshot } from "./schemas";
import {
  ProviderError,
  type ModelProvider,
  type ProviderResult,
} from "./provider";

const MAX_BYTES = 1_000_000;
const TIMEOUT_MS = 180_000;

export async function resolveCodexBinary() {
  const configured = process.env.SHADOWLINE_CODEX_BIN?.trim();
  const candidates = configured
    ? [configured]
    : (process.env.PATH ?? "")
        .split(path.delimiter)
        .filter(Boolean)
        .map((dir) => path.join(dir, "codex"));
  for (const candidate of candidates) {
    if (!path.isAbsolute(candidate)) continue;
    try {
      await access(candidate, constants.X_OK);
      return await realpath(candidate);
    } catch {
      /* next PATH entry */
    }
  }
  throw new ProviderError(
    "Codex CLI is unavailable. Add codex to the server PATH or set SHADOWLINE_CODEX_BIN to its absolute executable path.",
  );
}

function localAuthPath() {
  return path.join(
    process.env.CODEX_HOME || path.join(homedir(), ".codex"),
    "auth.json",
  );
}

export async function codexAvailability() {
  try {
    await resolveCodexBinary();
    await access(localAuthPath(), constants.R_OK);
    return {
      ready: true,
      message: "Uses local Codex login; no Gemini or OpenAI API key required.",
    };
  } catch {
    return {
      ready: false,
      message:
        "Install Codex CLI and run codex login locally. This adapter requires file-backed local authentication.",
    };
  }
}

/** Outer boundary applies to the CLI itself, not just its optional shell commands. */
export function codexSandboxProfile(
  root: string,
  binary: string,
  repository = process.cwd(),
) {
  return (
    sandboxProfile([binary], root) +
    `
(allow network*)
(allow file-read* (subpath "/private/etc") (subpath "/Library/Preferences") (subpath "/Library/Keychains"))
(deny file-read* (subpath ${JSON.stringify(repository)}))
(deny file-write* (subpath ${JSON.stringify(repository)}))`
  );
}

// A separate provider entry is necessary: built-in provider IDs cannot be overridden.
// Omitting base_url preserves Codex's native auth-dependent endpoint selection.
export const codexConfigOverrides = [
  'approval_policy="never"',
  'web_search="disabled"',
  'model_provider="shadowline"',
  'model_providers.shadowline.name="OpenAI via local Codex login"',
  'model_providers.shadowline.wire_api="responses"',
  "model_providers.shadowline.requires_openai_auth=true",
  "model_providers.shadowline.request_max_retries=0",
  "model_providers.shadowline.stream_max_retries=0",
  "model_providers.shadowline.supports_websockets=false",
  'model_reasoning_effort="low"',
  "project_doc_max_bytes=0",
  "skills.bundled.enabled=false",
  "skills.include_instructions=false",
  "features.skip_host_skill_discovery=true",
  "suppress_unstable_features_warning=true",
  "features.shell_tool=false",
  "features.unified_exec=false",
  "features.shell_snapshot=false",
  "features.apps=false",
  "features.plugins=false",
  "features.remote_plugin=false",
  "features.hooks=false",
  "features.memories=false",
  "features.multi_agent=false",
  "features.multi_agent_v2=false",
  "agents.enabled=false",
  "features.browser_use=false",
  "features.computer_use=false",
  "features.image_generation=false",
  "features.view_image=false",
  "features.code_mode=false",
  "features.code_mode_host=false",
  "features.unbounded_connection_retries=false",
  "features.skill_search=false",
  "features.skill_mcp_dependency_install=false",
  "features.goals=false",
  "features.sleep_tool=false",
  "features.tool_suggest=false",
  "analytics.enabled=false",
  'cli_auth_credentials_store="file"',
];

export interface CodexSession {
  root: string;
  cwd: string;
  binary: string;
  args: string[];
  env: NodeJS.ProcessEnv;
  outputFile: string;
  profile: string;
}

/** Internal test overrides are never accepted by the HTTP endpoint. */
export async function withCodexSession<T>(
  context: ContextSnapshot,
  work: (session: CodexSession) => Promise<T>,
  options?: { binary: string; authPath: string },
) {
  const binary = await realpath(
    options?.binary ?? (await resolveCodexBinary()),
  );
  const root = await realpath(
    await mkdtemp(path.join(tmpdir(), "shadowline-codex-")),
  );
  try {
    await chmod(root, 0o700);
    const cwd = path.join(root, "input");
    const sessionHome = path.join(root, "home");
    const authDirectory = path.join(sessionHome, ".codex");
    await mkdir(cwd);
    await mkdir(authDirectory, { recursive: true, mode: 0o700 });
    try {
      await copyFile(
        options?.authPath ?? localAuthPath(),
        path.join(authDirectory, "auth.json"),
      );
      await chmod(path.join(authDirectory, "auth.json"), 0o600);
    } catch {
      throw new ProviderError(
        "Codex local authentication is unavailable. Run codex login locally; file-backed authentication is required.",
      );
    }
    const schemaFile = path.join(root, "proposal-schema.json");
    const instructionsFile = path.join(root, "instructions.txt");
    await writeFile(
      schemaFile,
      JSON.stringify(z.toJSONSchema(agentProposalSchema)),
      { mode: 0o600 },
    );
    await writeFile(instructionsFile, context.systemPrompt, { mode: 0o600 });
    const outputFile = path.join(root, "proposal.json");
    const args = [
      "exec",
      "--ignore-user-config",
      "--ignore-rules",
      "--strict-config",
      "--ephemeral",
      "--skip-git-repo-check",
      "--sandbox",
      "read-only",
      "--color",
      "never",
      "--json",
      "--model",
      context.model,
      "--cd",
      cwd,
      "--output-schema",
      schemaFile,
      "--output-last-message",
      outputFile,
      ...[
        ...codexConfigOverrides,
        `model_instructions_file=${JSON.stringify(instructionsFile)}`,
      ].flatMap((setting) => ["-c", setting]),
      "-",
    ];
    // These variables have their standard meaning, scoped only to the child.
    // No inherited API keys, project paths, NODE_OPTIONS, MCP config, or session IDs.
    const env: NodeJS.ProcessEnv = {
      PATH: "/usr/bin:/bin:/opt/homebrew/bin",
      HOME: sessionHome,
      CODEX_HOME: authDirectory,
      TMPDIR: root,
      NODE_ENV: "production",
      NO_COLOR: "1",
    };
    return await work({
      root,
      cwd,
      binary,
      args,
      env,
      outputFile,
      profile: codexSandboxProfile(root, binary),
    });
  } finally {
    await rm(root, { recursive: true, force: true, maxRetries: 3 });
  }
}

const eventSchema = z
  .object({
    type: z.string(),
    thread_id: z.string().optional(),
    item: z.object({ type: z.string() }).passthrough().optional(),
    usage: z
      .object({
        input_tokens: z.number().nonnegative(),
        cached_input_tokens: z.number().nonnegative().default(0),
        output_tokens: z.number().nonnegative(),
      })
      .optional(),
  })
  .passthrough();

function eventFailure(event: z.infer<typeof eventSchema>) {
  if (event.type === "turn.failed" || event.type === "error")
    return "Codex CLI reported a provider/transport failure. No automatic retry was made.";
  // Native Codex emits startup warnings as item.completed with item.type=error.
  // These are diagnostics, not tool execution or proof that a turn succeeded.
  // Success still requires exit 0, exactly one completed turn, and a proposal.
  if (
    event.item &&
    !["agent_message", "reasoning", "error"].includes(event.item.type)
  )
    return "Codex CLI emitted a tool action or unsupported item; proposal-only execution was stopped.";
}

export function parseCodexEvents(stdout: string) {
  let responseId: string | null = null;
  let tokenUsage: ProviderResult["tokenUsage"] = null;
  let completed = 0;
  for (const line of stdout.split("\n").filter(Boolean)) {
    const event = eventSchema.parse(JSON.parse(line));
    if (event.type === "thread.started") responseId = event.thread_id ?? null;
    const failure = eventFailure(event);
    if (failure) throw new ProviderError(failure);
    if (event.type === "turn.completed") {
      completed++;
      if (event.usage)
        tokenUsage = {
          input: event.usage.input_tokens,
          cachedInput: event.usage.cached_input_tokens,
          output: event.usage.output_tokens,
          total: event.usage.input_tokens + event.usage.output_tokens,
        };
    }
  }
  if (completed !== 1)
    throw new ProviderError(
      "Codex CLI did not complete exactly one generation turn.",
    );
  return { responseId, tokenUsage };
}

async function executeCodex(session: CodexSession, prompt: string) {
  return new Promise<string>((resolve, reject) => {
    let stdout = "";
    let size = 0;
    let pending = "";
    let failure: string | undefined;
    const child = spawn(
      "/usr/bin/sandbox-exec",
      ["-p", session.profile, session.binary, ...session.args],
      {
        cwd: session.cwd,
        env: session.env,
        shell: false,
        detached: true,
        stdio: ["pipe", "pipe", "pipe"],
      },
    );
    function stop(message: string) {
      failure ??= message;
      if (child.pid) {
        try {
          process.kill(-child.pid, "SIGKILL");
        } catch {
          child.kill("SIGKILL");
        }
      }
    }
    const timer = setTimeout(
      () => stop("Codex CLI timed out. No automatic retry was made."),
      TIMEOUT_MS,
    );
    child.on("error", () => {
      failure = "Codex CLI could not start in its restricted environment.";
    });
    child.stdin.on("error", () => {});
    child.stdout.on("data", (data: Buffer) => {
      size += data.length;
      if (size > MAX_BYTES) return stop("Codex CLI output exceeded the limit.");
      const chunk = data.toString();
      stdout += chunk;
      pending += chunk;
      let index: number;
      while ((index = pending.indexOf("\n")) >= 0) {
        const line = pending.slice(0, index);
        pending = pending.slice(index + 1);
        if (!line) continue;
        try {
          const event = eventSchema.parse(JSON.parse(line));
          const eventError = eventFailure(event);
          if (eventError) stop(eventError);
        } catch {
          stop("Codex CLI emitted invalid event data.");
        }
      }
    });
    // Raw diagnostics may contain private local paths or auth details. Never persist them.
    child.stderr.on("data", (data: Buffer) => {
      size += data.length;
      if (size > MAX_BYTES) stop("Codex CLI output exceeded the limit.");
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      if (failure || code !== 0)
        reject(
          new ProviderError(
            failure ??
              `Codex CLI exited with code ${code ?? "unknown"}. No automatic retry was made.`,
          ),
        );
      else resolve(stdout);
    });
    child.stdin.end(prompt);
  });
}

export function codexCliProvider(options?: {
  binary: string;
  authPath: string;
}): ModelProvider {
  return {
    id: "codex-cli",
    async generate(context) {
      if (!/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,99}$/.test(context.model))
        throw new ProviderError("Invalid Codex model identifier.");
      let result: ProviderResult;
      try {
        result = await withCodexSession(
          context,
          async (session) => {
            const version = spawnSync(
              "/usr/bin/sandbox-exec",
              ["-p", session.profile, session.binary, "--version"],
              {
                cwd: session.cwd,
                env: session.env,
                encoding: "utf8",
                timeout: 5000,
              },
            );
            if (
              version.status !== 0 ||
              !/^codex-cli [\w.+-]+\s*$/.test(version.stdout)
            )
              throw new ProviderError(
                "Codex CLI sandbox/version preflight failed.",
              );
            const stdout = await executeCodex(session, context.userPrompt);
            const usage = parseCodexEvents(stdout);
            if ((await stat(session.outputFile)).size > MAX_BYTES)
              throw new ProviderError(
                "Codex CLI proposal exceeded the size limit.",
              );
            return {
              text: await readFile(session.outputFile, "utf8"),
              model: context.model,
              ...usage,
              error: null,
              metadata: {
                cliVersion: version.stdout.trim(),
                modelSource: "Explicit --model argument; no model fallback",
                sandbox: "macos-seatbelt-proposal-only-v1",
                inputCleanedUp: true,
              },
            };
          },
          options,
        );
      } catch (error) {
        if (error instanceof ProviderError) throw error;
        throw new ProviderError(
          "Codex CLI could not return a complete structured response. No automatic retry was made.",
        );
      }
      return result;
    },
  };
}
