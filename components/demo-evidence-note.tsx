import { isDemoMode } from "@/lib/demo-mode";
export function DemoEvidenceNote() {
  if (!isDemoMode()) return null;
  return (
    <details className="inline-details">
      <summary>Recorded evidence provenance</summary>
      <p>
        Local paths are redacted in hosted copies. Original hashes refer to
        local originals; measured results are unchanged.
      </p>
    </details>
  );
}
