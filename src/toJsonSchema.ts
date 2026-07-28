/* eslint-disable max-lines-per-function */
import {Pred} from '.';
import {getPredMeta, JsonSchemaFieldMeta, PredMeta} from './predMeta';

export type JsonSchema = Record<string, unknown>;

function fieldAnnotations(meta?: JsonSchemaFieldMeta): JsonSchema {

    const out: JsonSchema = {};

    if (meta?.description) out.description = meta.description;
    if (meta?.title) out.title = meta.title;

    return out;

}

function fromMeta(meta: PredMeta): JsonSchema {

    switch (meta.kind) {

        case 'string': {

            const schema: JsonSchema = {type: 'string', ...fieldAnnotations(meta.opts)};

            if (meta.opts?.len?.min !== undefined) schema.minLength = meta.opts.len.min;
            if (meta.opts?.len?.max !== undefined) schema.maxLength = meta.opts.len.max;
            if (meta.opts?.format) schema.format = meta.opts.format;
            if (meta.opts?.pattern) schema.pattern = meta.opts.pattern;

            return schema;

        }

        case 'number': {

            const schema: JsonSchema = {type: 'number', ...fieldAnnotations(meta.opts)};

            if (meta.opts?.range?.min !== undefined) schema.minimum = meta.opts.range.min;
            if (meta.opts?.range?.max !== undefined) schema.maximum = meta.opts.range.max;

            return schema;

        }

        case 'boolean':
            return {type: 'boolean', ...fieldAnnotations(meta.opts)};

        case 'object': {

            const schema: JsonSchema = {
                type: 'object',
                ...fieldAnnotations(meta.opts),
            };

            if (meta.opts?.name) schema.title = meta.opts.name;

            if (meta.schema) {

                const properties: Record<string, JsonSchema> = {};
                const required: string[] = [];

                for (const [key, childPred] of Object.entries(meta.schema)) {

                    const childSchema = toJsonSchema(childPred);

                    properties[key] = childSchema;

                    if (!childSchemaHasOptional(childPred)) {

                        required.push(key);

                    }

                }

                schema.properties = properties;

                if (required.length > 0) schema.required = required;

                if (!meta.opts?.allowUnknownKeys) schema.additionalProperties = false;

            } else {

                schema.additionalProperties = true;

            }

            return schema;

        }

        case 'array': {

            const schema: JsonSchema = {
                type: 'array',
                items: toJsonSchema(meta.item),
                ...fieldAnnotations(meta.opts),
            };

            if (meta.opts?.len?.min !== undefined) schema.minItems = meta.opts.len.min;
            if (meta.opts?.len?.max !== undefined) schema.maxItems = meta.opts.len.max;

            return schema;

        }

        case 'optional':
            return toJsonSchema(meta.inner);

        case 'enum':
            return {type: 'string', enum: meta.values};

        case 'literal':
            return {const: meta.value};

        case 'union': {

            const schemas = meta.predicates.map((p) => toJsonSchema(p));

            if (schemas.length === 1) return schemas[0];

            return {oneOf: schemas};

        }

        case 'chain': {

            for (let i = meta.predicates.length - 1; i >= 0; i--) {

                const childMeta = getPredMeta(meta.predicates[i]);

                if (childMeta) return toJsonSchema(meta.predicates[i]);

            }

            return {type: 'object'};

        }

        case 'any':
            return {};

        case 'date':
            return {type: 'string', format: 'date-time'};

        case 'unknown':
        default:
            return {type: 'object'};

    }

}

function childSchemaHasOptional(pred: Pred<any>): boolean {

    const meta = getPredMeta(pred);

    return meta?.kind === 'optional';

}

export function toJsonSchema(pred: Pred<any>): JsonSchema {

    const meta = getPredMeta(pred);

    if (!meta) return {type: 'object'};

    return fromMeta(meta);

}
