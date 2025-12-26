/**
 * Class representing a city plan (Plan)
 */

class Plan {

    /**
     * Constructor for the Plan class
     * @param {Array<Node>} nodes - List of all nodes (intersections)
     * @param {Array<Troncon>} segments - List of all segments (road segments)
     * @param {Node|null} warehouse - The warehouse node (starting point)
     */
    constructor(nodes = new Map(), segments = [], warehouse = null) {
        /**
         * @type {Map<idNode, Node>}
         */
        this.nodes = nodes;

        /**
         * @type {Array<Troncon>}
         */
        this.segments = segments;

        /**
         * @type {Node|null}
         */
        this.warehouse = warehouse;
    }

    /**
     * Finds and returns a node by its ID
     * @param {string|number} id - Node identifier
     * @returns {Node|null}
     */
    getNodeById(id) {
        return this.nodes.get(id) || null;
    }

    /**
     * Returns all outgoing road segments from a given node
     * @param {string|number} nodeId
     * @returns {Array<Troncon>}
     */
    getEdgesFrom(nodeId) {
        return this.segments.filter(e => (e.origin.id == nodeId || e.destination.id == nodeId));
    }

    /**
     * Returns all neighboring node IDs connected to a given node
     * @param {string|number} nodeId
     * @returns {Array<string|number>}
     */
    getNeighbors(nodeId) {
        const neighbors = new Set();

        this.segments.forEach(segment => {
            if (segment.origin.id == nodeId) {
                neighbors.add(segment.destination.id);
            } else if (segment.destination.id == nodeId) {
                neighbors.add(segment.origin.id);
            }
        });

        return Array.from(neighbors);
    }

    /**
     * Finds the shortest path between two nodes using Dijkstra's algorithm
     * @param {string|number} startId - Starting node ID
     * @param {string|number} endId - Destination node ID
     * @returns {Object} { path: Array<Node>, distance: number, segments: Array<Segment> } or null if no path exists
     */
    findShortestPath(startId, endId) {
        // Validate nodes exist
        if (!this.nodes.has(startId) || !this.nodes.has(endId)) {
            return null;
        }

        // Initialize distances and previous nodes
        const distances = new Map();
        const previous = new Map();
        const unvisited = new Set();

        // Set all distances to infinity except start node
        this.nodes.forEach((node, id) => {
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
            const neighbors = this.getNeighbors(currentId);
            neighbors.forEach(neighborId => {
                if (!unvisited.has(neighborId)) return;

                // Find segment connecting current to neighbor
                const segment = this.segments.find(s =>
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

        // Reconstruct path with Node objects
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

        // Convert IDs to Node objects
        const path = pathIds.map(id => this.nodes.get(id));

        // Get segments along the path
        const pathSegments = [];
        for (let i = 0; i < pathIds.length - 1; i++) {
            const segment = this.segments.find(s =>
                (s.origin.id == pathIds[i] && s.destination.id == pathIds[i + 1]) ||
                (s.destination.id == pathIds[i] && s.origin.id == pathIds[i + 1])
            );
            if (segment) {
                pathSegments.push(segment);
            }
        }

        return {
            path: path,
            distance: distances.get(endId),
            segments: pathSegments
        };
    }

    /**
     * Returns a JSON representation of the plan
     * @returns {Object}
     */
    toJSON() {
        return {
            nodes: Array.from(this.nodes.values()).map(node => node.toJSON()),
            segments: this.segments.map(segment => segment.toJSON()),
            warehouse: this.warehouse ? this.warehouse.toJSON() : null
        };
    }

    /**
     * Returns a textual summary of the plan
     * @returns {string}
     */
    toString() {
        return `Plan - ${this.nodes.size} nodes, ${this.segments.length} segments, warehouse: ${this.warehouse ? this.warehouse.id : 'None'
            }`;
    }
}

// Export for Node.js and Browser
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Plan;
}

if (typeof window !== 'undefined') {
    window.Plan = Plan;
}
