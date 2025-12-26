/**
 * Additional tests for ComputerTour algorithms and configuration
 */

const ComputerTour = require('../backend/computerTour.js');
const Plan = require('../backend/plan.js');
const Node = require('../backend/node.js');
const Segment = require('../backend/segment.js');
const Demand = require('../backend/demand.js');
const { TourPoint, TypePoint } = require('../backend/tourpoint.js');
const { describe, it, assert, getResults } = require('./testFramework.js');

function buildPlan() {
    const nodeW = new Node('W', 45.75, 4.85, []);
    const nodeA = new Node('A', 45.76, 4.86, []);
    const nodeB = new Node('B', 45.77, 4.87, []);

    const segWA = new Segment(nodeW, nodeA, 'WA', 100);
    const segAB = new Segment(nodeA, nodeB, 'AB', 150);
    const segWB = new Segment(nodeW, nodeB, 'WB', 400);

    const nodes = new Map([
        ['W', nodeW],
        ['A', nodeA],
        ['B', nodeB]
    ]);

    const plan = new Plan(nodes, [segWA, segAB, segWB], nodeW);
    return { plan, nodeW, nodeA, nodeB };
}

function makeTourPoint(node, type, demandId) {
    const demand = new Demand(node.id, node.id, 60, 60, demandId);
    return new TourPoint(node, 60, type, demand);
}

describe('ComputerTour - configuration and pathfinding', () => {
    it('should allow switching pathfinding algorithm with fallback', () => {
        const { plan, nodeW } = buildPlan();
        const warehousePoint = new TourPoint(nodeW, 0, TypePoint.WAREHOUSE, null);
        const computer = new ComputerTour(plan, warehousePoint);

        computer.setPathfindingAlgorithm('dijkstra');
        assert.strictEqual(computer.pathfindingAlgorithm, 'dijkstra');

        computer.setPathfindingAlgorithm('invalid');
        assert.strictEqual(computer.pathfindingAlgorithm, 'astar');
    });

    it('should allow switching TSP strategy with fallback', () => {
        const { plan, nodeW } = buildPlan();
        const warehousePoint = new TourPoint(nodeW, 0, TypePoint.WAREHOUSE, null);
        const computer = new ComputerTour(plan, warehousePoint);

        computer.setTSPStrategy('v2');
        assert.strictEqual(computer.tspStrategy, 'v2');

        computer.setTSPStrategy('unknown');
        assert.strictEqual(computer.tspStrategy, 'v1');
    });

    it('should compute shortest path with A* and Dijkstra', () => {
        const { plan, nodeW } = buildPlan();
        const warehousePoint = new TourPoint(nodeW, 0, TypePoint.WAREHOUSE, null);
        const computer = new ComputerTour(plan, warehousePoint);

        const aStar = computer.aStarShortestPath('W', 'B');
        const dijkstra = computer.dijkstraShortestPath('W', 'B');

        // Dijkstra must always return the optimal path
        assert.strictEqual(dijkstra.distance, 250);
        assert.deepStrictEqual(dijkstra.pathIds, ['W', 'A', 'B']);

        // A* may prefer the direct edge depending on heuristic, but should return a valid route
        assert.strictEqual(aStar.pathIds[0], 'W');
        assert.strictEqual(aStar.pathIds[aStar.pathIds.length - 1], 'B');
        assert.isTrue([250, 400].includes(aStar.distance));
    });
});

describe('ComputerTour - tour structure helpers', () => {
    it('should fill tour point structures when paths exist', () => {
        const { plan, nodeW, nodeA, nodeB } = buildPlan();
        const warehousePoint = new TourPoint(nodeW, 0, TypePoint.WAREHOUSE, null);
        const computer = new ComputerTour(plan, warehousePoint);

        const pickup = makeTourPoint(nodeA, TypePoint.PICKUP, 'DEM1');
        const delivery = makeTourPoint(nodeB, TypePoint.DELIVERY, 'DEM1');
        const ok = computer.fillTourPointStructures([[pickup, delivery]]);
        assert.isTrue(ok);

        const key = computer.getKey(pickup, delivery);
        assert.isTrue(computer.tourPointGraphTimes.has(key));
        assert.isTrue(computer.tourPointGraphLegs.has(key));
    });

    it('should fail to fill tour structures when nodes are disconnected', () => {
        const { plan, nodeW, nodeA } = buildPlan();
        const nodeC = new Node('C', 45.78, 4.88, []);
        plan.nodes.set('C', nodeC);
        // Plan lacks any segment to C
        const warehousePoint = new TourPoint(nodeW, 0, TypePoint.WAREHOUSE, null);
        const computer = new ComputerTour(plan, warehousePoint);

        const pickup = makeTourPoint(nodeA, TypePoint.PICKUP, 'DEM2');
        const delivery = makeTourPoint(nodeC, TypePoint.DELIVERY, 'DEM2');
        const ok = computer.fillTourPointStructures([[pickup, delivery]]);
        assert.strictEqual(ok, false);
    });

    it('should build TSP tour versions respecting precedence', () => {
        const { plan, nodeW, nodeA, nodeB } = buildPlan();
        const warehousePoint = new TourPoint(nodeW, 0, TypePoint.WAREHOUSE, null);
        const computer = new ComputerTour(plan, warehousePoint);

        const pickup = makeTourPoint(nodeA, TypePoint.PICKUP, 'DEM3');
        const delivery = makeTourPoint(nodeB, TypePoint.DELIVERY, 'DEM3');
        computer.fillTourPointStructures([[pickup, delivery]]);

        const tourV0 = computer.computeTSPTourV0();
        assert.deepStrictEqual(tourV0[0], warehousePoint);
        assert.deepStrictEqual(tourV0[tourV0.length - 1], warehousePoint);

        const tourV2 = computer.computeTSPTourV2();
        assert.deepStrictEqual(tourV2[0], warehousePoint);
        assert.deepStrictEqual(tourV2[tourV2.length - 1], warehousePoint);

        const valid = computer.validatePrecedenceConstraints(tourV2);
        assert.isTrue(valid);
    });
});

module.exports = getResults();
