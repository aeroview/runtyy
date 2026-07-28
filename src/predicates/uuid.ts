import {Pred, ValidationResult} from '..';
import {attachPredMeta} from '../predMeta';

const tester = /^[0-9a-fA-F]{8}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{12}$/i;

/**
 * A predicate which checks if a value is a valid UUID v4.
 */
export function uuidv4(): Pred<string> {

    return attachPredMeta((value: unknown): ValidationResult<string> => {

        if (typeof value !== 'string') {

            return {isValid: false, errors: {root: 'must be a valid uuid'}};

        }

        if (tester.test(value)) {

            return {isValid: true, value: value as string};

        } else {

            return {isValid: false, errors: {root: 'must be a valid uuid'}};

        }

    }, {kind: 'string', opts: {format: 'uuid'}});

}

// uuid is alias for uuidv4
export const uuid = uuidv4;
