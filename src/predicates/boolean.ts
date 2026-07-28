import {Pred, ValidationResult} from '..';
import {attachPredMeta} from '../predMeta';

export function boolean(opts?: { description?: string, title?: string }): Pred<boolean> {

    return attachPredMeta((value: unknown): ValidationResult<boolean> => {

        if (typeof value !== 'boolean') {

            return {
                isValid: false,
                errors: {root: 'must be a boolean'},
            };

        }

        return {
            isValid: true,
            value: value as boolean,
        };

    }, {kind: 'boolean', opts});

}
