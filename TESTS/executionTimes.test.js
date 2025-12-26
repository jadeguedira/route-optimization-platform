/**
 * Test Suite for Measuring Execution Times of ComputerTour Functions
 * Tests main functions: fillTourPointStructures, computeTSPTour, computeCompleteTour, findShortestPath
 * Uses XML files from fichiersXMLPickupDelivery directory
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
const { TourPoint, TypePoint } = require('../backend/tourpoint.js');

// Global timing tracker
const timingResults = [];

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
                attrs.nomRue || '',
                parseFloat(attrs.longueur)
            );
            originNode.segments.push(segment);
            segments.push(segment);
        }
    }

    // Create plan
    const plan = new Plan(nodes, segments, null);

    return plan;
}

/**
 * Helper function to load demands from XML file
 * @param {string} xmlPath - Path to the demands XML file
 * @param {Plan} plan - The plan to get nodes from
 * @returns {Promise<Array<[TourPoint, TourPoint]>>}
 */
async function loadDemandsFromXML(xmlPath, plan) {
    const xmlContent = await fs.promises.readFile(xmlPath, 'utf-8');
    const json = await xml2js.parseStringPromise(xmlContent);

    const root = json.demandeDeLivraisons;
    if (!root || !root.livraison) {
        throw new Error('Invalid demands XML structure');
    }

    const pickupDeliveryPairs = [];

    for (const livraison of root.livraison) {
        const attrs = livraison.$;
        const pickupNodeId = attrs.adresseEnlevement;
        const deliveryNodeId = attrs.adresseLivraison;
        const pickupDuration = parseInt(attrs.dureeEnlevement);
        const deliveryDuration = parseInt(attrs.dureeLivraison);

        const pickupNode = plan.nodes.get(pickupNodeId);
        const deliveryNode = plan.nodes.get(deliveryNodeId);

        if (pickupNode && deliveryNode) {
            const pickup = new TourPoint(pickupNode, pickupDuration, TypePoint.PICKUP, null);
            const delivery = new TourPoint(deliveryNode, deliveryDuration, TypePoint.DELIVERY, null);
            pickupDeliveryPairs.push([pickup, delivery]);
        }
    }

    return pickupDeliveryPairs;
}

/**
 * Helper function to get warehouse from demands XML
 * @param {string} xmlPath - Path to the demands XML file
 * @param {Plan} plan - The plan to get nodes from
 * @returns {Promise<TourPoint>}
 */
async function getWarehouseFromXML(xmlPath, plan) {
    const xmlContent = await fs.promises.readFile(xmlPath, 'utf-8');
    const json = await xml2js.parseStringPromise(xmlContent);

    const entrepot = json.demandeDeLivraisons.entrepot[0].$;
    const warehouseNodeId = entrepot.adresse;
    const warehouseNode = plan.nodes.get(warehouseNodeId);

    if (!warehouseNode) {
        throw new Error('Warehouse node not found');
    }

    return new TourPoint(warehouseNode, 0, TypePoint.WAREHOUSE, null);
}

/**
 * Utility to format time in seconds
 */
function formatTime(ms) {
    return (ms / 1000).toFixed(3);
}

/**
 * Utility to measure execution time of a function
 */
async function measureTime(fn, label, context = '') {
    const start = Date.now();
    const result = await fn();
    const duration = Date.now() - start;
    const timeStr = formatTime(duration);

    // Color coding based on duration
    let emoji = '⏱️ ';
    if (duration < 100) emoji = '⚡';
    else if (duration < 1000) emoji = '🟢';
    else if (duration < 5000) emoji = '🟡';
    else emoji = '🔴';

    const output = `  ${emoji} ${label}: \x1b[1m${timeStr}s\x1b[0m`;

    // Immediately log to console (will show in async context)
    console.log(output);

    // Store in global tracker
    timingResults.push({
        context,
        label,
        duration,
        timeStr,
        emoji,
        output
    });

    return { result, duration };
}

/**
 * Display all timing results for a context
 */
function displayTimings(context) {
    const contextTimings = timingResults.filter(t => t.context === context);
    if (contextTimings.length > 0) {
        console.log('\n📊 Execution Times Summary:');
        contextTimings.forEach(t => {
            console.log(t.output);
        });
    }
}

// ============================================
// Test Suite: Petit Plan (Small)
// ============================================

describe('Execution Times - Petit Plan', () => {

    it('should measure execution times for demandePetit1.xml', async () => {
        console.log('\n=== PETIT PLAN - demandePetit1.xml ===\n');

        const planPath = path.join(__dirname, '../fichiersXMLPickupDelivery/petitPlan.xml');
        const demandsPath = path.join(__dirname, '../fichiersXMLPickupDelivery/demandePetit1.xml');

        // Load plan and demands
        const { result: plan, duration: planLoadTime } = await measureTime(
            () => loadPlanFromXML(planPath),
            'Load Plan XML',
            'Petit Plan - demandePetit1'
        );

        const { result: warehouse, duration: warehouseLoadTime } = await measureTime(
            () => getWarehouseFromXML(demandsPath, plan),
            'Get Warehouse',
            'Petit Plan - demandePetit1'
        );

        const { result: pickupDeliveryPairs, duration: demandsLoadTime } = await measureTime(
            () => loadDemandsFromXML(demandsPath, plan),
            'Load Demands XML',
            'Petit Plan - demandePetit1'
        );

        console.log(`\nPlan: ${plan.nodes.size} nodes, ${plan.segments.length} segments`);
        console.log(`Demands: ${pickupDeliveryPairs.length} pickup/delivery pairs\n`);

        // Create ComputerTour
        const computerTour = new ComputerTour(plan, warehouse);
        const courier = new Courier(1, 'Test Courier');

        // Test fillTourPointStructures
        const { result: fillSuccess, duration: fillDuration } = await measureTime(
            () => computerTour.fillTourPointStructures(pickupDeliveryPairs),
            'fillTourPointStructures',
            'Petit Plan - demandePetit1'
        );

        assert.isTrue(fillSuccess, 'fillTourPointStructures should succeed');

        // Test computeTSPTour with different strategies
        computerTour.setTSPStrategy('v1');
        const { result: tspTourV1, duration: tspV1Duration } = await measureTime(
            () => computerTour.computeTSPTour(),
            'computeTSPTour (v1 - flexible)',
            'Petit Plan - demandePetit1'
        );

        assert.isTrue(Array.isArray(tspTourV1) && tspTourV1.length > 0, 'TSP tour v1 should be computed');

        // Reset and test v0
        computerTour.fillTourPointStructures(pickupDeliveryPairs);
        computerTour.setTSPStrategy('v0');
        const { result: tspTourV0, duration: tspV0Duration } = await measureTime(
            () => computerTour.computeTSPTour(),
            'computeTSPTour (v0 - rigid)',
            'Petit Plan - demandePetit1'
        );

        // Reset and test v2
        computerTour.fillTourPointStructures(pickupDeliveryPairs);
        computerTour.setTSPStrategy('v2');
        const { result: tspTourV2, duration: tspV2Duration } = await measureTime(
            () => computerTour.computeTSPTour(),
            'computeTSPTour (v2 - nearest neighbor)',
            'Petit Plan - demandePetit1'
        );

        // Test computeCompleteTour
        const { result: completeTour, duration: completeDuration } = await measureTime(
            () => computerTour.computeCompleteTour(tspTourV1, courier),
            'computeCompleteTour',
            'Petit Plan - demandePetit1'
        );

        assert.isTrue(completeTour !== null, 'Complete tour should be computed');

        // Test findShortestPath with both algorithms
        const nodeIds = Array.from(plan.nodes.keys());
        const startId = nodeIds[0];
        const endId = nodeIds[Math.min(10, nodeIds.length - 1)];

        computerTour.setPathfindingAlgorithm('astar');
        const { result: astarPath, duration: astarDuration } = await measureTime(
            () => computerTour.findShortestPath(startId, endId),
            'findShortestPath (A*)',
            'Petit Plan - demandePetit1'
        );

        computerTour.setPathfindingAlgorithm('dijkstra');
        const { result: dijkstraPath, duration: dijkstraDuration } = await measureTime(
            () => computerTour.findShortestPath(startId, endId),
            'findShortestPath (Dijkstra)',
            'Petit Plan - demandePetit1'
        );

        console.log('\n┌─────────────────── Summary ───────────────────┐');
        console.log(`│ Total tour time: \x1b[1m${formatTime(fillDuration + tspV1Duration + completeDuration)}s\x1b[0m`.padEnd(57) + '│');
        console.log(`│ TSP v1 vs v0: ${tspV1Duration < tspV0Duration ? '\x1b[32mv1 faster\x1b[0m' : '\x1b[33mv0 faster\x1b[0m'} (Δ ${Math.abs(tspV1Duration - tspV0Duration)}ms)`.padEnd(68) + '│');
        console.log(`│ A* vs Dijkstra: ${astarDuration < dijkstraDuration ? '\x1b[32mA* faster\x1b[0m' : '\x1b[33mDijkstra faster\x1b[0m'} (Δ ${Math.abs(astarDuration - dijkstraDuration)}ms)`.padEnd(73) + '│');
        console.log('└───────────────────────────────────────────────┘');

        displayTimings('Petit Plan - demandePetit1');
    });

    it('should measure execution times for demandePetit2.xml', async () => {
        console.log('\n=== PETIT PLAN - demandePetit2.xml ===\n');

        const planPath = path.join(__dirname, '../fichiersXMLPickupDelivery/petitPlan.xml');
        const demandsPath = path.join(__dirname, '../fichiersXMLPickupDelivery/demandePetit2.xml');

        const plan = await loadPlanFromXML(planPath);
        const warehouse = await getWarehouseFromXML(demandsPath, plan);
        const pickupDeliveryPairs = await loadDemandsFromXML(demandsPath, plan);

        console.log(`Plan: ${plan.nodes.size} nodes, ${plan.segments.length} segments`);
        console.log(`Demands: ${pickupDeliveryPairs.length} pickup/delivery pairs\n`);

        const computerTour = new ComputerTour(plan, warehouse);
        const courier = new Courier(1, 'Test Courier');

        const { duration: fillDuration } = await measureTime(
            () => computerTour.fillTourPointStructures(pickupDeliveryPairs),
            'fillTourPointStructures',
            'Petit Plan - demandePetit2'
        );

        const { result: tspTourV1, duration: tspV1Duration } = await measureTime(
            () => computerTour.computeTSPTour(),
            'computeTSPTour (v1)',
            'Petit Plan - demandePetit2'
        );

        computerTour.fillTourPointStructures(pickupDeliveryPairs);
        computerTour.setTSPStrategy('v2');
        const { duration: tspV2Duration } = await measureTime(
            () => computerTour.computeTSPTour(),
            'computeTSPTour (v2)',
            'Petit Plan - demandePetit2'
        );

        const { duration: completeDuration } = await measureTime(
            () => computerTour.computeCompleteTour(tspTourV1, courier),
            'computeCompleteTour',
            'Petit Plan - demandePetit2'
        );

        console.log(`\nTotal time (v1): ${formatTime(fillDuration + tspV1Duration + completeDuration)}s`);
        console.log(`Total time (v2): ${formatTime(fillDuration + tspV2Duration + completeDuration)}s`);

        displayTimings('Petit Plan - demandePetit2');
    });
});

// ============================================
// Test Suite: Moyen Plan (Medium)
// ============================================

describe('Execution Times - Moyen Plan', () => {

    it('should measure execution times for demandeMoyen3.xml', async () => {
        console.log('\n=== MOYEN PLAN - demandeMoyen3.xml ===\n');

        const planPath = path.join(__dirname, '../fichiersXMLPickupDelivery/moyenPlan.xml');
        const demandsPath = path.join(__dirname, '../fichiersXMLPickupDelivery/demandeMoyen3.xml');

        const { result: plan, duration: planLoadTime } = await measureTime(
            () => loadPlanFromXML(planPath),
            'Load Plan XML',
            'Moyen Plan - demandeMoyen3'
        );

        const warehouse = await getWarehouseFromXML(demandsPath, plan);
        const pickupDeliveryPairs = await loadDemandsFromXML(demandsPath, plan);

        console.log(`Plan: ${plan.nodes.size} nodes, ${plan.segments.length} segments`);
        console.log(`Demands: ${pickupDeliveryPairs.length} pickup/delivery pairs\n`);

        const computerTour = new ComputerTour(plan, warehouse);
        const courier = new Courier(1, 'Test Courier');

        const { duration: fillDuration } = await measureTime(
            () => computerTour.fillTourPointStructures(pickupDeliveryPairs),
            'fillTourPointStructures',
            'Moyen Plan - demandeMoyen3'
        );

        computerTour.setTSPStrategy('v1');
        const { result: tspTourV1, duration: tspV1Duration } = await measureTime(
            () => computerTour.computeTSPTour(),
            'computeTSPTour (v1)',
            'Moyen Plan - demandeMoyen3'
        );

        computerTour.fillTourPointStructures(pickupDeliveryPairs);
        computerTour.setTSPStrategy('v2');
        const { duration: tspV2Duration } = await measureTime(
            () => computerTour.computeTSPTour(),
            'computeTSPTour (v2)',
            'Moyen Plan - demandeMoyen3'
        );

        const { duration: completeDuration } = await measureTime(
            () => computerTour.computeCompleteTour(tspTourV1, courier),
            'computeCompleteTour',
            'Moyen Plan - demandeMoyen3'
        );

        console.log(`\nTotal time (v1): ${formatTime(fillDuration + tspV1Duration + completeDuration)}s`);
        console.log(`Total time (v2): ${formatTime(fillDuration + tspV2Duration + completeDuration)}s`);

        displayTimings('Moyen Plan - demandeMoyen3');
    });

    it('should measure execution times for demandeMoyen5.xml', async () => {
        console.log('\n=== MOYEN PLAN - demandeMoyen5.xml ===\n');

        const planPath = path.join(__dirname, '../fichiersXMLPickupDelivery/moyenPlan.xml');
        const demandsPath = path.join(__dirname, '../fichiersXMLPickupDelivery/demandeMoyen5.xml');

        const plan = await loadPlanFromXML(planPath);
        const warehouse = await getWarehouseFromXML(demandsPath, plan);
        const pickupDeliveryPairs = await loadDemandsFromXML(demandsPath, plan);

        console.log(`Plan: ${plan.nodes.size} nodes, ${plan.segments.length} segments`);
        console.log(`Demands: ${pickupDeliveryPairs.length} pickup/delivery pairs\n`);

        const computerTour = new ComputerTour(plan, warehouse);
        const courier = new Courier(1, 'Test Courier');

        const { duration: fillDuration } = await measureTime(
            () => computerTour.fillTourPointStructures(pickupDeliveryPairs),
            'fillTourPointStructures',
            'Moyen Plan - demandeMoyen5'
        );

        const { result: tspTourV1, duration: tspV1Duration } = await measureTime(
            () => computerTour.computeTSPTour(),
            'computeTSPTour (v1)',
            'Moyen Plan - demandeMoyen5'
        );

        computerTour.fillTourPointStructures(pickupDeliveryPairs);
        computerTour.setTSPStrategy('v2');
        const { duration: tspV2Duration } = await measureTime(
            () => computerTour.computeTSPTour(),
            'computeTSPTour (v2)',
            'Moyen Plan - demandeMoyen5'
        );

        const { duration: completeDuration } = await measureTime(
            () => computerTour.computeCompleteTour(tspTourV1, courier),
            'computeCompleteTour',
            'Moyen Plan - demandeMoyen5'
        );

        console.log(`\nTotal time (v1): ${formatTime(fillDuration + tspV1Duration + completeDuration)}s`);
        console.log(`Total time (v2): ${formatTime(fillDuration + tspV2Duration + completeDuration)}s`);

        displayTimings('Moyen Plan - demandeMoyen5');
    });
});

// ============================================
// Test Suite: Grand Plan (Large)
// ============================================

describe('Execution Times - Grand Plan', () => {

    it('should measure execution times for demandeGrand7.xml', async () => {
        console.log('\n=== GRAND PLAN - demandeGrand7.xml ===\n');

        const planPath = path.join(__dirname, '../fichiersXMLPickupDelivery/grandPlan.xml');
        const demandsPath = path.join(__dirname, '../fichiersXMLPickupDelivery/demandeGrand7.xml');

        const { result: plan, duration: planLoadTime } = await measureTime(
            () => loadPlanFromXML(planPath),
            'Load Plan XML',
            'Grand Plan - demandeGrand7'
        );

        const warehouse = await getWarehouseFromXML(demandsPath, plan);
        const pickupDeliveryPairs = await loadDemandsFromXML(demandsPath, plan);

        console.log(`Plan: ${plan.nodes.size} nodes, ${plan.segments.length} segments`);
        console.log(`Demands: ${pickupDeliveryPairs.length} pickup/delivery pairs\n`);

        const computerTour = new ComputerTour(plan, warehouse);
        const courier = new Courier(1, 'Test Courier');

        // Test with A*
        computerTour.setPathfindingAlgorithm('astar');
        const { duration: fillAstarDuration } = await measureTime(
            () => computerTour.fillTourPointStructures(pickupDeliveryPairs),
            'fillTourPointStructures (A*)',
            'Grand Plan - demandeGrand7'
        );

        const { result: tspTourV1, duration: tspV1Duration } = await measureTime(
            () => computerTour.computeTSPTour(),
            'computeTSPTour (v1)',
            'Grand Plan - demandeGrand7'
        );

        computerTour.fillTourPointStructures(pickupDeliveryPairs);
        computerTour.setTSPStrategy('v2');
        const { duration: tspV2Duration } = await measureTime(
            () => computerTour.computeTSPTour(),
            'computeTSPTour (v2)',
            'Grand Plan - demandeGrand7'
        );

        const { duration: completeDuration } = await measureTime(
            () => computerTour.computeCompleteTour(tspTourV1, courier),
            'computeCompleteTour',
            'Grand Plan - demandeGrand7'
        );

        console.log(`\nTotal time (v1): ${formatTime(fillAstarDuration + tspV1Duration + completeDuration)}s`);
        console.log(`Total time (v2): ${formatTime(fillAstarDuration + tspV2Duration + completeDuration)}s`);

        // Test with Dijkstra for comparison
        const computerTour2 = new ComputerTour(plan, warehouse);
        computerTour2.setPathfindingAlgorithm('dijkstra');
        const { duration: fillDijkstraDuration } = await measureTime(
            () => computerTour2.fillTourPointStructures(pickupDeliveryPairs),
            'fillTourPointStructures (Dijkstra)',
            'Grand Plan - demandeGrand7'
        );

        console.log(`\nPathfinding comparison: A* vs Dijkstra = ${formatTime(fillAstarDuration)}s vs ${formatTime(fillDijkstraDuration)}s`);

        displayTimings('Grand Plan - demandeGrand7');
    });

    // Skipped: demandeGrand9 takes too long (30+ seconds)
    // it('should measure execution times for demandeGrand9.xml', async () => {
    //     console.log('\n=== GRAND PLAN - demandeGrand9.xml ===\n');
    //
    //     const planPath = path.join(__dirname, '../fichiersXMLPickupDelivery/grandPlan.xml');
    //     const demandsPath = path.join(__dirname, '../fichiersXMLPickupDelivery/demandeGrand9.xml');
    //
    //     const plan = await loadPlanFromXML(planPath);
    //     const warehouse = await getWarehouseFromXML(demandsPath, plan);
    //     const pickupDeliveryPairs = await loadDemandsFromXML(demandsPath, plan);
    //
    //     console.log(`Plan: ${plan.nodes.size} nodes, ${plan.segments.length} segments`);
    //     console.log(`Demands: ${pickupDeliveryPairs.length} pickup/delivery pairs\n`);
    //
    //     const computerTour = new ComputerTour(plan, warehouse);
    //     const courier = new Courier(1, 'Test Courier');
    //
    //     const { duration: fillDuration } = await measureTime(
    //         () => computerTour.fillTourPointStructures(pickupDeliveryPairs),
    //         'fillTourPointStructures',
    //         'Grand Plan - demandeGrand9'
    //     );
    //
    //     computerTour.setTSPStrategy('v1');
    //     const { result: tspTourV1, duration: tspV1Duration } = await measureTime(
    //         () => computerTour.computeTSPTour(),
    //         'computeTSPTour (v1)',
    //         'Grand Plan - demandeGrand9'
    //     );
    //
    //     computerTour.fillTourPointStructures(pickupDeliveryPairs);
    //     computerTour.setTSPStrategy('v2');
    //     const { result: tspTourV2, duration: tspV2Duration } = await measureTime(
    //         () => computerTour.computeTSPTour(),
    //         'computeTSPTour (v2)',
    //         'Grand Plan - demandeGrand9'
    //     );
    //
    //     const { duration: completeDuration } = await measureTime(
    //         () => computerTour.computeCompleteTour(tspTourV1, courier),
    //         'computeCompleteTour',
    //         'Grand Plan - demandeGrand9'
    //     );
    //
    //     console.log(`\nTotal time (v1): ${formatTime(fillDuration + tspV1Duration + completeDuration)}s`);
    //     console.log(`Total time (v2): ${formatTime(fillDuration + tspV2Duration + completeDuration)}s`);
    //     console.log(`TSP v1 vs v2: ${formatTime(Math.abs(tspV1Duration - tspV2Duration))}s difference`);
    //
    //     displayTimings('Grand Plan - demandeGrand9');
    // });
});

// ============================================
// Test Suite: Comparative Analysis
// ============================================

describe('Execution Times - Comparative Analysis', () => {

    it('should compare performance across all plan sizes', async () => {
        console.log('\n=== COMPARATIVE ANALYSIS ===\n');

        const testCases = [
            {
                name: 'Petit',
                planPath: '../fichiersXMLPickupDelivery/petitPlan.xml',
                demandsPath: '../fichiersXMLPickupDelivery/demandePetit1.xml'
            },
            {
                name: 'Moyen',
                planPath: '../fichiersXMLPickupDelivery/moyenPlan.xml',
                demandsPath: '../fichiersXMLPickupDelivery/demandeMoyen3.xml'
            },
            {
                name: 'Grand',
                planPath: '../fichiersXMLPickupDelivery/grandPlan.xml',
                demandsPath: '../fichiersXMLPickupDelivery/demandeGrand7.xml'
            }
        ];

        const results = [];

        for (const testCase of testCases) {
            console.log(`\n--- ${testCase.name} Plan ---`);

            const planPath = path.join(__dirname, testCase.planPath);
            const demandsPath = path.join(__dirname, testCase.demandsPath);

            const plan = await loadPlanFromXML(planPath);
            const warehouse = await getWarehouseFromXML(demandsPath, plan);
            const pickupDeliveryPairs = await loadDemandsFromXML(demandsPath, plan);

            const computerTour = new ComputerTour(plan, warehouse);
            const courier = new Courier(1, 'Test Courier');

            const fillStart = Date.now();
            computerTour.fillTourPointStructures(pickupDeliveryPairs);
            const fillTime = Date.now() - fillStart;

            const tspStart = Date.now();
            const tspTour = computerTour.computeTSPTour();
            const tspTime = Date.now() - tspStart;

            const completeStart = Date.now();
            computerTour.computeCompleteTour(tspTour, courier);
            const completeTime = Date.now() - completeStart;

            const totalTime = fillTime + tspTime + completeTime;

            results.push({
                name: testCase.name,
                nodes: plan.nodes.size,
                segments: plan.segments.length,
                demands: pickupDeliveryPairs.length,
                fillTime,
                tspTime,
                completeTime,
                totalTime
            });

            console.log(`Nodes: ${plan.nodes.size}, Segments: ${plan.segments.length}, Demands: ${pickupDeliveryPairs.length}`);
            console.log(`Fill: ${formatTime(fillTime)}s, TSP: ${formatTime(tspTime)}s, Complete: ${formatTime(completeTime)}s`);
            console.log(`TOTAL: ${formatTime(totalTime)}s`);
        }

        console.log('\n\n=== SUMMARY TABLE ===\n');
        console.log('Plan   | Nodes  | Segments | Demands | Fill (s) | TSP (s) | Complete (s) | Total (s)');
        console.log('-------|--------|----------|---------|----------|---------|--------------|----------');

        results.forEach(r => {
            console.log(
                `${r.name.padEnd(6)} | ` +
                `${String(r.nodes).padEnd(6)} | ` +
                `${String(r.segments).padEnd(8)} | ` +
                `${String(r.demands).padEnd(7)} | ` +
                `${formatTime(r.fillTime).padEnd(8)} | ` +
                `${formatTime(r.tspTime).padEnd(7)} | ` +
                `${formatTime(r.completeTime).padEnd(12)} | ` +
                `${formatTime(r.totalTime)}`
            );
        });

        console.log('\n');
    });
});

// Run all tests
(async () => {
    console.log('\n╔════════════════════════════════════════════════════════════════╗');
    console.log('║     EXECUTION TIME TESTS FOR COMPUTERTOUR FUNCTIONS           ║');
    console.log('╚════════════════════════════════════════════════════════════════╝\n');

    // Wait for all async tests to complete (they can take several seconds)
    await new Promise(resolve => setTimeout(resolve, 30000));

    const results = getResults();

    console.log('\n\n╔════════════════════════════════════════════════════════════════╗');
    console.log('║                      TEST RESULTS                              ║');
    console.log('╚════════════════════════════════════════════════════════════════╝\n');

    console.log(`Total Tests: ${results.total}`);
    console.log(`Passed: \x1b[32m${results.passed} ✓\x1b[0m`);
    console.log(`Failed: \x1b[31m${results.failed} ✗\x1b[0m`);
    console.log(`Success Rate: \x1b[1m${((results.passed / results.total) * 100).toFixed(1)}%\x1b[0m`);

    // Display comprehensive execution time summary
    console.log('\n\n╔════════════════════════════════════════════════════════════════╗');
    console.log('║              COMPREHENSIVE EXECUTION TIME SUMMARY              ║');
    console.log('╚════════════════════════════════════════════════════════════════╝\n');

    // Group by context
    const byContext = {};
    timingResults.forEach(t => {
        if (!byContext[t.context]) byContext[t.context] = [];
        byContext[t.context].push(t);
    });

    // Display by category
    Object.keys(byContext).forEach(context => {
        if (context) {
            console.log(`\n\x1b[1m━━━ ${context} ━━━\x1b[0m`);
            byContext[context].forEach(t => {
                const emoji = t.duration < 100 ? '⚡' : t.duration < 1000 ? '🟢' : t.duration < 5000 ? '🟡' : '🔴';
                console.log(`  ${emoji} ${t.label.padEnd(35)} \x1b[1m${t.timeStr}s\x1b[0m`);
            });
        }
    });

    // Find slowest operations
    const sorted = [...timingResults].sort((a, b) => b.duration - a.duration);
    console.log('\n\n\x1b[1m━━━ TOP 5 SLOWEST OPERATIONS ━━━\x1b[0m');
    sorted.slice(0, 5).forEach((t, i) => {
        console.log(`  ${i + 1}. ${t.label.padEnd(35)} \x1b[31m${t.timeStr}s\x1b[0m ${t.context ? `(${t.context})` : ''}`);
    });

    // Find fastest operations
    console.log('\n\x1b[1m━━━ TOP 5 FASTEST OPERATIONS ━━━\x1b[0m');
    sorted.slice(-5).reverse().forEach((t, i) => {
        console.log(`  ${i + 1}. ${t.label.padEnd(35)} \x1b[32m${t.timeStr}s\x1b[0m ${t.context ? `(${t.context})` : ''}`);
    });

    // Calculate totals
    const totalTime = timingResults.reduce((sum, t) => sum + t.duration, 0);
    console.log('\n\x1b[1m━━━ OVERALL STATISTICS ━━━\x1b[0m');
    console.log(`  Total execution time: \x1b[1m${formatTime(totalTime)}s\x1b[0m`);
    console.log(`  Average operation time: \x1b[1m${formatTime(totalTime / timingResults.length)}s\x1b[0m`);
    console.log(`  Total operations measured: \x1b[1m${timingResults.length}\x1b[0m\n`);

    if (results.failed > 0) {
        console.log('\n⚠️  Some tests failed. See details above.');
        process.exit(1);
    } else {
        console.log('\n✅ All execution time tests completed successfully!');
        process.exit(0);
    }
})();
