# Phase 4: One real diagnosis, one approved intervention

Experiment: `1ede9ceb-1c45-4d5f-9c39-9b638f65216d`.

- [Local comparison](http://127.0.0.1:3000/experiments/real/1ede9ceb-1c45-4d5f-9c39-9b638f65216d)
- [Original baseline](http://127.0.0.1:3000/agent/runs/4b299b77-b63f-4ee3-ae13-06c5e0d2f956)
- [Context-rich run](http://127.0.0.1:3000/agent/runs/c0cc3ec2-68b7-43d6-8981-42728a91bd38)

## Observed baseline and AI hypothesis

The baseline provider succeeded and generated a route using `page` and `limit`, a custom parser, additional response fields, and a custom error message. Typecheck passed; four public and fourteen contract assertions failed. The historical-array compatibility checks passed, so critical failure remained false. Human review was required.

One real diagnosis request returned **CONTEXT_GAP**, with **ACCEPTANCE_CRITERIA** and **VALIDATION_GAP** as secondary hypotheses. It cited the exact original input, generated patch, public/contract failure summaries, and existing repository conventions/helper. Its hypothesis is that the omitted intent and empty criteria encouraged a plausible but incompatible API design. This does not establish a general model limitation or prove a causal mechanism.

The diagnosis is stored in the experiment sidecar and linked from the baseline page. The original baseline JSON bytes, generated output, and evaluator verdict are unchanged. Exact diagnostic prompts, validated evidence references, usage, and timings are inspectable. Hidden-test source and evaluator infrastructure were never supplied to a model. Contract failure summaries were supplied only to the diagnosis model, never the coding rerun.

## Approved intervention

The original task was unchanged: `Add pagination support to GET /customers.`

The four original context files remained:

- `src/app.ts`
- `src/routes/customers.ts`
- `src/data/customers.ts`
- `tests/customers.test.ts`

Exactly two context files were added, using their existing repository contents:

- `docs/api-conventions.md`
- `src/lib/pagination.ts`

The exact acceptance criteria in the approved prompt were:

1. Existing callers without pagination query parameters must continue receiving the historical Customer[] response.
2. Pagination uses page and pageSize query parameters, with opt-in behavior as documented in docs/api-conventions.md.
3. Use src/lib/pagination.ts and follow the repository's documented defaults, validation rules, response shape, and error contract.

Requested validation was `TYPECHECK`, `PUBLIC`, `INTEGRATION`, and `CONTRACT`. The original AI recommendation requested TYPECHECK, PUBLIC, and CONTRACT; the engineer draft explicitly added INTEGRATION to match the existing configuration. This edited draft was shown before execution. All deterministic checks run regardless of these prompt expectations.

The user explicitly approved revision 1 in the conversation. Approval was recorded with source `USER_MESSAGE` at `2026-09-29T04:54:21.905Z`, bound to proposal SHA-256 `8170f4a0dd9bf77619952e00e3531ff6434ffca79bc6359f203584f9e29b9371`. Exactly one context-rich attempt followed, with no retry. The coding prompt contained repository intent, not diagnostic prose, hidden-test failures, or copied assertions. The baseline's generated patch was not reused.

## Measured comparison

Both attempts used `codex-cli`, explicit model `gpt-6-astra`, and `codex-cli 0.155.0-alpha.16.3`. The compatible executable was pinned server-side because installed CLI 0.158.0 failed managed-preferences startup inside the unchanged sandbox during earlier preflight. No sandbox protections were relaxed.

| Measurement                                         | Baseline                  | Context-rich              |
| --------------------------------------------------- | ------------------------- | ------------------------- |
| Provider outcome                                    | Succeeded                 | Succeeded                 |
| Typecheck                                           | Passed                    | Passed                    |
| Public tests                                        | 7 passed / 4 failed       | 11 passed / 0 failed      |
| Contract tests                                      | 2 passed / 14 failed      | 16 passed / 0 failed      |
| Proposed / applied files                            | `src/routes/customers.ts` | `src/routes/customers.ts` |
| Critical failure                                    | No                        | No                        |
| Overall                                             | FAILED                    | PASSED                    |
| Human review required by benchmark                  | Yes                       | No                        |
| First coding attempt accepted in this configuration | No                        | Yes                       |
| Coding-attempt runtime                              | 19,429 ms                 | 11,187 ms                 |
| Input tokens                                        | 3,204                     | 3,976                     |
| Output tokens                                       | 516                       | 245                       |
| Cached input tokens                                 | 0                         | 0                         |
| Total tokens                                        | 3,720                     | 4,221                     |
| Inference cost                                      | Unknown                   | Unknown                   |
| Temporary workspace cleanup                         | Confirmed                 | Confirmed                 |

Diagnosis overhead is separate: 17,693 ms, 7,753 input tokens, 514 output tokens, 8,267 total tokens, zero cached input tokens, and unknown cost. No fixture measurements or inferred prices fill missing telemetry. First-pass acceptance is scoped per configuration and excludes provider errors; this is not a population acceptance-rate estimate.

Both coding records have baseline fingerprint `60bcd10f600f72accefc6982b43199374c0702a6476fbebdff238a0610dfd580`. A separate before/after SHA-256 manifest confirmed benchmark files, expected outputs, hidden tests, evaluator sources, and all previous run records were unchanged. Exactly one new coding-run record was created during Phase 4.

The new generated route imports and uses `parsePagination`, `paginate`, and `PaginationInputError`; it preserves the legacy array when pagination is absent and returns the repository's documented error contract for invalid input. Independent tests—not the model's summary—established the passing result.

## Justified and unjustified conclusions

This is evidence that the combined context-rich intervention helped on this benchmark. It supports supplying existing repository conventions and helpers instead of leaving an agent to infer API semantics. Benchmark review is no longer required for this passing attempt, but production review and deployment permission are separate.

One pair cannot prove the diagnosis universally, establish general model reliability, isolate which added file/criterion mattered, rule out sampling variability, or justify autonomous production merges. There was no LLM correctness judge and no adjustment to expected outcomes.

## Project validation

- Typecheck passed.
- Lint passed.
- All 34 application tests passed, including the original 25 and diagnosis/approval/one-attempt safeguards.
- All 13 browser tests passed, including intercepted edit → approve → execute interactions and production restrictions.
- Production build passed.

Browser tests made no live provider calls or real approval edits. The rationale field needed an explicit accessible label; the corrected full browser suite passed before the live intervention. The saved result and comparison were also checked directly after completion.
