/**
 * Tests for Tour order changes validation and movePoint behavior
 */

const Tour = require('../backend/tours.js');
const Courier = require('../backend/courier.js');
const Node = require('../backend/node.js');
const { TourPoint, TypePoint } = require('../backend/tourpoint.js');
const { describe, it, assert, getResults } = require('./testFramework.js');

describe('Tour order change - isMoveValid and movePoint', () => {

    it('should forbid moving the start depot', () => {
        const courier = new Courier('C001', 'John Doe');
        const tour = new Tour(null, '08:00', courier);

        const node = new Node('N', 45.75, 4.85, []);
        const start = new TourPoint(node, 0, TypePoint.WAREHOUSE, null);
        const end = new TourPoint(node, 0, TypePoint.WAREHOUSE, null);

        tour.stops = [start, end];

        const res = tour.movePoint(0, 1);
        assert.strictEqual(res.valid, false);
        assert.strictEqual(res.reason, 'DEPOT_START');
    });

    it('should forbid moving the end depot', () => {
        const courier = new Courier('C001', 'John Doe');
        const tour = new Tour(null, '08:00', courier);

        const node = new Node('N', 45.75, 4.85, []);
        const start = new TourPoint(node, 0, TypePoint.WAREHOUSE, null);
        const end = new TourPoint(node, 0, TypePoint.WAREHOUSE, null);

        tour.stops = [start, end];

        const res = tour.movePoint(1, 0);
        assert.strictEqual(res.valid, false);
        assert.strictEqual(res.reason, 'DEPOT_END_MOVE');
    });

    it('should return OUT_OF_RANGE when new index is invalid', () => {
        const courier = new Courier('C001', 'John Doe');
        const tour = new Tour(null, '08:00', courier);

        const node = new Node('N', 45.75, 4.85, []);
        const start = new TourPoint(node, 0, TypePoint.WAREHOUSE, null);
        const p = new TourPoint(node, 60, TypePoint.PICKUP, null);
        const end = new TourPoint(node, 0, TypePoint.WAREHOUSE, null);

        tour.stops = [start, p, end];

        const res = tour.movePoint(1, 5);
        assert.strictEqual(res.valid, false);
        assert.strictEqual(res.reason, 'OUT_OF_RANGE');
    });

    it('should forbid placing a pickup after its delivery', () => {
        const courier = new Courier('C001', 'John Doe');
        const tour = new Tour(null, '08:00', courier);

        const nodeA = new Node('A', 45.75, 4.85, []);
        const nodeB = new Node('B', 45.76, 4.86, []);

        const start = new TourPoint(nodeA, 0, TypePoint.WAREHOUSE, null);
        const p = new TourPoint(nodeA, 60, TypePoint.PICKUP, null);
        const d = new TourPoint(nodeB, 120, TypePoint.DELIVERY, null);
        const end = new TourPoint(nodeB, 0, TypePoint.WAREHOUSE, null);

        // link the pair
        p.relatedTourPoint = d;
        d.relatedTourPoint = p;

        tour.stops = [start, p, d, end];

        // Try to move pickup after delivery (index 1 -> 2)
        const res = tour.movePoint(1, 2);
        assert.strictEqual(res.valid, false);
        // Implementation may return either PICKUP_AFTER_DELIVERY or DELIVERY_BEFORE_PICKUP
        const allowed = ['PICKUP_AFTER_DELIVERY', 'DELIVERY_BEFORE_PICKUP'];
        if (!allowed.includes(res.reason)) {
            throw new Error(`Expected reason to be one of ${JSON.stringify(allowed)} but got ${JSON.stringify(res.reason)}`);
        }
    });

    it('should forbid placing a delivery before its pickup', () => {
        const courier = new Courier('C001', 'John Doe');
        const tour = new Tour(null, '08:00', courier);

        const nodeA = new Node('A', 45.75, 4.85, []);
        const nodeB = new Node('B', 45.76, 4.86, []);

        const start = new TourPoint(nodeA, 0, TypePoint.WAREHOUSE, null);
        const p = new TourPoint(nodeA, 60, TypePoint.PICKUP, null);
        const d = new TourPoint(nodeB, 120, TypePoint.DELIVERY, null);
        const end = new TourPoint(nodeB, 0, TypePoint.WAREHOUSE, null);

        // link the pair
        p.relatedTourPoint = d;
        d.relatedTourPoint = p;

        tour.stops = [start, p, d, end];

        // Try to move delivery before pickup (index 2 -> 1)
        const res = tour.movePoint(2, 1);
        assert.strictEqual(res.valid, false);
        assert.strictEqual(res.reason, 'DELIVERY_BEFORE_PICKUP');
    });

    it('should allow valid moves that respect rules', () => {
        const courier = new Courier('C001', 'John Doe');
        const tour = new Tour(null, '08:00', courier);

        const n1 = new Node('1', 45.75, 4.85, []);
        const n2 = new Node('2', 45.76, 4.86, []);
        const n3 = new Node('3', 45.77, 4.87, []);

        const start = new TourPoint(n1, 0, TypePoint.WAREHOUSE, null);
        const p1 = new TourPoint(n2, 60, TypePoint.PICKUP, null);
        const d1 = new TourPoint(n3, 120, TypePoint.DELIVERY, null);
        const p2 = new TourPoint(n3, 30, TypePoint.PICKUP, null);
        const d2 = new TourPoint(n2, 30, TypePoint.DELIVERY, null);
        const end = new TourPoint(n1, 0, TypePoint.WAREHOUSE, null);

        // link pairs
        p1.relatedTourPoint = d1; d1.relatedTourPoint = p1;
        p2.relatedTourPoint = d2; d2.relatedTourPoint = p2;

        tour.stops = [start, p1, d1, p2, d2, end];

        // Move p2 one position earlier (index 3 -> 2) which results in [start,p1,p2,d1,d2,end]
        const res = tour.movePoint(3, 2);
        assert.strictEqual(res.valid, true);
        // verify new ordering preserves pickup before delivery for both pairs
        const types = tour.stops.map(s => s.type);
        assert.strictEqual(types[1], TypePoint.PICKUP);
        assert.strictEqual(types[2], TypePoint.PICKUP);
        assert.strictEqual(types[3], TypePoint.DELIVERY);
    });

});

module.exports = getResults();
