# ADR 006: AI-generated diagnosis is a hypothesis; deterministic re-evaluation validates interventions

Status: implemented for the local Phase 4 experiment workflow.

## Decision

Use a model to propose a failure explanation and an intervention, never to assign correctness. A plausible explanation can be incomplete, unsupported, or wrong. An LLM judge would introduce another probabilistic opinion into the acceptance boundary and could reward persuasive reasoning instead of executable behavior. Shadowline therefore retains the same independent typecheck, public tests, contract tests, scope checks, and critical-regression rules before and after an intervention.

Diagnosis receives the original task, exact original input snapshot, before/after file contents, bounded public and contract failure summaries, and existing repository intent. It does not receive hidden-test source, raw test logs, stack traces, harness configuration, or evaluator source. Failure names and first-line assertion messages are diagnosis evidence only. The coding rerun never receives that diagnostic evidence or the model's prose.

Both providers support a caller-selected structured response schema while preserving the existing coding-proposal schema by default. Zod validates the diagnosis classifications, explanation, evidence references, and recommended intervention. Unknown evidence IDs or extra verdict fields are rejected. Evidence references establish traceability, not the truth of the explanation. A diagnosis error or provider outage is recorded and does not trigger a coding attempt.

## Immutable history and approval

The original run JSON remains byte-for-byte unchanged. Diagnosis and experiment evidence live in separate owner-only local JSON records linked by baseline run ID and SHA-256. Baseline pages show these linked records without rewriting historical model output or evaluation. The experiment stores exact diagnosis input, provider/model, response metadata, usage, hypothesis, recommended intervention, engineer-edited draft, approved input snapshot, approval provenance, and the resulting run ID.

An engineer can select additional files from a fixed repository-intent allowlist, select repository-grounded acceptance criteria and validation expectations, and edit the rationale. The baseline compatibility criterion remains mandatory. These controlled selections prevent copying diagnostic failure messages or hidden assertions into the coding prompt. Rationale is review evidence and is deliberately excluded from that prompt. Requested validation expectations never disable evaluator checks.

Human approval is explicit and bound to the saved proposal hash, including exact file contents, model, task, criteria, requested checks, and prompts. Editing invalidates approval. Stale revisions/hashes are rejected. Approving does not execute: a separate action starts exactly one attempt. The execution slot is persisted before invoking the provider. Duplicate requests, provider errors, and crashes cannot automatically reuse that slot. A new experiment requires a new review and approval.

Before diagnosis, the current baseline workspace must match the historical source fingerprint. Approval and execution also check the original run's byte hash and a digest of benchmark files, public acceptance tests, and evaluator implementation. Changed inputs block execution. These digests remain host-side. The model never controls benchmark files, test selection, commands, expected outputs, or evaluator policy.

## Re-evaluation and interpretation

The approved context-rich attempt uses the same task, provider, and resolved model, and starts from the original benchmark rather than the generated baseline patch. It goes through the existing structured-proposal validator, isolated file writer, and deterministic evaluator. Source scope and sandbox protections are unchanged. `PROVIDER_ERROR` retains its neutral semantics: no coding verdict, no first-pass failure, no autonomy evidence, and no automatic retry.

The comparison presents only measured results from the two linked runs. Unavailable usage, cost, runtime, or evaluation is labeled explicitly. First-pass acceptance is scoped to each task/configuration/provider/model series, excluding provider outages. Diagnosis overhead is recorded separately from coding runtime/cost. Fixture aggregates are not used or updated.

A passing intervention is evidence that the changed inputs helped on this benchmark. One pair cannot establish universal diagnosis accuracy, population reliability, or causality; multiple context changes and model sampling variability remain confounders. A failing intervention remains visible with its actual tests and review requirement. Neither result changes production merge/deployment permissions.

## Operational limits and checks

This is a single-machine development-only workflow with loopback/same-origin, bounded, strict-schema HTTP actions. Local locks serialize mutations. Forced termination may leave a running record or lock; it never authorizes an automatic rerun. JSON records are unencrypted and not tamper-proof against the local operator. A stronger audit and execution service is needed before multi-user deployment.

Controlled tests exercise diagnosis schema/evidence validation, prompt separation, immutable baseline bytes, hash-bound approval, edit invalidation, stale actions, one-shot execution, provider outages, and the unchanged evaluator. Browser checks cover the five product questions, editable review, explicit approval, separate execution, production restrictions, and mobile layout; browser provider submissions are intercepted. Real model calls and their evidence remain separate from those tests.
