import { notFound } from "next/navigation";
import { BenchmarkVerification } from "@/components/benchmark-verification";
import { PageHeading } from "@/components/ui";
import Link from "next/link";
import { canViewRealEvidence, isDemoMode } from "@/lib/demo-mode";

export const dynamic = "force-dynamic";
export const metadata = { title: "Benchmark verification" };

export default function VerificationPage() {
  if (!canViewRealEvidence()) notFound();
  return (
    <>
      <PageHeading
        eyebrow="PHASE 02 · LOCAL DEVELOPMENT"
        title="Benchmark verification"
        description="Apply one known patch to a fresh customer-service workspace and inspect real deterministic evidence."
      />
      {isDemoMode() ? (
        <section className="panel card-content">
          <h2>Inspect recorded verification</h2>
          <p>
            Benchmark execution requires the local isolated workspace. No code
            executes in this hosted view.
          </p>
          <button className="button secondary" disabled>
            Run benchmark — local only
          </button>
          <p>
            <Link className="text-link" href="/experiments/real">
              Inspect saved deterministic results
            </Link>
          </p>
        </section>
      ) : (
        <BenchmarkVerification />
      )}
    </>
  );
}
