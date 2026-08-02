#!/usr/bin/env node

const {performance} = require('perf_hooks');
const fs = require('fs');
const path = require('path');

const {predicates: p} = require('./dist/index.js');
const zod = require('zod');
const joi = require('joi');
const yup = require('yup');

const ITERATIONS = 100_000;

const Severity = Object.freeze({
    DEBUG: 'debug',
    INFO: 'info',
    WARN: 'warn',
    ERROR: 'error',
});

const Role = Object.freeze({
    ADMIN: 'admin',
    MEMBER: 'member',
    VIEWER: 'viewer',
});

const ISO_DATETIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?Z$/;
const SEMVER = /^\d+\.\d+\.\d+$/;

// Realistic API event-ingestion payload (nested objects, enums, UUIDs, URL array items, string map)
const validPayload = {
    id: '550e8400-e29b-41d4-a716-446655440000',
    appId: '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
    occurredAt: '2026-08-01T12:00:00.000Z',
    severity: 'error',
    message: 'Connection timeout while fetching user profile',
    fingerprint: 'pg-timeout-users-v2',
    source: {
        service: 'api-service',
        environment: 'production',
        host: 'api-1.prod.example.com',
        release: '2.5.1',
        region: 'us-east-1',
    },
    actor: {
        id: '7c9e6679-7425-40de-944b-e07fc1f90ae7',
        email: 'admin@example.com',
        role: 'admin',
    },
    tags: ['timeout', 'postgres', 'critical'],
    occurrences: [
        {
            at: '2026-08-01T12:00:00.000Z',
            count: 1,
            requestUrl: 'https://api.example.com/v1/users/profile',
        },
        {
            at: '2026-08-01T12:01:15.000Z',
            count: 4,
            requestUrl: 'https://api.example.com/v1/teams/members',
        },
    ],
    attributes: {
        dbHost: 'postgres.internal',
        queryMs: '842',
        pool: 'primary',
    },
};

const invalidPayload = {
    id: 'not-a-uuid',
    appId: 'also-bad',
    occurredAt: 'yesterday',
    severity: 'critical',
    message: '',
    fingerprint: '',
    source: {
        service: '',
        environment: 'production',
        host: '',
        release: 'v2.5',
        region: '',
    },
    actor: {
        id: 'bad',
        email: 'not-email',
        role: 'superuser',
        assigneeId: 'bad-uuid',
    },
    tags: [],
    occurrences: [
        {
            at: 'invalid',
            count: 0,
            requestUrl: 'ftp://bad.example.com/evil',
        },
        {
            at: '2026-08-01T12:00:00.000Z',
            count: -1,
            requestUrl: 'not-a-url',
        },
    ],
    attributes: {
        dbHost: 123,
        queryMs: null,
    },
};

const occurrenceRuntyp = p.object({
    at: p.regex(ISO_DATETIME, 'must be ISO-8601 UTC datetime'),
    count: p.number({range: {min: 1, max: 1_000_000}}),
    requestUrl: p.url(),
});

const runtypSchema = p.object({
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
    occurrences: p.array(occurrenceRuntyp, {len: {min: 1, max: 100}}),
    attributes: p.record(p.string({len: {min: 1, max: 512}})),
});

const occurrenceZod = zod.object({
    at: zod.string().regex(ISO_DATETIME),
    count: zod.number().int().min(1).max(1_000_000),
    requestUrl: zod.string().url(),
});

const zodSchema = zod.object({
    id: zod.string().uuid(),
    appId: zod.string().uuid(),
    occurredAt: zod.string().regex(ISO_DATETIME),
    severity: zod.enum(['debug', 'info', 'warn', 'error']),
    message: zod.string().min(1).max(10_000),
    fingerprint: zod.string().min(1).max(256),
    source: zod.object({
        service: zod.string().min(1).max(128),
        environment: zod.string().min(1).max(64),
        host: zod.string().min(1).max(253),
        release: zod.string().regex(SEMVER),
        region: zod.string().min(1).max(32),
    }),
    actor: zod.object({
        id: zod.string().uuid(),
        email: zod.string().email(),
        role: zod.enum(['admin', 'member', 'viewer']),
        assigneeId: zod.string().uuid().optional(),
    }),
    tags: zod.array(zod.string().min(1).max(64)).min(1).max(50),
    occurrences: zod.array(occurrenceZod).min(1).max(100),
    attributes: zod.record(zod.string(), zod.string().min(1).max(512)),
});

const occurrenceJoi = joi.object({
    at: joi.string().pattern(ISO_DATETIME).required(),
    count: joi.number().integer().min(1).max(1_000_000).required(),
    requestUrl: joi.string().uri().required(),
});

const joiSchema = joi.object({
    id: joi.string().uuid().required(),
    appId: joi.string().uuid().required(),
    occurredAt: joi.string().pattern(ISO_DATETIME).required(),
    severity: joi.string().valid('debug', 'info', 'warn', 'error').required(),
    message: joi.string().min(1).max(10_000).required(),
    fingerprint: joi.string().min(1).max(256).required(),
    source: joi.object({
        service: joi.string().min(1).max(128).required(),
        environment: joi.string().min(1).max(64).required(),
        host: joi.string().min(1).max(253).required(),
        release: joi.string().pattern(SEMVER).required(),
        region: joi.string().min(1).max(32).required(),
    }).required(),
    actor: joi.object({
        id: joi.string().uuid().required(),
        email: joi.string().email().required(),
        role: joi.string().valid('admin', 'member', 'viewer').required(),
        assigneeId: joi.string().uuid(),
    }).required(),
    tags: joi.array().items(joi.string().min(1).max(64)).min(1).max(50).required(),
    occurrences: joi.array().items(occurrenceJoi).min(1).max(100).required(),
    attributes: joi.object().pattern(joi.string(), joi.string().min(1).max(512)).required(),
});

const occurrenceYup = yup.object({
    at: yup.string().matches(ISO_DATETIME).required(),
    count: yup.number().integer().min(1).max(1_000_000).required(),
    requestUrl: yup.string().url().required(),
});

const yupSchema = yup.object({
    id: yup.string().uuid().required(),
    appId: yup.string().uuid().required(),
    occurredAt: yup.string().matches(ISO_DATETIME).required(),
    severity: yup.string().oneOf(['debug', 'info', 'warn', 'error']).required(),
    message: yup.string().min(1).max(10_000).required(),
    fingerprint: yup.string().min(1).max(256).required(),
    source: yup.object({
        service: yup.string().min(1).max(128).required(),
        environment: yup.string().min(1).max(64).required(),
        host: yup.string().min(1).max(253).required(),
        release: yup.string().matches(SEMVER).required(),
        region: yup.string().min(1).max(32).required(),
    }).required(),
    actor: yup.object({
        id: yup.string().uuid().required(),
        email: yup.string().email().required(),
        role: yup.string().oneOf(['admin', 'member', 'viewer']).required(),
        assigneeId: yup.string().uuid().optional(),
    }).required(),
    tags: yup.array().of(yup.string().min(1).max(64)).min(1).max(50).required(),
    occurrences: yup.array().of(occurrenceYup).min(1).max(100).required(),
    attributes: yup.object().test('string-record', 'attributes must be a string map', (value) => {
        if (!value || typeof value !== 'object' || Array.isArray(value)) {
            return false;
        }
        return Object.values(value).every((entry) => typeof entry === 'string' && entry.length >= 1 && entry.length <= 512);
    }).required(),
});

const libraries = [
    {
        name: 'runtyp',
        version: require('./package.json').version,
        validate: (data) => runtypSchema(data).isValid,
    },
    {
        name: 'zod',
        version: require('zod/package.json').version,
        validate: (data) => zodSchema.safeParse(data).success,
    },
    {
        name: 'joi',
        version: require('joi/package.json').version,
        validate: (data) => !joiSchema.validate(data, {abortEarly: false}).error,
    },
    {
        name: 'yup',
        version: require('yup/package.json').version,
        validate: (data) => {
            try {
                yupSchema.validateSync(data, {abortEarly: false});
                return true;
            } catch {
                return false;
            }
        },
    },
];

function assertFixtures(librariesToCheck) {
    for (const {name, validate} of librariesToCheck) {
        if (!validate(validPayload)) {
            throw new Error(`${name}: validPayload should pass validation`);
        }
        if (validate(invalidPayload)) {
            throw new Error(`${name}: invalidPayload should fail validation`);
        }
    }
}

function timeRuns(fn, data, iterations) {
    const start = performance.now();
    for (let i = 0; i < iterations; i++) {
        fn(data);
    }
    return performance.now() - start;
}

function benchmarkLibrary({name, version, validate}, iterations) {
    console.log(`\nBenchmarking ${name}@${version}...`);

    for (let i = 0; i < 1000; i++) {
        validate(validPayload);
    }

    const validMs = timeRuns(validate, validPayload, iterations);
    const invalidMs = timeRuns(validate, invalidPayload, iterations);
    const totalMs = validMs + invalidMs;

    const result = {
        name,
        version,
        iterations,
        validMs,
        invalidMs,
        totalMs,
        avgValidMs: validMs / iterations,
        avgInvalidMs: invalidMs / iterations,
    };

    console.log(`  Valid passes:   ${validMs.toFixed(2)}ms total (${result.avgValidMs.toFixed(4)}ms / run)`);
    console.log(`  Invalid passes: ${invalidMs.toFixed(2)}ms total (${result.avgInvalidMs.toFixed(4)}ms / run)`);
    console.log(`  Combined:       ${totalMs.toFixed(2)}ms total (${iterations.toLocaleString()} valid + ${iterations.toLocaleString()} invalid)`);

    return result;
}

console.log('Validation library benchmark');
console.log('============================');
console.log('Scenario: API event-ingestion payload (nested objects, enums, UUIDs, URL arrays, string map)');
console.log('Versions tested:');
libraries.forEach(({name, version}) => {
    console.log(`  ${name} ${version}`);
});
console.log(`Node ${process.version}`);
console.log('');
console.log(`Each library validates the same payload ${ITERATIONS.toLocaleString()} times with valid data,`);
console.log(`then ${ITERATIONS.toLocaleString()} times with invalid data (${(ITERATIONS * 2).toLocaleString()} runs total).`);
console.log('Invalid runs collect all field errors (abortEarly: false for Joi/Yup).');
console.log('Lower total time is faster. See docs/benchmark.md for methodology and per-run breakdown.');

assertFixtures(libraries);
console.log('\nFixture check passed: validPayload passes and invalidPayload fails for every library.');

const results = libraries.map((lib) => benchmarkLibrary(lib, ITERATIONS));
results.sort((a, b) => a.totalMs - b.totalMs);

const fastest = results[0].totalMs;

console.log('\nResults (fastest to slowest, by combined total time):');
console.log('=====================================================');
results.forEach((result, index) => {
    const ratio = result.totalMs / fastest;
    const suffix = index === 0 ? '(fastest)' : `(${ratio.toFixed(1)}x slower)`;
    console.log(`${index + 1}. ${result.name}@${result.version}: ${result.totalMs.toFixed(2)}ms ${suffix}`);
});

const payload = {
    runAt: new Date().toISOString(),
    nodeVersion: process.version,
    scenario: 'api-event-ingestion',
    iterations: ITERATIONS,
    runsPerLibrary: ITERATIONS * 2,
    results,
};

fs.writeFileSync(
    path.join(__dirname, 'benchmark-results.json'),
    `${JSON.stringify(payload, null, 2)}\n`,
);

console.log('\nWrote benchmark-results.json');
console.log('Benchmark complete.');
