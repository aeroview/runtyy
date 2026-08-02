# Validation benchmark

This page explains exactly what the runtyp performance numbers measure and how to reproduce them.

## What we measure

Each library validates the **same nested user object** under the same rules:

- top-level strings (name, email, phone)
- numeric range (age)
- nested address object (street, city, state, zip)
- string array with minimum length (tags)

For every library we run **two passes**:

1. **100,000 validations** against valid input (should pass)
2. **100,000 validations** against invalid input (should fail)

That is **200,000 validation runs per library**. Results are reported as **total wall-clock time** for each pass and combined. Lower is faster.

Before timing, the script asserts that `validUser` passes and `invalidUser` fails for **every** library. If fixtures drift out of equivalence, the benchmark exits with an error instead of publishing misleading numbers.

Each library uses its normal non-throwing validation path where one exists (`runtyp` result object, Zod `safeParse`, Joi `validate`, Yup `validateSync` in try/catch). On invalid input, **all libraries collect every field error** — Joi and Yup use `abortEarly: false` so they validate the same depth as runtyp and Zod.

## Latest results

Run date: **2026-08-02** · Node **v24.16.0** · [`benchmark.js`](../benchmark.js)

Competitor versions are **pinned exactly** in `package.json` (`zod` 4.4.3, `joi` 18.2.3, `yup` 1.7.1).

| Library | Version | Valid (100k runs) | Invalid (100k runs) | **Total (200k runs)** | vs runtyp |
|---------|---------|-------------------|---------------------|----------------------|-----------|
| **runtyp** | 1.0.0 | 36 ms | 61 ms | **97 ms** | fastest |
| **joi** | 18.2.3 | 293 ms | 608 ms | **901 ms** | 9.3× slower |
| **zod** | 4.4.3 | 56 ms | 1,333 ms | **1,389 ms** | 14.3× slower |
| **yup** | 1.7.1 | 878 ms | 14,959 ms | **15,837 ms** | 163× slower |

### Per-run averages

| Library | Avg valid pass | Avg invalid pass |
|---------|----------------|------------------|
| **runtyp** | 0.0004 ms | 0.0006 ms |
| **joi** | 0.0029 ms | 0.0061 ms |
| **zod** | 0.0006 ms | 0.0133 ms |
| **yup** | 0.0088 ms | 0.1496 ms |

Zod **4.4.3** is substantially faster on invalid data than older benchmark runs against Zod 4.1.x (combined total dropped from ~3.6 s to ~1.4 s). We use the latest pinned competitor versions and Zod's `safeParse` API for a fair comparison.

## Test schema

All libraries express equivalent constraints. Example (runtyp):

```typescript
p.object({
    name: p.string({len: {min: 1, max: 100}}),
    email: p.email(),
    age: p.number({range: {min: 0, max: 150}}),
    phone: p.regex(/^\(\d{3}\) \d{3}-\d{4}$/, 'must be valid phone format'),
    address: p.object({
        street: p.string({len: {min: 1}}),
        city: p.string({len: {min: 1}}),
        state: p.string({len: {min: 2, max: 2}}),
        zip: p.regex(/^\d{5}$/, 'must be 5 digits'),
    }),
    tags: p.array(p.string(), {len: {min: 1}}),
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
