# Controlled benchmark repository (placeholder)

Phase 1 reserves this location for one small customer-service benchmark. No benchmark source, executable checks, coding agent, or runner exists yet. File paths shown in the interface describe the planned repository and are illustrative.

The next milestone should add:

1. A minimal TypeScript customer endpoint with a seeded in-memory dataset and a stable legacy `GET /customers` → `Customer[]` contract.
2. `docs/api-conventions.md` requiring backward compatibility and a reusable pagination utility.
3. Unit, integration, and protected contract checks, including the no-query-parameter caller.
4. Fixed breaking and compatible patches that exercise the same task from the same revision.
5. A runner that operates in an isolated temporary copy, validates changed-file scope, captures deterministic results, and cleans up.

Hidden evaluator checks should live outside the agent-editable copy. Do not add a general repository orchestration platform or an LLM until this deterministic baseline is trustworthy.
