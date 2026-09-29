# Codex CLI baseline evidence

Exactly one live baseline invocation was made during this implementation. It was not retried.

| Field                                | Recorded result                                    |
| ------------------------------------ | -------------------------------------------------- |
| Run ID                               | `2401e5cb-dd75-4d12-880e-d2afc1396839`             |
| Started                              | `2026-09-29T04:06:44.374Z`                         |
| Provider                             | `codex-cli`                                        |
| Requested model                      | `gpt-6-astra`                                      |
| Resolved model                       | Unknown; no completed provider response            |
| Configuration                        | `baseline` / `customers-pagination`                |
| Status                               | `PROVIDER_ERROR`                                   |
| Elapsed                              | 508 ms                                             |
| Proposed / applied files             | None / none                                        |
| Typecheck / public / contract checks | Not run; no proposal was returned                  |
| Critical failure                     | False in the record; no code was evaluated         |
| Human review required                | False; no generated patch exists to review         |
| First-pass acceptance                | Null; excluded from the coding-attempt denominator |
| Autonomy evidence                    | None                                               |

The original record remains at `.shadowline/runs/2401e5cb-dd75-4d12-880e-d2afc1396839.json`, inspectable at [the local run page](http://127.0.0.1:3000/agent/runs/2401e5cb-dd75-4d12-880e-d2afc1396839) with the development server running. Previous Gemini records remain intact.

## Adapter correction

The saved error reads: “Codex CLI attempted a tool action; proposal-only execution was stopped.” Subsequent offline reproduction found that this guard also matched native CLI startup warnings, emitted as `item.completed` with `item.type = error`. The original run did not preserve raw events, so that text is not evidence that the model attempted a tool action, nor does it establish a backend outage. The record is left unchanged for transparency.

The event guard now accepts diagnostic items while still requiring a successful exit, exactly one completed turn, and a returned proposal. Top-level failures and tool-action items still stop execution. Regression tests include the native code-mode-disabled warning. No tools were enabled to suppress this warning.

## Offline validation versus live evidence

The installed CLI (`0.155.0-alpha.16.3`) was exercised against a loopback mock HTTP service with dummy authentication and no real inference. A synthetic structured streaming response completed and returned the expected proposal. A synthetic HTTP 503 failed without retry. Each case made exactly one `/responses` request, alongside two model-catalog lookups. Captured requests selected `gpt-6-astra`, supplied the response schema and selected baseline prompt, had an empty tools array, and contained no hidden-test or evaluator source.

A separate executable stub test sends a checked-in compatible control through the provider, path validator, isolated writer, and unchanged deterministic evaluator. That control passes. It is test infrastructure, not a model-generated benchmark result, and does not change the live run's status.

Because the one authorized live attempt had already been used, the corrected adapter was not exercised with another real model request. Live generation success and baseline coding quality remain unverified. Neither the benchmark nor its expected outcomes were changed.

## Final project validation

- `npm run typecheck`: passed.
- `npm run lint`: passed.
- `npm test`: 25 passed, including all existing tests and four CLI-provider tests.
- `npm run test:e2e`: 12 passed, including provider selection with an intercepted request, persisted evidence, and production execution restrictions.
- `npm run build`: passed.

The browser suite initially exposed an exact-label lookup issue in the new provider selector. Adding an explicit accessible label corrected it; the complete browser suite passed afterward. No browser test made a real provider request. These project checks do not substitute for the unavailable live-patch evaluation.
