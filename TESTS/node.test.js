/**
 * Test Suite for Node class
 * Tests all functionalities of the Node class
 */

const Node = require('../backend/node.js');
const { describe, it, assert, getResults } = require('./testFramework.js');

// Test Suite: Node Class
describe('Node Class - Constructor and Basic Properties', () => {

    it('should create a node with valid parameters', () => {
        const node = new Node('123', 45.75, 4.85, []);
        assert.strictEqual(node.id, '123');
        assert.strictEqual(node.latitude, 45.75);
        assert.strictEqual(node.longitude, 4.85);
        assert.deepStrictEqual(node.segments, []);
    });

    it('should create a node with numeric id', () => {
        const node = new Node(123, 45.75, 4.85, []);
        assert.strictEqual(node.id, 123);
    });

    it('should create a node with segments array', () => {
        const segments = ['seg1', 'seg2'];
        const node = new Node('456', 45.76, 4.86, segments);
        assert.deepStrictEqual(node.segments, segments);
    });

    it('should handle negative coordinates', () => {
        const node = new Node('789', -45.75, -4.85, []);
        assert.strictEqual(node.latitude, -45.75);
        assert.strictEqual(node.longitude, -4.85);
    });

    it('should handle zero coordinates', () => {
        const node = new Node('000', 0, 0, []);
        assert.strictEqual(node.latitude, 0);
        assert.strictEqual(node.longitude, 0);
    });

    it('should handle very precise coordinates', () => {
        const node = new Node('precise', 45.7540612, 4.8574183, []);
        assert.strictEqual(node.latitude, 45.7540612);
        assert.strictEqual(node.longitude, 4.8574183);
    });

    it('should handle empty segments array', () => {
        const node = new Node('empty', 45.75, 4.85, []);
        assert.strictEqual(node.segments.length, 0);
    });

    it('should handle null segments parameter', () => {
        const node = new Node('null', 45.75, 4.85, null);
        assert.strictEqual(node.segments, null);
    });

    it('should handle undefined segments parameter', () => {
        const node = new Node('undef', 45.75, 4.85, undefined);
        assert.strictEqual(node.segments, undefined);
    });
});

describe('Node Class - toJSON Method', () => {

    it('should return correct JSON representation', () => {
        const node = new Node('123', 45.75, 4.85, []);
        const json = node.toJSON();
        assert.strictEqual(json.id, '123');
        assert.strictEqual(json.latitude, 45.75);
        assert.strictEqual(json.longitude, 4.85);
    });

    it('should not include segments in JSON', () => {
        const node = new Node('456', 45.76, 4.86, ['seg1', 'seg2']);
        const json = node.toJSON();
        assert.strictEqual(json.segments, undefined);
    });

    it('should handle numeric id in JSON', () => {
        const node = new Node(789, 45.77, 4.87, []);
        const json = node.toJSON();
        assert.strictEqual(json.id, 789);
    });

    it('should return object with only required properties', () => {
        const node = new Node('test', 45.75, 4.85, []);
        const json = node.toJSON();
        const keys = Object.keys(json);
        assert.strictEqual(keys.length, 3);
        assert.isTrue(keys.includes('id'));
        assert.isTrue(keys.includes('latitude'));
        assert.isTrue(keys.includes('longitude'));
    });
});

describe('Node Class - toString Method', () => {

    it('should return correct string representation', () => {
        const node = new Node('123', 45.75, 4.85, []);
        const str = node.toString();
        assert.isTrue(str.includes('123'), 'String should contain node id');
        assert.isTrue(str.includes('45.75'), 'String should contain latitude');
        assert.isTrue(str.includes('4.85'), 'String should contain longitude');
    });

    it('should format string with Node prefix', () => {
        const node = new Node('456', 45.76, 4.86, []);
        const str = node.toString();
        assert.isTrue(str.startsWith('Node '), 'String should start with "Node "');
    });

    it('should handle numeric id in string', () => {
        const node = new Node(999, 45.77, 4.87, []);
        const str = node.toString();
        assert.isTrue(str.includes('999'), 'String should contain numeric id');
    });

    it('should format coordinates in parentheses', () => {
        const node = new Node('test', 45.75, 4.85, []);
        const str = node.toString();
        assert.isTrue(str.includes('(45.75, 4.85)'), 'String should contain coordinates in parentheses');
    });
});

describe('Node Class - Edge Cases', () => {

    it('should handle extremely large coordinates', () => {
        const node = new Node('large', 999999.999, 999999.999, []);
        assert.strictEqual(node.latitude, 999999.999);
        assert.strictEqual(node.longitude, 999999.999);
    });

    it('should handle extremely small coordinates', () => {
        const node = new Node('small', -999999.999, -999999.999, []);
        assert.strictEqual(node.latitude, -999999.999);
        assert.strictEqual(node.longitude, -999999.999);
    });

    it('should handle empty string as id', () => {
        const node = new Node('', 45.75, 4.85, []);
        assert.strictEqual(node.id, '');
    });

    it('should handle special characters in id', () => {
        const node = new Node('node-123_test!@#', 45.75, 4.85, []);
        assert.strictEqual(node.id, 'node-123_test!@#');
    });
});

describe('Node Class - Mutation Tests', () => {

    it('should allow modification of id', () => {
        const node = new Node('123', 45.75, 4.85, []);
        node.id = '456';
        assert.strictEqual(node.id, '456');
    });

    it('should allow modification of coordinates', () => {
        const node = new Node('123', 45.75, 4.85, []);
        node.latitude = 46.00;
        node.longitude = 5.00;
        assert.strictEqual(node.latitude, 46.00);
        assert.strictEqual(node.longitude, 5.00);
    });

    it('should allow adding segments after creation', () => {
        const node = new Node('123', 45.75, 4.85, []);
        node.segments.push('seg1');
        assert.strictEqual(node.segments.length, 1);
    });
});

// Export results
module.exports = getResults();

