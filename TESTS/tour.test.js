/**
 * Test Suite for Tour class
 * Tests all functionalities of the Tour class
 */

const Tour = require('../backend/tours.js');
const Leg = require('../backend/leg.js');
const Courier = require('../backend/courier.js');
const { TourPoint, TypePoint } = require('../backend/tourpoint.js');
const Node = require('../backend/node.js');
const Demand = require('../backend/demand.js');
const Segment = require('../backend/segment.js');
const { describe, it, assert, getResults } = require('./testFramework.js');

// Test Suite: Tour Class
describe('Tour Class - Constructor and Basic Properties', () => {

    it('should create a tour with valid parameters', () => {
        const courier = new Courier('C001', 'John Doe');
        const tour = new Tour(null, '08:00', courier);

        assert.strictEqual(tour.departureTime, '08:00');
        assert.strictEqual(tour.courier, courier);
        assert.strictEqual(tour.stops.length, 0);
        assert.strictEqual(tour.legs.length, 0);
        assert.strictEqual(tour.totalDuration, 0);
        assert.strictEqual(tour.totalDistance, 0);
    });

    it('should initialize with empty stops list', () => {
        const courier = new Courier('C001', 'John Doe');
        const tour = new Tour(null, '08:00', courier);

        assert.isTrue(Array.isArray(tour.stops));
        assert.strictEqual(tour.stops.length, 0);
    });

    it('should initialize with empty legs list', () => {
        const courier = new Courier('C001', 'John Doe');
        const tour = new Tour(null, '08:00', courier);

        assert.isTrue(Array.isArray(tour.legs));
        assert.strictEqual(tour.legs.length, 0);
    });

    it('should handle different time formats', () => {
        const courier = new Courier('C001', 'John Doe');

        const tour1 = new Tour(null, '08:00', courier);
        assert.strictEqual(tour1.departureTime, '08:00');

        const tour2 = new Tour(null, '14:30', courier);
        assert.strictEqual(tour2.departureTime, '14:30');

        const tour3 = new Tour(null, '23:59', courier);
        assert.strictEqual(tour3.departureTime, '23:59');
    });

    it('should handle null courier', () => {
        const tour = new Tour(null, '08:00', null);
        assert.strictEqual(tour.courier, null);
        assert.strictEqual(tour.departureTime, '08:00');
        assert.isTrue(tour.id.includes('UNKNOWN'));
    });
});

describe('Tour Class - addStop Method', () => {

    it('should add a stop to the tour', () => {
        const courier = new Courier('C001', 'John Doe');
        const tour = new Tour(null, '08:00', courier);

        const node = new Node('1', 45.75, 4.85, []);
        const pickup = new Node('1', 45.75, 4.85, []);
        const delivery = new Node('2', 45.76, 4.86, []);
        const demand = new Demand(pickup, delivery, 300, 240);
        const tourPoint = new TourPoint(node, 300, TypePoint.PICKUP, demand);

        tour.addStop(tourPoint);

        assert.strictEqual(tour.stops.length, 1);
    });

    it('should add multiple stops to the tour', () => {
        const courier = new Courier('C001', 'John Doe');
        const tour = new Tour(null, '08:00', courier);

        const node1 = new Node('1', 45.75, 4.85, []);
        const node2 = new Node('2', 45.76, 4.86, []);
        const pickup = new Node('1', 45.75, 4.85, []);
        const delivery = new Node('2', 45.76, 4.86, []);
        const demand = new Demand(pickup, delivery, 300, 240);

        const pickupPoint = new TourPoint(node1, 300, TypePoint.PICKUP, demand);
        const deliveryPoint = new TourPoint(node2, 240, TypePoint.DELIVERY, demand);

        tour.addStop(pickupPoint);
        tour.addStop(deliveryPoint);

        assert.strictEqual(tour.stops.length, 2);
    });

    it('should store tour points correctly', () => {
        const courier = new Courier('C001', 'John Doe');
        const tour = new Tour(null, '08:00', courier);

        const node = new Node('1', 45.75, 4.85, []);
        const pickup = new Node('1', 45.75, 4.85, []);
        const delivery = new Node('2', 45.76, 4.86, []);
        const demand = new Demand(pickup, delivery, 300, 240);
        const tourPoint = new TourPoint(node, 300, TypePoint.PICKUP, demand);

        tour.addStop(tourPoint);

        assert.strictEqual(tour.stops[0], tourPoint);
    });
});

describe('Tour Class - calculateTimeDifference Method', () => {

    it('should calculate difference between two times', () => {
        const courier = new Courier('C001', 'John Doe');
        const tour = new Tour(null, '08:00', courier);

        const diff = tour.calculateTimeDifference('08:00', '09:00');
        assert.strictEqual(diff, 60);
    });

    it('should calculate difference for same time', () => {
        const courier = new Courier('C001', 'John Doe');
        const tour = new Tour(null, '08:00', courier);

        const diff = tour.calculateTimeDifference('08:00', '08:00');
        assert.strictEqual(diff, 0);
    });

    it('should calculate difference with minutes', () => {
        const courier = new Courier('C001', 'John Doe');
        const tour = new Tour(null, '08:00', courier);

        const diff = tour.calculateTimeDifference('08:15', '08:45');
        assert.strictEqual(diff, 30);
    });

    it('should return absolute difference', () => {
        const courier = new Courier('C001', 'John Doe');
        const tour = new Tour(null, '08:00', courier);

        const diff1 = tour.calculateTimeDifference('08:00', '09:00');
        const diff2 = tour.calculateTimeDifference('09:00', '08:00');
        assert.strictEqual(diff1, diff2);
    });

    it('should handle times crossing hours', () => {
        const courier = new Courier('C001', 'John Doe');
        const tour = new Tour(null, '08:00', courier);

        const diff = tour.calculateTimeDifference('08:50', '09:10');
        assert.strictEqual(diff, 20);
    });

    it('should handle multi-hour differences', () => {
        const courier = new Courier('C001', 'John Doe');
        const tour = new Tour(null, '08:00', courier);

        const diff = tour.calculateTimeDifference('08:00', '12:30');
        assert.strictEqual(diff, 270);
    });
});

describe('Tour Class - calculateTotalDuration Method', () => {

    it('should return 0 for tour with no stops', () => {
        const courier = new Courier('C001', 'John Doe');
        const tour = new Tour(null, '08:00', courier);

        const duration = tour.calculateTotalDuration();
        assert.strictEqual(duration, 0);
    });

    it('should calculate duration from legs and stops', () => {
        const courier = new Courier('C001', 'John Doe');
        const tour = new Tour(null, '08:00', courier);

        const node1 = new Node('1', 45.75, 4.85, []);
        const node2 = new Node('2', 45.76, 4.86, []);

        const pickup = new Node('1', 45.75, 4.85, []);
        const delivery = new Node('2', 45.76, 4.86, []);
        const demand = new Demand(pickup, delivery, 300, 240);

        const pickupPoint = new TourPoint(node1, 300, TypePoint.PICKUP, demand);
        const deliveryPoint = new TourPoint(node2, 240, TypePoint.DELIVERY, demand);

        tour.addStop(pickupPoint);
        tour.addStop(deliveryPoint);

        const leg = new Leg(pickupPoint, deliveryPoint, [node1, node2], [], 150, 60);
        tour.addLeg(leg);

        const duration = tour.calculateTotalDuration();
        assert.strictEqual(duration, 600); // 300 + 240 + 60
    });

    it('should update totalDuration property', () => {
        const courier = new Courier('C001', 'John Doe');
        const tour = new Tour(null, '08:00', courier);

        const node = new Node('1', 45.75, 4.85, []);
        const tourPoint = new TourPoint(node, 300, TypePoint.PICKUP, null);

        tour.addStop(tourPoint);
        tour.calculateTotalDuration();

        assert.strictEqual(tour.totalDuration, 300);
    });
});

describe('Tour Class - calculateTotalDistance Method', () => {

    it('should return 0 for tour with empty legs', () => {
        const courier = new Courier('C001', 'John Doe');
        const tour = new Tour(null, '08:00', courier);

        const distance = tour.calculateTotalDistance();
        assert.strictEqual(distance, 0);
    });

    it('should calculate distance from legs', () => {
        const courier = new Courier('C001', 'John Doe');
        const tour = new Tour(null, '08:00', courier);

        const node1 = new Node('1', 45.75, 4.85, []);
        const node2 = new Node('2', 45.76, 4.86, []);

        const tourPoint1 = new TourPoint(node1, 0, TypePoint.WAREHOUSE, null);
        const tourPoint2 = new TourPoint(node2, 300, TypePoint.PICKUP, null);

        const leg = new Leg(tourPoint1, tourPoint2, [node1, node2], [], 150, 60);
        tour.addLeg(leg);

        const distance = tour.calculateTotalDistance();
        assert.strictEqual(distance, 150);
    });

    it('should sum all leg distances', () => {
        const courier = new Courier('C001', 'John Doe');
        const tour = new Tour(null, '08:00', courier);

        const node1 = new Node('1', 45.75, 4.85, []);
        const node2 = new Node('2', 45.76, 4.86, []);
        const node3 = new Node('3', 45.77, 4.87, []);

        const tourPoint1 = new TourPoint(node1, 0, TypePoint.WAREHOUSE, null);
        const tourPoint2 = new TourPoint(node2, 300, TypePoint.PICKUP, null);
        const tourPoint3 = new TourPoint(node3, 240, TypePoint.DELIVERY, null);

        const leg1 = new Leg(tourPoint1, tourPoint2, [node1, node2], [], 150, 60);
        const leg2 = new Leg(tourPoint2, tourPoint3, [node2, node3], [], 200, 80);

        tour.addLeg(leg1);
        tour.addLeg(leg2);

        const distance = tour.calculateTotalDistance();
        assert.strictEqual(distance, 350);
    });
});

describe('Tour Class - toJSON Method', () => {

    it('should return correct JSON representation', () => {
        const courier = new Courier('C001', 'John Doe');
        const tour = new Tour(null, '08:00', courier);

        const json = tour.toJSON();

        assert.strictEqual(json.departureTime, '08:00');
        assert.isTrue(json.courier !== null);
        assert.isTrue(Array.isArray(json.stops));
        assert.isTrue(Array.isArray(json.legs));
        assert.strictEqual(json.totalDuration, 0);
        assert.strictEqual(json.totalDistance, 0);
    });

    it('should include all tour properties in JSON', () => {
        const courier = new Courier('C001', 'John Doe');
        const tour = new Tour(null, '08:00', courier);

        const json = tour.toJSON();
        const keys = Object.keys(json);

        assert.isTrue(keys.includes('id'));
        assert.isTrue(keys.includes('departureTime'));
        assert.isTrue(keys.includes('courier'));
        assert.isTrue(keys.includes('stops'));
        assert.isTrue(keys.includes('legs'));
        assert.isTrue(keys.includes('totalDuration'));
        assert.isTrue(keys.includes('totalDistance'));
    });
});

describe('Tour Class - toString Method', () => {

    it('should return correct string representation', () => {
        const courier = new Courier('C001', 'John Doe');
        const tour = new Tour(null, '08:00', courier);

        const str = tour.toString();

        assert.isTrue(str.includes('Tour'));
        assert.isTrue(str.includes('08:00'));
        assert.isTrue(str.includes('John Doe'));
    });

    it('should include departure time in string', () => {
        const courier = new Courier('C001', 'John Doe');
        const tour = new Tour(null, '14:30', courier);

        const str = tour.toString();
        assert.isTrue(str.includes('14:30'));
    });

    it('should include number of stops', () => {
        const courier = new Courier('C001', 'John Doe');
        const tour = new Tour(null, '08:00', courier);

        const node = new Node('1', 45.75, 4.85, []);
        const tourPoint = new TourPoint(node, 300, TypePoint.PICKUP, null);
        tour.addStop(tourPoint);

        const str = tour.toString();
        assert.isTrue(str.includes('1'));
    });

    it('should handle null courier in string', () => {
        const tour = new Tour(null, '08:00', null);
        const str = tour.toString();

        assert.isTrue(str.includes('Unassigned'));
    });
});

describe('Tour Class - toXML Method', () => {

    it('should generate XML with header', () => {
        const courier = new Courier('C001', 'John Doe');
        const tour = new Tour(null, '08:00', courier);

        const xml = tour.toXML();

        assert.isTrue(xml.includes('<?xml version="1.0"'));
        assert.isTrue(xml.includes('<reseau>'));
        assert.isTrue(xml.includes('</reseau>'));
    });

    it('should include nodes in XML', () => {
        const courier = new Courier('C001', 'John Doe');
        const tour = new Tour(null, '08:00', courier);

        const node = new Node('123', 45.75, 4.85, []);
        const tourPoint = new TourPoint(node, 0, TypePoint.WAREHOUSE, null);

        const leg = new Leg(tourPoint, tourPoint, [node], [], 0, 0);
        tour.addLeg(leg);

        const xml = tour.toXML();

        assert.isTrue(xml.includes('<noeud'));
        assert.isTrue(xml.includes('id="123"'));
        assert.isTrue(xml.includes('latitude="45.75"'));
        assert.isTrue(xml.includes('longitude="4.85"'));
    });

    it('should include segments in XML', () => {
        const courier = new Courier('C001', 'John Doe');
        const tour = new Tour(null, '08:00', courier);

        const node1 = new Node('1', 45.75, 4.85, []);
        const node2 = new Node('2', 45.76, 4.86, []);
        const segment = new Segment(node1, node2, 'Main Street', 150);

        node1.segments = [segment];

        const tourPoint1 = new TourPoint(node1, 0, TypePoint.WAREHOUSE, null);
        const tourPoint2 = new TourPoint(node2, 0, TypePoint.PICKUP, null);

        const leg = new Leg(tourPoint1, tourPoint2, [node1, node2], [segment], 150, 60);
        tour.addLeg(leg);

        const xml = tour.toXML();

        assert.isTrue(xml.includes('<troncon'));
        assert.isTrue(xml.includes('origine="1"'));
        assert.isTrue(xml.includes('destination="2"'));
    });

    it('should generate valid XML structure for empty legs', () => {
        const courier = new Courier('C001', 'John Doe');
        const tour = new Tour(null, '08:00', courier);

        const xml = tour.toXML();

        assert.isTrue(xml.includes('<?xml'));
        assert.isTrue(xml.includes('<reseau>'));
        assert.isTrue(xml.includes('</reseau>'));
    });
});

describe('Tour Class - Edge Cases', () => {

    it('should handle tour with only warehouse point', () => {
        const courier = new Courier('C001', 'John Doe');
        const tour = new Tour(null, '08:00', courier);

        const node = new Node('W', 45.75, 4.85, []);
        const warehousePoint = new TourPoint(node, 0, TypePoint.WAREHOUSE, null);

        tour.addStop(warehousePoint);

        assert.strictEqual(tour.stops.length, 1);
    });

    it('should handle very early departure time', () => {
        const courier = new Courier('C001', 'John Doe');
        const tour = new Tour(null, '00:00', courier);

        assert.strictEqual(tour.departureTime, '00:00');
    });

    it('should handle very late departure time', () => {
        const courier = new Courier('C001', 'John Doe');
        const tour = new Tour(null, '23:59', courier);

        assert.strictEqual(tour.departureTime, '23:59');
    });

    it('should handle tour with many points', () => {
        const courier = new Courier('C001', 'John Doe');
        const tour = new Tour(null, '08:00', courier);

        for (let i = 0; i < 100; i++) {
            const node = new Node(String(i), 45.75, 4.85, []);
            const tourPoint = new TourPoint(node, 300, TypePoint.PICKUP, null);
            tour.addStop(tourPoint);
        }

        assert.strictEqual(tour.stops.length, 100);
    });

    it('should handle null departure time', () => {
        const courier = new Courier('C001', 'John Doe');
        const tour = new Tour(null, null, courier);

        assert.strictEqual(tour.departureTime, null);
        assert.strictEqual(tour.courier, courier);
    });

    it('should handle undefined courier', () => {
        const tour = new Tour(null, '08:00', undefined);

        assert.strictEqual(tour.courier, undefined);
    });
});

// Export results
module.exports = getResults();

