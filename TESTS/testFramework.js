/**
 * A simple test framework to be used by test files.
 * It provides `describe` and `it` functions to structure tests,
 * and an `assert` object for making assertions.
 * Each test file that uses this framework should export the results
 * by calling `getResults()` at the end.
 */

let passed = 0;
let failed = 0;

/**
 * Groups tests into a suite.
 * @param {string} name - The name of the test suite.
 * @param {function} fn - The function that contains the tests.
 */
function describe(name, fn) {
    console.log(`\n--- ${name} ---`);
    fn();
}

/**
 * Defines a single test case.
 * @param {string} name - The name of the test case.
 * @param {function} fn - The function that contains the test logic.
 */
function it(name, fn) {
    try {
        fn();
        console.log(`  ✓ ${name}`);
        passed++;
    } catch (error) {
        console.error(`  ✗ ${name}`);
        // Indent error message for better readability
        const errorMessage = error.stack.split('\n').map(line => `    ${line}`).join('\n');
        console.error(errorMessage);
        failed++;
    }
}

/**
 * Assertion utilities to check for expected outcomes.
 */
const assert = {
    /**
     * Checks for strict equality (===).
     * @param {*} actual - The actual value.
     * @param {*} expected - The expected value.
     * @param {string} [message] - Optional failure message.
     */
    strictEqual: (actual, expected, message) => {
        if (actual !== expected) {
            throw new Error(message || `Expected ${JSON.stringify(expected)} but got ${JSON.stringify(actual)}`);
        }
    },

    /**
     * Checks if a value is true.
     * @param {*} value - The value to check.
     * @param {string} [message] - Optional failure message.
     */
    isTrue: (value, message) => {
        if (value !== true) {
            throw new Error(message || `Expected true but got ${value}`);
        }
    },

    /**
     * Checks if a value is false.
     * @param {*} value - The value to check.
     * @param {string} [message] - Optional failure message.
     */
    isFalse: (value, message) => {
        if (value !== false) {
            throw new Error(message || `Expected false but got ${value}`);
        }
    },

    /**
     * Performs a deep equality check.
     * @param {object} actual - The actual object.
     * @param {object} expected - The expected object.
     * @param {string} [message] - Optional failure message.
     */
    deepStrictEqual: (actual, expected, message) => {
        try {
            // Using Node's built-in assert for reliable deep equality
            require('assert').deepStrictEqual(actual, expected);
        } catch (error) {
            // Re-throw with a more informative message if provided
            throw new Error(message || error.message);
        }
    },

    /**
     * Checks if a function throws an error.
     * @param {function} fn - The function to execute.
     * @param {string} [message] - Optional failure message.
     */
    throws: (fn, message) => {
        try {
            fn();
            throw new Error(message || 'Expected function to throw an error, but it did not.');
        } catch (error) {
            // If the function threw, the test passes for this assertion
        }
    }
};

/**
 * Returns the test results and resets the counters.
 * This should be called and exported by each test file.
 * @returns {{total: number, passed: number, failed: number}}
 */
function getResults() {
    const results = {
        total: passed + failed,
        passed: passed,
        failed: failed,
    };
    // Reset for the next suite
    passed = 0;
    failed = 0;
    return results;
}

module.exports = {
    describe,
    it,
    assert,
    getResults,
};

