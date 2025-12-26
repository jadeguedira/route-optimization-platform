/**
 * Class responsible for computing optimal delivery tours
 */
const isNodeEnv = typeof module !== 'undefined' && module.exports;

let LegDependency = null;
if (isNodeEnv) {
    LegDependency = require('./leg');
} else if (typeof window !== 'undefined' && window.Leg) {
    LegDependency = window.Leg;
} else if (typeof Leg !== 'undefined') {
    LegDependency = Leg;
}

let TourDependency = null;
if (isNodeEnv) {
    TourDependency = require('./tours');
} else if (typeof window !== 'undefined' && window.Tour) {
    TourDependency = window.Tour;
} else if (typeof Tour !== 'undefined') {
    TourDependency = Tour;
}

function getLegClass() {
    if (LegDependency) {
        return LegDependency;
    }
    if (typeof globalThis !== 'undefined' && globalThis.Leg) {
        LegDependency = globalThis.Leg;
        return LegDependency;
    }
    throw new Error('Leg class is not available for ComputerTour');
}

/**
 * Gets the Tour class from dependencies (handles Node.js and Browser environments)
 * Provides cross-environment compatibility for the Tour constructor
 * @returns {Function} The Tour constructor class
 * @throws {Error} If Tour class is not available in any environment
 */
function getTourClass() {
    if (TourDependency) {
        return TourDependency;
    }
    if (typeof globalThis !== 'undefined' && globalThis.Tour) {
        TourDependency = globalThis.Tour;
        return TourDependency;
    }
    throw new Error('Tour class is not available for ComputerTour');
}

class ComputerTour {
    /**
     * Constructor for the ComputerTour class
     * @param {Plan} plan - The city plan containing nodes and segments
     * @param {TourPoint} warehouseStart - The warehouse starting point
     */
    constructor(plan, warehouseStart) {
        this.plan = plan;
        this.start = warehouseStart; // TourPoint
        this.tourPoints = new Set(); // Set<TourPoint>
        this.precedence = new Map(); // Map<TourPointDelivery, TourPointPickup>
        this.tourPointGraphTimes = new Map(); // Map<string, number> - key: "fromNodeId_toNodeId"
        this.tourPointGraphLegs = new Map(); // Map<string, Leg> - key: "fromNodeId_toNodeId"
        this.pathfindingAlgorithm = 'astar'; // Default to A* for better performance
        this.tspStrategy = 'v1'; // Default to flexible strategy
    }

    /**
     * Sets the pathfinding algorithm to use
     * @param {string} algorithm - 'dijkstra' or 'astar'
     */
    setPathfindingAlgorithm(algorithm) {
        if (algorithm === 'dijkstra' || algorithm === 'astar') {
            this.pathfindingAlgorithm = algorithm;
        } else {
            console.warn(`Invalid algorithm: ${algorithm}. Using default: astar`);
            this.pathfindingAlgorithm = 'astar';
        }
    }

    /**
     * Sets the TSP strategy to use
     * @param {string} strategy - 'v0' (rigid), 'v1' (flexible), or 'v2' (nearest neighbor)
     */
    setTSPStrategy(strategy) {
        if (['v0', 'v1', 'v2'].includes(strategy)) {
            this.tspStrategy = strategy;
        } else {
            console.warn(`Invalid TSP strategy: ${strategy}. Using default: v1`);
            this.tspStrategy = 'v1';
        }
    }

    /**
     * Computes a complete tour from an array of pickup/delivery pairs
     * @param {Array<[TourPoint, TourPoint]>} pickupDeliveryPairs - Array of [TourPointPickup, TourPointDelivery] pairs
     * @param {Courier} courier - The courier assigned to this tour
     * @returns {Tour|null}
     */
    computeTour(pickupDeliveryPairs, courier) {
        // 1. Fill internal data structures
        let fillStartTime = Date.now();
        const success = this.fillTourPointStructures(pickupDeliveryPairs);
        if (!success) {
            return null;
        }
        let fillTime = (Date.now() - fillStartTime) / 1000;
        console.log(`Tour point structures filled in ${fillTime.toFixed(2)} seconds`);

        // 2. Compute the TSP tour
        let TSPStartTime = Date.now();
        const tspTour = this.computeTSPTour();
        if (!tspTour) {
            return null;
        }
        let tspTime = (Date.now() - TSPStartTime) / 1000;
        console.log(`TSP tour computed in ${tspTime.toFixed(2)} seconds`);

        // 3. Compute the complete tour with all details
        let CompleteStartTime = Date.now();
        const completeTour = this.computeCompleteTour(tspTour, courier);
        let completeTime = (Date.now() - CompleteStartTime) / 1000;
        console.log(`Complete tour computed in ${completeTime.toFixed(2)} seconds`);
        return completeTour;
    }

    /**
     * Fills the internal tour point data structures
     * @param {Array<[TourPoint, TourPoint]>} pickupDeliveryPairs - Array of [TourPointPickup, TourPointDelivery] pairs
     * @returns {boolean} - True if successful, false if no path exists
     * @private
     */
    fillTourPointStructures(pickupDeliveryPairs) {
        // Clear existing data (security), except the warehouse start point and plan.
        this.tourPoints.clear();
        this.precedence.clear();
        this.tourPointGraphTimes.clear();
        this.tourPointGraphLegs.clear();

        //      Fill with new data
        // 1. tourPoints & precedence
        for (const [pickup, delivery] of pickupDeliveryPairs) {
            this.tourPoints.add(pickup);
            this.tourPoints.add(delivery);
            this.precedence.set(delivery, pickup);
        }

        // 2. tourPointGraphTimes & tourPointGraphLegs
        const allTourPoints = Array.from(this.tourPoints);
        allTourPoints.push(this.start); // Include the warehouse start point
        const LegClass = getLegClass();
        // Get all pairs of tour points (including the warehouse)
        for (let i = 0; i < allTourPoints.length; i++) {
            for (let j = 0; j < allTourPoints.length; j++) {
                if (i !== j) {
                    const fromPoint = allTourPoints[i];
                    const toPoint = allTourPoints[j];

                    // Compute shortest path between fromPoint.node and toPoint.node using configured algorithm
                    const pathResult = this.findShortestPath(fromPoint.node.id, toPoint.node.id, this.pathfindingAlgorithm);
                    if (!pathResult) {
                        return false; // No path exists between these points
                    }
                    const travelTime = Math.ceil(pathResult.distance / (15000 / 3600)); // 15 km/h = 15000m/3600s
                    const leg = new LegClass(fromPoint, toPoint, pathResult.path, pathResult.segments, pathResult.distance, travelTime);
                    // Store in the maps with string key
                    const key = this.getKey(fromPoint, toPoint);
                    this.tourPointGraphTimes.set(key, travelTime);
                    this.tourPointGraphLegs.set(key, leg);
                }
            }
        }
        return true;
    }

    /**
     * Generates a unique key for a pair of tour points
     * @param {TourPoint} fromPoint - The starting tour point
     * @param {TourPoint} toPoint - The ending tour point
     * @returns {string} - The key in format "fromNodeId_toNodeId"
     * @private
     */
    getKey(fromPoint, toPoint) {
        return `${fromPoint.node.id}_${toPoint.node.id}`;
    }

    /**
     * A* algorithm implementation for shortest path with euclidean heuristic
     * @param {string|number} startId - Starting node ID
     * @param {string|number} endId - Destination node ID
     * @returns {Object} { pathIds: Array<string>, distance: number, segments: Array<Segment> } or null if no path exists
     * @private
     */
    aStarShortestPath(startId, endId) {
        // Validate nodes exist
        if (!this.plan.nodes.has(startId) || !this.plan.nodes.has(endId)) {
            return null;
        }

        const startNode = this.plan.nodes.get(startId);
        const endNode = this.plan.nodes.get(endId);

        // Euclidean distance heuristic
        const heuristic = (nodeId) => {
            const node = this.plan.nodes.get(nodeId);
            const dx = node.longitude - endNode.longitude;
            const dy = node.latitude - endNode.latitude;
            // Convert to approximate meters (rough approximation for Lyon area)
            const latToMeters = 111000; // 1 degree latitude ≈ 111 km
            const lonToMeters = latToMeters * Math.cos(node.latitude * Math.PI / 180);
            return Math.sqrt((dx * lonToMeters) ** 2 + (dy * latToMeters) ** 2);
        };

        // Initialize A* data structures
        const openSet = new Set([startId]);
        const closedSet = new Set();
        const gScore = new Map(); // Actual distance from start
        const fScore = new Map(); // gScore + heuristic
        const previous = new Map();

        // Initialize all nodes
        this.plan.nodes.forEach((node, id) => {
            gScore.set(id, id == startId ? 0 : Infinity);
            fScore.set(id, id == startId ? heuristic(startId) : Infinity);
            previous.set(id, null);
        });

        while (openSet.size > 0) {
            // Find node in openSet with lowest fScore
            let currentId = null;
            let minFScore = Infinity;
            openSet.forEach(id => {
                if (fScore.get(id) < minFScore) {
                    minFScore = fScore.get(id);
                    currentId = id;
                }
            });

            // If no valid node found
            if (currentId === null) {
                return null;
            }

            // If we reached the destination
            if (currentId == endId) {
                break;
            }

            // Move current from open to closed set
            openSet.delete(currentId);
            closedSet.add(currentId);

            // Check all neighbors
            const neighbors = this.plan.getNeighbors(currentId);
            neighbors.forEach(neighborId => {
                // Skip if already evaluated
                if (closedSet.has(neighborId)) return;

                // Find segment connecting current to neighbor
                const segment = this.plan.segments.find(s =>
                    (s.origin.id == currentId && s.destination.id == neighborId) ||
                    (s.destination.id == currentId && s.origin.id == neighborId)
                );

                if (!segment) return;

                // Calculate tentative gScore
                const tentativeGScore = gScore.get(currentId) + segment.length;

                // Add to open set if not already there
                if (!openSet.has(neighborId)) {
                    openSet.add(neighborId);
                } else if (tentativeGScore >= gScore.get(neighborId)) {
                    // Not a better path
                    return;
                }

                // This is the best path so far, record it
                previous.set(neighborId, currentId);
                gScore.set(neighborId, tentativeGScore);
                fScore.set(neighborId, tentativeGScore + heuristic(neighborId));
            });
        }

        // Reconstruct path with IDs
        const pathIds = [];
        let current = endId;
        while (current !== null) {
            pathIds.unshift(current);
            current = previous.get(current);
        }

        // If path doesn't start at startId, no path exists
        if (pathIds[0] != startId) {
            return null;
        }

        // Get segments along the path
        const pathSegments = [];
        for (let i = 0; i < pathIds.length - 1; i++) {
            const segment = this.plan.segments.find(s =>
                (s.origin.id == pathIds[i] && s.destination.id == pathIds[i + 1]) ||
                (s.destination.id == pathIds[i] && s.origin.id == pathIds[i + 1])
            );
            if (segment) {
                pathSegments.push(segment);
            }
        }

        return {
            pathIds: pathIds,
            distance: gScore.get(endId),
            segments: pathSegments
        };
    }

    /**
     * Dijkstra algorithm implementation for shortest path
     * @param {string|number} startId - Starting node ID
     * @param {string|number} endId - Destination node ID
     * @returns {Object} { pathIds: Array<string>, distance: number, segments: Array<Segment> } or null if no path exists
     * @private
     */
    dijkstraShortestPath(startId, endId) {
        // Validate nodes exist
        if (!this.plan.nodes.has(startId) || !this.plan.nodes.has(endId)) {
            return null;
        }

        // Initialize distances and previous nodes
        const distances = new Map();
        const previous = new Map();
        const unvisited = new Set();

        // Set all distances to infinity except start node
        this.plan.nodes.forEach((node, id) => {
            distances.set(id, id == startId ? 0 : Infinity);
            previous.set(id, null);
            unvisited.add(id);
        });

        while (unvisited.size > 0) {
            // Find unvisited node with minimum distance
            let currentId = null;
            let minDistance = Infinity;
            unvisited.forEach(id => {
                if (distances.get(id) < minDistance) {
                    minDistance = distances.get(id);
                    currentId = id;
                }
            });

            // If no path exists
            if (currentId === null || minDistance === Infinity) {
                return null;
            }

            // Remove current from unvisited
            unvisited.delete(currentId);

            // If we reached the destination
            if (currentId == endId) {
                break;
            }

            // Check all neighbors
            const neighbors = this.plan.getNeighbors(currentId);
            neighbors.forEach(neighborId => {
                if (!unvisited.has(neighborId)) return;

                // Find segment connecting current to neighbor
                const segment = this.plan.segments.find(s =>
                    (s.origin.id == currentId && s.destination.id == neighborId) ||
                    (s.destination.id == currentId && s.origin.id == neighborId)
                );

                if (!segment) return;

                // Calculate new distance
                const newDistance = distances.get(currentId) + segment.length;

                // Update if shorter path found
                if (newDistance < distances.get(neighborId)) {
                    distances.set(neighborId, newDistance);
                    previous.set(neighborId, currentId);
                }
            });
        }

        // Reconstruct path with IDs
        const pathIds = [];
        let current = endId;
        while (current !== null) {
            pathIds.unshift(current);
            current = previous.get(current);
        }

        // If path doesn't start at startId, no path exists
        if (pathIds[0] != startId) {
            return null;
        }

        // Get segments along the path
        const pathSegments = [];
        for (let i = 0; i < pathIds.length - 1; i++) {
            const segment = this.plan.segments.find(s =>
                (s.origin.id == pathIds[i] && s.destination.id == pathIds[i + 1]) ||
                (s.destination.id == pathIds[i] && s.origin.id == pathIds[i + 1])
            );
            if (segment) {
                pathSegments.push(segment);
            }
        }

        return {
            pathIds: pathIds,
            distance: distances.get(endId),
            segments: pathSegments
        };
    }

    /**
     * Enhanced shortest path finder that can use Dijkstra or A* algorithm
     * @param {string|number} startId - Starting node ID
     * @param {string|number} endId - Destination node ID
     * @param {string} algorithm - Algorithm to use: 'dijkstra' or 'astar' (default: 'astar')
     * @returns {Object} { path: Array<Node>, distance: number, segments: Array<Segment> } or null if no path exists
     * @private
     */
    findShortestPath(startId, endId, algorithm = 'astar') {
        let algorithmResult;

        if (algorithm === 'astar') {
            algorithmResult = this.aStarShortestPath(startId, endId);
        } else if (algorithm === 'dijkstra') {
            algorithmResult = this.dijkstraShortestPath(startId, endId);
        } else {
            console.warn(`Unknown algorithm: ${algorithm}, falling back to A*`);
            algorithmResult = this.aStarShortestPath(startId, endId);
        }

        if (!algorithmResult) {
            return null;
        }

        // Convert IDs to Node objects
        const path = algorithmResult.pathIds.map(id => this.plan.nodes.get(id));

        return {
            path: path,
            distance: algorithmResult.distance,
            segments: algorithmResult.segments
        };
    }

    /**
     * Computes the TSP (Traveling Salesman Problem) tour
     * @returns {Array<TourPoint>|null}
     * @private
     */
    // Version 0 : Give a random order (respecting the precedence constraints)
    // Version 1 : Compute all permutations (inefficient for large sets)
    // Version 2 : Constraints & Branch and Bound
    // Version 3 : Heuristic approaches for selecting the order of visits,
    // by selecting the nearest unvisited point at each step.
    computeTSPTour() {
        const pointCount = this.tourPoints.size;
        
        if (pointCount <= 16) {
            return this.computeTSPTourV1();
        } else {
            return this.computeTSPTourV2();
        }
    }

    /**
     * Version 0 : Give a random order (respecting the precedence constraints)
     * @returns {Array<TourPoint>|null}
     * @private
     */
    computeTSPTourV0() {
        const finalPath = new Array();
        finalPath.push(this.start);
        for (const [delivery, pickup] of this.precedence.entries()) {
            finalPath.push(pickup);
            finalPath.push(delivery);
        }
        finalPath.push(this.start);
        return finalPath;
    }

    computeTSPTourV1() {
        let bestTour = null;
        let bestDistance = Infinity;

        // Convert tourPoints Set to Array with indices
        const tourPointsArray = [this.start, ...Array.from(this.tourPoints)];

        // Precompute cheap lower-bound helpers
        const minOutgoingTime = new Map();
        const returnToStartTime = new Map();

        for (const fromPoint of tourPointsArray) {
            let bestOut = Infinity;
            for (const toPoint of tourPointsArray) {
                if (fromPoint === toPoint) continue;
                const key = this.getKey(fromPoint, toPoint);
                const travelTime = this.tourPointGraphTimes.get(key);
                if (travelTime !== undefined && travelTime < bestOut) {
                    bestOut = travelTime;
                }
            }
            minOutgoingTime.set(fromPoint, bestOut);

            const backKey = this.getKey(fromPoint, this.start);
            returnToStartTime.set(fromPoint, this.tourPointGraphTimes.get(backKey) ?? Infinity);
        }

        const enumerate = (currentPath, visited, currentDuration) => {
            const lastPoint = currentPath[currentPath.length - 1];

            // If all points visited, check if we can return to warehouse
            if (visited.size === tourPointsArray.length) {
                const returnKey = this.getKey(lastPoint, this.start);
                const returnTime = this.tourPointGraphTimes.get(returnKey);
                const totalDuration = currentDuration + returnTime;

                if (totalDuration < bestDistance) {
                    bestDistance = totalDuration;
                    bestTour = [...currentPath, this.start];
                }
                return;
            }

            // Collect valid candidates with their travel times
            const candidates = [];
            for (let i = 1; i < tourPointsArray.length; i++) {
                const nextPoint = tourPointsArray[i];

                // Skip if already visited
                if (visited.has(nextPoint)) continue;

                // Check precedence: can't deliver before pickup
                if (this.precedence.has(nextPoint)) {
                    const requiredPickup = this.precedence.get(nextPoint);
                    if (!visited.has(requiredPickup)) continue;
                }

                const key = this.getKey(lastPoint, nextPoint);
                const travelTime = this.tourPointGraphTimes.get(key);
                if (travelTime === undefined) continue;
                candidates.push({ point: nextPoint, travelTime });
            }

            // Sort by travel time - nearest point first
            candidates.sort((a, b) => a.travelTime - b.travelTime);

            // Try each candidate in order (nearest first)
            for (const { point: nextPoint, travelTime } of candidates) {
                const newDuration = currentDuration + travelTime;

                // Prune if already worse than best
                if (newDuration >= bestDistance) continue;

                // Optimistic lower bound: add minimal exits for unvisited points and best return to start
                let optimistic = newDuration + returnToStartTime.get(nextPoint);
                for (let i = 1; i < tourPointsArray.length; i++) {
                    const candidatePoint = tourPointsArray[i];
                    if (candidatePoint === nextPoint || visited.has(candidatePoint)) continue;
                    optimistic += minOutgoingTime.get(candidatePoint);
                }
                if (optimistic >= bestDistance) continue;

                // Branch: explore this path
                visited.add(nextPoint);
                currentPath.push(nextPoint);

                enumerate(currentPath, visited, newDuration);

                // Backtrack
                currentPath.pop();
                visited.delete(nextPoint);
            }
        };

        // Start enumeration from warehouse
        const initialVisited = new Set([this.start]);
        enumerate([this.start], initialVisited, 0);

        return bestTour;
    }

    /**
     * Version 2 : Gleedy Nearest Neighbor with precedence constraints
     * @returns {Array<TourPoint>|null}
     * @private
     */
    computeTSPTourV2() {
        // Step 1: Build an initial tour via nearest neighbor respecting precedence
        const path = [];
        path.push(this.start);

        const visited = new Set();
        const visitedPickups = new Set();
        let currentPoint = this.start;
        const allPoints = Array.from(this.tourPoints);

        while (visited.size < allPoints.length) {
            let best = null;
            let bestCost = Infinity;

            for (const point of allPoints) {
                if (visited.has(point)) continue;

                // Delivery precedence: its pickup must be already visited
                if (this.precedence.has(point)) {
                    const requiredPickup = this.precedence.get(point);
                    if (!visitedPickups.has(requiredPickup)) continue;
                }

                const key = this.getKey(currentPoint, point);
                const cost = this.tourPointGraphTimes.get(key) ?? Infinity;
                if (cost < bestCost) { bestCost = cost; best = point; }
            }

            if (!best) {
                console.error('ComputerTour.computeTSPTourV2: No valid next point found');
                return null;
            }

            path.push(best);
            visited.add(best);
            if (!this.precedence.has(best)) {
                visitedPickups.add(best);
            }
            currentPoint = best;
        }
        path.push(this.start);

        // Helper: get symmetric arc cost between two points
        const arcCost = (a, b) => {
            if (!a || !b) return Infinity;
            const key = this.getKey(a, b);
            const t = this.tourPointGraphTimes.get(key);
            return typeof t === 'number' ? t : Infinity;
        };

        // Helper: check precedence validity of a full path
        const respectsPrecedence = (tourArr) => {
            const indexMap = new Map();
            for (let i = 0; i < tourArr.length; i++) {
                indexMap.set(tourArr[i], i);
            }
            for (const [delivery, pickup] of this.precedence.entries()) {
                const iPick = indexMap.get(pickup);
                const iDel = indexMap.get(delivery);
                if (iPick === undefined || iDel === undefined) return false;
                if (iPick >= iDel) return false;
            }
            return true;
        };

        // Helper: compute full path cost (start..start)
        const pathCost = (tourArr) => {
            let sum = 0;
            for (let i = 0; i < tourArr.length - 1; i++) {
                const c = arcCost(tourArr[i], tourArr[i + 1]);
                if (!Number.isFinite(c)) return Infinity;
                sum += c;
            }
            return sum;
        };

        // Step 2: Greedy local search (2-opt) to improve path cost
        // We keep endpoints `start` fixed: indices 0 and path.length-1
        let improved = true;
        while (improved) {
            improved = false;
            let bestDelta = 0;
            let bestI = -1;
            let bestJ = -1;

            // Try all pairs of edges (i,i+1) and (j,j+1) with 1 <= i < j-1 <= n-2
            for (let i = 1; i < path.length - 2; i++) {
                for (let j = i + 1; j < path.length - 1; j++) {
                    // Skip adjacent edges; 2-opt requires non-overlapping edges
                    if (j === i + 1) continue;

                    const a = path[i - 1];
                    const b = path[i];
                    const c = path[j];
                    const d = path[j + 1];

                    const currentCost = arcCost(a, b) + arcCost(c, d);
                    const swappedCost = arcCost(a, c) + arcCost(b, d);
                    const delta = swappedCost - currentCost;
                    if (delta >= -1e-9) continue; // not improving

                    // Build candidate path by reversing segment [i..j]
                    const candidate = path.slice(0, i)
                        .concat(path.slice(i, j + 1).reverse())
                        .concat(path.slice(j + 1));

                    // Check precedence validity
                    if (!respectsPrecedence(candidate)) continue;

                    // Greedy: pick the most improving pair in this iteration
                    if (delta < bestDelta) {
                        bestDelta = delta;
                        bestI = i;
                        bestJ = j;
                        improved = true;
                    }
                }
            }

            // Apply the best found swap of this iteration
            if (improved && bestI >= 0) {
                const newPath = path.slice(0, bestI)
                    .concat(path.slice(bestI, bestJ + 1).reverse())
                    .concat(path.slice(bestJ + 1));
                path.length = 0;
                Array.prototype.push.apply(path, newPath);
            }
        }

        return path;
    }

    /**
     * Validates that a tour respects all precedence constraints
     * @param {Array<TourPoint>} tour - The tour to validate
     * @returns {boolean} - True if valid, false otherwise
     * @private
     */
    validatePrecedenceConstraints(tour) {
        const visitOrder = new Map();

        // Record visit order
        for (let i = 0; i < tour.length; i++) {
            visitOrder.set(tour[i], i);
        }

        // Check all precedence constraints
        for (const [delivery, pickup] of this.precedence.entries()) {
            const pickupOrder = visitOrder.get(pickup);
            const deliveryOrder = visitOrder.get(delivery);

            if (pickupOrder === undefined || deliveryOrder === undefined) {
                console.error("ComputerTour.validatePrecedenceConstraints: Missing point in tour");
                return false;
            }

            if (pickupOrder >= deliveryOrder) {
                console.error(`ComputerTour.validatePrecedenceConstraints: Pickup ${pickup.node.id} must come before delivery ${delivery.node.id}`);
                return false;
            }
        }

        return true;
    }

    /**
     * Computes the complete tour with all details
     * @param {Array<TourPoint>} tourPointsArray - Ordered array of tour points (expected depot first/last)
     * @param {Courier|null} courier - Courier assigned to the tour
     * @returns {Tour|null}
     * @private
     */
    computeCompleteTour(tourPointsArray, courier = null) {
        if (!Array.isArray(tourPointsArray) || tourPointsArray.length < 2) {
            console.error("ComputerTour.computeCompleteTour: invalid tour points array");
            return null;
        }
        if (!this.plan) {
            console.error("ComputerTour.computeCompleteTour: plan is not set");
            return null;
        }

        const TourClass = getTourClass();
        const LegClass = getLegClass();

        const DEFAULT_DEPARTURE = "08:00";
        const tour = new TourClass(null, DEFAULT_DEPARTURE, courier || null);

        // Add stops in order
        tourPointsArray.forEach(tp => tour.addStop(tp));

        // Helper: try to find a precomputed leg (string key or array key)
        const getPrecomputedLeg = (from, to) => {
            if (!this.tourPointGraphLegs) return null;
            const stringKey = this.getKey(from, to);
            if (this.tourPointGraphLegs.has(stringKey)) {
                return this.tourPointGraphLegs.get(stringKey);
            }
            for (const [k, v] of this.tourPointGraphLegs.entries()) {
                if (Array.isArray(k) && k.length === 2 && k[0] === from && k[1] === to) {
                    return v;
                }
            }
            return null;
        };

        // Helper: try to get a precomputed travel time
        const getPrecomputedTimeSeconds = (from, to) => {
            if (!this.tourPointGraphTimes) return null;
            const stringKey = this.getKey(from, to);
            if (this.tourPointGraphTimes.has(stringKey)) {
                return this.tourPointGraphTimes.get(stringKey);
            }
            for (const [k, v] of this.tourPointGraphTimes.entries()) {
                if (Array.isArray(k) && k.length === 2 && k[0] === from && k[1] === to) {
                    return v;
                }
            }
            return null;
        };

        const estimateTravelTimeSeconds = (distanceMeters) => {
            // Assume 15 km/h average speed
            const speedMetersPerSecond = (15 * 1000) / 3600;
            return Math.round(distanceMeters / speedMetersPerSecond);
        };

        for (let i = 0; i < tourPointsArray.length - 1; i++) {
            const from = tourPointsArray[i];
            const to = tourPointsArray[i + 1];

            let leg = getPrecomputedLeg(from, to);

            if (!leg) {
                // Compute shortest path using configured algorithm (A* or Dijkstra)
                const pathResult = this.findShortestPath(from?.node?.id, to?.node?.id, this.pathfindingAlgorithm);
                if (!pathResult) {
                    console.error(`ComputerTour.computeCompleteTour: no path between ${from?.node?.id} and ${to?.node?.id}`);
                    return null;
                }
                const precomputedTime = getPrecomputedTimeSeconds(from, to);
                const travelTimeSeconds = typeof precomputedTime === 'number'
                    ? precomputedTime
                    : estimateTravelTimeSeconds(pathResult.distance || 0);

                leg = new LegClass(
                    from,
                    to,
                    pathResult.path || [],
                    pathResult.segments || [],
                    pathResult.distance || 0,
                    travelTimeSeconds
                );

                // Cache for future use
                if (this.tourPointGraphLegs) {
                    this.tourPointGraphLegs.set(this.getKey(from, to), leg);
                }
                if (this.tourPointGraphTimes && typeof travelTimeSeconds === 'number') {
                    this.tourPointGraphTimes.set(this.getKey(from, to), travelTimeSeconds);
                }
            }

            tour.addLeg(leg);
        }

        // Update totals
        tour.calculateTotalDistance();
        tour.calculateTotalDuration();

        return tour;
    }
}

// Export for Node.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ComputerTour;
}

// Export for Browser
if (typeof window !== 'undefined') {
    window.ComputerTour = ComputerTour;
}
