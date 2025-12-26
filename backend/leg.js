/**
 * Class representing a leg (segment) of a tour between two tour points
 */
class Leg {

    /**
     * Constructor for the Leg class
     * @param {TourPoint} from - Starting tour point
     * @param {TourPoint} to - Ending tour point
     * @param {Array<Node>} pathNode - Path of nodes between the two tour points
     * @param {Array<Segment>} pathSegment - Path of segments between the two tour points
     * @param {number} distance - Distance in meters
     * @param {number} travelTime - Travel time in seconds
     */
    constructor(from, to, pathNode = [], pathSegment = [], distance = 0, travelTime = 0) {
        this.from = from;
        this.to = to;
        this.pathNode = pathNode;
        this.pathSegment = pathSegment;
        this.distance = distance;
        this.travelTime = travelTime;
    }

    /**
     * Returns a JSON representation of the leg
     * @returns {Object}
     */
    toJSON() {
        return {
            from: this.from ? this.from.toJSON() : null,
            to: this.to ? this.to.toJSON() : null,
            pathNode: (this.pathNode && Array.isArray(this.pathNode)) ? this.pathNode.map(node => node ? node.toJSON() : null) : [],
            pathSegment: (this.pathSegment && Array.isArray(this.pathSegment)) ? this.pathSegment.map(segment => segment ? segment.toJSON() : null) : [],
            distance: this.distance,
            travelTime: this.travelTime
        };
    }

    /**
     * Returns a textual summary of the leg
     * @returns {string}
     */
    toString() {
        const fromId = this.from?.node?.id ?? 'Unknown';
        const toId = this.to?.node?.id ?? 'Unknown';
        return `Leg from ${fromId} to ${toId} - ${this.distance}m, ${this.travelTime}s, ${this.pathNode.length} nodes`;
    }
}

// Export for Node.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Leg;
}
