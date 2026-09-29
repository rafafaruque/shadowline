import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  GitCompareArrows,
  ShieldCheck,
  Terminal,
  TriangleAlert,
} from "lucide-react";
import { AutonomyMap } from "@/components/autonomy-map";
import { MetricCard } from "@/components/metric-card";
import { RunTable } from "@/components/run-table";
import { PageHeading, SectionHeading } from "@/components/ui";
import { getRunMetrics, runs } from "@/lib/fixtures/runs";
import { money, percent } from "@/lib/format";

export default function Dashboard() {
  const metrics = getRunMetrics();
  return (
    <>
      <PageHeading
        eyebrow="AGENT WORKFLOW INTELLIGENCE"
        title="Shadowline"
        description="Measure where coding agents fail, improve how work is given to them, and determine where autonomy is earned."
      >
        <Link className="button secondary" href="/experiments">
          <GitCompareArrows size={16} />
          Compare configurations
          <ArrowUpRight size={14} />
        </Link>
      </PageHeading>
      <div className="cohort-bar">
        <div>
          <span className="fixture-dot" />
          <strong>Benchmark overview</strong>
          <span className="divider" />
          Controlled customer-service repository
        </div>
        <span>12 runs · Sep 24, 2026</span>
      </div>
      <div className="metrics-grid">
        <MetricCard
          label="First-pass success"
          value={percent(metrics.firstPassCount / metrics.firstAttempts)}
          detail={`${metrics.firstPassCount} of ${metrics.firstAttempts} initial attempts passed`}
        />
        <MetricCard
          label="Regression rate"
          value={percent(metrics.regressions / metrics.total)}
          detail={`${metrics.regressions} regressions across ${metrics.total} attempts`}
        />
        <MetricCard
          label="Human review rate"
          value={percent(metrics.reviews / metrics.total)}
          detail={`${metrics.reviews} of ${metrics.total} attempts require review`}
        />
        <MetricCard
          label="Avg. cost / successful task"
          value={money(metrics.totalCost / metrics.successfulTasks)}
          detail={`${money(metrics.totalCost)} total spend / ${metrics.successfulTasks} successful tasks`}
        />
      </div>
      <div className="dashboard-grid">
        <AutonomyMap />
        <div className="dashboard-right">
          <section className="panel spotlight">
            <div className="spotlight-label">
              <TriangleAlert size={14} />
              FAILURE SPOTLIGHT<span className="mono">SL-1042</span>
            </div>
            <h2>
              Passing tests.
              <br /> Broken contract.
            </h2>
            <p>
              The agent added pagination. Existing customers got a different
              response shape.
            </p>
            <div className="code-compare">
              <div>
                <span>EXPECTED</span>
                <code>Customer[]</code>
              </div>
              <ArrowRight size={16} />
              <div>
                <span>RECEIVED</span>
                <code>{"{ data, page, pageSize, total }"}</code>
              </div>
            </div>
            <div className="spotlight-evidence">
              <span>
                <ShieldCheck size={14} />
                11/11 public tests
              </span>
              <span className="text-bad">
                <TriangleAlert size={14} />2 contract failures
              </span>
            </div>
            <Link href="/runs/SL-1042" className="button dark full-width">
              Inspect failure &amp; intervention
              <ArrowRight size={16} />
            </Link>
          </section>
          <Link className="experiment-teaser" href="/experiments">
            <span className="teaser-icon">
              <GitCompareArrows size={20} />
            </span>
            <div>
              <div className="eyebrow">FROM FAILURE TO IMPROVEMENT</div>
              <h3>Better context. Measurable tradeoffs.</h3>
              <p>Explore the illustrative before / after experiment.</p>
            </div>
            <ArrowUpRight size={18} />
          </Link>
        </div>
      </div>
      <Link className="experiment-teaser engagement-teaser" href="/engagement">
        <span className="teaser-icon">
          <ShieldCheck size={20} />
        </span>
        <div>
          <div className="eyebrow">
            FROM TECHNICAL EVIDENCE TO CUSTOMER IMPACT
          </div>
          <h3>Customer engagement — Northstar Software</h3>
          <p>
            Real experiment evidence, a pilot review policy, and illustrative
            business assumptions.
          </p>
        </div>
        <ArrowUpRight size={18} />
      </Link>
      <section className="panel recent-runs">
        <SectionHeading
          eyebrow="THE EVIDENCE TRAIL"
          title="Recent benchmark runs"
        >
          <Link className="text-link" href="/runs">
            View all runs
            <ArrowRight size={14} />
          </Link>
        </SectionHeading>
        <RunTable runs={runs.slice(0, 5)} />
        <div className="table-footer">
          <span>
            <Terminal size={13} />
            Deterministic checks across type, behavior, contracts, and scope
          </span>
          <span>5 of 12 runs</span>
        </div>
      </section>
    </>
  );
}
