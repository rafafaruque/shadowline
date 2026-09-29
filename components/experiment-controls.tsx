"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  contextChoices,
  criteriaChoices,
  validationChoices,
} from "@/lib/experiments/catalog";
import {
  experimentSchema,
  type InterventionDraft,
  type RealExperiment,
} from "@/lib/experiments/schemas";

async function post(action: unknown) {
  const response = await fetch("/api/experiments", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(action),
  });
  const body = await response.json();
  if (!response.ok) throw new Error(body.error ?? "Experiment request failed.");
  return experimentSchema.parse(body);
}
export function DiagnoseButton({
  baselineRunId,
  readOnly = false,
}: {
  baselineRunId: string;
  readOnly?: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return (
    <div>
      <button
        className="button primary"
        disabled={busy || readOnly}
        onClick={async () => {
          if (readOnly) return;
          setBusy(true);
          setError("");
          try {
            const record = await post({ action: "diagnose", baselineRunId });
            router.push(`/experiments/real/${record.id}`);
          } catch (error) {
            setError(
              error instanceof Error ? error.message : "Diagnosis failed.",
            );
          } finally {
            setBusy(false);
          }
        }}
      >
        {busy
          ? "Generating a failure hypothesis…"
          : "Diagnose & propose intervention"}
      </button>
      <p role="status">
        {readOnly
          ? "Diagnosis is disabled in the hosted demo. Inspect the saved experiment instead."
          : error ||
            "One diagnosis request. No coding attempt runs until an engineer approves."}
      </p>
    </div>
  );
}

export function ExperimentControls({
  experiment,
  readOnly = false,
}: {
  experiment: RealExperiment;
  readOnly?: boolean;
}) {
  const router = useRouter();
  const [record, setRecord] = useState(experiment);
  const [draft, setDraft] = useState<InterventionDraft | null>(
    experiment.intervention?.draft ?? null,
  );
  const [reviewed, setReviewed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  if (!draft || !record.intervention) return null;
  const editable = !readOnly && ["DRAFT", "APPROVED"].includes(record.status);
  const dirty =
    JSON.stringify(draft) !== JSON.stringify(record.intervention.draft);
  const update = (next: InterventionDraft) => {
    setDraft(next);
    setReviewed(false);
  };
  async function act(action: unknown) {
    if (readOnly) return;
    setBusy(true);
    setMessage("");
    try {
      const next = await post(action);
      setRecord(next);
      setDraft(next.intervention?.draft ?? null);
      setReviewed(false);
      setMessage(
        next.status === "APPROVED"
          ? "Approved. Execution has not started."
          : next.status === "DRAFT"
            ? "Saved. Previous approval is invalidated; inspect the updated exact prompt below."
            : "Attempt finished. See deterministic evidence below.",
      );
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Action failed.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="intervention-editor">
      <p>
        Provider: <strong>{record.provider}</strong> · Model:{" "}
        <strong>{record.model}</strong>. One attempt from the same unchanged
        benchmark.
      </p>
      <fieldset disabled={!editable || busy}>
        <legend>Context to add</legend>
        {contextChoices.map((file) => (
          <label className="choice-row" key={file}>
            <input
              type="checkbox"
              checked={draft.contextToAdd.includes(file)}
              onChange={(event) =>
                update({
                  ...draft,
                  contextToAdd: event.target.checked
                    ? [...draft.contextToAdd, file]
                    : draft.contextToAdd.filter((value) => value !== file),
                })
              }
            />
            {file}
          </label>
        ))}
      </fieldset>
      <fieldset disabled={!editable || busy}>
        <legend>Acceptance criteria to add</legend>
        <p>
          Required: Existing callers without pagination query parameters must
          continue receiving the historical Customer[] response.
        </p>
        {Object.entries(criteriaChoices).map(([id, text]) => (
          <label className="choice-row" key={id}>
            <input
              type="checkbox"
              checked={draft.acceptanceCriteriaToAdd.includes(
                id as keyof typeof criteriaChoices,
              )}
              onChange={(event) =>
                update({
                  ...draft,
                  acceptanceCriteriaToAdd: event.target.checked
                    ? [
                        ...draft.acceptanceCriteriaToAdd,
                        id as keyof typeof criteriaChoices,
                      ]
                    : draft.acceptanceCriteriaToAdd.filter(
                        (value) => value !== id,
                      ),
                })
              }
            />
            {text}
          </label>
        ))}
      </fieldset>
      <fieldset disabled={!editable || busy}>
        <legend>Required validation expectations</legend>
        {validationChoices.map((check) => (
          <label className="choice-row" key={check}>
            <input
              type="checkbox"
              checked={draft.requiredValidation.includes(check)}
              onChange={(event) =>
                update({
                  ...draft,
                  requiredValidation: event.target.checked
                    ? [...draft.requiredValidation, check]
                    : draft.requiredValidation.filter(
                        (value) => value !== check,
                      ),
                })
              }
            />
            {check}
          </label>
        ))}
        <p>
          These are instructions to the coding agent. Shadowline always runs the
          full, unchanged deterministic evaluator.
        </p>
      </fieldset>
      <label className="rationale-field">
        Intervention rationale
        <textarea
          aria-label="Intervention rationale"
          disabled={!editable || busy}
          rows={5}
          maxLength={4000}
          value={draft.rationale}
          onChange={(event) =>
            update({ ...draft, rationale: event.target.value })
          }
        />
      </label>
      <p>
        Rationale is review evidence only. The coding prompt uses the selected
        repository files and criteria above; diagnosis prose and test-failure
        details are never copied into it.
      </p>
      {editable && (
        <>
          <button
            className="button secondary"
            disabled={busy || !dirty}
            onClick={() =>
              act({
                action: "edit",
                id: record.id,
                revision: record.revision,
                draft,
              })
            }
          >
            Save intervention changes
          </button>
          {record.status === "DRAFT" && (
            <>
              <label className="choice-row">
                <input
                  type="checkbox"
                  disabled={busy || dirty}
                  checked={reviewed}
                  onChange={(event) => setReviewed(event.target.checked)}
                />
                I reviewed this exact proposal and approve one context-rich
                attempt.
              </label>
              <button
                className="button primary"
                disabled={busy || dirty || !reviewed}
                onClick={() =>
                  act({
                    action: "approve",
                    id: record.id,
                    revision: record.revision,
                    proposalSha256: record.intervention!.sha256,
                    confirmed: true,
                  })
                }
              >
                Approve intervention
              </button>
            </>
          )}
          {record.status === "APPROVED" && (
            <button
              className="button primary"
              disabled={busy || dirty}
              onClick={() =>
                act({
                  action: "execute",
                  id: record.id,
                  proposalSha256: record.intervention!.sha256,
                })
              }
            >
              Run one approved attempt
            </button>
          )}
        </>
      )}
      {!editable && (
        <p>
          {readOnly
            ? "Recorded intervention — editing, approval, and execution are disabled in the hosted demo."
            : `Execution is ${record.status.toLowerCase()}. This experiment cannot start another attempt.`}
        </p>
      )}
      <p role="status">
        {busy
          ? "Working… Do not resubmit. Results are saved locally."
          : message ||
            (dirty
              ? "Unsaved changes cannot be approved or run."
              : record.approval
                ? "This saved proposal has explicit human approval."
                : "Awaiting explicit human approval. No coding request has been made for this intervention.")}
      </p>
    </div>
  );
}
