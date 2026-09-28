import Link from "next/link";
import type { Run } from "@/lib/domain/types";
import { getConfig, getTask } from "@/lib/fixtures/tasks";
import { categoryLabels, duration, money } from "@/lib/format";
import { Arrow, Badge } from "./ui";

export function RunTable({ runs }: { runs: Run[] }) {
  return (
    <div className="table-scroll">
      <table className="run-table">
        <caption className="sr-only">
          Benchmark runs and deterministic validation results
        </caption>
        <thead>
          <tr>
            <th>Task / run</th>
            <th>Category</th>
            <th>Configuration</th>
            <th>Result</th>
            <th>Tests</th>
            <th>Files</th>
            <th>Duration</th>
            <th>Cost</th>
            <th>
              <span className="sr-only">Open</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {runs.map((run) => {
            const task = getTask(run.taskId);
            const config = getConfig(run.configId);
            const suites = run.evaluation
              ? [
                  run.evaluation.unitTests,
                  run.evaluation.integrationTests,
                  run.evaluation.contractTests,
                ]
              : [];
            const passed = suites.reduce((sum, suite) => sum + suite.passed, 0);
            const total = suites.reduce(
              (sum, suite) => sum + suite.passed + suite.failed + suite.skipped,
              0,
            );
            return (
              <tr key={run.id}>
                <td>
                  <Link className="task-link" href={`/runs/${run.id}`}>
                    {task.title}
                  </Link>
                  <div className="table-subline mono">
                    {run.id} <span>·</span>{" "}
                    {run.attempt > 1 ? "rerun" : "first attempt"}
                  </div>
                </td>
                <td className="muted">{categoryLabels[task.category]}</td>
                <td>
                  <span className="config-tag">{config.name}</span>
                </td>
                <td>
                  <Badge value={run.status} />
                </td>
                <td
                  className={`mono ${passed !== total ? "text-warn" : "muted"}`}
                >
                  {total ? `${passed}/${total}` : "—"}
                </td>
                <td className="mono muted">{run.filesChanged.length}</td>
                <td className="mono muted nowrap">
                  {duration(run.durationMs)}
                </td>
                <td className="mono muted">{money(run.estimatedCost)}</td>
                <td>
                  <Link
                    href={`/runs/${run.id}`}
                    className="row-arrow"
                    aria-label={`Open run ${run.id}`}
                  >
                    <Arrow />
                  </Link>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
