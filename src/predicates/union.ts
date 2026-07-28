import {Pred, ValidationResult} from '..';
import {attachPredMeta} from '../predMeta';

/**
 * Extracts the type from a ValidationResult.
 */
type ExtractResultType<P> = P extends Pred<infer T> ? T : never;

/**
 * Returns a predicate that accepts any value passing one of the given predicates.
 * If none match, returns the custom error message.
 */
export function union<T extends readonly Pred<any>[]>(
    predicates: [...T],
    errorMessage: string,
): Pred<ExtractResultType<T[number]>> {

    return attachPredMeta((value: unknown): ValidationResult<ExtractResultType<T[number]>> => {

        for (const predicate of predicates) {

            const result = predicate(value);

            if (result.isValid) {

                return result;

            }

        }

        return {
            isValid: false,
            errors: {root: errorMessage},
        };

    }, {kind: 'union', predicates: [...predicates]});

}
