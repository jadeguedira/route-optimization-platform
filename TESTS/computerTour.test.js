/**
 * Test Suite for ComputerTour class
 * Tests the Branch & Bound TSP solver (computeTSPTourV1) with precedence constraints
 */

const ComputerTour = require('../backend/computerTour');
const Plan = require('../backend/plan');
const Node = require('../backend/node');
const Segment = require('../backend/segment');
const Leg = require('../backend/leg');
const { TourPoint, TypePoint } = require('../backend/tourpoint');
const Courier = require('../backend/courier');
const Demand = require('../backend/demand');
const { describe, it, assert, getResults } = require('./testFramework');

function buildSimplePlan() {
    // Nodes
    const n1 = new Node('A', 0, 0, []);
    const n2 = new Node('B', 0, 1, []);
    const n3 = new Node('C', 1, 1, []);

    // Segments (bidirectional connectivity through undirected lookup)
    const s12 = new Segment(n1, n2, 'A-B', 1000);
    const s23 = new Segment(n2, n3, 'B-C', 1200);
    const s31 = new Segment(n3, n1, 'C-A', 1500);

    n1.segments.push(s12);
    n2.segments.push(s23);
    n3.segments.push(s31);

    const nodesMap = new Map([['A', n1], ['B', n2], ['C', n3]]);
    const plan = new Plan(nodesMap, [s12, s23, s31], n1);
    return { plan, nodes: { n1, n2, n3 }, segments: { s12, s23, s31 } };
}

describe('ComputerTour - Basic Initialization', () => {

    it('Should create ComputerTour with plan and warehouse', () => {
        const nodeW = new Node("W", 45.75, 4.85, []);
        const plan = new Plan();
        plan.nodes = new Map([["W", nodeW]]);
        plan.segments = [];
        plan.warehouse = nodeW;

        const warehouseTourPoint = new TourPoint(nodeW, 0, TypePoint.WAREHOUSE, null);
        const computerTour = new ComputerTour(plan, warehouseTourPoint);

        assert.isTrue(computerTour.plan === plan, "Should store plan reference");
        assert.isTrue(computerTour.start === warehouseTourPoint, "Should store warehouse tour point");
        assert.strictEqual(computerTour.tourPoints.size, 0, "Should start with empty tour points");
        assert.strictEqual(computerTour.precedence.size, 0, "Should start with empty precedence map");
    });

});

describe('ComputerTour - fillTourPointStructures', () => {

    it('Should fill structures with one pickup-delivery pair', () => {
        const nodeW = new Node("W", 45.75, 4.85, []);
        const nodeA = new Node("A", 45.76, 4.86, []);
        const nodeB = new Node("B", 45.77, 4.87, []);

        const segWA = new Segment(nodeW, nodeA, "WA", 100);
        const segAW = new Segment(nodeA, nodeW, "AW", 100);
        const segAB = new Segment(nodeA, nodeB, "AB", 150);
        const segBA = new Segment(nodeB, nodeA, "BA", 150);
        const segWB = new Segment(nodeW, nodeB, "WB", 200);
        const segBW = new Segment(nodeB, nodeW, "BW", 200);

        const plan = new Plan();
        plan.nodes = new Map([
            ["W", nodeW],
            ["A", nodeA],
            ["B", nodeB]
        ]);
        plan.segments = [segWA, segAW, segAB, segBA, segWB, segBW];
        plan.warehouse = nodeW;

        const warehouseTourPoint = new TourPoint(nodeW, 0, TypePoint.WAREHOUSE, null);
        const demand = new Demand("A", "B", 60, 120);
        const pickupPoint = new TourPoint(nodeA, 60, TypePoint.PICKUP, demand);
        const deliveryPoint = new TourPoint(nodeB, 120, TypePoint.DELIVERY, demand);

        const computerTour = new ComputerTour(plan, warehouseTourPoint);
        const success = computerTour.fillTourPointStructures([[pickupPoint, deliveryPoint]]);

        assert.isTrue(success, "Should successfully fill structures");
        assert.strictEqual(computerTour.tourPoints.size, 2, "Should have 2 tour points");
        assert.isTrue(computerTour.tourPoints.has(pickupPoint), "Should contain pickup point");
        assert.isTrue(computerTour.tourPoints.has(deliveryPoint), "Should contain delivery point");
        assert.strictEqual(computerTour.precedence.size, 1, "Should have 1 precedence constraint");
        assert.isTrue(computerTour.precedence.get(deliveryPoint) === pickupPoint, "Delivery should require pickup");
    });

    it('Should handle multiple pickup-delivery pairs', () => {
        const nodeW = new Node("W", 45.75, 4.85, []);
        const nodeA = new Node("A", 45.76, 4.86, []);
        const nodeB = new Node("B", 45.77, 4.87, []);
        const nodeC = new Node("C", 45.78, 4.88, []);
        const nodeD = new Node("D", 45.79, 4.89, []);

        const plan = new Plan();
        plan.nodes = new Map([
            ["W", nodeW],
            ["A", nodeA],
            ["B", nodeB],
            ["C", nodeC],
            ["D", nodeD]
        ]);

        // Create all necessary bidirectional segments
        const segments = [];
        const nodes = [nodeW, nodeA, nodeB, nodeC, nodeD];
        for (let i = 0; i < nodes.length; i++) {
            for (let j = i + 1; j < nodes.length; j++) {
                segments.push(new Segment(nodes[i], nodes[j], `${nodes[i].id}${nodes[j].id}`, 100 * (j - i)));
                segments.push(new Segment(nodes[j], nodes[i], `${nodes[j].id}${nodes[i].id}`, 100 * (j - i)));
            }
        }
        plan.segments = segments;
        plan.warehouse = nodeW;

        const warehouseTourPoint = new TourPoint(nodeW, 0, TypePoint.WAREHOUSE, null);

        const demand1 = new Demand("A", "B", 60, 120);
        const pickup1 = new TourPoint(nodeA, 60, TypePoint.PICKUP, demand1);
        const delivery1 = new TourPoint(nodeB, 120, TypePoint.DELIVERY, demand1);

        const demand2 = new Demand("C", "D", 45, 90);
        const pickup2 = new TourPoint(nodeC, 45, TypePoint.PICKUP, demand2);
        const delivery2 = new TourPoint(nodeD, 90, TypePoint.DELIVERY, demand2);

        const computerTour = new ComputerTour(plan, warehouseTourPoint);
        const success = computerTour.fillTourPointStructures([[pickup1, delivery1], [pickup2, delivery2]]);

        assert.isTrue(success, "Should successfully fill structures");
        assert.strictEqual(computerTour.tourPoints.size, 4, "Should have 4 tour points");
        assert.strictEqual(computerTour.precedence.size, 2, "Should have 2 precedence constraints");
    });

    it('Should return false when no path exists', () => {
        const nodeW = new Node("W", 45.75, 4.85, []);
        const nodeA = new Node("A", 45.76, 4.86, []);
        const nodeB = new Node("B", 45.77, 4.87, []);

        const plan = new Plan();
        plan.nodes = new Map([
            ["W", nodeW],
            ["A", nodeA],
            ["B", nodeB]
        ]);
        plan.segments = []; // No segments - disconnected graph
        plan.warehouse = nodeW;

        const warehouseTourPoint = new TourPoint(nodeW, 0, TypePoint.WAREHOUSE, null);
        const demand = new Demand("A", "B", 60, 120);
        const pickupPoint = new TourPoint(nodeA, 60, TypePoint.PICKUP, demand);
        const deliveryPoint = new TourPoint(nodeB, 120, TypePoint.DELIVERY, demand);

        const computerTour = new ComputerTour(plan, warehouseTourPoint);
        const success = computerTour.fillTourPointStructures([[pickupPoint, deliveryPoint]]);

        assert.strictEqual(success, false, "Should return false when graph is disconnected");
    });

});

describe('ComputerTour - computeTSPTourV1 (Branch & Bound)', () => {

    it('Should find optimal tour for single demand', () => {
        const nodeW = new Node("W", 45.75, 4.85, []);
        const nodeA = new Node("A", 45.76, 4.86, []);
        const nodeB = new Node("B", 45.77, 4.87, []);

        const plan = new Plan();
        plan.nodes = new Map([
            ["W", nodeW],
            ["A", nodeA],
            ["B", nodeB]
        ]);

        plan.segments = [
            new Segment(nodeW, nodeA, "WA", 100),
            new Segment(nodeA, nodeW, "AW", 100),
            new Segment(nodeA, nodeB, "AB", 150),
            new Segment(nodeB, nodeA, "BA", 150),
            new Segment(nodeW, nodeB, "WB", 200),
            new Segment(nodeB, nodeW, "BW", 200)
        ];
        plan.warehouse = nodeW;

        const warehouseTourPoint = new TourPoint(nodeW, 0, TypePoint.WAREHOUSE, null);
        const demand = new Demand("A", "B", 60, 120);
        const pickupPoint = new TourPoint(nodeA, 60, TypePoint.PICKUP, demand);
        const deliveryPoint = new TourPoint(nodeB, 120, TypePoint.DELIVERY, demand);

        const computerTour = new ComputerTour(plan, warehouseTourPoint);
        computerTour.fillTourPointStructures([[pickupPoint, deliveryPoint]]);

        const result = computerTour.computeTSPTourV1();

        assert.isTrue(result !== null, "Should find a tour");
        assert.isTrue(Array.isArray(result), "Should return an array");
        assert.strictEqual(result[0], warehouseTourPoint, "Should start at warehouse");
        assert.strictEqual(result[result.length - 1], warehouseTourPoint, "Should end at warehouse");

        // Check pickup comes before delivery
        const pickupIdx = result.indexOf(pickupPoint);
        const deliveryIdx = result.indexOf(deliveryPoint);
        assert.isTrue(pickupIdx >= 0, "Should include pickup");
        assert.isTrue(deliveryIdx >= 0, "Should include delivery");
        assert.isTrue(pickupIdx < deliveryIdx, "Pickup should come before delivery");
    });

    it('Should respect precedence constraints for multiple demands', () => {
        const nodeW = new Node("W", 45.75, 4.85, []);
        const nodeA = new Node("A", 45.76, 4.86, []);
        const nodeB = new Node("B", 45.77, 4.87, []);
        const nodeC = new Node("C", 45.78, 4.88, []);
        const nodeD = new Node("D", 45.79, 4.89, []);

        const plan = new Plan();
        plan.nodes = new Map([
            ["W", nodeW],
            ["A", nodeA],
            ["B", nodeB],
            ["C", nodeC],
            ["D", nodeD]
        ]);

        const segments = [];
        const nodes = [nodeW, nodeA, nodeB, nodeC, nodeD];
        for (let i = 0; i < nodes.length; i++) {
            for (let j = i + 1; j < nodes.length; j++) {
                segments.push(new Segment(nodes[i], nodes[j], `${nodes[i].id}${nodes[j].id}`, 100 * (j - i)));
                segments.push(new Segment(nodes[j], nodes[i], `${nodes[j].id}${nodes[i].id}`, 100 * (j - i)));
            }
        }
        plan.segments = segments;
        plan.warehouse = nodeW;

        const warehouseTourPoint = new TourPoint(nodeW, 0, TypePoint.WAREHOUSE, null);

        const demand1 = new Demand("A", "B", 60, 120);
        const pickup1 = new TourPoint(nodeA, 60, TypePoint.PICKUP, demand1);
        const delivery1 = new TourPoint(nodeB, 120, TypePoint.DELIVERY, demand1);

        const demand2 = new Demand("C", "D", 45, 90);
        const pickup2 = new TourPoint(nodeC, 45, TypePoint.PICKUP, demand2);
        const delivery2 = new TourPoint(nodeD, 90, TypePoint.DELIVERY, demand2);

        const computerTour = new ComputerTour(plan, warehouseTourPoint);
        computerTour.fillTourPointStructures([[pickup1, delivery1], [pickup2, delivery2]]);

        const result = computerTour.computeTSPTourV1();

        assert.isTrue(result !== null, "Should find a tour");

        // Check all points are included (W start, P1, D1, P2, D2, W end = 6 unique points, 7 including return)
        assert.strictEqual(result.length, 6, `Should have 6 points (W, P1, D1, P2, D2, W), got ${result.length}`);

        // Check precedence constraints
        const p1Idx = result.indexOf(pickup1);
        const d1Idx = result.indexOf(delivery1);
        const p2Idx = result.indexOf(pickup2);
        const d2Idx = result.indexOf(delivery2);

        assert.isTrue(p1Idx < d1Idx, "Pickup1 should come before delivery1");
        assert.isTrue(p2Idx < d2Idx, "Pickup2 should come before delivery2");
    });

    it('Should handle tour with 3 demands', () => {
        const nodes = [];
        const nodeMap = new Map();

        for (let i = 0; i < 7; i++) {
            const node = new Node(`N${i}`, 45.75 + i * 0.01, 4.85 + i * 0.01, []);
            nodes.push(node);
            nodeMap.set(`N${i}`, node);
        }

        const plan = new Plan();
        plan.nodes = nodeMap;
        plan.warehouse = nodes[0];

        const segments = [];
        for (let i = 0; i < nodes.length; i++) {
            for (let j = i + 1; j < nodes.length; j++) {
                segments.push(new Segment(nodes[i], nodes[j], `${i}-${j}`, 100 * (j - i)));
                segments.push(new Segment(nodes[j], nodes[i], `${j}-${i}`, 100 * (j - i)));
            }
        }
        plan.segments = segments;

        const warehouseTourPoint = new TourPoint(nodes[0], 0, TypePoint.WAREHOUSE, null);

        const pairs = [];
        for (let i = 1; i <= 3; i++) {
            const demand = new Demand(`N${i}`, `N${i + 3}`, 60, 120);
            const pickup = new TourPoint(nodes[i], 60, TypePoint.PICKUP, demand);
            const delivery = new TourPoint(nodes[i + 3], 120, TypePoint.DELIVERY, demand);
            pairs.push([pickup, delivery]);
        }

        const computerTour = new ComputerTour(plan, warehouseTourPoint);
        computerTour.fillTourPointStructures(pairs);

        const result = computerTour.computeTSPTourV1();

        assert.isTrue(result !== null, "Should find tour for 3 demands");
        assert.strictEqual(result.length, 8, `Should have 8 points (W + 6 points + W), got ${result.length}`);
    });

});

describe('ComputerTour.computeCompleteTour', () => {
    it('builds a complete tour with legs and totals', () => {
        const { plan, nodes } = buildSimplePlan();
        const computerTour = new ComputerTour(plan);
        const courier = new Courier('C1', 'Alice');

        const warehouse = new TourPoint(nodes.n1, 0, TypePoint.WAREHOUSE, null);
        const pickup = new TourPoint(nodes.n2, 300, TypePoint.PICKUP, { id: 'D1' });
        const delivery = new TourPoint(nodes.n3, 300, TypePoint.DELIVERY, { id: 'D1' });
        pickup.relatedTourPoint = delivery;
        delivery.relatedTourPoint = pickup;

        const tour = computerTour.computeCompleteTour([warehouse, pickup, delivery, warehouse], courier);

        assert.isTrue(!!tour, 'Tour should be returned');
        assert.strictEqual(tour.stops.length, 4, 'Tour should include all stops');
        assert.strictEqual(tour.legs.length, 3, 'Tour should include all legs');
        assert.strictEqual(tour.courier, courier, 'Tour should carry the provided courier');

        // Distances from the plan: 1000 + 1200 + 1500
        assert.strictEqual(tour.totalDistance, 3700);

        // Travel time is distance at 15 km/h => distance / (15km/h) seconds
        const speedMps = (15 * 1000) / 3600;
        const expectedTravel = Math.round(1000 / speedMps) + Math.round(1200 / speedMps) + Math.round(1500 / speedMps);
        const expectedDuration = expectedTravel + 0 + 300 + 300 + 0;
        assert.strictEqual(tour.totalDuration, expectedDuration);
    });

    it('returns null when no path exists between two stops', () => {
        const nodeA = new Node('A', 0, 0, []);
        const nodeB = new Node('B', 0, 1, []);
        const nodesMap = new Map([['A', nodeA], ['B', nodeB]]);
        const plan = new Plan(nodesMap, [], nodeA); // no segments, no paths
        const computerTour = new ComputerTour(plan);
        const courier = new Courier('C2', 'Bob');

        const depot = new TourPoint(nodeA, 0, TypePoint.WAREHOUSE, null);
        const pickup = new TourPoint(nodeB, 100, TypePoint.PICKUP, null);

        const tour = computerTour.computeCompleteTour([depot, pickup], courier);
        assert.strictEqual(tour, null, 'Should return null if no path exists');
    });
});

module.exports = getResults();
