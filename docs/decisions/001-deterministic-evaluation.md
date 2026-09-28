# ADR 001: Deterministic evaluation

Status: accepted for the prototype.

## Context

Generated code can look plausible and satisfy ordinary unit tests while breaking external callers, authorization boundaries, or allowed-file constraints. An LLM explaining its own output is not independent evidence of correctness. The pagination scenario passes unit tests but changes `Customer[]` into `{ data, page, pageSize, total }` for existing clients.

## Decision

Generated code correctness must be determined primarily by executable checks rather than LLM judgment. **AI proposes; deterministic software verifies.**

The evaluator owns typechecking, unit tests, integration and contract tests, scope checks, forbidden-file checks, and critical-failure classification. It reports each piece of evidence separately. A failed required check fails the run; missing required evidence or scope ambiguity requires review. No aggregate AI score can override a failing check.

Agent-requested validation is distinct from evaluator-owned validation. Future hidden checks must live outside the agent-editable workspace. Diagnosis remains a hypothesis and cannot mutate evaluation results. A new intervention earns credibility through a new independently evaluated attempt.

## Tradeoffs

Executable checks are reproducible and auditable, but take engineering effort and can have blind spots. Passing a finite suite does not prove correctness. Scope ambiguity, unverifiable design quality, and higher-impact work still need human judgment. Deterministic evidence should support review decisions without creating false certainty.

Phase 1 contains authored evidence. Phase 2 adds real executable validation of two reviewed pagination patches, independently checking the historical contract and marking its regression critical. No generated agent code is evaluated yet.

## Alternatives considered

- **LLM-as-sole-judge:** fast and expressive, but subjective and vulnerable to persuasive output. Rejected for correctness verdicts; useful later for diagnosis hypotheses.
- **One aggregate quality score:** convenient for ranking but hides critical failures and omitted checks. Rejected as the primary outcome representation.
- **Human review for everything:** valuable but hard to scale; retained where verification or risk demands it.
