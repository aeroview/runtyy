import {Pred, ValidationResult} from '..';
import {attachPredMeta} from '../predMeta';

export function any(): Pred<any> {

    return attachPredMeta((value: unknown): ValidationResult<any> => ({
        isValid: true,
        value,
    }), {kind: 'any'});

}

