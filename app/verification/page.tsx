import { notFound } from "next/navigation";
import { BenchmarkVerification } from "@/components/benchmark-verification";
import { PageHeading } from "@/components/ui";

export const dynamic = "force-dynamic";
export const metadata = { title: "Benchmark verification" };

export default function VerificationPage() {
  if (process.env.NODE_ENV !== "development") notFound();
  return (
    <>
      <PageHeading
        eyebrow="PHASE 02 · LOCAL DEVELOPMENT"
        title="Benchmark verification"
        description="Apply one known patch to a fresh customer-service workspace and inspect real deterministic evidence."
      />
      <BenchmarkVerification />
    </>
  );
}
