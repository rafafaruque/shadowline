# Customer service benchmark

This small TypeScript / Hono application uses a fixed, ordered in-memory customer dataset. Hono's `app.request()` exercises HTTP request and response behavior without opening a listening port. No database, authentication, or external API is involved.

Routes stay thin. Reusable parsing, offsets, slicing, and metadata belong in `src/lib/pagination.ts`. That utility already exists in the baseline repository, while the baseline endpoint intentionally returns the historical array and has not yet integrated pagination.

Public tests cover basic routing and the existing utility. Public pagination acceptance tests accompany the task in `../benchmarks/public-tests/`. Public API behavior is also covered by independent contract tests. `hidden-tests/` is evaluator-owned and is excluded from the editable workspace. Shadowline stages these tests separately and never permits a patch to modify them.
