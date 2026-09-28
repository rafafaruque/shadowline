# Controlled customer API benchmark

Small TypeScript / Hono application with twelve in-memory customers. No database, network server, authentication, or external API is needed for the tests. Hono's `app.request()` evaluates HTTP routing and responses directly.

The untouched baseline exposes `GET /customers` → complete ordered `Customer[]`. The reusable pagination utility exists, but the endpoint intentionally has not integrated it yet.

```sh
npm ci --ignore-scripts
npm run typecheck
npm test
npm run test:hidden
```

Those commands verify **baseline readiness**: 7 public tests and 1 historical contract. They do not claim that the pagination task is implemented. From the Shadowline root, `npm run benchmark:verify` evaluates baseline plus both patches in fresh workspaces. Never manually apply patches to this baseline.

```text
src/app.ts                      HTTP application
src/data/customers.ts           fixed ordered dataset
src/routes/customers.ts         historical route; sole allowed patch target
src/lib/pagination.ts           existing parser, offsets, slicing, metadata
docs/api-conventions.md         backward compatibility and invalid-input rules
docs/architecture.md            thin routes, shared utility, contract boundaries
tests/                         existing public tests (7)
hidden-tests/                   evaluator-owned compatibility/acceptance tests
```

The public task acceptance suite lives in `../benchmarks/public-tests/` and adds 4 pagination tests for both patches. The hidden pagination contract suite adds 15 checks to the baseline's 1. The runner copies hidden tests and all trusted validation configuration to a sibling harness outside editable source. No patch can target that harness through the patch-ID API.

`pagination-breaking` passes typecheck and 11 public tests but fails two critical legacy-array assertions. `pagination-compatible` passes all 16 contracts. Both use the existing helper. The baseline, patch, and dependency lockfile are content-fingerprinted; execution output remains separate from the fixture dashboard.
