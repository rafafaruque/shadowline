import Link from "next/link";
import { Badge, SectionHeading } from "./ui";
import { evidenceReaders } from "@/lib/evidence/readers";
import { canViewRealEvidence } from "@/lib/demo-mode";

export async function ExperimentHistory({
  recent = false,
}: {
  recent?: boolean;
}) {
  const readers = await evidenceReaders();
  const records = await readers.experiments.list();
  const rows = await Promise.all(
    (recent ? records.slice(0, 1) : records).map(async (record) => ({
      record,
      baseline: await readers.runs.get(record.baselineRunId),
      after: record.interventionRunId
        ? await readers.runs.get(record.interventionRunId)
        : undefined,
    })),
  );
  const counts = (suite?: {
    passed: number;
    failed: number;
    skipped: number;
  }) =>
    suite
      ? `${suite.passed}/${suite.passed + suite.failed + suite.skipped}`
      : "Not evaluated";
  if (recent && rows[0]) {
    const { record, after } = rows[0];
    return (
      <section className="panel" aria-label="Recent experiment">
        <SectionHeading title="Recent experiment">
          <span className="small-chip">Measured</span>
        </SectionHeading>
        <div className="card-content activity-row">
          <div>
            <strong>API pagination</strong>
            <p className="muted">
              {after ? "Context-rich configuration" : "Awaiting rerun"}
            </p>
          </div>
          <div>
            {after ? (
              <Badge value={after.status} />
            ) : (
              <Badge value={record.status} />
            )}
            <p className="muted">
              {after?.evaluation
                ? `${counts(after.evaluation.publicTests)} public · ${counts(after.evaluation.contractTests)} contract`
                : "No rerun evaluation"}
            </p>
          </div>
          {canViewRealEvidence() && (
            <Link
              className="button secondary"
              href={`/experiments/real/${record.id}`}
            >
              View experiment →
            </Link>
          )}
        </div>
      </section>
    );
  }
  return (
    <section
      className="panel"
      aria-label={recent ? "Recent experiment" : "Measured experiments"}
    >
      <SectionHeading
        title={recent ? "Recent experiment" : "Measured experiments"}
      />
      {rows.length ? (
        <div className="table-scroll">
          <table className="operational-table">
            <thead>
              <tr>
                <th>Task</th>
                <th>Configuration</th>
                <th>Outcome</th>
                <th>Evidence</th>
                <th>
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ record, baseline, after }) => (
                <tr key={record.id}>
                  <td>
                    API pagination
                    <small>Measured · {record.createdAt.slice(0, 10)}</small>
                  </td>
                  <td>
                    {recent && after
                      ? "Context-rich configuration"
                      : "Baseline → Context-rich"}
                  </td>
                  <td>
                    {!recent && baseline && (
                      <>
                        <Badge value={baseline.status} /> →{" "}
                      </>
                    )}
                    {after ? (
                      <Badge value={after.status} />
                    ) : (
                      <Badge value={record.status} />
                    )}
                  </td>
                  <td>
                    {after?.evaluation
                      ? `${counts(after.evaluation.publicTests)} public · ${counts(after.evaluation.contractTests)} contract`
                      : "No rerun evaluation"}
                  </td>
                  <td>
                    {canViewRealEvidence() && (
                      <Link
                        className="text-link"
                        href={`/experiments/real/${record.id}`}
                      >
                        {recent ? "View experiment" : "Open"} →
                      </Link>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="card-content muted">No saved experiments available.</p>
      )}
    </section>
  );
}
