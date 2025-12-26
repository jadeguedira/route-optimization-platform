 /**
 * Main Test Runner
 * Executes all test suites and provides a summary
 */

console.log('╔═══════════════════════════════════════════════════════════╗');
console.log('║           AGILE PROJECT - TEST SUITE RUNNER               ║');
console.log('╚═══════════════════════════════════════════════════════════╝\n');

// Track overall results
const overallResults = {
    suites: [],
    totalTests: 0,
    totalPassed: 0,
    totalFailed: 0
};

/**
 * Run a test file and collect results
 * @param {string} testFile - Path to the test file
 * @param {string} suiteName - Name of the test suite
 */
function runTestSuite(testFile, suiteName) {
    console.log(`\n🚀 Running ${suiteName}...`);
    try {
        const results = require(testFile);
        overallResults.suites.push({
            name: suiteName,
            results: results
        });
        overallResults.totalTests += results.total;
        overallResults.totalPassed += results.passed;
        overallResults.totalFailed += results.failed;
    } catch (error) {
        console.error(`❌ Error running ${suiteName}:`, error.message);
    }
}

// Run all test suites
runTestSuite('./node.test.js', 'Node Class Tests');
runTestSuite('./segment.test.js', 'Segment Class Tests');
runTestSuite('./demand.test.js', 'Demand Class Tests');
runTestSuite('./tourpoint.test.js', 'TourPoint Class Tests');
runTestSuite('./courier.test.js', 'Courier Class Tests');
runTestSuite('./plan.test.js', 'Plan Class Tests');
runTestSuite('./leg.test.js', 'Leg Class Tests');
runTestSuite('./tour.test.js', 'Tour Class Tests');
runTestSuite('./tours_move.test.js', 'Tour Move Tests');
runTestSuite('./computerTour.test.js', 'ComputerTour computeCompleteTour Tests');
runTestSuite('./computerTour_algorithms.test.js', 'ComputerTour Algorithms Tests');
runTestSuite('./system_core.test.js', 'System Core Tests');
runTestSuite('./testSystem.js', 'System Extended Tests');

// Print overall summary
console.log('\n\n╔═══════════════════════════════════════════════════════════╗');
console.log('║                   OVERALL TEST SUMMARY                   ║');
console.log('╚═══════════════════════════════════════════════════════════╝\n');

console.log(`📊 Total Test Suites: ${overallResults.suites.length}`);
console.log(`📋 Total Tests:       ${overallResults.totalTests}`);
console.log(`✅ Total Passed:      ${overallResults.totalPassed}`);
console.log(`❌ Total Failed:      ${overallResults.totalFailed}`);

if (overallResults.totalTests > 0) {
    const successRate = (overallResults.totalPassed / overallResults.totalTests * 100).toFixed(2);
    console.log(`📈 Success Rate:      ${successRate}%`);
}

console.log('\n' + '─'.repeat(60));
console.log('Test Suite Results by Module:');
console.log('─'.repeat(60));

overallResults.suites.forEach(suite => {
    const rate = suite.results.total > 0
        ? (suite.results.passed / suite.results.total * 100).toFixed(1)
        : 0;
    const status = suite.results.failed === 0 ? '✅' : '⚠️';
    console.log(`${status} ${suite.name.padEnd(25)} ${suite.results.passed}/${suite.results.total} (${rate}%)`);
});

console.log('─'.repeat(60));

// Final verdict
if (overallResults.totalFailed === 0) {
    console.log('\n🎉 SUCCESS! All tests passed!');
    process.exit(0);
} else {
    console.log(`\n⚠️  WARNING! ${overallResults.totalFailed} test(s) failed. Please review the errors above.`);
    process.exit(1);
}
