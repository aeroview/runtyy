#!/usr/bin/env node

const {performance} = require('perf_hooks');
const fs = require('fs');
const path = require('path');

// Import validation libraries
const {predicates: p} = require('./dist/index.js');
const zod = require('zod');
const joi = require('joi');
const yup = require('yup');

const ITERATIONS = 100_000;

// Test data — same payload for every library
const validUser = {
    name: 'John Doe',
    email: 'john@example.com',
    age: 30,
    phone: '(555) 123-4567',
    address: {
        street: '123 Main St',
        city: 'Anytown',
        state: 'CA',
        zip: '12345',
    },
    tags: ['developer', 'typescript', 'nodejs'],
};

const invalidUser = {
    name: '',
    email: 'invalid-email',
    age: -5,
    phone: 'not-a-phone',
    address: {
        street: '',
        city: '',
        state: 'INVALID',
        zip: 'not-a-zip',
    },
    tags: [],
};

const runtypSchema = p.object({
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

const zodSchema = zod.object({
    name: zod.string().min(1).max(100),
    email: zod.string().email(),
    age: zod.number().min(0).max(150),
    phone: zod.string().regex(/^\(\d{3}\) \d{3}-\d{4}$/),
    address: zod.object({
        street: zod.string().min(1),
        city: zod.string().min(1),
        state: zod.string().length(2),
        zip: zod.string().regex(/^\d{5}$/),
    }),
    tags: zod.array(zod.string()).min(1),
});

const joiSchema = joi.object({
    name: joi.string().min(1).max(100).required(),
    email: joi.string().email().required(),
    age: joi.number().min(0).max(150).required(),
    phone: joi.string().pattern(/^\(\d{3}\) \d{3}-\d{4}$/).required(),
    address: joi.object({
        street: joi.string().min(1).required(),
        city: joi.string().min(1).required(),
        state: joi.string().length(2).required(),
        zip: joi.string().pattern(/^\d{5}$/).required(),
    }).required(),
    tags: joi.array().items(joi.string()).min(1).required(),
});

const yupSchema = yup.object({
    name: yup.string().min(1).max(100).required(),
    email: yup.string().email().required(),
    age: yup.number().min(0).max(150).required(),
    phone: yup.string().matches(/^\(\d{3}\) \d{3}-\d{4}$/).required(),
    address: yup.object({
        street: yup.string().min(1).required(),
        city: yup.string().min(1).required(),
        state: yup.string().length(2).required(),
        zip: yup.string().matches(/^\d{5}$/).required(),
    }).required(),
    tags: yup.array().of(yup.string()).min(1).required(),
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
        if (!validate(validUser)) {
            throw new Error(`${name}: validUser should pass validation`);
        }
        if (validate(invalidUser)) {
            throw new Error(`${name}: invalidUser should fail validation`);
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
        validate(validUser);
    }

    const validMs = timeRuns(validate, validUser, iterations);
    const invalidMs = timeRuns(validate, invalidUser, iterations);
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
console.log('Versions tested:');
libraries.forEach(({name, version}) => {
    console.log(`  ${name} ${version}`);
});
console.log(`Node ${process.version}`);
console.log('');
console.log(`Each library validates the same user object ${ITERATIONS.toLocaleString()} times with valid data,`);
console.log(`then ${ITERATIONS.toLocaleString()} times with invalid data (${(ITERATIONS * 2).toLocaleString()} runs total).`);
console.log('Invalid runs collect all field errors (abortEarly: false for Joi/Yup).');
console.log('Lower total time is faster. See docs/benchmark.md for methodology and per-run breakdown.');

assertFixtures(libraries);
console.log('\nFixture check passed: validUser passes and invalidUser fails for every library.');

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
