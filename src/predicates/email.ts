
import {Pred, ValidationResult} from '..';
import {attachPredMeta} from '../predMeta';

const tester = /^[-!#$%&'*+/0-9=?A-Z^_a-z`{|}~](\.?[-!#$%&'*+/0-9=?A-Z^_a-z`{|}~])*@[a-zA-Z0-9](-*\.?[a-zA-Z0-9])*\.[a-zA-Z](-?[a-zA-Z0-9])+$/;

const INVALID_EMAIL_ERROR = {
    isValid: false,
    errors: {root: 'must be a valid email address'},
} as const;

/**
 * Validates an email address.
 * Taken from https://github.com/manishsaraan/email-validator/blob/master/index.js
 */
export function email(): Pred<string> {

    return attachPredMeta((value: unknown): ValidationResult<string> => {

        if (typeof value !== 'string') {

            return INVALID_EMAIL_ERROR;

        }

        const emailParts = value.split('@');

        if (emailParts.length !== 2) {

            return INVALID_EMAIL_ERROR;

        }

        const account = emailParts[0];
        const address = emailParts[1];

        if (account.length > 64) {

            return INVALID_EMAIL_ERROR;

        }
        if (address.length > 255) {

            return INVALID_EMAIL_ERROR;

        }

        const domainParts = address.split('.');

        if (domainParts.some((part) => part.length > 63)) {

            return INVALID_EMAIL_ERROR;

        }
        if (!tester.test(value)) {

            return INVALID_EMAIL_ERROR;

        }

        return {
            isValid: true,
            value: value as string,
        };

    }, {kind: 'string', opts: {format: 'email'}});

}
