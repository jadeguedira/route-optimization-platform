/**
 * Test Suite for TourPoint class
 * Tests all functionalities of the TourPoint class
 */

const { TourPoint, TypePoint } = require('../backend/tourpoint.js');
const Node = require('../backend/node.js');
const Demand = require('../backend/demand.js');
const { describe, it, assert, getResults } = require('./testFramework.js');

// Test Suite: TourPoint Class
describe('TourPoint Class - Constructor and Basic Properties', () => {

    it('should create a pickup point with valid parameters', () => {
        const node = new Node('123', 45.75, 4.85, []);
        const pickup = new Node('123', 45.75, 4.85, []);
        const delivery = new Node('456', 45.76, 4.86, []);
        const demand = new Demand(pickup, delivery, 300, 240);
        const tourPoint = new TourPoint(node, 300, TypePoint.PICKUP, demand);

        assert.strictEqual(tourPoint.node, node);
        assert.strictEqual(tourPoint.type, TypePoint.PICKUP);
        assert.strictEqual(tourPoint.serviceDuration, 300);
        assert.strictEqual(tourPoint.demand, demand);
    });

    it('should create a delivery point with valid parameters', () => {
        const node = new Node('456', 45.76, 4.86, []);
        const pickup = new Node('123', 45.75, 4.85, []);
        const delivery = new Node('456', 45.76, 4.86, []);
        const demand = new Demand(pickup, delivery, 300, 240);
        const tourPoint = new TourPoint(node, 240, TypePoint.DELIVERY, demand);

        assert.strictEqual(tourPoint.node.id, '456');
        assert.strictEqual(tourPoint.type, TypePoint.DELIVERY);
        assert.strictEqual(tourPoint.serviceDuration, 240);
    });

    it('should create a warehouse point without demand', () => {
        const node = new Node('000', 45.75, 4.85, []);
        const tourPoint = new TourPoint(node, 0, TypePoint.WAREHOUSE, null);

        assert.strictEqual(tourPoint.node.id, '000');
        assert.strictEqual(tourPoint.type, TypePoint.WAREHOUSE);
        assert.strictEqual(tourPoint.serviceDuration, 0);
        assert.strictEqual(tourPoint.demand, null);
    });

    it('should use default demand of null', () => {
        const node = new Node('123', 45.75, 4.85, []);
        const tourPoint = new TourPoint(node, 0, TypePoint.WAREHOUSE);

        assert.strictEqual(tourPoint.demand, null);
    });

    it('should handle zero service duration', () => {
        const node = new Node('123', 45.75, 4.85, []);
        const tourPoint = new TourPoint(node, 0, TypePoint.PICKUP, null);

        assert.strictEqual(tourPoint.serviceDuration, 0);
    });

    it('should handle large service duration', () => {
        const node = new Node('123', 45.75, 4.85, []);
        const tourPoint = new TourPoint(node, 9999, TypePoint.PICKUP, null);

        assert.strictEqual(tourPoint.serviceDuration, 9999);
    });
});

describe('TourPoint Class - TypePoint Enum', () => {

    it('should have PICKUP type defined', () => {
        assert.strictEqual(TypePoint.PICKUP, 'PICKUP');
    });

    it('should have DELIVERY type defined', () => {
        assert.strictEqual(TypePoint.DELIVERY, 'DELIVERY');
    });

    it('should have WAREHOUSE type defined', () => {
        assert.strictEqual(TypePoint.WAREHOUSE, 'WAREHOUSE');
    });

    it('should create tour point with each type', () => {
        const node = new Node('123', 45.75, 4.85, []);
        
        const pickup = new TourPoint(node, 300, TypePoint.PICKUP, null);
        assert.strictEqual(pickup.type, 'PICKUP');

        const delivery = new TourPoint(node, 240, TypePoint.DELIVERY, null);
        assert.strictEqual(delivery.type, 'DELIVERY');

        const warehouse = new TourPoint(node, 0, TypePoint.WAREHOUSE, null);
        assert.strictEqual(warehouse.type, 'WAREHOUSE');
    });
});

describe('TourPoint Class - toJSON Method', () => {

    it('should return correct JSON representation with all properties', () => {
        const node = new Node('123', 45.75, 4.85, []);
        const pickup = new Node('123', 45.75, 4.85, []);
        const delivery = new Node('456', 45.76, 4.86, []);
        const demand = new Demand(pickup, delivery, 300, 240);
        const tourPoint = new TourPoint(node, 300, TypePoint.PICKUP, demand);

        const json = tourPoint.toJSON();
        assert.strictEqual(json.node.id, '123');
        assert.strictEqual(json.node.latitude, 45.75);
        assert.strictEqual(json.node.longitude, 4.85);
        assert.strictEqual(json.type, TypePoint.PICKUP);
        assert.strictEqual(json.serviceDuration, 300);
        assert.isTrue(json.demand !== null);
    });

    it('should serialize coordinates correctly in JSON', () => {
        const node = new Node('123', 45.75, 4.85, []);
        const tourPoint = new TourPoint(node, 300, TypePoint.PICKUP, null);

        const json = tourPoint.toJSON();
        assert.strictEqual(json.node.id, '123');
        assert.strictEqual(json.node.latitude, 45.75);
        assert.strictEqual(json.node.longitude, 4.85);
    });

    it('should serialize demand correctly in JSON', () => {
        const node = new Node('123', 45.75, 4.85, []);
        const pickup = new Node('123', 45.75, 4.85, []);
        const delivery = new Node('456', 45.76, 4.86, []);
        const demand = new Demand(pickup, delivery, 300, 240, 'D1');
        const tourPoint = new TourPoint(node, 300, TypePoint.PICKUP, demand);

        const json = tourPoint.toJSON();
        assert.strictEqual(json.demand.pickupAddress, '123');
        assert.strictEqual(json.demand.deliveryAddress, '456');
    });

    it('should handle null demand in JSON', () => {
        const node = new Node('123', 45.75, 4.85, []);
        const tourPoint = new TourPoint(node, 0, TypePoint.WAREHOUSE, null);

        const json = tourPoint.toJSON();
        assert.strictEqual(json.demand, null);
    });
});

describe('TourPoint Class - toString Method', () => {

    it('should return correct string representation', () => {
        const node = new Node('123', 45.75, 4.85, []);
        const tourPoint = new TourPoint(node, 300, TypePoint.PICKUP, null);

        const str = tourPoint.toString();
        assert.isTrue(str.includes('TourPoint'));
        assert.isTrue(str.includes('PICKUP'));
        assert.isTrue(str.includes('123'));
        assert.isTrue(str.includes('300'));
    });

    it('should format string with TourPoint prefix', () => {
        const node = new Node('123', 45.75, 4.85, []);
        const tourPoint = new TourPoint(node, 300, TypePoint.PICKUP, null);

        const str = tourPoint.toString();
        assert.isTrue(str.startsWith('TourPoint'));
    });

    it('should include type in string', () => {
        const node = new Node('123', 45.75, 4.85, []);
        
        const pickup = new TourPoint(node, 300, TypePoint.PICKUP, null);
        assert.isTrue(pickup.toString().includes('PICKUP'));

        const delivery = new TourPoint(node, 240, TypePoint.DELIVERY, null);
        assert.isTrue(delivery.toString().includes('DELIVERY'));

        const warehouse = new TourPoint(node, 0, TypePoint.WAREHOUSE, null);
        assert.isTrue(warehouse.toString().includes('WAREHOUSE'));
    });

    it('should include service duration with seconds unit', () => {
        const node = new Node('123', 45.75, 4.85, []);
        const tourPoint = new TourPoint(node, 300, TypePoint.PICKUP, null);

        const str = tourPoint.toString();
        assert.isTrue(str.includes('300s'));
    });

});

describe('TourPoint Class - Edge Cases', () => {

    it('should handle negative service duration', () => {
        const node = new Node('123', 45.75, 4.85, []);
        const tourPoint = new TourPoint(node, -100, TypePoint.PICKUP, null);
        assert.strictEqual(tourPoint.serviceDuration, -100);
    });

    it('should handle decimal service duration', () => {
        const node = new Node('123', 45.75, 4.85, []);
        const tourPoint = new TourPoint(node, 123.456, TypePoint.PICKUP, null);
        assert.strictEqual(tourPoint.serviceDuration, 123.456);
    });

    it('should handle NaN service duration', () => {
        const node = new Node('123', 45.75, 4.85, []);
        const tourPoint = new TourPoint(node, NaN, TypePoint.PICKUP, null);
        assert.isTrue(isNaN(tourPoint.serviceDuration));
    });

    it('should handle Infinity service duration', () => {
        const node = new Node('123', 45.75, 4.85, []);
        const tourPoint = new TourPoint(node, Infinity, TypePoint.PICKUP, null);
        assert.strictEqual(tourPoint.serviceDuration, Infinity);
    });

    it('should handle invalid type string', () => {
        const node = new Node('123', 45.75, 4.85, []);
        const tourPoint = new TourPoint(node, 300, 'INVALID_TYPE', null);
        assert.strictEqual(tourPoint.type, 'INVALID_TYPE');
    });
});

describe('TourPoint Class - Mutation Tests', () => {

    it('should allow modification of type', () => {
        const node = new Node('123', 45.75, 4.85, []);
        const tourPoint = new TourPoint(node, 300, TypePoint.PICKUP, null);

        tourPoint.type = TypePoint.DELIVERY;
        assert.strictEqual(tourPoint.type, TypePoint.DELIVERY);
    });

    it('should allow modification of service duration', () => {
        const node = new Node('123', 45.75, 4.85, []);
        const tourPoint = new TourPoint(node, 300, TypePoint.PICKUP, null);

        tourPoint.serviceDuration = 600;
        assert.strictEqual(tourPoint.serviceDuration, 600);
    });

    it('should allow modification of demand', () => {
        const node = new Node('123', 45.75, 4.85, []);
        const pickup = new Node('123', 45.75, 4.85, []);
        const delivery = new Node('456', 45.76, 4.86, []);
        const demand = new Demand(pickup, delivery, 300, 240);
        const tourPoint = new TourPoint(node, 300, TypePoint.PICKUP, null);

        tourPoint.demand = demand;
        assert.strictEqual(tourPoint.demand, demand);
    });
});

// Export results
module.exports = getResults();

