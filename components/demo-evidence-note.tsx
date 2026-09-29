import { isDemoMode } from "@/lib/demo-mode";

export function DemoEvidenceNote() {
  if (!isDemoMode()) return null;
  return (
    <p className="demo-evidence-note">
      Recorded real evidence · read-only. Local repository and temporary
      workspace paths are redacted from logs. Original record, prompt, and
      approval hashes refer to local originals; measured results are unchanged.
    </p>
  );
}
