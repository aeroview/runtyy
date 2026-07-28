import {Pred, ValidationResult} from '..';
import {attachPredMeta} from '../predMeta';

/**
 * Returns a predicate that checks if all predicates in the chain return true.
 * - All predicates must be of the same type (e.g. string, number, boolean, T).
 * - Predicates are executed in order.
 * - Returns the first error encountered, or success if all pass.
 */
export function chain<T>(...predicates: Pred<T>[]): Pred<T> {

    return attachPredMeta((value: unknown): ValidationResult<T> => {

        for (const predicate of predicates) {

            const result = predicate(value);

            if (!result.isValid) {

                return result;

            }

        }

        return {
            isValid: true,
            value: value as T,
        };

    }, {kind: 'chain', predicates});

}
