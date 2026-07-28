import {Pred, ValidationResult} from '..';
import {attachPredMeta} from '../predMeta';

export function regex(
    exp: RegExp,
    errorMessage: string,
): Pred<string> {

    return attachPredMeta((value: unknown): ValidationResult<string> => {

        if (typeof value !== 'string') {

            return {
                isValid: false,
                errors: {root: errorMessage},
            };

        }

        if (!exp.test(value)) {

            return {
                isValid: false,
                errors: {root: errorMessage},
            };

        }

        return {
            isValid: true,
            value,
        };

    }, {kind: 'string', opts: {pattern: exp.source}});

}
