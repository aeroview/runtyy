/* eslint-disable max-lines-per-function */
import {Pred, ValidationResult} from '..';
import {attachPredMeta} from '../predMeta';

type Opts = {
    len?: {min?: number, max?: number}
    description?: string
    title?: string
};

export function array<T>(
    predicate: Pred<T>,
    options?: Opts,
): Pred<T[]> {

    return attachPredMeta((value: unknown): ValidationResult<T[]> => {

        if (!Array.isArray(value)) {

            return {
                isValid: false,
                errors: {root: 'must be an array'},
            };

        }

        if (
            options?.len?.min !== undefined
            && options?.len?.max !== undefined
            && options.len.min === options.len.max
            && value.length !== options.len.min
        ) {

            return {
                isValid: false,
                errors: {root: `must have exactly ${options.len.min} item(s)`},
            };

        }

        if (options?.len?.min !== undefined && value.length < options.len.min) {

            return {
                isValid: false,
                errors: {root: `must have at least ${options.len.min} item(s)`},
            };

        }

        if (options?.len?.max !== undefined && value.length > options.len.max) {

            return {
                isValid: false,
                errors: {root: `must have at most ${options.len.max} item(s)`},
            };

        }

        const errors: Record<string, string> = {};
        const validItems: T[] = [];

        for (let i = 0; i < value.length; i++) {

            const result = predicate(value[i]);

            if (!result.isValid) {

                if (result.errors.root) {

                    errors[`[${i}]`] = result.errors.root;

                } else {

                    // Handle nested errors
                    Object.entries(result.errors).forEach(([key, message]) => {

                        errors[`[${i}].${key}`] = message;

                    });

                }

            } else {

                validItems.push(result.value);

            }

        }

        if (Object.keys(errors).length > 0) {

            return {
                isValid: false,
                errors,
            };

        }

        return {
            isValid: true,
            value: validItems,
        };

    }, {kind: 'array', item: predicate, opts: options});

}
