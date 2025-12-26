/**
 * Class representing a road segment (Tronçon)
 */
class Segment {

    /**
     * Constructor for the Segment class
     * @param {Node} origin - Origin node reference
     * @param {Node} destination - Destination node reference
     * @param {string} streetName - Name of the street
     * @param {number} length - Length in meters
     */
    constructor(origin, destination, streetName, length) {
        this.origin = origin;
        this.destination = destination;
        this.streetName = streetName;
        this.length = length;
    }

    /**
     * Returns a JSON representation of the road segment
     * @returns {Object}
     */
    toJSON() {
        return {
            origin: this.origin.id,
            destination: this.destination.id,
            streetName: this.streetName,
            length: this.length
        };
    }

    /**
     * Returns a textual summary of the segment
     * @returns {string}
     */
    toString() {
        return `Segment ${this.origin.id} → ${this.destination.id} (${this.streetName}, ${this.length}m)`;
    }
}

// Export for Node.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Segment;
}
