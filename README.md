# `runtyp`

![Code Coverage](https://img.shields.io/badge/Code%20Coverage%20-%20100%25%20-%20%2331c352)
[![SemVer](https://img.shields.io/badge/SemVer-2.0.0-blue)]()
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![AutoRel](https://img.shields.io/badge/%F0%9F%9A%80%20AutoRel-2D4DDE)](https://github.com/mhweiner/autorel)

Lightning-fast, zero-dependency runtime type validation for TS/JS. 25x faster and 15x smaller than zod (4kb vs 60kb gzipped).

**🚀 Fast & reliable performance**  

- 25x faster than `zod` and `yup`, 4.3x faster than `joi` (see [Performance](#performance) section)
- Supports tree-shaking via ES Modules so you only bundle what you use
- No dependencies
- 100% test coverage

**😀 User-friendly & powerful**

- Native Typescript support with <strong>simple, human-readable inferred types</strong>
- Easy-to-use declarative & functional API
- [Structured validation errors](#validation-results) that are easy to parse on both server & client
- Returns validation errors as values, not exceptions to catch and handle
- Works great both on the server and in the browser
- Composable and extensible with custom predicates

**🔋 Batteries included**

- Built-in support for email, urls, uuids, regex, enums, passwords, and more!

# Table of contents

- [Performance](#performance)
- [Example](#example)
- [Taking advantage of tree-shaking](#taking-advantage-of-tree-shaking)
- [Nested objects](#nested-objects)
- [Predicates (Validators)](#predicates-validators)
- [Validation Results](#validation-results)
- [Type Definitions](#type-definitions)
- [Advanced Usage](#advanced-usage)
- [Contribution](#contribution)
 
# Performance

runtyp is designed for speed. Here's how it compares to other popular programmatic validation libraries:

| Library | Valid Data | Invalid Data | Total Time | Relative Speed |
|---------|------------|--------------|------------|----------------|
| **runtyp** | 0.0005ms | 0.0009ms | 142.47ms | 1.0x (fastest) |
| **joi** | 0.0042ms | 0.0018ms | 607.70ms | 4.3x slower |
| **yup** | 0.0145ms | 0.0209ms | 3532.78ms | 24.8x slower |
| **zod** | 0.0007ms | 0.0357ms | 3637.74ms | 25.5x slower |

*Benchmark results from 100,000 iterations of complex object validation with nested objects, arrays, and various validation rules. Lower times are better.*

# Installation

```bash
npm i runtyp
```

## Requirements

- **Node.js**: 18+ (or any modern browser)
- **TypeScript**: 5.0+ (for type inference features)

> **Note**: JavaScript users can use runtyp without TypeScript. The TypeScript requirement only applies if you want type inference via `Infer<>`.

# Usage

## Example

```typescript
import {predicates as p, Infer} from 'runtyp';

// Validate a user object

const validator = p.object({
    email: p.email(),
    password: p.password(),
    name: p.string({len: {min: 1, max: 100}}),
    phone: p.optional(p.string()),
    mustBe42: p.custom((input: number) => input === 42, 'must be 42'),
});

type User = Infer<typeof validator>; // {email: string, password: string, name: string, phone?: string, mustBe42: number}

const result = validator({
    email: 'oopsie',
    password: 'password',
    name: 'John Doe',
    foo: 'bar',
});

if (!result.isValid) {
    console.log(result.errors); 
    /* Outputs:
    {
        email: 'must be a valid email address',
        password: 'must include at least one uppercase letter',
        mustBe42: 'must be 42',
        foo: 'unknown key',
    }
    */
} else {

    // result.isValid = true
    // result.value is now typed as User

}

// Check if a string is a valid GitHub username
const isValidUsername = p.chain(
    p.string({len: {min: 1, max: 39}}),
    p.regex(/^[a-zA-Z0-9-]+$/, 'can only contain letters, numbers, and hyphens'),
    p.custom((username: string) => !username.startsWith('-') && !username.endsWith('-'), 'cannot start or end with hyphen')
);

// Validate a phone number (US format)
const isValidPhone = p.regex(/^\(\d{3}\) \d{3}-\d{4}$/, 'must be in format (123) 456-7890');

// Check if a value is a valid port number
const isValidPort = p.chain(
    p.number({range: {min: 1, max: 65535}}),
    p.custom((port: number) => Number.isInteger(port), 'must be an integer')
);
```

## Taking advantage of tree-shaking

`runtyp` is tree-shakeable. This means that you can import only the predicates you need and the rest of the library will not be included in your bundle.

This is useful for frontend applications where bundle size is a concern. As a bonus, this allows our repo to contain a large number of predicates for convenience without bloating your bundle. Best of both worlds!

```typescript
import {email} from 'runtyp/dist/predicates';

const isEmail = email();
```

## Nested objects 

You can nest objects by using the `object` predicate. This allows you to create complex validation rules for nested objects. The error object will be flattened to include the nested object keys with a dot separator.

```typescript
import {predicates as p, Infer} from 'runtyp';

const validator = p.object({
    email: p.email(),
    address: p.object({
        line1: p.string(),
        line2: p.optional(p.string()),
        street: p.string(),
        state: p.string(),
        city: p.string({len: {min: 2, max: 2}}),
        zip: p.string(),
    })
});

type User = Infer<typeof validator>; // {email: string, address: {line1: string, line2?: string, street: string, city: string, zip: string}}

const result = validator({
    email: 'blah',
    address: {}
});

if (!result.isValid) {
    console.log(result.errors);
    /* 
    {
        email: 'must be a valid email address',
        'address.line1': 'must be a string',
        'address.street': 'must be a string',
        'address.state': 'must be a string',
        'address.city': 'must be between 2 and 2 characters long', // Yeah, we should probably fix this :)
        'address.zip': 'must be a string',
    }
    */
}
```

# Predicates (Validators)

Predicates are the building blocks of the validation API. They are functions that take an input and return a `ValidationResult`. You can use them to create your own custom predicates.

## Available Predicates

- [`boolean()`](#boolean) - Validates boolean values
- [`number()`](#number) - Validates numbers with optional range constraints
- [`string()`](#string) - Validates strings with optional length constraints
- [`object()`](#object) - Validates objects with schema definitions
- [`array()`](#array) - Validates arrays with element and length constraints
- [`enumValue()`](#enum) - Validates enum values
- [`optional()`](#optional) - Makes any predicate optional (allows undefined)
- [`custom()`](#custom) - Creates custom validation logic
- [`regex()`](#regex) - Validates strings against regular expressions
- [`chain()`](#chain) - Chains multiple predicates together
- [`union()`](#union) - Validates against multiple possible predicates
- [`literal()`](#literal) - Validates exact literal values
- [`email()`](#email) - Validates email addresses
- [`password()`](#password) - Validates password strength
- [`uuid()`](#uuid) - Validates UUID strings
- [`url()`](#url) - Validates URLs with optional constraints
- [`date()`](#date) - Validates Date objects with optional string and timestamp support
- [`any()`](#any) - Accepts any value without validation

## boolean

`boolean(): Pred<boolean>` 

Returns a predicate that checks if the input is a boolean.

Example:

```typescript
import {boolean} from 'runtyp/dist/predicates';

const isBoolean = boolean();
const result1 = isBoolean(true); // { isValid: true, value: true }
const result2 = isBoolean('hello'); // { isValid: false, errors: { root: 'must be a boolean' } }
```

## number

`number(opts?: Options): Pred<number>`

Returns a predicate that checks if the input is a number.

Options:

- `range`: `{min: number, max: number} | undefined` - checks if the input is within the specified range

Example:

```typescript
import {number} from 'runtyp/dist/predicates';

const isNumber = number({range: {min: 0, max: 100}});
const result1 = isNumber(50); // { isValid: true, value: 50 }
const result2 = isNumber(150); // { isValid: false, errors: { root: 'must be between 0 and 100' } }
const result3 = isNumber('hello'); // { isValid: false, errors: { root: 'must be a number' } }
```

## string

`string(opts?: Options): Pred<string>`

Returns a predicate that checks if the input is a string.

Options:

- `len`: `{min: number, max: number} | undefined` - checks if the input is within the specified length

Example:

```typescript
import {string} from 'runtyp/dist/predicates';

const isString = string({len: {min: 2, max: 10}});
const result1 = isString('hello'); // { isValid: true, value: 'hello' }
const result2 = isString('a'); // { isValid: false, errors: { root: 'must be at least 2 characters' } }
const result3 = isString(42); // { isValid: false, errors: { root: 'must be a string' } }
```

## object

`object<T>(predicates?: {[K in keyof T]: Pred<T[K]>}, opts?: Options): Pred<T> | Pred<Record<string, any>>`

Returns a predicate that checks if the input is an object. If a schema is provided, it validates the object against the specified keys and values. If no schema is provided, it simply validates that the input is an object (not null, not an array, etc.).

Options:

- `allowUnknownKeys` - allows unspecified/unexpected keys in the object, default is `false`

Example:

```typescript
import {object, string, number} from 'runtyp/dist/predicates';

// With schema
const userSchema = object({
    name: string(),
    age: number()
});
const result1 = userSchema({name: 'John', age: 30}); // { isValid: true, value: { name: 'John', age: 30 } }
const result2 = userSchema({name: 'John'}); // { isValid: false, errors: { age: 'must be a number' } }

// Without schema - accepts any object
const anyObject = object();
const result3 = anyObject({foo: 'bar', baz: 42}); // { isValid: true, value: {foo: 'bar', baz: 42} }
const result4 = anyObject(null); // { isValid: false, errors: { root: 'must be an object' } }
const result5 = anyObject([]); // { isValid: false, errors: { root: 'must be an object' } }
```

## array
`array<T>(predicate: Pred<T>, opts?: Options): Pred<T[]>`

Returns a predicate that checks if the input is an array of the specified type.

Options:

- `len?`: `{min: number, max: number}` - checks if the array is within the specified length

Example:

```typescript
import {array, number} from 'runtyp/dist/predicates';

const numberArray = array(number(), {len: {min: 1, max: 3}});
const result1 = numberArray([1, 2, 3]); // { isValid: true, value: [1, 2, 3] }
const result2 = numberArray([1, 'hello', 3]); // { isValid: false, errors: { '[1]': 'must be a number' } }
const result3 = numberArray([]); // { isValid: false, errors: { root: 'must have at least 1 item(s)' } }
```

## enum

`enumValue<T>(enumType: T): Pred<T[keyof T]>`

Returns a predicate that checks if the input is a value of the specified enum.

Example:

```typescript
import {enumValue} from 'runtyp/dist/predicates';

enum Color { Red = 'red', Green = 'green', Blue = 'blue' }
const isColor = enumValue(Color);
const result1 = isColor('red'); // { isValid: true, value: 'red' }
const result2 = isColor('yellow'); // { isValid: false, errors: { root: 'must be a valid enum value' } }
```

## optional

`optional<T>(predicate: Pred<T>): Pred<T | undefined>`

Returns a predicate that checks if the input is either the type of the predicate or `undefined`.

Example:

```typescript
import {optional, string} from 'runtyp/dist/predicates';

const optionalString = optional(string());
const result1 = optionalString('hello'); // { isValid: true, value: 'hello' }
const result2 = optionalString(undefined); // { isValid: true, value: undefined }
const result3 = optionalString(42); // { isValid: false, errors: { root: 'must be a string' } }
```

## custom

`custom<T>(predicate: (input: T) => boolean, message: string): Pred<T>`

Returns a predicate that checks if the input passes a custom function.

Example:

```typescript
import {custom} from 'runtyp/dist/predicates';

const is42 = custom((input: number) => input === 42, 'must be 42');

const result = is42(42); // { isValid: true, value: 42 }
const result2 = is42(43); // { isValid: false, errors: { root: 'must be 42' } }
```

## regex

`regex(exp: RegExp, message: string): Pred<string>`

Returns a predicate that checks if the input passes the provided regular expression.

Example:

```typescript
import {regex} from 'runtyp/dist/predicates';

const result1 = regex(/^[a-z]+$/, 'not a-z')('abc'); // { isValid: true, value: 'abc' }
const result2 = regex(/^[a-z]+$/, 'not a-z')('123'); // { isValid: false, errors: { root: 'not a-z' } }
```

## chain

`chain<T>(...predicates: Pred<T>[]): Pred<T>`

Returns a predicate that chains multiple predicates together. The input must pass all predicates. Predicates are checked in order. If a predicate fails, the rest of the predicates are not checked. Predicates must be of the same type `T`.

Example:

```typescript
import {chain, email, custom} from 'runtyp/dist/predicates';

const isSchoolEmail = chain(
    email(), 
    custom((input: string) => /.+[.edu]$/.test(input), 'must be a school email')
);
```

## union

`union<T extends readonly Pred<any>[]>(predicates: [...T], errorMessage: string): Pred<ExtractResultType<T[number]>>`

Returns a predicate that checks if the input passes any of the given predicates.

Example:

```typescript
import {union, email, custom} from 'runtyp/dist/predicates';

const isEmailOrEvenNumber = union([email(), custom((input: number) => input % 2 === 0, 'must be an even number')], 'must be email or even number');

const result1 = isEmailOrEvenNumber('john@smith.com'); // { isValid: true, value: 'john@smith.com' }
const result2 = isEmailOrEvenNumber(2); // { isValid: true, value: 2 }
const result3 = isEmailOrEvenNumber(3); // { isValid: false, errors: { root: 'must be email or even number' } }

type IsEmailOrEvenNumber = Infer<typeof isEmailOrEvenNumber>; // string | number
```

## literal

`literal<T>(expected: T): Pred<T>`

Returns a predicate that checks if the input is equal to the expected value.

Example:

```typescript
import {literal, union} from 'runtyp/dist/predicates';

const is42 = literal(42);

// An example combining literal and union

const isBlueOrNull = union([
    literal('blue'),
    literal(null)
], 'must be blue or null');

const result1 = isBlueOrNull('blue'); // { isValid: true, value: 'blue' }
const result2 = isBlueOrNull(null); // { isValid: true, value: null }
const result3 = isBlueOrNull('red'); // { isValid: false, errors: { root: 'must be blue or null' } }
```

## email

`email(): Pred<string>`

Returns a predicate that checks if the input is a valid email address.

Example:

```typescript
import {email} from 'runtyp/dist/predicates';

const isEmail = email();
const result1 = isEmail('user@example.com'); // { isValid: true, value: 'user@example.com' }
const result2 = isEmail('invalid-email'); // { isValid: false, errors: { root: 'must be a valid email address' } }
```

## password

`password(): Pred<string>`

Returns a predicate that checks if the input is a valid password. A valid password must:

- Be at least 8 characters long
- Include at least one uppercase letter
- Include at least one lowercase letter
- Include at least one number
- Include at least one special character

Example:

```typescript
import {password} from 'runtyp/dist/predicates';

const isPassword = password();
const result1 = isPassword('MyPass123!'); // { isValid: true, value: 'MyPass123!' }
const result2 = isPassword('weak'); // { isValid: false, errors: { root: 'must between 8 and 100 characters' } }
```

## uuid
`uuid(): Pred<string>`

Returns a predicate that checks if the input is a valid UUID.

Example:

```typescript
import {uuid} from 'runtyp/dist/predicates';

const isUuid = uuid();
const result1 = isUuid('123e4567-e89b-12d3-a456-426614174000'); // { isValid: true, value: '123e4567-e89b-12d3-a456-426614174000' }
const result2 = isUuid('not-a-uuid'); // { isValid: false, errors: { root: 'must be a valid uuid' } }
```

## url
`url(opts?: Options): Pred<string>`

Returns a predicate that checks if the input is a valid URL.

Options:

- `allowLocalhost` - allows localhost URLs, default is `false`
- `requireProtocol` - requires the URL to include a protocol (http:// or https://), default is `true`

Example:

```typescript
import {url} from 'runtyp/dist/predicates';

const isUrl = url({allowLocalhost: true});
const result1 = isUrl('https://example.com'); // { isValid: true, value: 'https://example.com' }
const result2 = isUrl('not-a-url'); // { isValid: false, errors: { root: 'must be a valid URL' } }
```

## date
`date(opts?: Options): Pred<Date>`

Returns a predicate that checks if the input is a valid Date object.

Options:

- `allowString` - allows date strings to be converted to Date objects, default is `false`
- `allowTimestamp` - allows numeric timestamps to be converted to Date objects, default is `false`

Example:

```typescript
import {date} from 'runtyp/dist/predicates';

const isDate = date();
const result1 = isDate(new Date('2023-01-01')); // { isValid: true, value: Date('2023-01-01') }
const result2 = isDate('2023-01-01'); // { isValid: false, errors: { root: 'must be a Date object' } }

// With allowString option
const isDateFromString = date({allowString: true});
const result3 = isDateFromString('2023-01-01'); // { isValid: true, value: Date('2023-01-01') }
const result4 = isDateFromString('2023-01-01T12:00:00Z'); // { isValid: true, value: Date('2023-01-01T12:00:00Z') }
const result5 = isDateFromString('invalid-date'); // { isValid: false, errors: { root: 'must be a valid date' } }

// With allowTimestamp option
const isDateFromTimestamp = date({allowTimestamp: true});
const result6 = isDateFromTimestamp(1672531200000); // { isValid: true, value: Date(1672531200000) }
const result7 = isDateFromTimestamp(0); // { isValid: true, value: Date(0) }

// With both options
const isFlexibleDate = date({allowString: true, allowTimestamp: true});
const result8 = isFlexibleDate(new Date()); // { isValid: true, value: Date }
const result9 = isFlexibleDate('2023-01-01'); // { isValid: true, value: Date('2023-01-01') }
const result10 = isFlexibleDate(1672531200000); // { isValid: true, value: Date(1672531200000) }
```

## any
`any(): Pred<any>`

Returns a predicate that accepts any value without validation. This is useful when you want to include a field in your schema but skip validation for it.

Example:

```typescript
import {any, object, string} from 'runtyp/dist/predicates';

const isAny = any();
const result1 = isAny(true); // { isValid: true, value: true }
const result2 = isAny('hello'); // { isValid: true, value: 'hello' }
const result3 = isAny(null); // { isValid: true, value: null }
const result4 = isAny(undefined); // { isValid: true, value: undefined }
const result5 = isAny({foo: 'bar'}); // { isValid: true, value: {foo: 'bar'} }

// Useful in object schemas when you want to allow any value for a field
const schema = object({
    name: string(),
    metadata: any(), // Accepts any value
});
const result6 = schema({name: 'John', metadata: {anything: 'goes'}}); // { isValid: true, value: {name: 'John', metadata: {anything: 'goes'}} }
```

# Validation Results

Validation results are structured and designed to be easy to parse and work with.

When validation fails, predicates return a `ValidationResult` with `isValid: false` and an `errors` object. The `errors` object contains key-value pairs of all validation issues, including any nested ones. If you are operating on "naked" values (not within an `object` predicate), the key will be `root`. Here are a few examples:

### Number (naked)

```typescript
const result = p.number()('blah');
// result = { isValid: false, errors: { root: 'must be a number' } }
```

### Object

```typescript
const result = p.object({
    email: p.email(),
    password: p.password(),
})({
    email: 'blah',
    password: 'password',
});
// result = { 
//   isValid: false, 
//   errors: { 
//     email: 'must be a valid email address', 
//     password: 'must include at least one uppercase letter' 
//   }
// }
```

# Type Definitions

## `Pred<T>` 

A predicate function that takes an input and returns a `ValidationResult<T>`. Every predicate function in our API returns a `Pred<T>`.

Example:

```typescript
import {Pred} from 'runtyp';

const isNumber: Pred<number> = (input: unknown) => {
    if (typeof input === 'number') {
        return { isValid: true, value: input };
    }
    return { isValid: false, errors: { root: 'must be a number' } };
};
```

## `ValidationResult<T>`

The result type returned by all predicates:

```typescript
type ValidationResult<T> = {
    isValid: true;
    value: T;
} | {
    isValid: false;
    errors: Record<string, string>;
};
```

## `Infer<T>`

Infer is a utility type that extracts the type of the input from a predicate function. See the [example above](#example) for usage.

# Advanced Usage

## Defining validation at runtime while using static `Infer` type at compile-time

You can use the `custom()` predicate to define a predicate at runtime, while still using the `Infer` type at compile-time. This is useful when you need to define a predicate based on user input or configuration.

```typescript
import {predicates as p, Infer} from 'runtyp';

const validator = p.custom((input: string) => {
    
    const regEx = getRegExFromSomewhere();

    const result = p.regex(regEx, 'invalid regex')(input);
    return result.isValid;

});

type Input = Infer<typeof validator>; // string
```

# Support, Feedback, and Contributions

- Star this repo if you like it!
- Submit an [issue](https://github.com/aeroview/runtyp/issues) with your problem, feature request or bug report
- Issue a PR against `main` and request review. Make sure all tests pass and coverage is good.
- Write about `runtyp` in your blog, tweet about it, or share it with your friends!

# Sponsorship

Want to sponsor this project? [Reach out](mailto:marc@aeroview.io?subject=I%20want%20to%20sponsor%20runtyp).
