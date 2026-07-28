/* eslint-disable max-lines-per-function */
import {Pred, ValidationResult} from '..';
import {attachPredMeta} from '../predMeta';

export function password(): Pred<string> {

    return attachPredMeta((password: unknown): ValidationResult<string> => {

        if (typeof password !== 'string') {

            return {
                isValid: false,
                errors: {root: 'must be a string'},
            };

        }

        const isWithinLength = password.length >= 8 && password.length <= 100;
        const hasUppercase = /[A-Z]/.test(password);
        const hasLowercase = /[a-z]/.test(password);
        const hasNumber = /[0-9]/.test(password);
        const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

        if (!isWithinLength) {

            return {
                isValid: false,
                errors: {root: 'must between 8 and 100 characters'},
            };

        }
        if (!hasUppercase) {

            return {
                isValid: false,
                errors: {root: 'must include at least one uppercase letter'},
            };

        }
        if (!hasLowercase) {

            return {
                isValid: false,
                errors: {root: 'must include at least one lowercase letter'},
            };

        }
        if (!hasNumber) {

            return {
                isValid: false,
                errors: {root: 'must include at least one number'},
            };

        }
        if (!hasSpecialChar) {

            return {
                isValid: false,
                errors: {root: 'must include at least one special character'},
            };

        }

        return {
            isValid: true,
            value: password,
        };

    }, {kind: 'string', opts: {len: {min: 8, max: 100}}});

}
