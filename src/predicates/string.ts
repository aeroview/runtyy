import {Pred, ValidationResult} from '..';
import {attachPredMeta} from '../predMeta';

export function string(opts?: {
    len?: {min?: number, max?: number}
    description?: string
    title?: string
}): Pred<string> {

    return attachPredMeta((value: unknown): ValidationResult<string> => {

        if (typeof value !== 'string') {

            return {isValid: false, errors: {root: 'must be a string'}};

        }

        if (opts?.len?.min !== undefined && value.length < opts.len.min) {

            return {isValid: false, errors: {root: `must be at least ${opts.len.min} characters`}};

        }

        if (opts?.len?.max !== undefined && value.length > opts.len.max) {

            return {isValid: false, errors: {root: `must be at most ${opts.len.max} characters`}};

        }

        return {isValid: true, value: value as string};

    }, {kind: 'string', opts});

}
