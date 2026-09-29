import type { Metadata } from "next";
import { AppSidebar, Topbar, EvidenceFooter } from "@/components/app-sidebar";
import "./globals.css";
import { isDemoMode } from "@/lib/demo-mode";

// Read the server-side mode for each request, including navigation and notices.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: {
    default: "Shadowline · Agent workflow evaluation",
    template: "%s · Shadowline",
  },
  description: "Coding-agent workflow health.",
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
          <Topbar demoMode={isDemoMode()} />
          <main id="main">{children}</main>
          <EvidenceFooter demoMode={isDemoMode()} />
        </div>
      </body>
    </html>
  );
}
