/**
 * Test Suite for System.computeTours with different pathfinding algorithms
 * Compares Dijkstra vs A* performance in complete tour computation scenarios
 * Analyzes computation time, tour quality, and scalability
 */

const fs = require('fs');
const xml2js = require('xml2js');
const path = require('path');
const { describe, it, assert, getResults } = require('./testFramework.js');

const System = require('../backend/system.js');
const Plan = require('../backend/plan.js');
const Node = require('../backend/node.js');
const Segment = require('../backend/segment.js');
const Courier = require('../backend/courier.js');
const Demand = require('../backend/demand.js');
const ComputerTour = require('../backend/computerTour.js');

/**
 * Helper function to load demands from XML file
 * @param {string} xmlPath - Path to the XML file
 * @returns {Promise<Array<Demand>>}
 */
async function loadDemandsFromXML(xmlPath) {
    const xmlContent = await fs.promises.readFile(xmlPath, 'utf-8');
    const json = await xml2js.parseStringPromise(xmlContent);
    
    const demandesLivraison = json.demandesLivraison;
    if (!demandesLivraison || !demandesLivraison.demande) {
        throw new Error('Invalid demands XML structure');
    }
    
    const demands = [];
    for (const demandeData of demandesLivraison.demande) {
        const attrs = demandeData.$;
        const demand = new Demand(
            attrs.adresseEnlevement,
            attrs.adresseLivraison,
            parseInt(attrs.dureeEnlevement),
            parseInt(attrs.dureeLivraison)
        );
        demands.push(demand);
    }
    
    return demands;
}

/**
 * Helper function to load a plan from XML file
 * @param {string} xmlPath - Path to the XML file
 * @returns {Promise<Plan>}
 */
async function loadPlanFromXML(xmlPath) {
    const xmlContent = await fs.promises.readFile(xmlPath, 'utf-8');
    const json = await xml2js.parseStringPromise(xmlContent);
    
    const reseau = json.reseau;
    if (!reseau || !reseau.noeud || !reseau.troncon) {
        throw new Error('Invalid XML structure');
    }
    
    // Create nodes
    const nodes = new Map();
    for (const noeudData of reseau.noeud) {
        const attrs = noeudData.$;
        const node = new Node(
            attrs.id,
            parseFloat(attrs.latitude),
            parseFloat(attrs.longitude),
            []
        );
        nodes.set(attrs.id, node);
    }
    
    // Create segments
    const segments = [];
    for (const tronconData of reseau.troncon) {
        const attrs = tronconData.$;
        const originNode = nodes.get(attrs.origine);
        const destNode = nodes.get(attrs.destination);
        
        if (originNode && destNode) {
            const segment = new Segment(
                originNode,
                destNode,
                parseFloat(attrs.longueur),
                attrs.nomRue || 'Unknown'
            );
            segments.push(segment);
        }
    }
    
    const plan = new Plan(nodes, segments);
    
    // Set warehouse to first node
    const firstNodeId = Array.from(nodes.keys())[0];
    plan.warehouse = nodes.get(firstNodeId);
    
    return plan;
}

/**
 * Create couriers for testing
 * @param {number} count - Number of couriers to create
 * @returns {Array<Courier>}
 */
function createTestCouriers(count) {
    const couriers = [];
    for (let i = 1; i <= count; i++) {
        couriers.push(new Courier(`COURIER_${i.toString().padStart(3, '0')}`, `Test Courier ${i}`));
    }
    return couriers;
}

/**
 * Generate random demands for testing
 * @param {Plan} plan - The plan with nodes
 * @param {number} demandCount - Number of demands to generate
 * @returns {Array<Demand>}
 */
function generateRandomDemands(plan, demandCount) {
    const nodeIds = Array.from(plan.nodes.keys());
    const demands = [];
    
    for (let i = 0; i < demandCount; i++) {
        // Select random pickup and delivery nodes (different)
        const pickupIdx = Math.floor(Math.random() * nodeIds.length);
        let deliveryIdx = Math.floor(Math.random() * nodeIds.length);
        
        while (deliveryIdx === pickupIdx) {
            deliveryIdx = Math.floor(Math.random() * nodeIds.length);
        }
        
        const demand = new Demand(
            nodeIds[pickupIdx],
            nodeIds[deliveryIdx],
            300, // 5 minutes pickup
            420  // 7 minutes delivery
        );
        demands.push(demand);
    }
    
    return demands;
}

/**
 * Analyze tour results for comparison
 * @param {Object} tourResult - Result from computeTours
 * @returns {Object} Analysis metrics
 */
function analyzeTourResults(tourResult) {
    if (!tourResult || !tourResult.tours) {
        return {
            success: false,
            totalTours: 0,
            totalDistance: 0,
            totalDuration: 0,
            averageDistance: 0,
            averageDuration: 0,
            maxDuration: 0,
            minDuration: 0
        };
    }
    
    const tours = tourResult.tours;
    let totalDistance = 0;
    let totalDuration = 0;
    let maxDuration = 0;
    let minDuration = Infinity;
    
    for (const tour of tours) {
        totalDistance += tour.totalDistance;
        totalDuration += tour.totalDuration;
        maxDuration = Math.max(maxDuration, tour.totalDuration);
        minDuration = Math.min(minDuration, tour.totalDuration);
    }
    
    return {
        success: true,
        totalTours: tours.length,
        totalDistance: totalDistance,
        totalDuration: totalDuration,
        averageDistance: tours.length > 0 ? totalDistance / tours.length : 0,
        averageDuration: tours.length > 0 ? totalDuration / tours.length : 0,
        maxDuration: maxDuration,
        minDuration: minDuration === Infinity ? 0 : minDuration
    };
}

// Test Suite
describe('System.computeTours Algorithm Performance Comparison', () => {
    let plan;
    let demands;
    let couriers;
    let system;
    
    it('should load XML files successfully', async () => {
        const planPath = path.join(__dirname, '..', 'fichiersXMLPickupDelivery', 'petitPlan.xml');
        const demandsPath = path.join(__dirname, '..', 'fichiersXMLPickupDelivery', 'demandePetit1.xml');
        
        assert(fs.existsSync(planPath), `Plan XML should exist at ${planPath}`);
        assert(fs.existsSync(demandsPath), `Demands XML should exist at ${demandsPath}`);
        
        plan = await loadPlanFromXML(planPath);
        demands = await loadDemandsFromXML(demandsPath);
        
        assert(plan !== null, 'Plan should be loaded');
        assert(plan.nodes.size > 0, 'Plan should have nodes');
        assert(demands.length > 0, 'Should have demands');
        
        console.log(`\nLoaded plan: ${plan.nodes.size} nodes, ${plan.segments.length} segments`);
        console.log(`Loaded demands: ${demands.length} pickup-delivery pairs`);
        
        // Create test couriers
        couriers = createTestCouriers(3);
        system = new System();
        
        console.log(`Created ${couriers.length} test couriers`);
    });

    it('should compare Dijkstra vs A* with small dataset', async () => {
        console.log('\n=== SMALL DATASET COMPARISON ===');
        
        const testDemands = demands.slice(0, Math.min(5, demands.length));
        const testCouriers = couriers.slice(0, 2);
        
        console.log(`Testing with ${testDemands.length} demands and ${testCouriers.length} couriers`);
        
        // Test with Dijkstra
        console.log('\n--- Testing with Dijkstra algorithm ---');
        system.setPathfindingAlgorithm('dijkstra');
        
        const dijkstraStart = performance.now();
        const dijkstraResult = system.computeTours(plan, testDemands, testCouriers);
        const dijkstraTime = performance.now() - dijkstraStart;
        
        const dijkstraAnalysis = analyzeTourResults(dijkstraResult);
        
        console.log(`✅ Dijkstra result: Code ${dijkstraResult.code}`);
        console.log(`📊 Tours: ${dijkstraAnalysis.totalTours}, Total distance: ${(dijkstraAnalysis.totalDistance/1000).toFixed(2)}km`);
        console.log(`⏱️  Computation time: ${dijkstraTime.toFixed(2)}ms`);
        
        // Test with A*
        console.log('\n--- Testing with A* algorithm ---');
        system.setPathfindingAlgorithm('astar');
        
        const astarStart = performance.now();
        const astarResult = system.computeTours(plan, testDemands, testCouriers);
        const astarTime = performance.now() - astarStart;
        
        const astarAnalysis = analyzeTourResults(astarResult);
        
        console.log(`✅ A* result: Code ${astarResult.code}`);
        console.log(`📊 Tours: ${astarAnalysis.totalTours}, Total distance: ${(astarAnalysis.totalDistance/1000).toFixed(2)}km`);
        console.log(`⏱️  Computation time: ${astarTime.toFixed(2)}ms`);
        
        // Compare results
        console.log('\n--- COMPARISON RESULTS ---');
        console.log(`Return codes: Dijkstra=${dijkstraResult.code}, A*=${astarResult.code}`);
        
        if (dijkstraAnalysis.success && astarAnalysis.success) {
            const distanceDiff = Math.abs(dijkstraAnalysis.totalDistance - astarAnalysis.totalDistance);
            const durationDiff = Math.abs(dijkstraAnalysis.totalDuration - astarAnalysis.totalDuration);
            
            console.log(`Distance difference: ${distanceDiff.toFixed(2)}m (${(distanceDiff/dijkstraAnalysis.totalDistance*100).toFixed(3)}%)`);
            console.log(`Duration difference: ${durationDiff.toFixed(2)}s (${(durationDiff/dijkstraAnalysis.totalDuration*100).toFixed(3)}%)`);
            console.log(`Speed: ${astarTime < dijkstraTime ? 'A*' : 'Dijkstra'} was ${(Math.max(astarTime, dijkstraTime) / Math.min(astarTime, dijkstraTime)).toFixed(2)}x faster`);
            
            // Tours should be very similar (small differences due to TSP heuristics)
            assert(distanceDiff < dijkstraAnalysis.totalDistance * 0.01, 'Distance difference should be < 1%');
        }
        
        // Both should succeed
        assert(dijkstraResult.code !== null, 'Dijkstra should return valid code');
        assert(astarResult.code !== null, 'A* should return valid code');
    });

    it('should stress test with large random dataset', async () => {
        console.log('\n=== LARGE DATASET STRESS TEST ===');
        
        const largeDemands = generateRandomDemands(plan, 15);
        const largeCouriers = createTestCouriers(4);
        
        console.log(`Stress testing with ${largeDemands.length} demands and ${largeCouriers.length} couriers`);
        
        // Stress test Dijkstra
        console.log('\n🔥 Stress testing Dijkstra...');
        system.setPathfindingAlgorithm('dijkstra');
        
        const stressDijkstraStart = performance.now();
        const stressDijkstraResult = system.computeTours(plan, largeDemands, largeCouriers);
        const stressDijkstraTime = performance.now() - stressDijkstraStart;
        
        const stressDijkstraAnalysis = analyzeTourResults(stressDijkstraResult);
        
        // Stress test A*
        console.log('🔥 Stress testing A*...');
        system.setPathfindingAlgorithm('astar');
        
        const stressAstarStart = performance.now();
        const stressAstarResult = system.computeTours(plan, largeDemands, largeCouriers);
        const stressAstarTime = performance.now() - stressAstarStart;
        
        const stressAstarAnalysis = analyzeTourResults(stressAstarResult);
        
        // Display stress test results
        console.log('\n--- STRESS TEST RESULTS ---');
        console.log(`Dataset: ${largeDemands.length} demands, ${largeCouriers.length} couriers`);
        console.log(`Graph: ${plan.nodes.size} nodes, ${plan.segments.length} edges`);
        console.log('');
        console.log('Algorithm | Time(ms) | Code | Tours | Total Dist(km) | Avg Dist(km) | Max Duration(min)');
        console.log('----------|----------|------|-------|----------------|--------------|------------------');
        
        const dijTours = stressDijkstraAnalysis.totalTours;
        const dijDist = (stressDijkstraAnalysis.totalDistance / 1000).toFixed(2);
        const dijAvgDist = (stressDijkstraAnalysis.averageDistance / 1000).toFixed(2);
        const dijMaxDur = (stressDijkstraAnalysis.maxDuration / 60).toFixed(1);
        
        const astarTours = stressAstarAnalysis.totalTours;
        const astarDist = (stressAstarAnalysis.totalDistance / 1000).toFixed(2);
        const astarAvgDist = (stressAstarAnalysis.averageDistance / 1000).toFixed(2);
        const astarMaxDur = (stressAstarAnalysis.maxDuration / 60).toFixed(1);
        
        console.log(`Dijkstra  | ${stressDijkstraTime.toFixed(1).padStart(8)} | ${stressDijkstraResult.code.toString().padStart(4)} | ${dijTours.toString().padStart(5)} | ${dijDist.padStart(14)} | ${dijAvgDist.padStart(12)} | ${dijMaxDur.padStart(16)}`);
        console.log(`A*        | ${stressAstarTime.toFixed(1).padStart(8)} | ${stressAstarResult.code.toString().padStart(4)} | ${astarTours.toString().padStart(5)} | ${astarDist.padStart(14)} | ${astarAvgDist.padStart(12)} | ${astarMaxDur.padStart(16)}`);
        
        // Performance analysis
        const speedupRatio = stressDijkstraTime / stressAstarTime;
        console.log(`\n🏆 Performance: ${speedupRatio > 1 ? 'A*' : 'Dijkstra'} was ${Math.max(speedupRatio, 1/speedupRatio).toFixed(2)}x faster`);
        
        if (speedupRatio > 1) {
            console.log(`💡 A* achieved ${((speedupRatio - 1) * 100).toFixed(1)}% performance improvement`);
        } else {
            console.log(`💡 Dijkstra achieved ${((1/speedupRatio - 1) * 100).toFixed(1)}% performance improvement`);
        }
        
        // Quality analysis
        if (stressDijkstraAnalysis.success && stressAstarAnalysis.success && 
            stressDijkstraResult.code === stressAstarResult.code) {
            const qualityDiff = Math.abs(stressDijkstraAnalysis.totalDistance - stressAstarAnalysis.totalDistance);
            console.log(`📏 Solution quality difference: ${qualityDiff.toFixed(2)}m (${(qualityDiff/stressDijkstraAnalysis.totalDistance*100).toFixed(3)}%)`);
        }
        
        // Assertions
        assert(stressDijkstraResult.code >= 0, 'Dijkstra should handle stress test');
        assert(stressAstarResult.code >= 0, 'A* should handle stress test');
    });

    it('should test scalability with increasing demands', async () => {
        console.log('\n=== SCALABILITY TEST ===');
        
        const testSizes = [5, 10, 15];
        const testCouriers = createTestCouriers(3);
        
        console.log('Testing scalability with increasing demand counts...');
        console.log('\nDemands | Algorithm | Time(ms) | Tours | Avg Time per Demand(ms)');
        console.log('--------|-----------|----------|-------|------------------------');
        
        for (const demandCount of testSizes) {
            const testDemands = generateRandomDemands(plan, demandCount);
            
            // Test Dijkstra
            system.setPathfindingAlgorithm('dijkstra');
            const dijStart = performance.now();
            const dijResult = system.computeTours(plan, testDemands, testCouriers);
            const dijTime = performance.now() - dijStart;
            
            const dijAnalysis = analyzeTourResults(dijResult);
            const dijTimePerDemand = dijTime / demandCount;
            
            // Test A*
            system.setPathfindingAlgorithm('astar');
            const astarStart = performance.now();
            const astarResult = system.computeTours(plan, testDemands, testCouriers);
            const astarTime = performance.now() - astarStart;
            
            const astarAnalysis = analyzeTourResults(astarResult);
            const astarTimePerDemand = astarTime / demandCount;
            
            console.log(`${demandCount.toString().padStart(7)} | Dijkstra  | ${dijTime.toFixed(1).padStart(8)} | ${dijAnalysis.totalTours.toString().padStart(5)} | ${dijTimePerDemand.toFixed(2).padStart(22)}`);
            console.log(`${demandCount.toString().padStart(7)} | A*        | ${astarTime.toFixed(1).padStart(8)} | ${astarAnalysis.totalTours.toString().padStart(5)} | ${astarTimePerDemand.toFixed(2).padStart(22)}`);
        }
        
        console.log('\n📈 Scalability analysis complete');
        console.log('💡 Lower "Time per Demand" indicates better scalability');
    });

    it('should test with different TSP strategies', async () => {
        console.log('\n=== TSP STRATEGY COMPARISON ===');
        
        const testDemands = generateRandomDemands(plan, 8);
        const testCouriers = createTestCouriers(2);
        const strategies = ['v0', 'v1', 'v2'];
        
        console.log(`Testing TSP strategies with ${testDemands.length} demands and ${testCouriers.length} couriers`);
        console.log('\nStrategy | Algorithm | Time(ms) | Tours | Total Dist(km) | Success Rate');
        console.log('---------|-----------|----------|-------|----------------|-------------');
        
        for (const strategy of strategies) {
            system.setTSPStrategy(strategy);
            
            // Test with Dijkstra
            system.setPathfindingAlgorithm('dijkstra');
            const dijStart = performance.now();
            const dijResult = system.computeTours(plan, testDemands, testCouriers);
            const dijTime = performance.now() - dijStart;
            const dijAnalysis = analyzeTourResults(dijResult);
            
            // Test with A*
            system.setPathfindingAlgorithm('astar');
            const astarStart = performance.now();
            const astarResult = system.computeTours(plan, testDemands, testCouriers);
            const astarTime = performance.now() - astarStart;
            const astarAnalysis = analyzeTourResults(astarResult);
            
            const dijSuccessRate = dijResult.code === 0 ? '100%' : dijResult.code === 1 ? 'Partial' : 'Failed';
            const astarSuccessRate = astarResult.code === 0 ? '100%' : astarResult.code === 1 ? 'Partial' : 'Failed';
            
            console.log(`${strategy.padStart(8)} | Dijkstra  | ${dijTime.toFixed(1).padStart(8)} | ${dijAnalysis.totalTours.toString().padStart(5)} | ${(dijAnalysis.totalDistance/1000).toFixed(2).padStart(14)} | ${dijSuccessRate.padStart(11)}`);
            console.log(`${strategy.padStart(8)} | A*        | ${astarTime.toFixed(1).padStart(8)} | ${astarAnalysis.totalTours.toString().padStart(5)} | ${(astarAnalysis.totalDistance/1000).toFixed(2).padStart(14)} | ${astarSuccessRate.padStart(11)}`);
        }
        
        console.log('\n📋 Strategy explanation:');
        console.log('• v0: Rigid pickup→delivery order');
        console.log('• v1: Flexible - all pickups first');
        console.log('• v2: Nearest neighbor with precedence');
    });
});

// Run tests if this file is executed directly
if (require.main === module) {
    console.log('🚀 Running System.computeTours Algorithm Comparison Tests...\n');
    
    // Run all tests
    const results = getResults();
    
    console.log('\n📊 FINAL TEST RESULTS 📊');
    console.log('='.repeat(50));
    console.log(`✅ Passed: ${results.passed}`);
    console.log(`❌ Failed: ${results.failed}`);
    console.log(`📈 Total: ${results.total}`);
    
    if (results.failed > 0) {
        console.log('\n❌ Some tests failed. Check the output above for details.');
        process.exit(1);
    } else {
        console.log('\n🎉 All tests passed successfully!');
        console.log('\n📝 KEY FINDINGS:');
        console.log('• System.computeTours performance comparison between algorithms');
        console.log('• End-to-end tour computation with clustering and optimization');
        console.log('• Real-world scenario testing with multiple couriers and demands');
        console.log('• TSP strategy impact on different pathfinding algorithms');
        console.log('• Scalability analysis for production readiness');
        process.exit(0);
    }
}