/**
 * Tests covering core functionalities of backend/system.js
 */

const System = require('../backend/system.js');
const Plan = require('../backend/plan.js');
const Node = require('../backend/node.js');
const Segment = require('../backend/segment.js');
const Demand = require('../backend/demand.js');
const Courier = require('../backend/courier.js');
const Tour = require('../backend/tours.js');
const { TourPoint, TypePoint } = require('../backend/tourpoint.js');
const { describe, it, assert, getResults } = require('./testFramework.js');

function buildSystem() {
    const system = new System(2);
    const nodeW = new Node('W', 45.75, 4.85, []);
    const nodeA = new Node('A', 45.76, 4.86, []);
    const nodeB = new Node('B', 45.77, 4.87, []);

    const segWA = new Segment(nodeW, nodeA, 'WA', 100);
    const segAB = new Segment(nodeA, nodeB, 'AB', 100);
    const segWB = new Segment(nodeW, nodeB, 'WB', 300);

    const nodes = new Map([
        ['W', nodeW],
        ['A', nodeA],
        ['B', nodeB]
    ]);

    system.plan = new Plan(nodes, [segWA, segAB, segWB], nodeW);
    system.distanceMatrix = new Map([
        ['W', new Map([['A', 100], ['B', 300]])],
        ['A', new Map([['W', 100], ['B', 100]])],
        ['B', new Map([['A', 100], ['W', 300]])]
    ]);

    return { system, nodes: { nodeW, nodeA, nodeB } };
}

describe('System Class - Demand management', () => {
    it('should refuse to add demand without plan', () => {
        const system = new System();
        const result = system.addDemand('A', 'B', 300, 240);
        assert.strictEqual(result.success, false);
    });

    it('should add, update and remove demands', () => {
        const { system } = buildSystem();

        const added = system.addDemand('A', 'B', 300, 240);
        assert.strictEqual(added.success, true);
        assert.strictEqual(system.demandsList.length, 1);

        const demandId = added.demand.id;
        const updated = system.updateDemand(demandId, 'B', 'A', 200, 100);
        assert.strictEqual(updated.success, true);
        assert.strictEqual(system.demandsList[0].pickupDuration, 200);

        const removed = system.removeDemandById(demandId);
        assert.strictEqual(removed, true);
        assert.strictEqual(system.demandsList.length, 0);
    });
});

describe('System Class - Helpers', () => {
    it('should convert demands to tour point pairs', () => {
        const { system } = buildSystem();
        const demand = new Demand('A', 'B', 300, 240, 'DEM_TEST');
        const pairs = system.createTourPointPairs([demand]);
        assert.strictEqual(pairs.length, 1);
        const [pickup, delivery] = pairs[0];
        assert.strictEqual(pickup.node.id, 'A');
        assert.strictEqual(delivery.node.id, 'B');
    });

    it('should compute travel time from distance', () => {
        const system = new System();
        const time = system.calculateTravelTime(15000); // 15km => 3600s
        assert.strictEqual(time, 3600);
    });

    it('should run Dijkstra on the pre-computed matrix', () => {
        const { system } = buildSystem();
        const result = system.dijkstra('W', 'B');
        assert.deepStrictEqual(result.path, ['W', 'A', 'B']);
        assert.strictEqual(result.distance, 200);
    });
});

describe('System Class - Distribution and tour building', () => {
    it('should distribute demands when there are more couriers than tasks', () => {
        const { system } = buildSystem();
        system.demandsList = [
            new Demand('A', 'B', 300, 240, 'D1'),
            new Demand('B', 'A', 300, 240, 'D2')
        ];
        const groups = system.distributeDemands(5);
        assert.strictEqual(groups.length, system.demandsList.length);
        groups.forEach((group, idx) => {
            assert.strictEqual(group.length, 1);
            assert.strictEqual(group[0].id, `D${idx + 1}`);
        });
    });

    it('should build a consistent tour for a courier', () => {
        const { system } = buildSystem();
        const courier = new Courier('C1', 'Test Courier');
        const demand = new Demand('A', 'B', 300, 240, 'DEM_BUILD');
        const tour = system.buildTourForCourier(courier, [demand], system.distanceMatrix);

        assert.isTrue(tour instanceof Tour);
        assert.strictEqual(tour.courier, courier);
        assert.strictEqual(tour.legs.length >= 2, true); // at least pickup/delivery + return
        const firstStop = tour.stops[0];
        const lastStop = tour.stops[tour.stops.length - 1];
        assert.strictEqual(firstStop.address.id, 'W');
        assert.strictEqual(lastStop.address.id, 'W');
    });
});

module.exports = getResults();

