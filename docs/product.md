# Product: Shadowline

## User problem

A fictional software organization has adopted coding agents. Implementation throughput increased, but human code review became a bottleneck because every generated change still receives roughly the same review regardless of task type, historical reliability, or failure severity.

Teams can observe whether a patch passed, but often lack a repeatable way to connect a failure to the instructions and context that produced it. They also lack evidence for adjusting review requirements. Shadowline explores whether empirical evaluation can improve agent workflows and differentiate oversight.

## Target users

**Primary:** an engineer or AI platform engineer responsible for incorporating coding agents into engineering workflows. They need reproducible tasks, input snapshots, executable validation, and interpretable before/after comparisons.

**Secondary:** an engineering leader responsible for throughput, reliability, and review burden. They need evidence of net benefit, including regression severity and human remediation, rather than implementation speed alone.

## Core hypothesis

Coding agents can increasingly complete software-engineering tasks, but teams need a principled way to understand why agents fail, improve how work is given to them, and determine which categories of work are reliable enough to require less human review.

Relevant context, clearer acceptance criteria, better task decomposition, and stronger validation may improve outcomes. Adding context is not universally beneficial: irrelevant information can add cost and distraction, and more tokens cannot solve every capability limitation.

## Intended transformation

Move from uniform review of opaque generated patches toward evidence-informed workflows:

1. Capture the task and exact agent configuration.
2. Apply the agent's changes to one controlled, isolated benchmark repository.
3. Evaluate correctness with independent executable checks and file/scope constraints.
4. Record a diagnosis as a hypothesis grounded in evidence.
5. Propose a targeted intervention and rerun the same task from the same base.
6. Compare reliability, cost, iteration count, and human remediation.
7. Recommend AUTO, REVIEW, or HUMAN per task class, considering risk and the strength of evidence.

AUTO is an illustrative recommendation for low-risk work with adequate verification and a reliable history. REVIEW retains human inspection. HUMAN keeps high-impact decisions and work under human ownership. Phase 1 never enforces these recommendations.

## Success metrics

- First-pass success: passed initial attempts divided by completed initial attempts.
- Regression rate: attempts that break established behavior divided by completed attempts; track critical failures separately.
- Human review rate: completed attempts flagged as requiring review divided by all completed attempts.
- Cost per successful task: total attempt cost, including failed attempts and reruns, divided by distinct tasks with a passing attempt.
- Iterations per task, token usage, inference cost, and measured human remediation time.
- Verification coverage: independently executed required checks divided by the applicable required checks; this is not source-code coverage or a proof of correctness.
- Reliability by task category, with sample size, risk, critical failures, and eventually uncertainty and recency visible.

Prototype success means a reviewer can follow one failure from task inputs to independent evidence, proposed intervention, and a clearly labeled illustrative rerun. Real performance claims require real measurements.

## Phase 2 milestone

The controlled customer-service benchmark and deterministic evaluator now execute known patches. They distinguish working pagination that breaks existing callers from a compatible implementation, using public tests and independent contracts. Breaking the legacy API shape is a critical failure. The development verification panel shows real evidence separately from all fixture/aggregate metrics. No coding agent, diagnosis model, or automatic intervention has been implemented.

## Intentional non-goals

Phase 1 builds the domain model and navigation only. It does not execute an agent or a benchmark, call an LLM, persist data, assign real permissions, or prove an intervention's causal effect. It is not a general agent platform, repository host, chatbot, production policy engine, or universal correctness oracle. No authentication, billing, queues, distributed services, or multiple-provider infrastructure is needed.
