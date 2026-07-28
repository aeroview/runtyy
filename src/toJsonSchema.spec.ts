import {test} from 'kizu';
import {predicates as p, toJsonSchema} from '.';

test('toJsonSchema: object with described fields', (assert) => {

    const schema = p.object({
        teamId: p.string({description: 'Team UUID'}),
        limit: p.optional(p.number({description: 'Max rows'})),
    });

    assert.equal(toJsonSchema(schema), {
        type: 'object',
        additionalProperties: false,
        properties: {
            teamId: {type: 'string', description: 'Team UUID'},
            limit: {type: 'number', description: 'Max rows'},
        },
        required: ['teamId'],
    }, 'object schema');

});

test('toJsonSchema: array and enum', (assert) => {

    enum Color { Red = 'red', Blue = 'blue' }

    const schema = p.object({
        tags: p.array(p.string(), {len: {min: 1}}),
        color: p.enumValue(Color),
    });

    const json = toJsonSchema(schema);

    assert.equal(json.type, 'object', 'root type');
    assert.equal((json.properties as Record<string, unknown>).color, {
        type: 'string',
        enum: ['red', 'blue'],
    }, 'enum field');

});

test('toJsonSchema: fallback without metadata', (assert) => {

    const custom = p.custom((v: string) => v.length > 0, 'required');

    assert.equal(toJsonSchema(custom), {type: 'object'}, 'custom fallback');

});
