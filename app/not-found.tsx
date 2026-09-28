import Link from "next/link";
export default function NotFound() {
  return (
    <div className="empty-results">
      <div className="eyebrow">404 · NOT FOUND</div>
      <h1>This run is not in the fixture set.</h1>
      <p>Return to the benchmark explorer to inspect an available run.</p>
      <Link className="button primary" href="/runs">
        Browse benchmark runs
      </Link>
    </div>
  );
}
