"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  ArrowUpRight,
  FlaskConical,
  GitBranch,
  LayoutDashboard,
  Layers3,
  PanelLeft,
  ShieldCheck,
} from "lucide-react";

const links = [
  { href: "/", label: "Overview", icon: LayoutDashboard },
  { href: "/runs", label: "Benchmark runs", icon: Activity },
  { href: "/experiments", label: "Experiments", icon: FlaskConical },
];
export function AppSidebar() {
  const pathname = usePathname();
  return (
    <aside className="sidebar">
      <Link href="/" className="brand" aria-label="Shadowline home">
        <span className="brand-icon">
          <Layers3 size={21} />
        </span>
        shadowline<span className="brand-period">.</span>
      </Link>
      <div className="workspace">
        <span className="workspace-avatar">S</span>
        <div>
          <strong>Engineering workspace</strong>
          <span>Local benchmark</span>
        </div>
        <PanelLeft size={14} />
      </div>
      <div className="nav-label">WORKSPACE</div>
      <nav aria-label="Main navigation">
        {links.map(({ href, label, icon: Icon }) => {
          const active =
            href === "/" ? pathname === href : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`nav-link ${active ? "active" : ""}`}
              aria-current={active ? "page" : undefined}
            >
              <Icon size={17} />
              {label}
              {active && <span className="active-dot" />}
            </Link>
          );
        })}
      </nav>
      <div className="sidebar-note">
        <ShieldCheck size={19} />
        <strong>Autonomy is earned.</strong>
        <p>
          AI proposes.
          <br />
          Deterministic software verifies.
        </p>
        <Link href="/#autonomy">
          Explore the evidence <ArrowUpRight size={13} />
        </Link>
      </div>
      <div className="sidebar-bottom">
        <span className="fixture-dot" />
        Fixture mode<span className="version">v0.1</span>
      </div>
    </aside>
  );
}
export function Topbar() {
  const pathname = usePathname();
  const section = pathname.startsWith("/experiments")
    ? "Experiments"
    : pathname.startsWith("/runs")
      ? "Benchmark runs"
      : "Overview";
  return (
    <div className="topbar">
      <div className="breadcrumbs">
        <span>Workspace</span>
        <span>/</span>
        <strong>{section}</strong>
      </div>
      <div className="topbar-right">
        <span className="repo-label">
          <GitBranch size={13} />
          shadowline-benchmark
        </span>
        <span className="demo-tag">PHASE 01 · PROTOTYPE</span>
      </div>
    </div>
  );
}
