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
        // 1. Charger le plan moyenPlan.xml
        const xmlPath = path.join(__dirname, '../fichiersXMLPickupDelivery/moyenPlan.xml');
        const plan = await loadPlanFromXML(xmlPath);
        
        // 2. Créer un warehouse tourpoint
        const warehouseNode = plan.nodes.get('4150019167');
        assert.isTrue(warehouseNode !== null && warehouseNode !== undefined, 'Warehouse node should exist');
        
        const warehouseTourPoint = new TourPoint(warehouseNode, 0, TypePoint.WAREHOUSE, null);
        
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
        
        // 4. Créer un courier
        const courier = new Courier(1, 'Pierre');
        
        // 5. Créer une instance de ComputerTour
        const computerTour = new ComputerTour(plan, warehouseTourPoint);
        
        // 6. Calculer le tour
        const tour = computerTour.computeTour(pickupDeliveryPairs, courier);
        
        // 7. Vérifier que le tour est créé
        assert.isTrue(tour !== null && tour !== undefined, 'Tour should be created');
        assert.strictEqual(tour.courier.name, 'Pierre', 'Courier name should be Pierre');
        
        // 8. Afficher le tour
        console.log(`Tour ${tour.id} - Departure: ${tour.departureTime}, Courier: ${tour.courier.name}, Stops: ${tour.stops.length}, Legs: ${tour.legs.length}, Duration: ${tour.totalDuration}s, Distance: ${tour.totalDistance}m`);
    });

    it('should handle a single pickup-delivery pair', async () => {
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
        
        console.log(`Tour ${tour.id} - Departure: ${tour.departureTime}, Courier: ${tour.courier.name}, Stops: ${tour.stops.length}, Legs: ${tour.legs.length}, Duration: ${tour.totalDuration}s, Distance: ${tour.totalDistance}m`);
    });

    it('should compute tour with three pickup-delivery pairs', async () => {
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
        
        console.log(`Tour ${tour.id} - Departure: ${tour.departureTime}, Courier: ${tour.courier.name}, Stops: ${tour.stops.length}, Legs: ${tour.legs.length}, Duration: ${tour.totalDuration}s, Distance: ${tour.totalDistance}m`);
    });

    it('should compute tour with five pickup-delivery pairs', async () => {
        const xmlPath = path.join(__dirname, '../fichiersXMLPickupDelivery/moyenPlan.xml');
        const plan = await loadPlanFromXML(xmlPath);
        
        const warehouseNode = plan.nodes.get('4150019167');
        const warehouseTourPoint = new TourPoint(warehouseNode, 0, TypePoint.WAREHOUSE, null);
        
        // Five well-distributed pickup-delivery pairs across the map
        const pickupDeliveryPairs = [
            // North area -> East area
            [
                new TourPoint(plan.nodes.get('459797873'), 300, TypePoint.PICKUP, null),  // lat=45.761814, lon=4.8854713
                new TourPoint(plan.nodes.get('459797856'), 420, TypePoint.DELIVERY, null) // lat=45.761265, lon=4.8991294
            ],
            // Center-West -> South-East
            [
                new TourPoint(plan.nodes.get('9214919'), 240, TypePoint.PICKUP, null),     // lat=45.74021, lon=4.864795
                new TourPoint(plan.nodes.get('2292223595'), 360, TypePoint.DELIVERY, null) // lat=45.73208, lon=4.902046
            ],
            // Center -> North
            [
                new TourPoint(plan.nodes.get('7300874'), 180, TypePoint.PICKUP, null),     // lat=45.744404, lon=4.8745656
                new TourPoint(plan.nodes.get('1682387671'), 480, TypePoint.DELIVERY, null) // lat=45.75619, lon=4.8825054
            ],
            // South-West -> Center
            [
                new TourPoint(plan.nodes.get('26132383'), 300, TypePoint.PICKUP, null),    // lat=45.729237, lon=4.8607116
                new TourPoint(plan.nodes.get('25321469'), 240, TypePoint.DELIVERY, null)   // lat=45.748405, lon=4.875445
            ],
            // South -> East
            [
                new TourPoint(plan.nodes.get('143402'), 360, TypePoint.PICKUP, null),      // lat=45.732605, lon=4.8813524
                new TourPoint(plan.nodes.get('194609787'), 420, TypePoint.DELIVERY, null)  // lat=45.735596, lon=4.902852
            ]
        ];
        
        const courier = new Courier(4, 'Fatima');
        const computerTour = new ComputerTour(plan, warehouseTourPoint);
        const tour = computerTour.computeTour(pickupDeliveryPairs, courier);
        
        assert.isTrue(tour !== null && tour !== undefined, 'Tour should be created');
        assert.strictEqual(tour.courier.name, 'Fatima', 'Courier should be Fatima');
        assert.isTrue(tour.stops.length >= 11, 'Tour should have at least 11 stops (warehouse + 5 pickups + 5 deliveries)');
        
        console.log(`Tour ${tour.id} - Departure: ${tour.departureTime}, Courier: ${tour.courier.name}, Stops: ${tour.stops.length}, Legs: ${tour.legs.length}, Duration: ${tour.totalDuration}s, Distance: ${tour.totalDistance}m`);
    });

    it('should compute tour with seven pickup-delivery pairs', async () => {
        const xmlPath = path.join(__dirname, '../fichiersXMLPickupDelivery/moyenPlan.xml');
        const plan = await loadPlanFromXML(xmlPath);
        
        const warehouseNode = plan.nodes.get('4150019167');
        const warehouseTourPoint = new TourPoint(warehouseNode, 0, TypePoint.WAREHOUSE, null);
        
        // Seven well-distributed pickup-delivery pairs covering all map areas
        const pickupDeliveryPairs = [
            // Far North -> Far East
            [
                new TourPoint(plan.nodes.get('459797870'), 300, TypePoint.PICKUP, null),   // lat=45.76069, lon=4.8857045
                new TourPoint(plan.nodes.get('459797854'), 360, TypePoint.DELIVERY, null)  // lat=45.76118, lon=4.898195
            ],
            // North-West -> Center-East
            [
                new TourPoint(plan.nodes.get('26317236'), 240, TypePoint.PICKUP, null),    // lat=45.75603, lon=4.864057
                new TourPoint(plan.nodes.get('1682387628'), 420, TypePoint.DELIVERY, null) // lat=45.754463, lon=4.882047
            ],
            // Center-North -> South-East
            [
                new TourPoint(plan.nodes.get('25321408'), 180, TypePoint.PICKUP, null),    // lat=45.748898, lon=4.873075
                new TourPoint(plan.nodes.get('245023213'), 480, TypePoint.DELIVERY, null)  // lat=45.734554, lon=4.904345
            ],
            // Center-West -> Center-East
            [
                new TourPoint(plan.nodes.get('1703401805'), 360, TypePoint.PICKUP, null),  // lat=45.749405, lon=4.866139
                new TourPoint(plan.nodes.get('4034132513'), 300, TypePoint.DELIVERY, null) // lat=45.749508, lon=4.887014
            ],
            // South-West -> North
            [
                new TourPoint(plan.nodes.get('465470608'), 420, TypePoint.PICKUP, null),   // lat=45.730606, lon=4.8607206
                new TourPoint(plan.nodes.get('26317248'), 240, TypePoint.DELIVERY, null)   // lat=45.753586, lon=4.871547
            ],
            // South -> East
            [
                new TourPoint(plan.nodes.get('271151860'), 300, TypePoint.PICKUP, null),   // lat=45.728664, lon=4.889341
                new TourPoint(plan.nodes.get('60901982'), 360, TypePoint.DELIVERY, null)   // lat=45.734184, lon=4.8974867
            ],
            // South-Center -> Far East
            [
                new TourPoint(plan.nodes.get('1957527534'), 240, TypePoint.PICKUP, null),  // lat=45.736397, lon=4.8693357
                new TourPoint(plan.nodes.get('292655293'), 480, TypePoint.DELIVERY, null)  // lat=45.73507, lon=4.906903
            ]
        ];
        
        const courier = new Courier(5, 'Hassan');
        const computerTour = new ComputerTour(plan, warehouseTourPoint);
        const tour = computerTour.computeTour(pickupDeliveryPairs, courier);
        
        assert.isTrue(tour !== null && tour !== undefined, 'Tour should be created');
        assert.strictEqual(tour.courier.name, 'Hassan', 'Courier should be Hassan');
        assert.isTrue(tour.stops.length >= 15, 'Tour should have at least 15 stops (warehouse + 7 pickups + 7 deliveries)');
        
        console.log(`Tour ${tour.id} - Departure: ${tour.departureTime}, Courier: ${tour.courier.name}, Stops: ${tour.stops.length}, Legs: ${tour.legs.length}, Duration: ${tour.totalDuration}s, Distance: ${tour.totalDistance}m`);
    });

});

// Export test results
module.exports = getResults();
