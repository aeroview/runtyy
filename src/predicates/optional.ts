import {Pred, ValidationResult} from '..';
import {attachPredMeta} from '../predMeta';

export function optional<T>(predicate: Pred<T>): Pred<T|undefined> {

    return attachPredMeta((value: any): ValidationResult<T|undefined> => {

        if (value === undefined) return {isValid: true, value: undefined};
        return predicate(value);

    }, {kind: 'optional', inner: predicate});

}
