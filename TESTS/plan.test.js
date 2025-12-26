/**
 * Test Suite for Plan class
 * Tests all functionalities of the Plan class
 */

const Plan = require('../backend/plan.js');
const Node = require('../backend/node.js');
const Segment = require('../backend/segment.js');
const path = require('path');
const { describe, it, assert, getResults } = require('./testFramework.js');

// Test Suite: Plan Class
describe('Plan Class - Constructor and Basic Properties', () => {

    it('should create an empty plan with default parameters', () => {
        const plan = new Plan();
        assert.isTrue(plan.nodes instanceof Map);
        assert.strictEqual(plan.nodes.size, 0);
        assert.strictEqual(plan.segments.length, 0);
        assert.strictEqual(plan.warehouse, null);
    });

    it('should create a plan with nodes map', () => {
        const nodes = new Map();
        const node1 = new Node('1', 45.75, 4.85, []);
        nodes.set('1', node1);

        const plan = new Plan(nodes, [], null);
        assert.strictEqual(plan.nodes.size, 1);
        assert.strictEqual(plan.nodes.get('1'), node1);
    });

    it('should create a plan with segments array', () => {
        const node1 = new Node('1', 45.75, 4.85, []);
        const node2 = new Node('2', 45.76, 4.86, []);
        const node3 = new Node('3', 45.77, 4.87, []);
        const segment1 = new Segment(node1, node2, 'Street A', 100);
        const segment2 = new Segment(node2, node3, 'Street B', 200);

        const plan = new Plan(new Map(), [segment1, segment2], null);
        assert.strictEqual(plan.segments.length, 2);
    });

    it('should create a plan with warehouse node', () => {
        const warehouse = new Node('W001', 45.75, 4.85, []);
        const nodes = new Map();
        nodes.set('W001', warehouse);

        const plan = new Plan(nodes, [], warehouse);
        assert.strictEqual(plan.warehouse, warehouse);
    });

    it('should create a plan with all parameters', () => {
        const nodes = new Map();
        const node1 = new Node('1', 45.75, 4.85, []);
        const node2 = new Node('2', 45.76, 4.86, []);
        nodes.set('1', node1);
        nodes.set('2', node2);

        const segment1 = new Segment(node1, node2, 'Street', 100);
        const warehouse = node1;

        const plan = new Plan(nodes, [segment1], warehouse);
        assert.strictEqual(plan.nodes.size, 2);
        assert.strictEqual(plan.segments.length, 1);
        assert.strictEqual(plan.warehouse, warehouse);
    });
});

describe('Plan Class - getNodeById Method', () => {

    it('should find node by string id', () => {
        const nodes = new Map();
        const node1 = new Node('123', 45.75, 4.85, []);
        nodes.set('123', node1);

        const plan = new Plan(nodes, [], null);
        const found = plan.getNodeById('123');
        assert.strictEqual(found, node1);
    });

    it('should find node by numeric id', () => {
        const nodes = new Map();
        const node1 = new Node(123, 45.75, 4.85, []);
        nodes.set(123, node1);

        const plan = new Plan(nodes, [], null);
        const found = plan.getNodeById(123);
        assert.strictEqual(found, node1);
    });

    it('should return null for non-existent id', () => {
        const plan = new Plan();
        const found = plan.getNodeById('nonexistent');
        assert.strictEqual(found, null);
    });

    it('should return null for empty plan', () => {
        const plan = new Plan();
        const found = plan.getNodeById('123');
        assert.strictEqual(found, null);
    });

    it('should find multiple different nodes', () => {
        const nodes = new Map();
        const node1 = new Node('1', 45.75, 4.85, []);
        const node2 = new Node('2', 45.76, 4.86, []);
        nodes.set('1', node1);
        nodes.set('2', node2);

        const plan = new Plan(nodes, [], null);
        assert.strictEqual(plan.getNodeById('1'), node1);
        assert.strictEqual(plan.getNodeById('2'), node2);
    });
});

describe('Plan Class - getEdgesFrom Method', () => {

    it('should return empty array for node with no outgoing edges', () => {
        const plan = new Plan();
        const edges = plan.getEdgesFrom('123');
        assert.strictEqual(edges.length, 0);
    });

    it('should return outgoing edges from a node', () => {
        const node1 = new Node('1', 45.75, 4.85, []);
        const node2 = new Node('2', 45.76, 4.86, []);
        const node3 = new Node('3', 45.77, 4.87, []);
        const segment1 = new Segment(node1, node2, 'Street A', 100);
        const segment2 = new Segment(node1, node3, 'Street B', 200);
        const segment3 = new Segment(node2, node3, 'Street C', 150);

        const plan = new Plan(new Map(), [segment1, segment2, segment3], null);
        const edges = plan.getEdgesFrom('1');

        assert.strictEqual(edges.length, 2);
        assert.isTrue(edges.includes(segment1));
        assert.isTrue(edges.includes(segment2));
    });

    it('should return empty array for node with no outgoing edges', () => {
        const node1 = new Node('1', 45.75, 4.85, []);
        const node2 = new Node('2', 45.76, 4.86, []);
        const segment1 = new Segment(node1, node2, 'Street A', 100);
        const plan = new Plan(new Map(), [segment1], null);

        const edges = plan.getEdgesFrom('3');
        assert.strictEqual(edges.length, 0);
    });

    it('should work with numeric node ids', () => {
        const node1 = new Node(1, 45.75, 4.85, []);
        const node2 = new Node(2, 45.76, 4.86, []);
        const node3 = new Node(3, 45.77, 4.87, []);
        const segment1 = new Segment(node1, node2, 'Street A', 100);
        const segment2 = new Segment(node1, node3, 'Street B', 200);

        const plan = new Plan(new Map(), [segment1, segment2], null);
        const edges = plan.getEdgesFrom(1);

        assert.strictEqual(edges.length, 2);
    });

    it('should handle mixed string/number comparison', () => {
        const node1 = new Node('1', 45.75, 4.85, []);
        const node2 = new Node('2', 45.76, 4.86, []);
        const segment1 = new Segment(node1, node2, 'Street A', 100);
        const plan = new Plan(new Map(), [segment1], null);

        // Using == comparison, should find the edge
        const edges = plan.getEdgesFrom(1);
        assert.strictEqual(edges.length, 1);
    });
});

describe('Plan Class - toJSON Method', () => {

    it('should return correct JSON representation', () => {
        const nodes = new Map();
        const node1 = new Node('1', 45.75, 4.85, []);
        const node2 = new Node('2', 45.76, 4.86, []);
        nodes.set('1', node1);
        nodes.set('2', node2);

        const segment1 = new Segment(node1, node2, 'Street', 100);
        const warehouse = node1;

        const plan = new Plan(nodes, [segment1], warehouse);
        const json = plan.toJSON();

        assert.isTrue(Array.isArray(json.nodes));
        assert.isTrue(Array.isArray(json.segments));
        assert.isTrue(json.warehouse !== undefined);
    });

    it('should convert nodes map to array in JSON', () => {
        const nodes = new Map();
        const node1 = new Node('1', 45.75, 4.85, []);
        const node2 = new Node('2', 45.76, 4.86, []);
        nodes.set('1', node1);
        nodes.set('2', node2);

        const plan = new Plan(nodes, [], null);
        const json = plan.toJSON();

        assert.strictEqual(json.nodes.length, 2);
    });

    it('should include warehouse in JSON', () => {
        const warehouse = new Node('W', 45.75, 4.85, []);
        const nodes = new Map();
        nodes.set('W', warehouse);

        const plan = new Plan(nodes, [], warehouse);
        const json = plan.toJSON();

        assert.strictEqual(json.warehouse.id, 'W');
        assert.strictEqual(json.warehouse.latitude, 45.75);
        assert.strictEqual(json.warehouse.longitude, 4.85);
    });

    it('should handle null warehouse in JSON', () => {
        const plan = new Plan();
        const json = plan.toJSON();

        assert.strictEqual(json.warehouse, null);
    });
});

describe('Plan Class - toString Method', () => {

    it('should return correct string representation', () => {
        const nodes = new Map();
        const node1 = new Node('1', 45.75, 4.85, []);
        const node2 = new Node('2', 45.76, 4.86, []);
        nodes.set('1', node1);
        nodes.set('2', node2);

        const segment1 = new Segment(node1, node2, 'Street', 100);
        const plan = new Plan(nodes, [segment1], null);

        const str = plan.toString();
        assert.isTrue(str.includes('Plan'));
        assert.isTrue(str.includes('2'));
        assert.isTrue(str.includes('nodes'));
        assert.isTrue(str.includes('segments'));
    });

    it('should include node count in string', () => {
        const nodes = new Map();
        nodes.set('1', new Node('1', 45.75, 4.85, []));
        nodes.set('2', new Node('2', 45.76, 4.86, []));

        const plan = new Plan(nodes, [], null);
        const str = plan.toString();

        assert.isTrue(str.includes('2'));
    });

    it('should include segment count in string', () => {
        const node1 = new Node('1', 45.75, 4.85, []);
        const node2 = new Node('2', 45.76, 4.86, []);
        const node3 = new Node('3', 45.77, 4.87, []);
        const segment1 = new Segment(node1, node2, 'Street A', 100);
        const segment2 = new Segment(node2, node3, 'Street B', 200);

        const plan = new Plan(new Map(), [segment1, segment2], null);
        const str = plan.toString();

        assert.isTrue(str.includes('2'));
    });

    it('should indicate when warehouse is null', () => {
        const plan = new Plan();
        const str = plan.toString();

        assert.isTrue(str.includes('None') || str.includes('null'));
    });

    it('should include warehouse id when set', () => {
        const warehouse = new Node('W001', 45.75, 4.85, []);
        const nodes = new Map();
        nodes.set('W001', warehouse);

        const plan = new Plan(nodes, [], warehouse);
        const str = plan.toString();

        assert.isTrue(str.includes('W001'));
    });
});


describe('Plan Class - Edge Cases', () => {

    it('should handle empty nodes map', () => {
        const plan = new Plan(new Map(), [], null);
        assert.strictEqual(plan.nodes.size, 0);
    });

    it('should handle empty segments array', () => {
        const plan = new Plan(new Map(), [], null);
        assert.strictEqual(plan.segments.length, 0);
    });

    it('should handle large number of nodes', () => {
        const nodes = new Map();
        for (let i = 0; i < 1000; i++) {
            nodes.set(String(i), new Node(String(i), 45.75, 4.85, []));
        }

        const plan = new Plan(nodes, [], null);
        assert.strictEqual(plan.nodes.size, 1000);
    });

    it('should handle large number of segments', () => {
        const nodes = new Map();
        for (let i = 0; i < 1001; i++) {
            nodes.set(String(i), new Node(String(i), 45.75, 4.85, []));
        }
        
        const segments = [];
        for (let i = 0; i < 1000; i++) {
            const node1 = nodes.get(String(i));
            const node2 = nodes.get(String(i + 1));
            segments.push(new Segment(node1, node2, 'Street', 100));
        }

        const plan = new Plan(new Map(), segments, null);
        assert.strictEqual(plan.segments.length, 1000);
    });
});

describe('Plan Class - Neighbors and Shortest Path', () => {

    function buildSamplePlan() {
        const nodeA = new Node('A', 45.75, 4.85, []);
        const nodeB = new Node('B', 45.76, 4.86, []);
        const nodeC = new Node('C', 45.77, 4.87, []);
        const nodeD = new Node('D', 45.78, 4.88, []);

        const segAB = new Segment(nodeA, nodeB, 'AB', 100);
        const segBC = new Segment(nodeB, nodeC, 'BC', 200);
        const segAC = new Segment(nodeA, nodeC, 'AC', 400);

        const nodes = new Map([
            ['A', nodeA],
            ['B', nodeB],
            ['C', nodeC],
            ['D', nodeD]
        ]);

        const plan = new Plan(nodes, [segAB, segBC, segAC], nodeA);
        return { plan, nodeA, nodeB, nodeC, nodeD };
    }

    it('should list neighbors for a node with multiple links', () => {
        const { plan } = buildSamplePlan();
        const neighbors = plan.getNeighbors('A');
        neighbors.sort();
        assert.deepStrictEqual(neighbors, ['B', 'C']);
    });

    it('should return shortest path between connected nodes', () => {
        const { plan } = buildSamplePlan();
        const result = plan.findShortestPath('A', 'C');
        assert.isTrue(result !== null, 'Path should exist');
        const pathIds = result.path.map(node => node.id);
        assert.deepStrictEqual(pathIds, ['A', 'B', 'C']); // A->B->C is cheaper than direct AC
        assert.strictEqual(result.distance, 300);
        assert.strictEqual(result.segments.length, 2);
    });

    it('should return null when nodes are missing', () => {
        const { plan } = buildSamplePlan();
        const missingStart = plan.findShortestPath('X', 'A');
        const missingEnd = plan.findShortestPath('A', 'Z');
        assert.strictEqual(missingStart, null);
        assert.strictEqual(missingEnd, null);
    });

    it('should return null when no path exists between nodes', () => {
        const { plan } = buildSamplePlan();
        const result = plan.findShortestPath('A', 'D'); // D is isolated
        assert.strictEqual(result, null);
    });
});

// Export results
module.exports = getResults();
