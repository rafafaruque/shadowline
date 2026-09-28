"use client";

import { useState } from "react";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { runs } from "@/lib/fixtures/runs";
import { getTask } from "@/lib/fixtures/tasks";
import { categoryLabels } from "@/lib/format";
import { RunTable } from "./run-table";

export function RunExplorer() {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("ALL");
  const [category, setCategory] = useState("ALL");
  const filtered = runs.filter((run) => {
    const task = getTask(run.taskId);
    return (
      `${task.title} ${run.id}`.toLowerCase().includes(query.toLowerCase()) &&
      (status === "ALL" || status === run.status) &&
      (category === "ALL" || category === task.category)
    );
  });
  return (
    <section className="panel explorer">
      <div className="filterbar">
        <label className="search-field">
          <Search size={16} />
          <input
            aria-label="Search runs"
            placeholder="Search by task or run ID…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
        <div className="filters">
          <SlidersHorizontal size={15} aria-hidden="true" />
          <select
            aria-label="Filter by result"
            value={status}
            onChange={(event) => setStatus(event.target.value)}
          >
            <option value="ALL">All results</option>
            <option value="PASSED">Passed</option>
            <option value="FAILED">Failed</option>
            <option value="REVIEW_REQUIRED">Review required</option>
          </select>
          <select
            aria-label="Filter by category"
            value={category}
            onChange={(event) => setCategory(event.target.value)}
          >
            <option value="ALL">All categories</option>
            {Object.entries(categoryLabels).map(([value, label]) => (
              <option value={value} key={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
      </div>
      {filtered.length ? (
        <RunTable runs={filtered} />
      ) : (
        <div className="empty-results">
          <Search size={25} />
          <h2>No matching runs</h2>
          <p>Try a different task, result, or category.</p>
          <button
            className="button secondary"
            onClick={() => {
              setQuery("");
              setStatus("ALL");
              setCategory("ALL");
            }}
          >
            <X size={14} />
            Clear filters
          </button>
        </div>
      )}
      <div className="table-footer">
        <span>
          Showing {filtered.length} of {runs.length} fixture runs
        </span>
        <span>September 24, 2026 · UTC</span>
      </div>
    </section>
  );
}
