# Phase 3: real provider request evidence

The Gemini integration, isolated execution, persistence, and review UI are implemented. A completed model-generated proposal remains unverified because the live service returned HTTP 503. Phase 3 is not marked complete. Controlled provider-output tests are labeled test stubs, stored only in temporary test directories, and are not presented as real model results.

## Real requests

Provider: Gemini Developer API. Requested model: `gemini-3.8-flash`, listed as available by the authenticated Models API and as free-tier eligible in Google's [pricing](https://ai.google.dev/gemini-api/docs/pricing). The key was loaded from `.env.local`, never included in prompts, stored records, browser bundles, or subprocess environments.

| Attempt | Local record ID                        | Observed outcome                                                    |
| ------- | -------------------------------------- | ------------------------------------------------------------------- |
| 1       | `6ff1f892-c368-4595-93dc-3f236582ea20` | HTTP 400; no generated proposal.                                    |
| 2       | `051afcf9-379a-4ed2-8f2f-c4fb56ce15df` | HTTP 503 after correcting the REST output-format enum.              |
| 3       | `7598eb4a-1dab-4bbd-b7f1-f428b333fce2` | HTTP 503; one additional attempt explicitly authorized by the user. |

Google's structured-output example used the MIME string `application/json`; the live REST discovery schema defines `TextResponseFormat.mimeType` as the enum `APPLICATION_JSON`. The adapter was corrected to the discovery schema. This was an integration correction, not a prompt intervention or a code-correction retry. All requests remain in history. Each invocation made exactly one request; the adapter never retried automatically or changed models.

The original JSON records retain `REVIEW_REQUIRED`, `requiresHumanReview: true`, `evaluation: null`, no proposed/applied files, null usage/cost/remediation, and undetermined first-pass acceptance. `criticalFailure: false` means no regression was observed; it does not establish compatibility because no application was evaluated. No output or inference cost is invented for failed requests.

## Exact baseline input

Task: “Add pagination support to GET /customers.”

Supplied files, with exact contents and SHA-256 hashes retained in each local record:

- `src/app.ts`
- `src/routes/customers.ts`
- `src/data/customers.ts`
- `tests/customers.test.ts`

There were no explicit acceptance criteria. Requested prompt validation was `TYPECHECK` and `PUBLIC`. The writable path was only `src/routes/customers.ts`. The generic system instruction requested structured complete replacements with no tools/shell and no claims of having executed checks.

The API conventions document, pagination helper, explicit backward-compatibility criterion, hidden tests, and evaluator implementation were excluded. Requests 2 and 3 retained the same model and prompts as request 1. The UI exposes the full snapshots at `/agent/runs/<record-id>` in development mode.

## Deterministic validation independent of Gemini availability

The original baseline still passes (7 public, 1 contract). The known breaking patch passes typecheck and 11 public tests but fails 2 of 16 contracts and is critical. The known compatible patch passes typecheck, all 11 public tests, and all 16 contracts.

Both controlled code proposals were also exercised through the real-agent orchestration and restricted worker using explicitly labeled test providers. Their outcomes and human-review decisions match the independent evaluator. Path/schema rejection, exact context exclusions, sandbox isolation, one-request Gemini transport, persistence, and attempt numbering have executable tests.

The user subsequently requested a default change to `gemini-3.7-flash` and a distinct `PROVIDER_ERROR` outcome. These original 3.8 records are now classified as provider errors when read by the application, without modifying their stored bytes. They are excluded from coding failures, benchmark failures, first-pass acceptance denominators, and autonomy evidence. Request history and original errors remain visible.

## Explicit Gemini 3.7 baseline attempt

After the requested default-model and outcome-classification changes, exactly one new baseline request was made with `gemini-3.7-flash`.

- Record: `5c23f5cc-0034-49df-a357-e45c67af66af`.
- Outcome: `PROVIDER_ERROR`, upstream HTTP 503. No retry was made.
- Proposed/applied files: none. Evaluation: null. First-pass acceptance: null (excluded, not failed).
- Human code review: not required; no generated patch exists.
- Coding-failure, benchmark-failure, and autonomy evidence: excluded.

All three earlier 3.8 JSON records remain byte-for-byte unchanged. The default is still overridable with `SHADOWLINE_MODEL`. A future first completed coding attempt remains eligible for first-pass acceptance despite preceding provider outages; request ordinals continue to preserve every request.
