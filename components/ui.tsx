import type { ReactNode } from "react";
import { ArrowUpRight, Check, Circle, X } from "lucide-react";
import { humanize } from "@/lib/format";

export function Badge({ value }: { value: string }) {
  const tone = ["PASSED", "AUTO", "LOW"].includes(value)
    ? "good"
    : ["FAILED", "HUMAN", "HIGH", "CRITICAL"].includes(value)
      ? "bad"
      : ["REVIEW", "REVIEW_REQUIRED", "WARNING", "MEDIUM"].includes(value)
        ? "warn"
        : "neutral";
  const Icon = value === "PASSED" ? Check : value === "FAILED" ? X : Circle;
  return (
    <span className={`badge ${tone}`}>
      <Icon size={11} strokeWidth={2.5} />
      {humanize(value)}
    </span>
  );
}
export function SectionHeading({
  eyebrow,
  title,
  children,
}: {
  eyebrow?: string;
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="section-heading">
      <div>
        {eyebrow && <div className="eyebrow">{eyebrow}</div>}
        <h2>{title}</h2>
      </div>
      {children}
    </div>
  );
}
export function PageHeading({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return (
    <header className="page-heading">
      <div>
        <div className="eyebrow">{eyebrow}</div>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {children}
    </header>
  );
}
export function Arrow() {
  return <ArrowUpRight size={15} aria-hidden="true" />;
}
