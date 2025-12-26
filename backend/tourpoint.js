/**
 * Enum representing the type of a tour point
 */
const TypePoint = {
    PICKUP: "PICKUP",
    DELIVERY: "DELIVERY",
    WAREHOUSE: "WAREHOUSE"
};

/**
 * Class representing a point in a delivery tour (pickup, delivery, or warehouse)
 * Uses composition (has-a relationship) with Node
 */
class TourPoint {

    /**
     * Constructor for the TourPoint class
     * @param {Node} node - Reference to the node
     * @param {number} serviceDuration - Duration of the service in seconds
     * @param {("PICKUP"|"DELIVERY"|"WAREHOUSE")} type - The type of point
     * @param {Demand|null} demand - Related demand (null for WAREHOUSE)
     */
    constructor(node, serviceDuration, type, demand = null) {
        this.node = node;
        this.serviceDuration = serviceDuration;
        this.type = type;
        this.demand = demand;
        this.relatedTourPoint = null; // Reference to related TourPoint (pickup/delivery pair)
    }

    /**
     * Returns a JSON representation of the tour point
     * @returns {Object}
     */
    toJSON() {
        return {
            node: this.node ? this.node.toJSON() : null,
            serviceDuration: this.serviceDuration,
            type: this.type,
            demand: this.demand ? this.demand.toJSON() : null,
            relatedTourPoint: this.relatedTourPoint ? this.relatedTourPoint.node.id : null
        };
    }

    /**
     * Returns a textual summary of the tour point
     * @returns {string}
     */
    toString() {
        const nodeId = this.node?.id ?? 'Unknown';
        const nodeLat = this.node?.latitude ?? 0;
        const nodeLon = this.node?.longitude ?? 0;
        return `TourPoint - ${this.type} @ Node ${nodeId} (${nodeLat}, ${nodeLon}) (service: ${this.serviceDuration}s)`;
    }
}

// Export for Node.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { TourPoint, TypePoint };
}
