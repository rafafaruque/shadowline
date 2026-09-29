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
        title="Benchmark verification"
        description="Known patches · deterministic evaluation"
      />
      {isDemoMode() ? (
        <section className="panel card-content">
          <h2>Inspect recorded verification</h2>
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
