/**
 * Test Suite for Demand class
 * Tests all functionalities of the Demand class
 */

const Demand = require('../backend/demand.js');
const Node = require('../backend/node.js');
const { describe, it, assert, getResults } = require('./testFramework.js');

// Test Suite: Demand Class
describe('Demand Class - Constructor and Basic Properties', () => {

    it('should create a demand with valid parameters', () => {
        const pickup = new Node('pickup1', 45.75, 4.85, []);
        const delivery = new Node('delivery1', 45.76, 4.86, []);
        const demand = new Demand(pickup, delivery, 300, 240);
        assert.strictEqual(demand.pickupAddress, pickup);
        assert.strictEqual(demand.deliveryAddress, delivery);
        assert.strictEqual(demand.pickupDuration, 300);
        assert.strictEqual(demand.deliveryDuration, 240);
    });

    it('should create a demand with numeric addresses', () => {
        const pickup = new Node(123, 45.75, 4.85, []);
        const delivery = new Node(456, 45.76, 4.86, []);
        const demand = new Demand(pickup, delivery, 300, 240);
        assert.strictEqual(demand.pickupAddress, pickup);
        assert.strictEqual(demand.deliveryAddress, delivery);
    });

    it('should handle zero durations', () => {
        const pickup = new Node('p1', 45.75, 4.85, []);
        const delivery = new Node('d1', 45.76, 4.86, []);
        const demand = new Demand(pickup, delivery, 0, 0);
        assert.strictEqual(demand.pickupDuration, 0);
        assert.strictEqual(demand.deliveryDuration, 0);
    });

    it('should handle very large durations', () => {
        const pickup = new Node('p1', 45.75, 4.85, []);
        const delivery = new Node('d1', 45.76, 4.86, []);
        const demand = new Demand(pickup, delivery, 999999, 999999);
        assert.strictEqual(demand.pickupDuration, 999999);
        assert.strictEqual(demand.deliveryDuration, 999999);
    });

    it('should handle decimal durations', () => {
        const pickup = new Node('p1', 45.75, 4.85, []);
        const delivery = new Node('d1', 45.76, 4.86, []);
        const demand = new Demand(pickup, delivery, 123.456, 789.012);
        assert.strictEqual(demand.pickupDuration, 123.456);
        assert.strictEqual(demand.deliveryDuration, 789.012);
    });

    it('should handle negative durations', () => {
        const pickup = new Node('p1', 45.75, 4.85, []);
        const delivery = new Node('d1', 45.76, 4.86, []);
        const demand = new Demand(pickup, delivery, -100, -200);
        assert.strictEqual(demand.pickupDuration, -100);
        assert.strictEqual(demand.deliveryDuration, -200);
    });

    it('should handle same address for pickup and delivery', () => {
        const addr = new Node('addr1', 45.75, 4.85, []);
        const demand = new Demand(addr, addr, 300, 240);
        assert.strictEqual(demand.pickupAddress, demand.deliveryAddress);
    });

    it('should handle empty string addresses', () => {
        const pickup = new Node('', 45.75, 4.85, []);
        const delivery = new Node('', 45.76, 4.86, []);
        const demand = new Demand(pickup, delivery, 300, 240);
        assert.strictEqual(demand.pickupAddress.id, '');
        assert.strictEqual(demand.deliveryAddress.id, '');
    });
});

describe('Demand Class - Address Validation', () => {

    it('should accept string addresses', () => {
        const pickup = new Node('node123', 45.75, 4.85, []);
        const delivery = new Node('node456', 45.76, 4.86, []);
        const demand = new Demand(pickup, delivery, 300, 240);
        assert.strictEqual(typeof demand.pickupAddress.id, 'string');
        assert.strictEqual(typeof demand.deliveryAddress.id, 'string');
    });

    it('should accept numeric addresses', () => {
        const pickup = new Node(25175791, 45.75, 4.85, []);
        const delivery = new Node(2129259178, 45.76, 4.86, []);
        const demand = new Demand(pickup, delivery, 300, 240);
        assert.strictEqual(typeof demand.pickupAddress.id, 'number');
        assert.strictEqual(typeof demand.deliveryAddress.id, 'number');
    });

    it('should handle mixed address types', () => {
        const pickup = new Node('node1', 45.75, 4.85, []);
        const delivery = new Node(123, 45.76, 4.86, []);
        const demand = new Demand(pickup, delivery, 300, 240);
        assert.strictEqual(typeof demand.pickupAddress.id, 'string');
        assert.strictEqual(typeof demand.deliveryAddress.id, 'number');
    });

    it('should handle null addresses', () => {
        const demand = new Demand(null, null, 300, 240);
        assert.strictEqual(demand.pickupAddress, null);
        assert.strictEqual(demand.deliveryAddress, null);
    });

    it('should handle undefined addresses', () => {
        const demand = new Demand(undefined, undefined, 300, 240);
        assert.strictEqual(demand.pickupAddress, undefined);
        assert.strictEqual(demand.deliveryAddress, undefined);
    });

    it('should handle special characters in addresses', () => {
        const pickup = new Node('node-123_A', 45.75, 4.85, []);
        const delivery = new Node('node-456_B', 45.76, 4.86, []);
        const demand = new Demand(pickup, delivery, 300, 240);
        assert.isTrue(demand.pickupAddress.id.includes('-'));
        assert.isTrue(demand.pickupAddress.id.includes('_'));
    });

    it('should handle very long address strings', () => {
        const longAddr = 'node' + '1'.repeat(1000);
        const pickup = new Node(longAddr, 45.75, 4.85, []);
        const delivery = new Node(longAddr, 45.76, 4.86, []);
        const demand = new Demand(pickup, delivery, 300, 240);
        assert.strictEqual(demand.pickupAddress.id, longAddr);
    });
});

describe('Demand Class - Duration Validation', () => {

    it('should handle typical pickup duration (300s = 5min)', () => {
        const pickup = new Node('p1', 45.75, 4.85, []);
        const delivery = new Node('d1', 45.76, 4.86, []);
        const demand = new Demand(pickup, delivery, 300, 240);
        assert.strictEqual(demand.pickupDuration, 300);
    });

    it('should handle typical delivery duration (240s = 4min)', () => {
        const pickup = new Node('p1', 45.75, 4.85, []);
        const delivery = new Node('d1', 45.76, 4.86, []);
        const demand = new Demand(pickup, delivery, 300, 240);
        assert.strictEqual(demand.deliveryDuration, 240);
    });

    it('should handle equal durations', () => {
        const pickup = new Node('p1', 45.75, 4.85, []);
        const delivery = new Node('d1', 45.76, 4.86, []);
        const demand = new Demand(pickup, delivery, 300, 300);
        assert.strictEqual(demand.pickupDuration, demand.deliveryDuration);
    });

    it('should handle very different durations', () => {
        const pickup = new Node('p1', 45.75, 4.85, []);
        const delivery = new Node('d1', 45.76, 4.86, []);
        const demand = new Demand(pickup, delivery, 60, 3600);
        assert.strictEqual(demand.pickupDuration, 60);
        assert.strictEqual(demand.deliveryDuration, 3600);
    });

    it('should handle NaN durations', () => {
        const pickup = new Node('p1', 45.75, 4.85, []);
        const delivery = new Node('d1', 45.76, 4.86, []);
        const demand = new Demand(pickup, delivery, NaN, NaN);
        assert.isTrue(isNaN(demand.pickupDuration));
        assert.isTrue(isNaN(demand.deliveryDuration));
    });

    it('should handle Infinity durations', () => {
        const pickup = new Node('p1', 45.75, 4.85, []);
        const delivery = new Node('d1', 45.76, 4.86, []);
        const demand = new Demand(pickup, delivery, Infinity, -Infinity);
        assert.strictEqual(demand.pickupDuration, Infinity);
        assert.strictEqual(demand.deliveryDuration, -Infinity);
    });

    it('should handle string durations (no type checking)', () => {
        const pickup = new Node('p1', 45.75, 4.85, []);
        const delivery = new Node('d1', 45.76, 4.86, []);
        const demand = new Demand(pickup, delivery, '300', '240');
        assert.strictEqual(demand.pickupDuration, '300');
        assert.strictEqual(demand.deliveryDuration, '240');
    });
});

describe('Demand Class - toJSON Method', () => {

    it('should return correct JSON representation', () => {
        const pickup = new Node('pickup1', 45.75, 4.85, []);
        const delivery = new Node('delivery1', 45.76, 4.86, []);
        const demand = new Demand(pickup, delivery, 300, 240);
        const json = demand.toJSON();
        assert.strictEqual(json.pickupAddress, 'pickup1');
        assert.strictEqual(json.deliveryAddress, 'delivery1');
        assert.strictEqual(json.pickupDuration, 300);
        assert.strictEqual(json.deliveryDuration, 240);
    });

    it('should include all properties in JSON', () => {
        const pickup = new Node('p1', 45.75, 4.85, []);
        const delivery = new Node('d1', 45.76, 4.86, []);
        const demand = new Demand(pickup, delivery, 300, 240);
        const json = demand.toJSON();
        const keys = Object.keys(json);
        assert.strictEqual(keys.length, 5);
        assert.isTrue(keys.includes('pickupAddress'));
        assert.isTrue(keys.includes('deliveryAddress'));
        assert.isTrue(keys.includes('pickupDuration'));
        assert.isTrue(keys.includes('deliveryDuration'));
    });

    it('should preserve numeric addresses in JSON', () => {
        const pickup = new Node(123, 45.75, 4.85, []);
        const delivery = new Node(456, 45.76, 4.86, []);
        const demand = new Demand(pickup, delivery, 300, 240);
        const json = demand.toJSON();
        assert.strictEqual(json.pickupAddress, 123);
        assert.strictEqual(json.deliveryAddress, 456);
    });

    it('should handle null values in JSON', () => {
        const demand = new Demand(null, null, 0, 0);
        const json = demand.toJSON();
        assert.strictEqual(json.pickupAddress, null);
        assert.strictEqual(json.deliveryAddress, null);
    });
});

describe('Demand Class - toString Method', () => {

    it('should return correct string representation', () => {
        const pickup = new Node('pickup1', 45.75, 4.85, []);
        const delivery = new Node('delivery1', 45.76, 4.86, []);
        const demand = new Demand(pickup, delivery, 300, 240);
        const str = demand.toString();
        assert.isTrue(str.includes('pickup1'), 'String should contain pickup address');
        assert.isTrue(str.includes('delivery1'), 'String should contain delivery address');
        assert.isTrue(str.includes('300'), 'String should contain pickup duration');
        assert.isTrue(str.includes('240'), 'String should contain delivery duration');
    });

    it('should format string with Demand prefix', () => {
        const pickup = new Node('p1', 45.75, 4.85, []);
        const delivery = new Node('d1', 45.76, 4.86, []);
        const demand = new Demand(pickup, delivery, 300, 240);
        const str = demand.toString();
        assert.isTrue(str.startsWith('Demand'), 'String should start with "Demand"');
    });

    it('should include "Pickup" and "Delivery" keywords', () => {
        const pickup = new Node('p1', 45.75, 4.85, []);
        const delivery = new Node('d1', 45.76, 4.86, []);
        const demand = new Demand(pickup, delivery, 300, 240);
        const str = demand.toString();
        assert.isTrue(str.includes('Pickup'), 'String should contain "Pickup"');
        assert.isTrue(str.includes('Delivery'), 'String should contain "Delivery"');
    });

    it('should include duration in seconds (s)', () => {
        const pickup = new Node('p1', 45.75, 4.85, []);
        const delivery = new Node('d1', 45.76, 4.86, []);
        const demand = new Demand(pickup, delivery, 300, 240);
        const str = demand.toString();
        assert.isTrue(str.includes('s)'), 'String should show seconds unit');
    });
});

describe('Demand Class - Mutation Tests', () => {

    it('should allow modification of pickup address', () => {
        const pickup1 = new Node('p1', 45.75, 4.85, []);
        const pickup2 = new Node('p2', 45.76, 4.86, []);
        const delivery = new Node('d1', 45.77, 4.87, []);
        const demand = new Demand(pickup1, delivery, 300, 240);
        demand.pickupAddress = pickup2;
        assert.strictEqual(demand.pickupAddress, pickup2);
    });

    it('should allow modification of delivery address', () => {
        const pickup = new Node('p1', 45.75, 4.85, []);
        const delivery1 = new Node('d1', 45.76, 4.86, []);
        const delivery2 = new Node('d2', 45.77, 4.87, []);
        const demand = new Demand(pickup, delivery1, 300, 240);
        demand.deliveryAddress = delivery2;
        assert.strictEqual(demand.deliveryAddress, delivery2);
    });

    it('should allow modification of pickup duration', () => {
        const pickup = new Node('p1', 45.75, 4.85, []);
        const delivery = new Node('d1', 45.76, 4.86, []);
        const demand = new Demand(pickup, delivery, 300, 240);
        demand.pickupDuration = 600;
        assert.strictEqual(demand.pickupDuration, 600);
    });

    it('should allow modification of delivery duration', () => {
        const pickup = new Node('p1', 45.75, 4.85, []);
        const delivery = new Node('d1', 45.76, 4.86, []);
        const demand = new Demand(pickup, delivery, 300, 240);
        demand.deliveryDuration = 480;
        assert.strictEqual(demand.deliveryDuration, 480);
    });
});

// Export results
module.exports = getResults();

