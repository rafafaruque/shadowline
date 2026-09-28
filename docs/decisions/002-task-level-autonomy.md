# ADR 002: Task-level autonomy

Status: accepted for the prototype.

## Context

An agent's performance varies by task type, supplied context, risk, and the available verification. Test generation can be constrained to a test file and checked mechanically. Database migrations may destroy data; architectural changes may affect boundaries that are expensive or incomplete to test. One global autonomy switch obscures these differences.

## Decision

Autonomy should be assigned per class of engineering task rather than as one global ON/OFF setting for an agent.

Return one of AUTO, REVIEW, or HUMAN with the evidence and reasons. Consider task risk, sample size, deterministic verification coverage, critical failure count, and historical reliability together. A high pass percentage on a tiny sample, inadequate validation, or high-risk tasks does not earn autonomy.

An agent may be reliable enough to autonomously generate tests while still requiring human review or human ownership for database migrations and architectural decisions. Concrete task risk must take precedence over a broad category recommendation.

Phase 1 uses conservative, illustrative gates documented in architecture.md. Recommendations are provisional UI outputs and never change permissions or execute work. The historical dataset is authored fixture data.

## Tradeoffs

Task classes make policy explainable and useful, but category boundaries may be coarse and histories sparse. More granular policies require more observations. Thresholds can create misleading certainty, so sample size, check coverage, risk, and critical failures remain visible. Future evaluation should include uncertainty, recency, severity, and model/configuration version before operational use.

## Alternatives considered

- **Global agent ON/OFF autonomy:** simple but cannot distinguish low-risk tests from destructive schema changes.
- **Raw success-percentage thresholds:** easy to compute but ignore insufficient samples, severity, and verification gaps.
- **Permanent human review:** provides oversight but preserves the review bottleneck even for well-verified, low-risk work.
