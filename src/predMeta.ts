import {Pred} from '.';

export const PRED_META = Symbol.for('runtyp.predMeta');

export type JsonSchemaFieldMeta = {
    description?: string
    title?: string
};

export type PredMeta =
    | { kind: 'string', opts?: { len?: { min?: number, max?: number }, format?: string, pattern?: string } & JsonSchemaFieldMeta }
    | { kind: 'number', opts?: { range?: { min?: number, max?: number } } & JsonSchemaFieldMeta }
    | { kind: 'boolean', opts?: JsonSchemaFieldMeta }
    | { kind: 'object', schema?: Record<string, Pred<any>>, opts?: { allowUnknownKeys?: boolean, name?: string } & JsonSchemaFieldMeta }
    | { kind: 'array', item: Pred<any>, opts?: { len?: { min?: number, max?: number } } & JsonSchemaFieldMeta }
    | { kind: 'optional', inner: Pred<any> }
    | { kind: 'enum', values: string[] }
    | { kind: 'literal', value: unknown }
    | { kind: 'union', predicates: Pred<any>[] }
    | { kind: 'chain', predicates: Pred<any>[] }
    | { kind: 'any' }
    | { kind: 'date' }
    | { kind: 'unknown' };

export function attachPredMeta<T>(pred: Pred<T>, meta: PredMeta): Pred<T> {

    (pred as Pred<T> & { [PRED_META]?: PredMeta })[PRED_META] = meta;
    return pred;

}

export function getPredMeta(pred: Pred<any>): PredMeta | undefined {

    return (pred as Pred<any> & { [PRED_META]?: PredMeta })[PRED_META];

}
