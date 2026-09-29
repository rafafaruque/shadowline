"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { agentConfigurations } from "@/lib/agent/configs";
import {
  realRunSchema,
  type AgentRequest,
  type ProviderId,
} from "@/lib/agent/schemas";
import { SectionHeading } from "./ui";

export function AgentControl({
  providers,
}: {
  providers: {
    id: ProviderId;
    name: string;
    model: string;
    ready: boolean;
    message: string;
  }[];
}) {
  const router = useRouter();
  const [configId, setConfigId] =
    useState<AgentRequest["configId"]>("baseline");
  const [running, setRunning] = useState(false);
  const [error, setError] = useState("");
  const [providerId, setProviderId] = useState<ProviderId>("gemini");
  const provider = providers.find((item) => item.id === providerId)!;
  const config = agentConfigurations[configId];
  async function run() {
    setRunning(true);
    setError("");
    try {
      const response = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskId: "customers-pagination",
          configId,
          providerId,
        }),
      });
      const payload = await response.json();
      if (!response.ok)
        throw new Error(
          typeof payload.error === "string"
            ? payload.error
            : "Agent request failed.",
        );
      const result = realRunSchema.parse(payload);
      router.push(`/agent/runs/${result.id}`);
      router.refresh();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Agent request failed.",
      );
    } finally {
      setRunning(false);
    }
  }
  return (
    <section className="panel">
      <SectionHeading title="New attempt" />
      <div className="card-content agent-controls">
        <div className="info-strip">
          Fresh baseline · one attempt · no automatic retries
        </div>
        <label>
          Provider
          <select
            aria-label="Provider"
            disabled={running}
            value={providerId}
            onChange={(event) =>
              setProviderId(event.target.value as ProviderId)
            }
          >
            {providers.map((item) => (
              <option value={item.id} key={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Task
          <select
            disabled={running}
            value="customers-pagination"
            onChange={() => {}}
          >
            <option value="customers-pagination">
              Add pagination support to GET /customers.
            </option>
          </select>
        </label>
        <label>
          Agent configuration
          <select
            disabled={running}
            value={configId}
            onChange={(event) =>
              setConfigId(event.target.value as AgentRequest["configId"])
            }
          >
            <option value="baseline">Baseline</option>
            <option value="context-rich">Context-rich</option>
          </select>
        </label>
        <p>
          <strong>Model:</strong> {provider.model} · {provider.name}
        </p>
        <div>
          <h3>Context supplied</h3>
          <ul>
            {config.files.map((file) => (
              <li key={file}>
                <code>{file}</code>
              </li>
            ))}
          </ul>
        </div>
        <p>
          <strong>Explicit acceptance criteria:</strong>{" "}
          {config.acceptanceCriteria.join(" ") || "None supplied."}
        </p>
        <p>
          <strong>Validation requested in prompt:</strong>{" "}
          {config.requiredChecks.join(" · ")}. All acceptance checks run
          independently.
        </p>
        <p className={provider.ready ? "" : "text-warn"}>{provider.message}</p>
        <button
          className="button primary"
          onClick={run}
          disabled={running || !provider.ready}
        >
          {running ? "Running coding agent…" : "Run coding agent"}
        </button>
        <p role="status" aria-live="polite">
          {running
            ? "Generating and evaluating one patch…"
            : "Saved locally. No automatic retries."}
        </p>
        {error && (
          <p role="alert" className="text-bad">
            {error}
          </p>
        )}
      </div>
    </section>
  );
}
