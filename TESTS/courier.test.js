/**
 * Test Suite for Courier class
 * Tests all functionalities of the Courier class
 */

const Courier = require('../backend/courier.js');
const { describe, it, assert, getResults } = require('./testFramework.js');

// Test Suite: Courier Class
describe('Courier Class - Constructor and Basic Properties', () => {

    it('should create a courier with valid parameters', () => {
        const courier = new Courier('C001', 'John Doe');
        assert.strictEqual(courier.id, 'C001');
        assert.strictEqual(courier.name, 'John Doe');
    });

    it('should create a courier with numeric id', () => {
        const courier = new Courier(123, 'Jane Smith');
        assert.strictEqual(courier.id, 123);
        assert.strictEqual(courier.name, 'Jane Smith');
    });

    it('should create a courier with string id', () => {
        const courier = new Courier('ABC123', 'Bob Wilson');
        assert.strictEqual(courier.id, 'ABC123');
    });

    it('should handle empty name', () => {
        const courier = new Courier('C001', '');
        assert.strictEqual(courier.name, '');
    });

    it('should handle empty string id', () => {
        const courier = new Courier('', 'John Doe');
        assert.strictEqual(courier.id, '');
    });

    it('should handle long names', () => {
        const longName = 'Very Long Courier Name ' + 'Test '.repeat(20);
        const courier = new Courier('C001', longName);
        assert.strictEqual(courier.name, longName);
    });

    it('should handle special characters in name', () => {
        const courier = new Courier('C001', 'Jean-François O\'Connor');
        assert.isTrue(courier.name.includes('Jean-François'));
    });

    it('should handle numbers in id', () => {
        const courier = new Courier(999, 'Test Courier');
        assert.strictEqual(courier.id, 999);
    });
});

describe('Courier Class - toJSON Method', () => {

    it('should return correct JSON representation', () => {
        const courier = new Courier('C001', 'John Doe');
        const json = courier.toJSON();
        assert.strictEqual(json.id, 'C001');
        assert.strictEqual(json.name, 'John Doe');
    });

    it('should include all properties in JSON', () => {
        const courier = new Courier('C001', 'John Doe');
        const json = courier.toJSON();
        const keys = Object.keys(json);
        assert.strictEqual(keys.length, 2);
        assert.isTrue(keys.includes('id'));
        assert.isTrue(keys.includes('name'));
    });

    it('should preserve numeric id in JSON', () => {
        const courier = new Courier(123, 'Jane Smith');
        const json = courier.toJSON();
        assert.strictEqual(json.id, 123);
    });

    it('should handle empty name in JSON', () => {
        const courier = new Courier('C001', '');
        const json = courier.toJSON();
        assert.strictEqual(json.name, '');
    });

    it('should handle empty id in JSON', () => {
        const courier = new Courier('', 'John Doe');
        const json = courier.toJSON();
        assert.strictEqual(json.id, '');
    });
});

describe('Courier Class - toString Method', () => {

    it('should return correct string representation', () => {
        const courier = new Courier('C001', 'John Doe');
        const str = courier.toString();
        assert.isTrue(str.includes('C001'), 'String should contain courier id');
        assert.isTrue(str.includes('John Doe'), 'String should contain courier name');
    });

    it('should format string with Courier prefix', () => {
        const courier = new Courier('C001', 'John Doe');
        const str = courier.toString();
        assert.isTrue(str.startsWith('Courier '), 'String should start with "Courier "');
    });

    it('should include id and name separated', () => {
        const courier = new Courier('C001', 'John Doe');
        const str = courier.toString();
        assert.isTrue(str.includes('C001'));
        assert.isTrue(str.includes('John Doe'));
    });

    it('should handle numeric id in string', () => {
        const courier = new Courier(123, 'Jane Smith');
        const str = courier.toString();
        assert.isTrue(str.includes('123'));
    });

    it('should handle empty name in string', () => {
        const courier = new Courier('C001', '');
        const str = courier.toString();
        assert.isTrue(str.length > 0);
    });

    it('should handle special characters in string', () => {
        const courier = new Courier('C001', 'Jean-François');
        const str = courier.toString();
        assert.isTrue(str.includes('Jean-François'));
    });
});

describe('Courier Class - Edge Cases', () => {

    it('should auto-generate id when null', () => {
        const courier = new Courier(null, 'John Doe');
        assert.isTrue(courier.id.startsWith('C'));
        assert.strictEqual(typeof courier.id, 'string');
    });

    it('should auto-generate id when undefined', () => {
        const courier = new Courier(undefined, 'John Doe');
        assert.isTrue(courier.id.startsWith('C'));
        assert.strictEqual(typeof courier.id, 'string');
    });

    it('should handle null name', () => {
        const courier = new Courier('C001', null);
        assert.strictEqual(courier.name, null);
    });

    it('should handle undefined name', () => {
        const courier = new Courier('C001', undefined);
        assert.strictEqual(courier.name, undefined);
    });

    it('should handle zero as id', () => {
        const courier = new Courier(0, 'John Doe');
        assert.strictEqual(courier.id, 0);
    });

    it('should handle negative number as id', () => {
        const courier = new Courier(-999, 'John Doe');
        assert.strictEqual(courier.id, -999);
    });

    it('should handle very large number as id', () => {
        const courier = new Courier(999999999, 'John Doe');
        assert.strictEqual(courier.id, 999999999);
    });

    it('should handle special characters in id', () => {
        const courier = new Courier('C-001_ABC!@#', 'John Doe');
        assert.strictEqual(courier.id, 'C-001_ABC!@#');
    });

    it('should handle whitespace in name', () => {
        const courier = new Courier('C001', '  John   Doe  ');
        assert.strictEqual(courier.name, '  John   Doe  ');
    });
});

describe('Courier Class - Mutation Tests', () => {

    it('should allow modification of id', () => {
        const courier = new Courier('C001', 'John Doe');
        courier.id = 'C002';
        assert.strictEqual(courier.id, 'C002');
    });

    it('should allow modification of name', () => {
        const courier = new Courier('C001', 'John Doe');
        courier.name = 'Jane Smith';
        assert.strictEqual(courier.name, 'Jane Smith');
    });

    it('should allow changing id from string to number', () => {
        const courier = new Courier('C001', 'John Doe');
        courier.id = 123;
        assert.strictEqual(courier.id, 123);
        assert.strictEqual(typeof courier.id, 'number');
    });

    it('should allow changing id from number to string', () => {
        const courier = new Courier(123, 'John Doe');
        courier.id = 'C001';
        assert.strictEqual(courier.id, 'C001');
        assert.strictEqual(typeof courier.id, 'string');
    });
});

describe('Courier Class - Type Tests', () => {

    it('should accept string type for id', () => {
        const courier = new Courier('C001', 'John Doe');
        assert.strictEqual(typeof courier.id, 'string');
    });

    it('should accept number type for id', () => {
        const courier = new Courier(123, 'John Doe');
        assert.strictEqual(typeof courier.id, 'number');
    });

    it('should accept string type for name', () => {
        const courier = new Courier('C001', 'John Doe');
        assert.strictEqual(typeof courier.name, 'string');
    });
});

describe('Courier Class - Integration Tests', () => {

    it('should create multiple couriers with different ids', () => {
        const courier1 = new Courier('C001', 'John Doe');
        const courier2 = new Courier('C002', 'Jane Smith');
        const courier3 = new Courier('C003', 'Bob Wilson');

        assert.strictEqual(courier1.id, 'C001');
        assert.strictEqual(courier2.id, 'C002');
        assert.strictEqual(courier3.id, 'C003');
    });

    it('should create multiple couriers with same name', () => {
        const courier1 = new Courier('C001', 'John Doe');
        const courier2 = new Courier('C002', 'John Doe');

        assert.strictEqual(courier1.name, courier2.name);
        assert.isTrue(courier1.id !== courier2.id);
    });

    it('should maintain independence between courier instances', () => {
        const courier1 = new Courier('C001', 'John Doe');
        const courier2 = new Courier('C002', 'Jane Smith');

        courier1.name = 'Changed Name';

        assert.strictEqual(courier1.name, 'Changed Name');
        assert.strictEqual(courier2.name, 'Jane Smith');
    });
});

// Export results
module.exports = getResults();

