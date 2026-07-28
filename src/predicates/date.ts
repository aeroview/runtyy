/* eslint-disable max-lines-per-function */
import {Pred, ValidationResult} from '..';
import {attachPredMeta} from '../predMeta';

export function date(opts?: {
    allowString?: boolean
    allowTimestamp?: boolean
}): Pred<Date> {

    return attachPredMeta((value: unknown): ValidationResult<Date> => {

        if (value instanceof Date) {

            if (Number.isNaN(value.getTime())) {

                return {
                    isValid: false,
                    errors: {root: 'must be a valid date'},
                };

            }

            return {
                isValid: true,
                value,
            };

        }

        if (opts?.allowString && typeof value === 'string') {

            const dateValue = new Date(value);

            if (Number.isNaN(dateValue.getTime())) {

                return {
                    isValid: false,
                    errors: {root: 'must be a valid date'},
                };

            }

            return {
                isValid: true,
                value: dateValue,
            };

        }

        if (opts?.allowTimestamp && typeof value === 'number') {

            const dateValue = new Date(value);

            if (Number.isNaN(dateValue.getTime())) {

                return {
                    isValid: false,
                    errors: {root: 'must be a valid date'},
                };

            }

            return {
                isValid: true,
                value: dateValue,
            };

        }

        return {
            isValid: false,
            errors: {root: 'must be a Date object'},
        };

    }, {kind: 'date'});

}

