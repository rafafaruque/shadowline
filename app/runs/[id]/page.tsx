import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Clock3,
  Coins,
  FileCode2,
  GitCompareArrows,
} from "lucide-react";
import { DiagnosisCard } from "@/components/diagnosis-card";
import { InterventionCard } from "@/components/intervention-card";
import { RunResultSummary } from "@/components/run-result-summary";
import { Badge, SectionHeading } from "@/components/ui";
import { getRun, runs } from "@/lib/fixtures/runs";
import { getConfig, getTask } from "@/lib/fixtures/tasks";
import { categoryLabels, duration, money } from "@/lib/format";

export function generateStaticParams() {
  return runs.map((run) => ({ id: run.id }));
}
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return { title: getRun(id) ? `Run ${id}` : "Run not found" };
}
export default async function RunPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const run = getRun(id);
  if (!run) notFound();
  const task = getTask(run.taskId);
  const config = getConfig(run.configId);
  return (
    <>
      <Link className="back-link" href="/runs">
        <ArrowLeft size={14} />
        All benchmark runs
      </Link>
      <header className="run-heading">
        <div>
          <div className="eyebrow">
            {run.id} <span> / </span> ATTEMPT {run.attempt} <span> / </span>{" "}
            FIXTURE
          </div>
          <h1>{task.title}</h1>
          <div className="run-meta">
            <Badge value={run.status} />
            <span>{categoryLabels[task.category]}</span>
            <Badge value={task.riskLevel} />
            <span className="mono">
              {new Date(run.startedAt)
                .toISOString()
                .replace("T", " · ")
                .replace(".000Z", " UTC")}
            </span>
          </div>
        </div>
      </header>
      <div className="run-stat-strip">
        <span>
          <Clock3 size={15} />
          {duration(run.durationMs)}
        </span>
        <span>
          <FileCode2 size={15} />
          {run.filesChanged.length} files changed
        </span>
        <span className="mono">
          {run.tokenCount.toLocaleString("en-US")} tokens
        </span>
        <span>
          <Coins size={15} />
          {money(run.estimatedCost)} estimated
        </span>
      </div>
      {task.id === "customers-pagination" && (
        <div className="info-strip">
          Fixture narrative aligned with the executable pagination benchmark: 11
          public tests and 16 contract tests. Timing, tokens, cost,
          configuration, and diagnosis remain illustrative.{" "}
          {process.env.NODE_ENV === "development" && (
            <Link className="text-link" href="/verification">
              Run real verification →
            </Link>
          )}
        </div>
      )}
      <div className="detail-grid">
        <div className="detail-column">
          <section className="panel">
            <SectionHeading eyebrow="INTENT & CONSTRAINTS" title="Task" />
            <div className="card-content">
              <p>{task.description}</p>
              <h3>Task-owned acceptance criteria</h3>
              <ul className="check-list">
                {task.acceptanceCriteria.map((criterion) => (
                  <li key={criterion}>{criterion}</li>
                ))}
              </ul>
              <details className="inline-details">
                <summary>Expected context and permitted files</summary>
                <h3>Expected context</h3>
                <div className="file-list">
                  {task.expectedContext.map((file) => (
                    <code key={file}>{file}</code>
                  ))}
                </div>
                <h3>Permitted files</h3>
                <div className="file-list">
                  {task.allowedFiles.map((file) => (
                    <code key={file}>{file}</code>
                  ))}
                </div>
                <h3>Required evaluator checks</h3>
                <p className="mono">{task.requiredChecks.join(" · ")}</p>
              </details>
            </div>
          </section>
          <section className="panel">
            <SectionHeading
              eyebrow="EXACT INPUT SNAPSHOT"
              title="Agent configuration"
            >
              <span className="config-tag">{config.name}</span>
            </SectionHeading>
            <div className="card-content">
              <dl className="config-details">
                <dt>Model</dt>
                <dd>
                  <code>{config.model}</code>
                </dd>
                <dt>Task supplied</dt>
                <dd>{task.title}</dd>
                <dt>Context files</dt>
                <dd>
                  {config.contextFiles.length ? (
                    <div className="file-list">
                      {config.contextFiles.map((file) => (
                        <code key={file}>{file}</code>
                      ))}
                    </div>
                  ) : (
                    <span className="muted">
                      None supplied · task title only
                    </span>
                  )}
                </dd>
                <dt>Acceptance criteria supplied</dt>
                <dd>
                  {config.acceptanceCriteria.length ? (
                    <ul className="check-list">
                      {config.acceptanceCriteria.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  ) : (
                    <span className="muted">None supplied</span>
                  )}
                </dd>
                <dt>Agent validation requirements</dt>
                <dd>
                  <div className="tag-list">
                    {config.requiredChecks.map((check) => (
                      <span className="config-tag" key={check}>
                        {check}
                      </span>
                    ))}
                  </div>
                </dd>
              </dl>
              <p className="config-note">{config.notes}</p>
            </div>
          </section>
          {run.evaluation?.failureDetails.length ? (
            <section className="failure-detail">
              <div className="eyebrow">
                {run.evaluation.criticalFailure
                  ? "CRITICAL FAILURE"
                  : "EVALUATION FINDINGS"}
              </div>
              <h2>
                {run.status === "FAILED" ? "What broke" : "What needs review"}
              </h2>
              {run.evaluation.failureDetails.map((detail) => (
                <p key={detail}>{detail}</p>
              ))}
            </section>
          ) : (
            <section className="success-detail">
              <div className="eyebrow">EVALUATION OUTCOME</div>
              <h2>Required checks passed</h2>
              <p>{run.summary}</p>
            </section>
          )}
          <DiagnosisCard diagnoses={run.diagnoses} />
        </div>
        <div className="detail-column">
          {run.evaluation && <RunResultSummary result={run.evaluation} />}
          {run.intervention && (
            <InterventionCard intervention={run.intervention} />
          )}
          <section className="panel">
            <SectionHeading title="Changed files" />
            <div className="card-content file-list">
              {run.filesChanged.map((file) => (
                <code key={file}>
                  <FileCode2 size={13} />
                  {file}
                </code>
              ))}
              <p className="muted">
                Fixture file manifest. Live verification uses a separate
                temporary workspace and does not update this record.
              </p>
            </div>
          </section>
          {task.id === "customers-pagination" && (
            <Link
              className="comparison-link"
              href={run.id === "SL-1042" ? "/runs/SL-1043" : "/runs/SL-1042"}
            >
              <GitCompareArrows size={20} />
              <div>
                <strong>
                  {run.id === "SL-1042"
                    ? "Inspect the improved fixture"
                    : "Inspect the baseline failure"}
                </strong>
                <p>Same task · different configuration</p>
              </div>
              <ArrowRight size={16} />
            </Link>
          )}
        </div>
      </div>
    </>
  );
}
