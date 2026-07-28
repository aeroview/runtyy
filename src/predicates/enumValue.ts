import {Pred, ValidationResult} from '..';
import {attachPredMeta} from '../predMeta';

export function enumValue<T extends Record<string, string>>(enumObj: T): Pred<T[keyof T]> {

    return attachPredMeta((value: unknown): ValidationResult<T[keyof T]> => {

        if (typeof value !== 'string' || !Object.values(enumObj).includes(value as T[keyof T])) {

            return {
                isValid: false,
                errors: {root: 'must be a valid enum value'},
            };

        }

        return {
            isValid: true,
            value: value as T[keyof T],
        };

    }, {kind: 'enum', values: Object.values(enumObj)});

}
