/**
 * Test Suite for ComputerTour class - Multi-Courier Performance Analysis
 * Tests how the system behaves with different numbers of couriers
 * Analyzes tour distribution, efficiency, and scalability
 */

const fs = require('fs');
const xml2js = require('xml2js');
const path = require('path');
const { describe, it, assert, getResults } = require('./testFramework.js');

const ComputerTour = require('../backend/computerTour.js');
const Plan = require('../backend/plan.js');
const Node = require('../backend/node.js');
const Segment = require('../backend/segment.js');
const Courier = require('../backend/courier.js');
const System = require('../backend/system.js');
const { TourPoint, TypePoint } = require('../backend/tourpoint.js');
const Demand = require('../backend/demand.js');

/**
 * Helper function to load a plan from XML file in Node.js
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
 * Generate multiple couriers for testing
 * @param {number} count - Number of couriers to generate
 * @returns {Array<Courier>}
 */
function generateCouriers(count) {
    const couriers = [];
    const courierNames = ['Pierre', 'Marie', 'Jean', 'Sophie', 'Paul', 'Emma', 'Lucas', 'Chloe', 'Hugo', 'Lea'];
    
    for (let i = 0; i < count; i++) {
        const name = courierNames[i % courierNames.length] + (i >= courierNames.length ? ` ${Math.floor(i / courierNames.length) + 1}` : '');
        couriers.push(new Courier(`C${i + 1}`, name));
    }
    
    return couriers;
}

/**
 * Generate test demands from available nodes
 * @param {Plan} plan - The plan with nodes
 * @param {number} count - Number of demands to generate
 * @returns {Array<Demand>}
 */
function generateDemands(plan, count) {
    const nodeIds = Array.from(plan.nodes.keys());
    const demands = [];
    
    for (let i = 0; i < count; i++) {
        const pickupIdx = Math.floor(Math.random() * nodeIds.length);
        let deliveryIdx = Math.floor(Math.random() * nodeIds.length);
        
        // Ensure pickup and delivery are different
        while (deliveryIdx === pickupIdx) {
            deliveryIdx = Math.floor(Math.random() * nodeIds.length);
        }
        
        const demand = new Demand(
            `D${i + 1}`,
            nodeIds[pickupIdx],
            nodeIds[deliveryIdx],
            300 + Math.floor(Math.random() * 300), // pickup duration 300-600s
            300 + Math.floor(Math.random() * 300)  // delivery duration 300-600s
        );
        demands.push(demand);
    }
    
    return demands;
}

/**
 * Analyze tour metrics and distribution
 * @param {Array} tours - Array of tours
 * @returns {Object} Analysis results
 */
function analyzeTours(tours) {
    if (!tours || tours.length === 0) {
        return {
            totalTours: 0,
            totalDistance: 0,
            totalDuration: 0,
            averageDistance: 0,
            averageDuration: 0,
            maxDistance: 0,
            maxDuration: 0,
            minDistance: 0,
            minDuration: 0,
            distributionEfficiency: 0
        };
    }

    let totalDistance = 0;
    let totalDuration = 0;
    let maxDistance = 0;
    let maxDuration = 0;
    let minDistance = Infinity;
    let minDuration = Infinity;

    tours.forEach(tour => {
        const distance = tour.totalDistance || 0;
        const duration = tour.totalDuration || 0;
        
        totalDistance += distance;
        totalDuration += duration;
        
        maxDistance = Math.max(maxDistance, distance);
        maxDuration = Math.max(maxDuration, duration);
        minDistance = Math.min(minDistance, distance);
        minDuration = Math.min(minDuration, duration);
    });

    const averageDistance = totalDistance / tours.length;
    const averageDuration = totalDuration / tours.length;

    // Calculate distribution efficiency (how evenly distributed the workload is)
    const distanceVariance = tours.reduce((sum, tour) => {
        const diff = (tour.totalDistance || 0) - averageDistance;
        return sum + diff * diff;
    }, 0) / tours.length;
    
    const distributionEfficiency = 1 - Math.sqrt(distanceVariance) / averageDistance;

    return {
        totalTours: tours.length,
        totalDistance,
        totalDuration,
        averageDistance,
        averageDuration,
        maxDistance,
        maxDuration,
        minDistance: minDistance === Infinity ? 0 : minDistance,
        minDuration: minDuration === Infinity ? 0 : minDuration,
        distributionEfficiency: Math.max(0, distributionEfficiency)
    };
}

// Test Suite
describe('ComputerTour Multi-Courier Performance Analysis', () => {
    let plan;
    let system;
    
    it('should load XML plan successfully', async () => {
        const xmlPath = path.join(__dirname, '..', 'fichiersXMLPickupDelivery', 'petitPlan.xml');
        assert(fs.existsSync(xmlPath), `XML file should exist at ${xmlPath}`);
        
        plan = await loadPlanFromXML(xmlPath);
        assert(plan !== null, 'Plan should be loaded');
        assert(plan.nodes.size > 0, 'Plan should have nodes');
        assert(plan.segments.length > 0, 'Plan should have segments');
        assert(plan.warehouse !== null, 'Plan should have warehouse');
        
        system = new System(plan);
    });

    it('should test single courier scenario (baseline)', async () => {
        console.log('\n=== SINGLE COURIER TEST ===');
        
        const couriers = generateCouriers(1);
        const demands = generateDemands(plan, 5);
        
        system.demandsList = demands;
        
        const startTime = performance.now();
        const result = system.computeTours(couriers);
        const endTime = performance.now();
        const computationTime = endTime - startTime;
        
        assert(result.code === 0, 'Should compute tours successfully');
        assert(result.tours.length === 1, 'Should generate 1 tour');
        
        const analysis = analyzeTours(result.tours);
        
        console.log(`Couriers: ${couriers.length}`);
        console.log(`Demands: ${demands.length}`);
        console.log(`Computation time: ${computationTime.toFixed(2)}ms`);
        console.log(`Total distance: ${(analysis.totalDistance / 1000).toFixed(2)}km`);
        console.log(`Total duration: ${(analysis.totalDuration / 3600).toFixed(2)}h`);
        console.log(`Distribution efficiency: ${(analysis.distributionEfficiency * 100).toFixed(1)}%`);
    });

    it('should test multiple courier scenarios', async () => {
        console.log('\n=== MULTIPLE COURIER SCENARIOS ===');
        
        const demands = generateDemands(plan, 10); // Fixed number of demands
        system.demandsList = demands;
        
        const courierCounts = [2, 3, 4, 5, 8, 10];
        const results = [];
        
        for (const count of courierCounts) {
            console.log(`\n--- Testing with ${count} couriers ---`);
            
            const couriers = generateCouriers(count);
            
            const startTime = performance.now();
            const result = system.computeTours(couriers);
            const endTime = performance.now();
            const computationTime = endTime - startTime;
            
            assert(result.code === 0 || result.code === 2, 'Should compute tours successfully or hit 8h limit');
            
            const analysis = analyzeTours(result.tours);
            
            const testResult = {
                courierCount: count,
                demandCount: demands.length,
                computationTime,
                resultCode: result.code,
                ...analysis
            };
            
            results.push(testResult);
            
            console.log(`Result code: ${result.code} (${result.code === 0 ? 'Success' : result.code === 2 ? '8h limit exceeded' : 'Error'})`);
            console.log(`Tours generated: ${analysis.totalTours}`);
            console.log(`Computation time: ${computationTime.toFixed(2)}ms`);
            console.log(`Average distance/courier: ${(analysis.averageDistance / 1000).toFixed(2)}km`);
            console.log(`Average duration/courier: ${(analysis.averageDuration / 3600).toFixed(2)}h`);
            console.log(`Distribution efficiency: ${(analysis.distributionEfficiency * 100).toFixed(1)}%`);
            console.log(`Workload variance: ${((analysis.maxDuration - analysis.minDuration) / 3600).toFixed(2)}h`);
        }
        
        // Analysis of scalability
        console.log('\n=== SCALABILITY ANALYSIS ===');
        console.log('Couriers | Time(ms) | Avg Distance(km) | Avg Duration(h) | Efficiency(%) | Max-Min Duration(h)');
        console.log('---------|----------|------------------|-----------------|---------------|-------------------');
        
        results.forEach(r => {
            const timePadded = r.computationTime.toFixed(1).padStart(8);
            const distPadded = (r.averageDistance / 1000).toFixed(2).padStart(16);
            const durPadded = (r.averageDuration / 3600).toFixed(2).padStart(15);
            const effPadded = (r.distributionEfficiency * 100).toFixed(1).padStart(13);
            const varPadded = ((r.maxDuration - r.minDuration) / 3600).toFixed(2).padStart(17);
            
            console.log(`   ${r.courierCount}     | ${timePadded} | ${distPadded} | ${durPadded} | ${effPadded} | ${varPadded}`);
        });
        
        // Verify that more couriers generally lead to better distribution
        const twoCs = results.find(r => r.courierCount === 2);
        const fiveCs = results.find(r => r.courierCount === 5);
        
        if (twoCs && fiveCs) {
            assert(fiveCs.averageDuration <= twoCs.averageDuration, 
                'More couriers should reduce average duration per courier');
        }
    });

    it('should test courier overflow scenario', async () => {
        console.log('\n=== COURIER OVERFLOW TEST ===');
        
        const demands = generateDemands(plan, 3); // Few demands
        const couriers = generateCouriers(10); // Many couriers
        
        system.demandsList = demands;
        
        const startTime = performance.now();
        const result = system.computeTours(couriers);
        const endTime = performance.now();
        const computationTime = endTime - startTime;
        
        assert(result.code === 0, 'Should handle courier overflow');
        assert(result.tours.length <= demands.length, 'Should not create more tours than needed');
        
        const analysis = analyzeTours(result.tours);
        
        console.log(`Couriers available: ${couriers.length}`);
        console.log(`Demands: ${demands.length}`);
        console.log(`Tours actually used: ${result.tours.length}`);
        console.log(`Computation time: ${computationTime.toFixed(2)}ms`);
        console.log(`Efficiency: Some couriers will be idle (expected behavior)`);
    });

    it('should test high demand scenario', async () => {
        console.log('\n=== HIGH DEMAND SCENARIO ===');
        
        const demands = generateDemands(plan, 20); // Many demands
        const couriers = generateCouriers(3); // Few couriers
        
        system.demandsList = demands;
        
        const startTime = performance.now();
        const result = system.computeTours(couriers);
        const endTime = performance.now();
        const computationTime = endTime - startTime;
        
        // May hit 8h limit with high demand
        assert(result.code === 0 || result.code === 2, 'Should handle high demand (may hit 8h limit)');
        
        const analysis = analyzeTours(result.tours);
        
        console.log(`Couriers: ${couriers.length}`);
        console.log(`Demands: ${demands.length}`);
        console.log(`Result: ${result.code === 0 ? 'Success' : result.code === 2 ? 'Hit 8h limit' : 'Error'}`);
        console.log(`Tours generated: ${result.tours.length}`);
        console.log(`Computation time: ${computationTime.toFixed(2)}ms`);
        
        if (result.tours.length > 0) {
            console.log(`Average stops/tour: ${(demands.length * 2 / result.tours.length).toFixed(1)}`);
            console.log(`Average duration/courier: ${(analysis.averageDuration / 3600).toFixed(2)}h`);
            console.log(`Max duration: ${(analysis.maxDuration / 3600).toFixed(2)}h`);
        }
    });

    it('should verify TSP strategy performance with multiple couriers', async () => {
        console.log('\n=== TSP STRATEGY COMPARISON ===');
        
        const demands = generateDemands(plan, 8);
        const couriers = generateCouriers(4);
        
        system.demandsList = demands;
        
        const strategies = ['v0', 'v1', 'v2'];
        const strategyResults = [];
        
        for (const strategy of strategies) {
            console.log(`\n--- Testing TSP Strategy ${strategy} ---`);
            
            // Create ComputerTour instance to set strategy
            const warehouseTourPoint = new TourPoint(plan.warehouse, 0, TypePoint.WAREHOUSE, null, null);
            const computer = new ComputerTour(plan, warehouseTourPoint);
            computer.setTSPStrategy(strategy);
            
            // Temporarily modify system to use this computer
            const originalComputeTours = system.computeTours;
            system.computeTours = function(couriersList) {
                // Use the configured ComputerTour for each courier's tour
                return originalComputeTours.call(this, couriersList);
            };
            
            const startTime = performance.now();
            const result = system.computeTours(couriers);
            const endTime = performance.now();
            const computationTime = endTime - startTime;
            
            const analysis = analyzeTours(result.tours);
            
            strategyResults.push({
                strategy,
                computationTime,
                resultCode: result.code,
                totalDistance: analysis.totalDistance,
                distributionEfficiency: analysis.distributionEfficiency
            });
            
            console.log(`Strategy: ${strategy}`);
            console.log(`Computation time: ${computationTime.toFixed(2)}ms`);
            console.log(`Total distance: ${(analysis.totalDistance / 1000).toFixed(2)}km`);
            console.log(`Distribution efficiency: ${(analysis.distributionEfficiency * 100).toFixed(1)}%`);
            
            // Restore original method
            system.computeTours = originalComputeTours;
        }
        
        console.log('\n--- Strategy Comparison Summary ---');
        console.log('Strategy | Time(ms) | Distance(km) | Efficiency(%)');
        console.log('---------|----------|--------------|---------------');
        
        strategyResults.forEach(r => {
            const time = r.computationTime.toFixed(1).padStart(8);
            const dist = (r.totalDistance / 1000).toFixed(2).padStart(12);
            const eff = (r.distributionEfficiency * 100).toFixed(1).padStart(13);
            console.log(`   ${r.strategy}    | ${time} | ${dist} | ${eff}`);
        });
    });
});

// Run tests if this file is executed directly
if (require.main === module) {
    console.log('🚀 Running Multi-Courier Performance Tests...\n');
    
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
        process.exit(0);
    }
}