/**
 * Test Suite for ComputerTour class - Full Integration Test with XML Loading
 * Tests the complete workflow: load XML plan, create tour points, compute tour
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

// Test Suite
describe('ComputerTour - Integration Test with moyenPlan.xml', () => {

    it('should load moyenPlan.xml and compute a tour with multiple pickups/deliveries', async () => {
        console.log('\n=== Test 1: Multiple Pickup-Delivery Pairs ===\n');
        
        // 1. Charger le plan moyenPlan.xml
        const xmlPath = path.join(__dirname, '../fichiersXMLPickupDelivery/moyenPlan.xml');
        const plan = await loadPlanFromXML(xmlPath);
        
        console.log(`Plan loaded: ${plan.nodes.size} nodes, ${plan.segments.length} segments`);
        
        // 2. Créer un warehouse tourpoint
        const warehouseNode = plan.nodes.get('4150019167');
        assert.isTrue(warehouseNode !== null && warehouseNode !== undefined, 'Warehouse node should exist');
        
        const warehouseTourPoint = new TourPoint(warehouseNode, 0, TypePoint.WAREHOUSE, null);
        console.log(`Warehouse created at node: ${warehouseNode.id}`);
        
        // 3. Créer des couples de tourpoints (pickup et delivery) depuis demandeMoyen5.xml
        const pickupDeliveryPairs = [];
        
        // Paire 1: 21992645 -> 55444215
        const pickup1 = new TourPoint(plan.nodes.get('21992645'), 360, TypePoint.PICKUP, null);
        const delivery1 = new TourPoint(plan.nodes.get('55444215'), 480, TypePoint.DELIVERY, null);
        pickupDeliveryPairs.push([pickup1, delivery1]);
        
        // Paire 2: 26155372 -> 1036842078
        const pickup2 = new TourPoint(plan.nodes.get('26155372'), 480, TypePoint.PICKUP, null);
        const delivery2 = new TourPoint(plan.nodes.get('1036842078'), 0, TypePoint.DELIVERY, null);
        pickupDeliveryPairs.push([pickup2, delivery2]);
        
        console.log(`Created ${pickupDeliveryPairs.length} pickup-delivery pairs`);
        
        // 4. Créer un courier
        const courier = new Courier(1, 'Pierre');
        console.log(`Courier created: ${courier.name}`);
        
        // 5. Créer une instance de ComputerTour
        const computerTour = new ComputerTour(plan, warehouseTourPoint);
        
        // 6. Calculer le tour
        console.log('\nComputing tour...');
        const tour = computerTour.computeTour(pickupDeliveryPairs, courier);
        
        // 7. Vérifier que le tour est créé
        assert.isTrue(tour !== null && tour !== undefined, 'Tour should be created');
        assert.strictEqual(tour.courier.name, 'Pierre', 'Courier name should be Pierre');
        
        // 8. Afficher le tour
        console.log('\n=== TOUR RESULT ===');
        console.log(tour.toString());
        console.log('\n=== TOUR DETAILS ===');
        console.log(`Departure time: ${tour.departureTime}`);
        console.log(`Number of stops: ${tour.stops.length}`);
        console.log(`Number of legs: ${tour.legs.length}`);
        console.log(`Total distance: ${tour.totalDistance} meters`);
        console.log(`Total duration: ${tour.totalDuration} seconds (${Math.round(tour.totalDuration / 60)} minutes)`);
        
        console.log('\n=== STOPS ===');
        tour.stops.forEach((stop, index) => {
            console.log(`  ${index + 1}. ${stop.type} at node ${stop.node.id} (service: ${stop.serviceDuration}s)`);
        });
    });

    it('should handle a single pickup-delivery pair', async () => {
        console.log('\n=== Test 2: Single Pickup-Delivery Pair ===\n');
        
        // Charger le plan
        const xmlPath = path.join(__dirname, '../fichiersXMLPickupDelivery/moyenPlan.xml');
        const plan = await loadPlanFromXML(xmlPath);
        
        // Warehouse
        const warehouseNode = plan.nodes.get('4150019167');
        const warehouseTourPoint = new TourPoint(warehouseNode, 0, TypePoint.WAREHOUSE, null);
        
        // Une seule paire pickup-delivery: 25610684 -> 21717915
        const pickup = new TourPoint(plan.nodes.get('25610684'), 180, TypePoint.PICKUP, null);
        const delivery = new TourPoint(plan.nodes.get('21717915'), 540, TypePoint.DELIVERY, null);
        
        const pickupDeliveryPairs = [[pickup, delivery]];
        
        // Courier
        const courier = new Courier(2, 'Marie');
        
        // Compute tour
        const computerTour = new ComputerTour(plan, warehouseTourPoint);
        const tour = computerTour.computeTour(pickupDeliveryPairs, courier);
        
        assert.isTrue(tour !== null && tour !== undefined, 'Tour should be created');
        assert.isTrue(tour.stops.length >= 3, 'Tour should have at least 3 stops');
        
        console.log('\n=== TOUR RESULT ===');
        console.log(tour.toString());
        console.log(`\nStops: ${tour.stops.length}, Distance: ${tour.totalDistance}m, Duration: ${Math.round(tour.totalDuration / 60)} min`);
    });

    it('should compute tour with three pickup-delivery pairs', async () => {
        console.log('\n=== Test 3: Three Pickup-Delivery Pairs ===\n');
        
        const xmlPath = path.join(__dirname, '../fichiersXMLPickupDelivery/moyenPlan.xml');
        const plan = await loadPlanFromXML(xmlPath);
        
        const warehouseNode = plan.nodes.get('4150019167');
        const warehouseTourPoint = new TourPoint(warehouseNode, 0, TypePoint.WAREHOUSE, null);
        
        // Trois paires depuis demandeMoyen5.xml
        const pickupDeliveryPairs = [
            [
                new TourPoint(plan.nodes.get('21992645'), 360, TypePoint.PICKUP, null),
                new TourPoint(plan.nodes.get('55444215'), 480, TypePoint.DELIVERY, null)
            ],
            [
                new TourPoint(plan.nodes.get('26155372'), 480, TypePoint.PICKUP, null),
                new TourPoint(plan.nodes.get('1036842078'), 0, TypePoint.DELIVERY, null)
            ],
            [
                new TourPoint(plan.nodes.get('25610684'), 180, TypePoint.PICKUP, null),
                new TourPoint(plan.nodes.get('21717915'), 540, TypePoint.DELIVERY, null)
            ]
        ];
        
        const courier = new Courier(3, 'Omar');
        const computerTour = new ComputerTour(plan, warehouseTourPoint);
        const tour = computerTour.computeTour(pickupDeliveryPairs, courier);
        
        assert.isTrue(tour !== null && tour !== undefined, 'Tour should be created');
        assert.strictEqual(tour.courier.name, 'Omar', 'Courier should be Omar');
        
        console.log('\n=== TOUR RESULT ===');
        console.log(tour.toString());
        console.log(`\nTotal stops: ${tour.stops.length}`);
        console.log(`Total distance: ${tour.totalDistance} meters`);
        console.log(`Total duration: ${Math.round(tour.totalDuration / 60)} minutes`);
    });

});

// Export test results
module.exports = getResults();
