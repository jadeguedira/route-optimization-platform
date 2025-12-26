/**
 * Class representing a courier (delivery person)
 */
class Courier {
    static nextId = 1;

    /**
     * Constructor for the Courier class
     * @param {string|number|null} id - Unique identifier (auto-generated if null)
     * @param {string} name - Courier name
     */
    constructor(id = null, name) {
        this.id = id !== null ? id : `C${Courier.nextId++}`;
        this.name = name;
    }

    /**
     * Returns a JSON representation of the courier
     * @returns {Object}
     */
    toJSON() {
        return {
            id: this.id,
            name: this.name
        };
    }

    /**
     * Returns a textual summary of the courier
     * @returns {string}
     */
    toString() {
        return `Courier ${this.id} - ${this.name}`;
    }
}

// Export for Node.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Courier;
}
