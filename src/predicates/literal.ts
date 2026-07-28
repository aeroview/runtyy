import {Pred, ValidationResult} from '..';
import {attachPredMeta} from '../predMeta';

export function literal<const T>(expected: T): Pred<T> {

    return attachPredMeta((value: unknown): ValidationResult<T> => {

        if (value !== expected) {

            return {
                isValid: false,
                errors: {root: `must be ${expected}`},
            };

        }

        return {
            isValid: true,
            value: value as T,
        };

    }, {kind: 'literal', value: expected});

}
