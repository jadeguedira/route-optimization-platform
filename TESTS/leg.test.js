/**
 * Test Suite for Leg class
 */

const Leg = require('../backend/leg.js');
const Node = require('../backend/node.js');
const Segment = require('../backend/segment.js');
const { TourPoint, TypePoint } = require('../backend/tourpoint.js');
const Demand = require('../backend/demand.js');
const { describe, it, assert, getResults } = require('./testFramework.js');

function buildTourPoint(id) {
    const node = new Node(id, 45.75, 4.85, []);
    const demand = new Demand('A', 'B', 300, 240, `DEM_${id}`);
    return new TourPoint(node, 120, id === 'FROM' ? TypePoint.PICKUP : TypePoint.DELIVERY, demand);
}

describe('Leg Class - Basic Behaviour', () => {

    it('should create a leg with provided parameters', () => {
        const from = buildTourPoint('FROM');
        const to = buildTourPoint('TO');
        const leg = new Leg(from, to, [], [], 150, 60);

        assert.strictEqual(leg.from, from);
        assert.strictEqual(leg.to, to);
        assert.strictEqual(leg.distance, 150);
        assert.strictEqual(leg.travelTime, 60);
        assert.deepStrictEqual(leg.pathNode, []);
        assert.deepStrictEqual(leg.pathSegment, []);
    });

    it('should serialize to JSON with nested nodes and segments', () => {
        const fromNode = new Node('A', 45.75, 4.85, []);
        const toNode = new Node('B', 45.76, 4.86, []);
        const from = new TourPoint(fromNode, 0, TypePoint.WAREHOUSE, null);
        const to = new TourPoint(toNode, 60, TypePoint.PICKUP, null);
        const pathNodes = [fromNode, toNode];
        const segment = new Segment(fromNode, toNode, 'AB', 123);
        const leg = new Leg(from, to, pathNodes, [segment], 123, 30);

        const json = leg.toJSON();
        assert.strictEqual(json.from.node.id, 'A');
        assert.strictEqual(json.to.node.id, 'B');
        assert.strictEqual(json.pathNode.length, 2);
        assert.strictEqual(json.pathSegment.length, 1);
        assert.strictEqual(json.distance, 123);
        assert.strictEqual(json.travelTime, 30);
    });

    it('should provide a readable string representation', () => {
        const from = buildTourPoint('FROM');
        const to = buildTourPoint('TO');
        const leg = new Leg(from, to, [], [], 250, 90);
        const str = leg.toString();
        assert.isTrue(str.includes('FROM'));
        assert.isTrue(str.includes('TO'));
        assert.isTrue(str.includes('250'));
        assert.isTrue(str.includes('90'));
    });
});

module.exports = getResults();

