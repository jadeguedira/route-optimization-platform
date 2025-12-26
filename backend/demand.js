/**
 * Class representing a Pickup & Delivery request
 */
class Demand {
    static counter = 1;

    /**
     * Generates a unique demand ID with date and counter
     * @returns {string} Generated ID in format DEM_YYYYMMDD_NNN
     */
    static generateId() {
        const date = new Date();
        const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
        const countStr = String(Demand.counter++).padStart(3, '0');
        return `DEM_${dateStr}_${countStr}`;
    }

    /**
     * Constructor for the Demand class
     * @param {string|number} pickupAddress - Node reference for pickup
     * @param {string|number} deliveryAddress - Node reference for delivery
     * @param {number} pickupDuration - Duration at pickup (seconds)
     * @param {number} deliveryDuration - Duration at delivery (seconds)
     * @param {string|number} id - Demand ID (auto-generated if null)
     */
    constructor(pickupAddress, deliveryAddress, pickupDuration, deliveryDuration, id = null) {
        this.id = id !== null ? id : Demand.generateId();
        this.pickupAddress = pickupAddress;
        this.deliveryAddress = deliveryAddress;
        this.pickupDuration = pickupDuration;
        this.deliveryDuration = deliveryDuration;
    }

    /**
     * Returns a JSON representation of the demand
     * @returns {Object}
     */
    toJSON() {
        return {
            id: this.id,
            pickupAddress: this.pickupAddress?.id ?? this.pickupAddress,
            deliveryAddress: this.deliveryAddress?.id ?? this.deliveryAddress,
            pickupDuration: this.pickupDuration,
            deliveryDuration: this.deliveryDuration
        };
    }

    /**
     * Returns a textual summary of the demand
     * @returns {string}
     */
    toString() {
        const pickupId = this.pickupAddress?.id ?? this.pickupAddress;
        const deliveryId = this.deliveryAddress?.id ?? this.deliveryAddress;
        return `Demand - Pickup number ${this.id} at ${pickupId} (${this.pickupDuration}s), Delivery at ${deliveryId} (${this.deliveryDuration}s)`;
    }
}
// Export for Node.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Demand;
}

// Export for Browser
if (typeof window !== 'undefined') {
    window.Demand = Demand;
}
