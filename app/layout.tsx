import type { Metadata } from "next";
import { AppSidebar, Topbar, EvidenceFooter } from "@/components/app-sidebar";
import "./globals.css";
import { demoNotice, isDemoMode } from "@/lib/demo-mode";

// Read the server-side mode for each request, including navigation and notices.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: {
    default: "Shadowline · Agent workflow evaluation",
    template: "%s · Shadowline",
  },
  description:
    "Measure agent failures, improve task design, and earn autonomy with deterministic evidence. Fixture-driven engineering prototype.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <a href="#main" className="skip-link">
          Skip to content
        </a>
        <AppSidebar demoMode={isDemoMode()} />
        <div className="app-shell">
          <Topbar />
          <main id="main">
            {isDemoMode() && (
              <aside className="demo-notice" aria-label="Hosted demo">
                {demoNotice}
              </aside>
            )}
            {children}
          </main>
          <EvidenceFooter demoMode={isDemoMode()} />
        </div>
      </body>
    </html>
  );
}
