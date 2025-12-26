/**
 * Test Suite for Segment class
 * Tests all functionalities of the Segment class
 */

const Segment = require('../backend/segment.js');
const Node = require('../backend/node.js');
const { describe, it, assert, getResults } = require('./testFramework.js');

// Test Suite: Segment Class
describe('Segment Class - Constructor and Basic Properties', () => {

    it('should create a segment with valid parameters', () => {
        const node1 = new Node('node1', 45.75, 4.85, []);
        const node2 = new Node('node2', 45.76, 4.86, []);
        const segment = new Segment(node1, node2, 'Main Street', 150.5);
        assert.strictEqual(segment.origin, node1);
        assert.strictEqual(segment.destination, node2);
        assert.strictEqual(segment.streetName, 'Main Street');
        assert.strictEqual(segment.length, 150.5);
    });

    it('should create a segment with numeric ids', () => {
        const node1 = new Node(123, 45.75, 4.85, []);
        const node2 = new Node(456, 45.76, 4.86, []);
        const segment = new Segment(node1, node2, 'Avenue', 200);
        assert.strictEqual(segment.origin.id, 123);
        assert.strictEqual(segment.destination.id, 456);
    });

    it('should handle empty street name', () => {
        const node1 = new Node('a', 45.75, 4.85, []);
        const node2 = new Node('b', 45.76, 4.86, []);
        const segment = new Segment(node1, node2, '', 100);
        assert.strictEqual(segment.streetName, '');
    });

    it('should handle zero length', () => {
        const node1 = new Node('x', 45.75, 4.85, []);
        const node2 = new Node('y', 45.76, 4.86, []);
        const segment = new Segment(node1, node2, 'Street', 0);
        assert.strictEqual(segment.length, 0);
    });

    it('should handle very long street name', () => {
        const node1 = new Node('a', 45.75, 4.85, []);
        const node2 = new Node('b', 45.76, 4.86, []);
        const longName = 'Very Long Street Name With Many Words '.repeat(10);
        const segment = new Segment(node1, node2, longName, 100);
        assert.strictEqual(segment.streetName, longName);
    });

    it('should handle special characters in street name', () => {
        const node1 = new Node('a', 45.75, 4.85, []);
        const node2 = new Node('b', 45.76, 4.86, []);
        const segment = new Segment(node1, node2, 'Rue de l\'Église - Côté Est', 100);
        assert.isTrue(segment.streetName.includes('Église'));
    });

    it('should handle decimal length', () => {
        const node1 = new Node('a', 45.75, 4.85, []);
        const node2 = new Node('b', 45.76, 4.86, []);
        const segment = new Segment(node1, node2, 'Street', 123.456789);
        assert.strictEqual(segment.length, 123.456789);
    });

    it('should handle very large length', () => {
        const node1 = new Node('a', 45.75, 4.85, []);
        const node2 = new Node('b', 45.76, 4.86, []);
        const segment = new Segment(node1, node2, 'Highway', 999999.99);
        assert.strictEqual(segment.length, 999999.99);
    });
});

describe('Segment Class - toJSON Method', () => {

    it('should return correct JSON representation', () => {
        const node1 = new Node('node1', 45.75, 4.85, []);
        const node2 = new Node('node2', 45.76, 4.86, []);
        const segment = new Segment(node1, node2, 'Main Street', 150.5);
        const json = segment.toJSON();
        assert.strictEqual(json.origin, 'node1');
        assert.strictEqual(json.destination, 'node2');
        assert.strictEqual(json.streetName, 'Main Street');
        assert.strictEqual(json.length, 150.5);
    });

    it('should include all properties in JSON', () => {
        const node1 = new Node('a', 45.75, 4.85, []);
        const node2 = new Node('b', 45.76, 4.86, []);
        const segment = new Segment(node1, node2, 'Street', 100);
        const json = segment.toJSON();
        const keys = Object.keys(json);
        assert.strictEqual(keys.length, 4);
        assert.isTrue(keys.includes('origin'));
        assert.isTrue(keys.includes('destination'));
        assert.isTrue(keys.includes('streetName'));
        assert.isTrue(keys.includes('length'));
    });

    it('should handle empty street name in JSON', () => {
        const node1 = new Node('a', 45.75, 4.85, []);
        const node2 = new Node('b', 45.76, 4.86, []);
        const segment = new Segment(node1, node2, '', 100);
        const json = segment.toJSON();
        assert.strictEqual(json.streetName, '');
    });

    it('should preserve numeric ids in JSON', () => {
        const node1 = new Node(123, 45.75, 4.85, []);
        const node2 = new Node(456, 45.76, 4.86, []);
        const segment = new Segment(node1, node2, 'Street', 100);
        const json = segment.toJSON();
        assert.strictEqual(json.origin, 123);
        assert.strictEqual(json.destination, 456);
    });
});

describe('Segment Class - toString Method', () => {

    it('should return correct string representation', () => {
        const node1 = new Node('node1', 45.75, 4.85, []);
        const node2 = new Node('node2', 45.76, 4.86, []);
        const segment = new Segment(node1, node2, 'Main Street', 150.5);
        const str = segment.toString();
        assert.isTrue(str.includes('node1'), 'String should contain origin');
        assert.isTrue(str.includes('node2'), 'String should contain destination');
        assert.isTrue(str.includes('Main Street'), 'String should contain street name');
        assert.isTrue(str.includes('150.5'), 'String should contain length');
    });

    it('should format string with Segment prefix', () => {
        const node1 = new Node('a', 45.75, 4.85, []);
        const node2 = new Node('b', 45.76, 4.86, []);
        const segment = new Segment(node1, node2, 'Street', 100);
        const str = segment.toString();
        assert.isTrue(str.startsWith('Segment '), 'String should start with "Segment "');
    });

    it('should include arrow between origin and destination', () => {
        const node1 = new Node('a', 45.75, 4.85, []);
        const node2 = new Node('b', 45.76, 4.86, []);
        const segment = new Segment(node1, node2, 'Street', 100);
        const str = segment.toString();
        assert.isTrue(str.includes('→'), 'String should contain arrow');
    });

    it('should include length with meter unit', () => {
        const node1 = new Node('a', 45.75, 4.85, []);
        const node2 = new Node('b', 45.76, 4.86, []);
        const segment = new Segment(node1, node2, 'Street', 100);
        const str = segment.toString();
        assert.isTrue(str.includes('100m'), 'String should contain length with m unit');
    });

    it('should handle empty street name in string', () => {
        const node1 = new Node('a', 45.75, 4.85, []);
        const node2 = new Node('b', 45.76, 4.86, []);
        const segment = new Segment(node1, node2, '', 100);
        const str = segment.toString();
        assert.isTrue(str.length > 0, 'String should not be empty');
    });

    it('should format decimal length correctly', () => {
        const node1 = new Node('a', 45.75, 4.85, []);
        const node2 = new Node('b', 45.76, 4.86, []);
        const segment = new Segment(node1, node2, 'Street', 123.456);
        const str = segment.toString();
        assert.isTrue(str.includes('123.456'), 'String should contain full decimal length');
    });
});

describe('Segment Class - Edge Cases', () => {

    it('should handle same origin and destination', () => {
        const node1 = new Node('node1', 45.75, 4.85, []);
        const segment = new Segment(node1, node1, 'Loop', 0);
        assert.strictEqual(segment.origin, segment.destination);
    });

    it('should handle null street name', () => {
        const node1 = new Node('a', 45.75, 4.85, []);
        const node2 = new Node('b', 45.76, 4.86, []);
        const segment = new Segment(node1, node2, null, 100);
        assert.strictEqual(segment.streetName, null);
    });

    it('should handle undefined street name', () => {
        const node1 = new Node('a', 45.75, 4.85, []);
        const node2 = new Node('b', 45.76, 4.86, []);
        const segment = new Segment(node1, node2, undefined, 100);
        assert.strictEqual(segment.streetName, undefined);
    });

    it('should handle negative length', () => {
        const node1 = new Node('a', 45.75, 4.85, []);
        const node2 = new Node('b', 45.76, 4.86, []);
        const segment = new Segment(node1, node2, 'Street', -100);
        assert.strictEqual(segment.length, -100);
    });

    it('should handle NaN length', () => {
        const node1 = new Node('a', 45.75, 4.85, []);
        const node2 = new Node('b', 45.76, 4.86, []);
        const segment = new Segment(node1, node2, 'Street', NaN);
        assert.isTrue(isNaN(segment.length));
    });

    it('should handle Infinity length', () => {
        const node1 = new Node('a', 45.75, 4.85, []);
        const node2 = new Node('b', 45.76, 4.86, []);
        const segment = new Segment(node1, node2, 'Street', Infinity);
        assert.strictEqual(segment.length, Infinity);
    });
});

describe('Segment Class - Mutation Tests', () => {

    it('should allow modification of origin', () => {
        const node1 = new Node('a', 45.75, 4.85, []);
        const node2 = new Node('b', 45.76, 4.86, []);
        const node3 = new Node('c', 45.77, 4.87, []);
        const segment = new Segment(node1, node2, 'Street', 100);
        segment.origin = node3;
        assert.strictEqual(segment.origin, node3);
    });

    it('should allow modification of destination', () => {
        const node1 = new Node('a', 45.75, 4.85, []);
        const node2 = new Node('b', 45.76, 4.86, []);
        const node3 = new Node('d', 45.77, 4.87, []);
        const segment = new Segment(node1, node2, 'Street', 100);
        segment.destination = node3;
        assert.strictEqual(segment.destination, node3);
    });

    it('should allow modification of street name', () => {
        const node1 = new Node('a', 45.75, 4.85, []);
        const node2 = new Node('b', 45.76, 4.86, []);
        const segment = new Segment(node1, node2, 'Street', 100);
        segment.streetName = 'New Street';
        assert.strictEqual(segment.streetName, 'New Street');
    });

    it('should allow modification of length', () => {
        const node1 = new Node('a', 45.75, 4.85, []);
        const node2 = new Node('b', 45.76, 4.86, []);
        const segment = new Segment(node1, node2, 'Street', 100);
        segment.length = 200;
        assert.strictEqual(segment.length, 200);
    });
});

describe('Segment Class - Type Tests', () => {

    it('should store Node objects for origin and destination', () => {
        const node1 = new Node('node1', 45.75, 4.85, []);
        const node2 = new Node('node2', 45.76, 4.86, []);
        const segment = new Segment(node1, node2, 'Street', 100);
        assert.strictEqual(typeof segment.origin, 'object');
        assert.strictEqual(typeof segment.destination, 'object');
        assert.isTrue(segment.origin instanceof Node);
        assert.isTrue(segment.destination instanceof Node);
    });

    it('should accept Node with string id', () => {
        const node1 = new Node('node1', 45.75, 4.85, []);
        const node2 = new Node('node2', 45.76, 4.86, []);
        const segment = new Segment(node1, node2, 'Street', 100);
        assert.strictEqual(typeof segment.origin.id, 'string');
        assert.strictEqual(typeof segment.destination.id, 'string');
    });

    it('should accept Node with number id', () => {
        const node1 = new Node(123, 45.75, 4.85, []);
        const node2 = new Node(456, 45.76, 4.86, []);
        const segment = new Segment(node1, node2, 'Street', 100);
        assert.strictEqual(typeof segment.origin.id, 'number');
        assert.strictEqual(typeof segment.destination.id, 'number');
    });
});

// Export results
module.exports = getResults();

