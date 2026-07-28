export type Prettify<T> = any extends T
    ? T // preserve any/unknown
    : { [K in keyof T]: T[K] } & {};
export type ValidationResult<T> = {
    isValid: true
    value: T
} | {
    isValid: false
    errors: Record<string, string>
};
export type Pred<T> = (value: unknown) => ValidationResult<T>;
export type Infer<T> = T extends Pred<infer U> ? Prettify<U> : never;
export type IsOptional<T> = undefined extends T ? true : false;

type RequiredKeys<T extends Record<string, Pred<any>>> = {
    [K in keyof T]: IsOptional<Infer<T[K]>> extends true ? never : K;
}[keyof T];
type OptionalKeys<T extends Record<string, Pred<any>>> = {
    [K in keyof T]: IsOptional<Infer<T[K]>> extends true ? K : never;
}[keyof T];

export type InferShape<T extends Record<string, Pred<any>>> = Pick<T, RequiredKeys<T>> &
Partial<Pick<T, OptionalKeys<T>>> extends infer O
    ? { [K in keyof O]: Infer<O[K]> }
    : never;

export * as predicates from './predicates';
export {toJsonSchema} from './toJsonSchema';
export type {JsonSchema} from './toJsonSchema';
export {getPredMeta, PRED_META} from './predMeta';
export type {PredMeta, JsonSchemaFieldMeta} from './predMeta';
