"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  FlaskConical,
  GitBranch,
  LayoutDashboard,
  Layers3,
  ShieldCheck,
  Building2,
  Workflow,
} from "lucide-react";
const links = [
  { href: "/", label: "Overview", icon: LayoutDashboard },
  { href: "/runs", label: "Runs", icon: Activity },
  { href: "/experiments", label: "Experiments", icon: FlaskConical },
  { href: "/engagement", label: "Engagement", icon: Building2 },
  { href: "/architecture", label: "Architecture", icon: Workflow },
];
export function AppSidebar({ demoMode = false }: { demoMode?: boolean }) {
  const pathname = usePathname();
  const activePath = pathname.startsWith("/agent/runs/") ? "/runs" : pathname;
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
          <strong>Engineering</strong>
          <span>{demoMode ? "Recorded benchmark" : "Local workspace"}</span>
        </div>
      </div>
      <div className="nav-label">WORKSPACE</div>
      <nav aria-label="Main navigation">
        {links.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={`nav-link ${(href === "/" ? activePath === href : activePath.startsWith(href)) ? "active" : ""}`}
            aria-current={
              (href === "/" ? activePath === href : activePath.startsWith(href))
                ? "page"
                : undefined
            }
          >
            <Icon size={17} />
            {label}
          </Link>
        ))}
      </nav>
      {!demoMode && process.env.NODE_ENV === "development" && (
        <div className="secondary-navigation">
          <div className="nav-label">LOCAL TOOLS</div>
          <Link className="nav-link" href="/agent">
            <GitBranch size={15} />
            Coding agent
          </Link>
          <Link className="nav-link" href="/verification">
            <ShieldCheck size={15} />
            Verification
          </Link>
        </div>
      )}
      <div className="sidebar-bottom">
        <span className="fixture-dot" />
        {demoMode ? "Read-only workspace" : "Local workspace"}
        <span className="version">v0.4</span>
      </div>
    </aside>
  );
}
export function Topbar({ demoMode = false }: { demoMode?: boolean }) {
  const pathname = usePathname();
  const activePath = pathname.startsWith("/agent/runs/") ? "/runs" : pathname;
  const section =
    links.find((link) => link.href !== "/" && activePath.startsWith(link.href))
      ?.label ??
    (pathname.startsWith("/agent")
      ? "Coding agent"
      : pathname === "/verification"
        ? "Verification"
        : "Overview");
  return (
    <div className="topbar">
      <div className="breadcrumbs">
        <span>Workspace</span>
        <span>/</span>
        <strong>{section}</strong>
      </div>
      <div className="topbar-right">
        {demoMode ? (
          <span className="demo-tag" aria-label="Hosted demo">
            Recorded demo
          </span>
        ) : (
          <span className="repo-label">
            <GitBranch size={13} />
            shadowline-benchmark
          </span>
        )}
      </div>
    </div>
  );
}
export function EvidenceFooter({ demoMode = false }: { demoMode?: boolean }) {
  const pathname = usePathname();
  const label =
    pathname === "/engagement"
      ? "Illustrative customer assumptions · saved real benchmark evidence"
      : pathname.startsWith("/agent") ||
          pathname.startsWith("/experiments/real") ||
          pathname === "/verification"
        ? `${demoMode ? "Recorded" : "Local"} real benchmark evidence`
        : pathname.startsWith("/runs/")
          ? "Illustrative fixture"
          : pathname === "/architecture"
            ? "Architecture"
            : "Recorded evidence · illustrative sections labeled separately";
  return (
    <footer className="app-footer">
      <span>{label}</span>
      <span>Shadowline</span>
    </footer>
  );
}
