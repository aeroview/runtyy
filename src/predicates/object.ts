/* eslint-disable max-lines-per-function */
import {InferShape, Pred, ValidationResult} from '..';
import {attachPredMeta} from '../predMeta';

type ObjectOptions = {
    allowUnknownKeys?: boolean
    description?: string
    title?: string
    name?: string
};

export function object<T extends Record<string, Pred<any>>>(
    schema: T,
    options?: ObjectOptions
): Pred<InferShape<T>>;
export function object(
    options?: ObjectOptions
): Pred<Record<string, any>>;
export function object<T extends Record<string, Pred<any>>>(
    schemaOrOptions?: T | ObjectOptions,
    options?: ObjectOptions,
): Pred<InferShape<T>> | Pred<Record<string, any>> {

    // Check if first argument is options (has allowUnknownKeys property) or is undefined
    // If allowUnknownKeys exists, it must be boolean (or undefined since it's optional)
    const isOptions = !schemaOrOptions || (typeof schemaOrOptions === 'object' && !Array.isArray(schemaOrOptions) && 'allowUnknownKeys' in schemaOrOptions && (schemaOrOptions.allowUnknownKeys === undefined || typeof schemaOrOptions.allowUnknownKeys === 'boolean'));

    const schema = isOptions ? undefined : (schemaOrOptions as T);
    const opts = isOptions ? (schemaOrOptions as ObjectOptions | undefined) : options;

    if (schema && typeof schema !== 'object') throw new Error('invalid schema, must be object');

    if (!schema) {

        // No schema provided - just validate it's an object
        return attachPredMeta((value: unknown): ValidationResult<Record<string, any>> => {

            if (typeof value !== 'object' || !value || Array.isArray(value)) {

                return {isValid: false, errors: {root: 'must be an object'}};

            }

            return {
                isValid: true,
                value: value as Record<string, any>,
            };

        }, {kind: 'object', opts});

    }

    return attachPredMeta((value: unknown): ValidationResult<InferShape<T>> => {

        if (typeof value !== 'object' || !value) {

            return {isValid: false, errors: {root: `must be an object with keys ${Object.keys(schema).join(', ')}`}};

        }

        // go through each key in the schema
        const errors: Record<string, string> = Object.entries(schema)
            .reduce<Record<string, string>>((acc, [key, predicate]) => {

            const result = predicate((value as Record<string, unknown>)[key]);

            if (!result.isValid && Object.keys(result.errors).length === 1 && result.errors.root) {

                // root error
                acc[key] = result.errors.root;

            } else if (!result.isValid) {

                // nested errors
                Object.entries(result.errors).forEach(([subKey, subMessage]) => {

                    acc[`${key}.${subKey}`] = subMessage;

                });

            }

            return acc;

        }, {});

        // go through each key in the value
        if (!opts?.allowUnknownKeys) {

            Object.keys(value as Record<string, unknown>).forEach((key) => {

                if (!schema[key]) {

                    errors[key] = 'unknown key';

                }

            });

        }

        if (Object.keys(errors).length > 0) {

            return {
                isValid: false,
                errors,
            };

        }

        return {
            isValid: true,
            value: value as InferShape<T>,
        };

    }, {kind: 'object', schema, opts});

}
