/**
 * Service de géocodage inverse pour convertir des coordonnées en adresses
 * Utilise l'API Nominatim d'OpenStreetMap (gratuite)
 */

class GeocodingService {
    constructor() {
        this.cache = new Map(); // Cache pour éviter les requêtes répétées
        this.requestQueue = [];
        this.isProcessing = false;
        this.minDelay = 1100; // Nominatim limite : 1 requête/seconde
    }

    /**
     * Convertit des coordonnées en adresse lisible
     * @param {number} latitude - Latitude
     * @param {number} longitude - Longitude
     * @returns {Promise<string>} Adresse formatée
     */
    async getAddress(latitude, longitude) {
        const cacheKey = `${latitude.toFixed(5)},${longitude.toFixed(5)}`;

        // Vérifier le cache
        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey);
        }

        // Ajouter à la queue pour respecter les limites de taux
        return new Promise((resolve, reject) => {
            this.requestQueue.push({ latitude, longitude, cacheKey, resolve, reject });
            this.processQueue();
        });
    }

    /**
     * Traite la queue de requêtes en respectant les limites de taux
     */
    async processQueue() {
        if (this.isProcessing || this.requestQueue.length === 0) {
            return;
        }

        this.isProcessing = true;

        while (this.requestQueue.length > 0) {
            const request = this.requestQueue.shift();

            try {
                const address = await this.fetchAddress(request.latitude, request.longitude);
                this.cache.set(request.cacheKey, address);
                request.resolve(address);
            } catch (error) {
                console.error('Erreur geocoding:', error);
                // En cas d'erreur, retourner les coordonnées
                const fallback = `${request.latitude.toFixed(4)}, ${request.longitude.toFixed(4)}`;
                this.cache.set(request.cacheKey, fallback);
                request.resolve(fallback);
            }

            // Attendre avant la prochaine requête (respect limite Nominatim)
            if (this.requestQueue.length > 0) {
                await this.delay(this.minDelay);
            }
        }

        this.isProcessing = false;
    }

    /**
     * Effectue la requête vers l'API Nominatim
     * @param {number} lat - Latitude
     * @param {number} lon - Longitude
     * @returns {Promise<string>} Adresse formatée
     */
    async fetchAddress(lat, lon) {
        const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1`;

        const response = await fetch(url, {
            headers: {
                'User-Agent': 'DelivHub Application' // Nominatim requiert un User-Agent
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();

        // Formater l'adresse
        return this.formatAddress(data);
    }

    /**
     * Formate l'adresse à partir de la réponse Nominatim
     * @param {Object} data - Données de Nominatim
     * @returns {string} Adresse formatée
     */
    formatAddress(data) {
        if (!data || data.error) {
            return 'Adresse inconnue';
        }

        const addr = data.address || {};

        // Priorité : numéro + rue
        if (addr.house_number && addr.road) {
            return `${addr.house_number} ${addr.road}`;
        }

        // Sinon juste la rue
        if (addr.road) {
            return addr.road;
        }

        // Ou le quartier
        if (addr.neighbourhood) {
            return addr.neighbourhood;
        }

        // Ou la ville
        if (addr.city || addr.town || addr.village) {
            return addr.city || addr.town || addr.village;
        }

        // Fallback
        return data.display_name?.split(',')[0] || 'Adresse inconnue';
    }

    /**
     * Obtient une adresse courte (sans détails)
     * @param {number} latitude - Latitude
     * @param {number} longitude - Longitude
     * @returns {Promise<string>} Adresse courte
     */
    async getShortAddress(latitude, longitude) {
        const fullAddress = await this.getAddress(latitude, longitude);

        // Limiter à 30 caractères pour l'affichage dans la timeline
        if (fullAddress.length > 30) {
            return fullAddress.substring(0, 27) + '...';
        }

        return fullAddress;
    }

    /**
     * Pré-charge les adresses pour une liste de coordonnées
     * @param {Array<{latitude: number, longitude: number}>} coordinates - Liste de coordonnées
     */
    async preloadAddresses(coordinates) {
        const promises = coordinates.map(coord =>
            this.getAddress(coord.latitude, coord.longitude)
        );

        await Promise.all(promises);
        console.log(`✅ ${coordinates.length} adresses préchargées`);
    }

    /**
     * Vide le cache
     */
    clearCache() {
        this.cache.clear();
        console.log('Cache géocodage vidé');
    }

    /**
     * Délai pour respecter les limites de taux
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Instance globale
if (typeof window !== 'undefined') {
    window.geocodingService = new GeocodingService();
}

// Export pour Node.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = GeocodingService;
}

