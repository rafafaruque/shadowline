export function CriticalStatus({ value }: { value: boolean | null }) {
  return (
    <span className="critical-status">
      Critical failure:{" "}
      <strong>{value === null ? "Not evaluated" : value ? "Yes" : "No"}</strong>
      <details className="inline-help">
        <summary aria-label="What counts as critical?">What counts?</summary>
        <p>
          For real pagination runs, critical means a failed legacy API
          compatibility assertion marked by the evaluator. Other contract
          failures still fail the run; they are not automatically critical.
          Fixture flags retain their authored meaning.
        </p>
      </details>
    </span>
  );
}
