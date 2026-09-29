# ADR 005: Local Codex CLI as a proposal provider

Status: implemented. The first attempt's adapter error is preserved; subsequent live baseline generation and the [approved context-rich experiment](../phase4-real-experiment.md) completed with CLI `0.155.0-alpha.16.3`.

## Decision

Keep the generic `ModelProvider.generate(ContextSnapshot)` interface and Gemini adapter. Add `codex-cli`, selected explicitly in the Coding Agent page or CLI. Provider/model and available usage metadata are persisted per attempt. Omitted provider selection retains Gemini for compatibility. Models are configured server-side, never supplied as arbitrary request arguments.

Use [non-interactive Codex execution](https://learn.chatgpt.com/docs/non-interactive-mode) with `--output-schema`, `--output-last-message`, and JSON event output. The schema comes from the same strict Zod file-proposal schema used by Gemini. Returned JSON passes through the existing orchestrator, all-path validation, isolated writes, and deterministic evaluator. Codex does not apply a patch itself.

## Boundary

The adapter requires macOS Seatbelt. A fresh owner-only temporary directory contains an empty working directory, selected prompt instructions, response schema, isolated home, and a private copy of the local file-backed Codex login. It copies no repository, personal configuration, project instructions, rules, skills, plugins, or MCP settings. The CLI receives a minimal environment without inherited API keys or Node preload options. Normal success and failure paths remove the directory, including the credential copy; forced termination can leave it behind.

An outer `sandbox-exec` profile applies to the CLI itself and its descendants. It permits reads of the executable, system runtime paths, and staging directory, plus writes only to staging and `/dev/null`. Explicit denials cover all reads and writes under the Shadowline repository, including benchmark files, hidden tests, evaluator sources, and stored runs. Unlike the generated-application sandbox, this CLI profile permits networking to reach the model service. The generated application continues to run under the existing network-denied profile.

The CLI runs with read-only mode, approvals disabled, user configuration/rules ignored, ephemeral history, custom model instructions, and project-document discovery disabled. Shell, code execution, web, browser, computer, image, application, plugin, skill, memory, and subagent capabilities are disabled. A native CLI request captured by a dummy-auth local mock service contained an empty tools array and only the selected benchmark context. The outer filesystem boundary remains necessary even with tools disabled.

A dedicated provider configuration preserves Codex's authentication-dependent endpoint while setting request and stream retry counts to zero and disabling unbounded retries and WebSockets. One invocation makes one generation attempt, with no evaluator feedback or model fallback. Model-catalog discovery can involve additional non-generation requests. A 180-second limit and one-megabyte combined output limit bound the process; failures stop its process group. Raw stderr and diagnostic message contents are not persisted because they can contain sensitive local details.

The event reader requires exit zero and exactly one completed turn. Native startup diagnostic items (`item.type = error`) do not establish failure or success. Top-level errors, failed turns, tool actions, unsupported items, incomplete output, or nonzero exits fail closed. A completed response still needs a schema-valid proposal before any file write. Provider/transport errors remain `PROVIDER_ERROR`, with no evaluation, no first-pass acceptance value, and no autonomy evidence. Invalid proposed code and deterministic failures retain the existing coding/evaluation semantics.

## Compatibility and evidence

Validated against `codex-cli 0.155.0-alpha.16.3`. This adapter depends on its isolation flags and configuration keys; incompatible installed versions fail closed. `SHADOWLINE_CODEX_BIN` selects a trusted executable, and `SHADOWLINE_CODEX_MODEL` selects the explicit model (default `gpt-6-astra`). The default matches the local CLI model configured during implementation. No personal configuration is otherwise imported. The record distinguishes the requested model from the successful adapter result; a failed attempt has no resolved model. Successful records also retain CLI version and the explicit model-selection basis. Token usage comes from CLI completion events; subscription usage cost remains unknown.

Tests cover repository read/write denial, credential/environment isolation, cleanup on failure, schema transport, diagnostic handling, rejection of tool actions, controlled proposals passing through the unchanged evaluator, and distinct provider errors. Native local mock checks covered structured streaming completion and HTTP 503 with exactly one generation request in each case, empty tools, and no hidden-test/evaluator content. These are integration checks, not live coding-agent evidence. The [single live attempt](../phase3-codex-run.md) remains preserved separately.
