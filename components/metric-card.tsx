import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";

export function MetricCard({
  label,
  value,
  detail,
  trend,
  favorable = true,
}: {
  label: string;
  value: string;
  detail: string;
  trend?: string;
  favorable?: boolean;
}) {
  const Icon = trend ? (favorable ? ArrowDownRight : ArrowUpRight) : Minus;
  return (
    <div className="metric-card">
      <div className="metric-label">{label}</div>
      <div className="metric-value">{value}</div>
      <div className="metric-bottom">
        <span
          className={trend ? (favorable ? "text-good" : "text-warn") : "muted"}
        >
          <Icon size={13} />
          {trend ?? "Fixture cohort"}
        </span>
      </div>
      <p>{detail}</p>
    </div>
  );
}
