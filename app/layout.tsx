import type { Metadata } from "next";
import { AppSidebar, Topbar } from "@/components/app-sidebar";
import "./globals.css";

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
        <AppSidebar />
        <div className="app-shell">
          <Topbar />
          <main id="main">{children}</main>
          <footer className="app-footer">
            <span>
              <span className="fixture-dot" />
              All results are illustrative fixtures
            </span>
            <span>AI proposes. Deterministic software verifies.</span>
          </footer>
        </div>
      </body>
    </html>
  );
}
