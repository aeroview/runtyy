# Validation benchmark

This page explains exactly what the runtyp performance numbers measure and how to reproduce them.

## What we measure

Each library validates the **same API event-ingestion payload** — the kind of structured JSON an observability API might accept on ingest:

- top-level UUIDs, ISO timestamps, enums, and bounded strings
- nested `source` and `actor` objects (service metadata + user context)
- optional fields (`assigneeId`)
- `tags` string array with length bounds
- `occurrences` array of objects (timestamp, count, request URL)
- `attributes` open string map (`Record<string, string>`)

For every library we run **two passes**:

1. **100,000 validations** against valid input (should pass)
2. **100,000 validations** against invalid input (should fail)

That is **200,000 validation runs per library**. Results are reported as **total wall-clock time** for each pass and combined. Lower is faster.

Before timing, the script asserts that `validPayload` passes and `invalidPayload` fails for **every** library. If fixtures drift out of equivalence, the benchmark exits with an error instead of publishing misleading numbers.

Each library uses its normal non-throwing validation path where one exists (`runtyp` result object, Zod `safeParse`, Joi `validate`, Yup `validateSync` in try/catch). On invalid input, **all libraries collect every field error** — Joi and Yup use `abortEarly: false` so they validate the same depth as runtyp and Zod.

## Versions tested

All versions are **pinned exactly** in `package.json` and the lockfile:

| Library | Version |
|---------|---------|
| **runtyp** | 1.0.0 |
| **joi** | 18.2.3 |
| **zod** | 4.4.3 |
| **yup** | 1.7.1 |

Environment: Node **v24.16.0** · run date **2026-08-02** · [`benchmark.js`](../benchmark.js)

## Latest results

| Library | Version | Valid (100k runs) | Invalid (100k runs) | **Total (200k runs)** | vs runtyp |
|---------|---------|-------------------|---------------------|----------------------|-----------|
| **runtyp** | 1.0.0 | 115 ms | 295 ms | **410 ms** | fastest |
| **joi** | 18.2.3 | 846 ms | 1,788 ms | **2,634 ms** | 6.4× slower |
| **zod** | 4.4.3 | 261 ms | 3,554 ms | **3,815 ms** | 9.3× slower |
| **yup** | 1.7.1 | 2,413 ms | 33,368 ms | **35,781 ms** | 87× slower |

### Per-run averages

| Library | Version | Avg valid pass | Avg invalid pass |
|---------|---------|----------------|------------------|
| **runtyp** | 1.0.0 | 0.0012 ms | 0.0029 ms |
| **joi** | 18.2.3 | 0.0085 ms | 0.0179 ms |
| **zod** | 4.4.3 | 0.0026 ms | 0.0355 ms |
| **yup** | 1.7.1 | 0.0241 ms | 0.3337 ms |

We use the latest pinned competitor versions and Zod's `safeParse` API for a fair comparison.

## Test schema

All libraries express equivalent constraints. Example (runtyp):

```typescript
const occurrence = p.object({
    at: p.regex(ISO_DATETIME, 'must be ISO-8601 UTC datetime'),
    count: p.number({range: {min: 1, max: 1_000_000}}),
    requestUrl: p.url(),
});

p.object({
    id: p.uuid(),
    appId: p.uuid(),
    occurredAt: p.regex(ISO_DATETIME, 'must be ISO-8601 UTC datetime'),
    severity: p.enumValue(Severity),
    message: p.string({len: {min: 1, max: 10_000}}),
    fingerprint: p.string({len: {min: 1, max: 256}}),
    source: p.object({
        service: p.string({len: {min: 1, max: 128}}),
        environment: p.string({len: {min: 1, max: 64}}),
        host: p.string({len: {min: 1, max: 253}}),
        release: p.regex(SEMVER, 'must be semver'),
        region: p.string({len: {min: 1, max: 32}}),
    }),
    actor: p.object({
        id: p.uuid(),
        email: p.email(),
        role: p.enumValue(Role),
        assigneeId: p.optional(p.uuid()),
    }),
    tags: p.array(p.string({len: {min: 1, max: 64}}), {len: {min: 1, max: 50}}),
    occurrences: p.array(occurrence, {len: {min: 1, max: 100}}),
    attributes: p.record(p.string({len: {min: 1, max: 512}})),
});
```

Valid and invalid fixtures live in [`benchmark.js`](../benchmark.js).

## Reproduce locally

```bash
git clone https://github.com/logfoxai/runtyp.git
cd runtyp
npm install
npm run benchmark
```

The script prints a summary to stdout and writes `benchmark-results.json` (gitignored) with raw timings.

## Caveats

- Micro-benchmarks vary by CPU, Node version, and background load. Treat ratios as directional, not guarantees.
- This measures **runtime validation only**, not bundle size. See the README for gzip size comparisons.
- Real apps spend time on I/O, serialization, and business logic; profile your own hot paths before optimizing library choice.
- If your app only needs the first validation error, Joi/Yup with default `abortEarly: true` will be faster on invalid input than these numbers suggest.
