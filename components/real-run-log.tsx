"use client";
import { useState } from "react";
import Link from "next/link";
import { Badge } from "./ui";
import type { RealAgentRun } from "@/lib/agent/schemas";

export type RunLogRow = Pick<
  RealAgentRun,
  | "id"
  | "provider"
  | "model"
  | "configId"
  | "status"
  | "startedAt"
  | "durationMs"
  | "requiresHumanReview"
> & { publicTests: string; contractTests: string; incident: string };

export function RealRunTable({
  rows,
  inspect = true,
}: {
  rows: RunLogRow[];
  inspect?: boolean;
}) {
  return (
    <div className="table-scroll">
      <table className="operational-table run-log-table">
        <caption className="sr-only">Recorded real runs</caption>
        <thead>
          <tr>
            {[
              "Task / provider",
              "Configuration",
              "Result",
              "Tests · passed / total",
              "Review",
              "Runtime",
              "Started · UTC",
            ].map((label) => (
              <th key={label} scope="col">
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <td>
                {inspect ? (
                  <Link
                    href={`/agent/runs/${row.id}`}
                    className="run-task-link"
                  >
                    API pagination <span className="sr-only">{row.id}</span>
                  </Link>
                ) : (
                  "API pagination"
                )}
                <small>
                  {row.provider} / {row.model}
                </small>
              </td>
              <td>
                {row.configId}
                <small>{row.id.slice(0, 8)}</small>
              </td>
              <td>
                <Badge value={row.status} />
              </td>
              <td>
                {row.status === "PROVIDER_ERROR" ? (
                  "Not evaluated"
                ) : (
                  <>
                    <span>Public {row.publicTests}</span>
                    <small>Contract {row.contractTests}</small>
                  </>
                )}
              </td>
              <td>
                {row.status === "PROVIDER_ERROR"
                  ? "No patch"
                  : row.requiresHumanReview
                    ? "Required"
                    : "Not required*"}
              </td>
              <td>{(row.durationMs / 1000).toFixed(3)}s</td>
              <td>
                <time dateTime={row.startedAt}>
                  {row.startedAt.slice(0, 10)}
                  <small>{row.startedAt.slice(11, 19)}</small>
                </time>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function RealRunLog({
  rows,
  inspect = true,
}: {
  rows: RunLogRow[];
  inspect?: boolean;
}) {
  const [status, setStatus] = useState("ALL");
  const visible = rows.filter(
    (row) => status === "ALL" || row.status === status,
  );
  const coding = visible.filter((row) => row.status !== "PROVIDER_ERROR");
  const incidents = visible.filter((row) => row.status === "PROVIDER_ERROR");
  const groups = Object.groupBy(
    incidents,
    (row) => `${row.provider} · ${row.incident}`,
  );
  return (
    <section className="panel" aria-label="Recorded runs">
      <div className="log-toolbar">
        <h2>
          Recorded runs <span className="muted">{rows.length}</span>
        </h2>
        <label className="sr-only" htmlFor="real-result-filter">
          Recorded result
        </label>
        <select
          id="real-result-filter"
          value={status}
          onChange={(event) => setStatus(event.target.value)}
        >
          <option value="ALL">All</option>
          <option value="PASSED">Passed</option>
          <option value="FAILED">Failed</option>
          <option value="PROVIDER_ERROR">Provider errors</option>
        </select>
      </div>
      {coding.length > 0 && <RealRunTable rows={coding} inspect={inspect} />}
      {incidents.length > 0 && (
        <div className="incident-groups">
          <h3>
            Provider incidents <span className="muted">{incidents.length}</span>
          </h3>
          <p className="muted">
            Excluded from coding failures and acceptance rates.
          </p>
          {Object.entries(groups).map(([label, group]) => (
            <details
              key={`${status}:${label}`}
              open={status === "PROVIDER_ERROR"}
            >
              <summary>
                {label}{" "}
                <span className="muted">
                  {group!.length} recorded{" "}
                  {group!.length === 1 ? "attempt" : "attempts"}
                </span>
              </summary>
              <RealRunTable rows={group!} inspect={inspect} />
            </details>
          ))}
        </div>
      )}
      {!visible.length && (
        <p className="card-content muted">No matching recorded runs.</p>
      )}
      <div className="panel-footnote">
        *Benchmark review decision; production review policy is separate.
      </div>
    </section>
  );
}
