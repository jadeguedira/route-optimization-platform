/**
 * Class representing a map node (intersection)
 */
class Node {

    /**
     * Constructor for the Node class
     * @param {string|number} id - Unique identifier of the node
     * @param {number} latitude - Latitude value
     * @param {number} longitude - Longitude value
     * @param {Array} segments - List of connected segments
     */
    constructor(id, latitude, longitude, segments) {
        this.id = id;
        this.latitude = latitude;
        this.longitude = longitude;
        this.segments = segments;
    }

    /**
     * Returns a JSON representation of the node
     * @returns {Object}
     */
    toJSON() {
        return {
            id: this.id,
            latitude: this.latitude,
            longitude: this.longitude
        };
    }

    /**
     * Returns a textual summary of the node
     * @returns {string}
     */
    toString() {
        return `Node ${this.id} (${this.latitude}, ${this.longitude})`;
    }
}

// Export for Node.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Node;
}

