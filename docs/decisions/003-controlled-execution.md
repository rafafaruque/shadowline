# ADR 003: Controlled execution

Status: accepted and implemented in Phase 2 for known local patches.

## Context

Coding agents eventually need their output executed and tested. Allowing model-generated shell commands would unnecessarily expand the prototype's trust boundary. Editable package scripts or test configurations could also weaken the evaluator and hide a failing patch.

## Decision

The coding agent will eventually propose file modifications only. Shadowline owns execution and runs a fixed allowlist of validation commands inside a controlled benchmark workspace.

Phase 2 accepts exactly `baseline`, `pagination-breaking`, or `pagination-compatible`. Runtime Zod validation rejects unknown IDs and extra request fields, including commands, flags, environment variables, and paths. Controlled patches replace only the customer route. The runner invokes the installed Node/TypeScript/Vitest executables with fixed argument arrays and `shell: false`; it never evaluates model text as a command or invokes patch-defined package scripts.

The baseline is copied into a fresh temporary directory. Hidden tests and trusted compiler/test configuration are staged in a sibling harness outside editable source. Public tests are also evaluated from trusted copies. File hashes enforce scope before and after validation. Bounded output, fixed timeouts, independently parsed test reports, and `finally` cleanup preserve a reviewable evidence trail.

Dependencies are installed once from the benchmark lockfile with lifecycle scripts disabled, then linked into disposable workspaces. Each evaluation requires no package installation or network access. The local UI endpoint is disabled in production, requires a same-origin loopback request, and accepts only the fixed ID schema.

## Tradeoff

This limits generality but substantially improves determinism, control, and interpretability. For a two-day prototype, this is intentional. Full-file replacements are adequate for the single benchmark and avoid an unnecessary general diff/execution API.

Directory isolation and allowlisted commands are not a security sandbox for arbitrary code. Source under test still executes with local process privileges and could access sibling files or shared dependencies if malicious. These constraints are appropriate only for the reviewed, checked-in patches accepted in Phase 2. Before accepting a probabilistic agent's untrusted output, establish an explicit execution isolation boundary; do not claim that temporary copies alone provide one. Uncatchable host termination can also prevent cleanup despite `finally`.

## Alternatives considered

- **Model-defined shell commands:** flexible, but adds an unnecessary execution interface and makes validation inconsistent.
- **Run editable package scripts:** familiar, but a proposed patch could weaken the scripts; direct trusted invocations are clearer.
- **Reinstall dependencies per attempt:** independent but slower and network-sensitive; locked, preinstalled dependencies are sufficient for reviewed fixtures.
- **Containers and general orchestration now:** excessive for this narrowly controlled phase. Broader code execution requires revisiting isolation before expanding inputs.
