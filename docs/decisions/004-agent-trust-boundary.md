# ADR 004: Agent trust boundary

Status: accepted and implemented for the local Phase 3 prototype.

## Context

The coding model must modify real files for the experiment to be meaningful. Arbitrary repository or shell access would unnecessarily expand its authority. A temporary directory alone cannot protect hidden tests, reports, credentials, or dependencies when generated code executes.

## Decision

The model produces structured full-file modifications only. Shadowline validates paths, applies files, owns process execution, and owns evaluation. Gemini Developer API is the sole real provider, behind a provider-independent interface. Credentials remain server-side in `GEMINI_API_KEY`; no tools, shell, repository browsing, automatic retry, or evaluator-feedback loop is exposed to the model.

Context is assembled from an explicit per-configuration file list, never a repository dump. Neither configuration receives hidden tests or evaluator infrastructure. Baseline omits API conventions, the helper, and the explicit compatibility criterion. Rich context adds those inputs without changing ground-truth evaluation. Exact prompts and file contents/hashes are saved.

Strict Zod validation rejects malformed responses. The entire file list is validated before the first write: absolute paths, traversal, backslashes, duplicate targets, unexpected paths, and symlink components are rejected. The task permits only the existing `src/routes/customers.ts`, narrower than a general `src/**` allowlist. Tests, package manifests/lockfiles, hidden tests, evaluator infrastructure, and Shadowline application code are never writable. Canonical paths and `O_NOFOLLOW` add protection in the host-owned temporary workspace.

Generated code executes only in a macOS `sandbox-exec` worker with a deny-by-default Seatbelt profile. The worker reads the temporary benchmark, installed runtime dependencies, and necessary system runtime paths. It writes only disposable scratch and `/dev/null`; network access and host/home/hidden-test/report contents are denied. A minimal environment excludes credentials and Node preload options. This prototype fails closed on unsupported platforms or sandbox setup failure, before spending a model request.

Trusted public/contract tests run outside the restricted worker and communicate through bounded JSON-lines stdin/stdout. Model code can affect HTTP behavior, but cannot rewrite assertions or result reports. Tests still own PASS/FAIL, including legacy contract regressions. The trusted compiler also runs inside the sandbox, with access only to source, dependencies, and its fixed configuration; no model-defined commands, npm scripts, plugins, or test configurations run. The evaluator retains timeouts, output limits, expected assertion counts, exit/report consistency, before/after scope hashes, and finally cleanup.

Any failed/incomplete validation, forbidden-path attempt, or critical regression requires human review. A passing benchmark does not grant production merge or deployment permission. Null telemetry remains unknown. One UI click or CLI invocation makes one provider request; no automatic correction, retry, diagnosis, intervention, or model fallback occurs.

The local API is development-only, loopback and same-origin, with strict bounded task/config inputs. JSON run records are stored separately from authored fixture aggregates and include unsuccessful API requests. A file lock prevents overlapping UI/CLI attempts.

## Tradeoff

Structured replacements and a single writable route are less flexible than a fully autonomous agent, but create a clear boundary for one benchmark. stdio transport adds implementation complexity to keep tests and reports outside generated-code execution. The application worker does see the request URLs tests exercise; it never receives test source or expectations, and no feedback is returned to the model.

This is a local macOS prototype, not a hosted hostile-code service. Seatbelt is platform-specific; its profile allows system/runtime reads and process creation, and is not a VM or a hard memory/CPU quota. Time/output limits and filesystem/network restrictions are tested, but resource-exhaustion and OS vulnerabilities require a stronger maintained container/VM boundary before expansion. The trusted dependency install and host user are outside the threat model. Forced process termination can leave workspaces, incomplete records, or a stale lock. Local JSON is neither encrypted nor a tamper-proof audit trail.

## Validation

Tests exercise forbidden batch paths and symlinks before writes, prompt exclusions, one-request provider behavior, malformed output, persistent attempt numbering, both controlled code outcomes through the restricted worker, and denied hidden-test reads, host writes, network access, and credential inheritance. Existing Phase 2 controls continue to prove baseline PASS, breaking FAIL/critical, and compatible PASS.
