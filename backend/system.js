// Demand is expected to be loaded before this script in browser environment
// For Node.js environment - import Demand, Tour, Leg, TourPoint

if (typeof require !== 'undefined') {
    // Node.js environment
    global.Demand = require("./demand");
    global.Tour = require("./tours");
    global.Leg = require("./leg");
    const tourpointModule = require("./tourpoint");
    global.TourPoint = tourpointModule.TourPoint;
    global.TypePoint = tourpointModule.TypePoint;
    global.Courier = require("./courier");
    global.ComputerTour = require("./computerTour")
}

// In browser, Demand, Tour, Leg, TourPoint, and Courier will be available from the global scope after their scripts load

class System {
    plan;

    constructor(nbCouriers = 1) {
        this.nbCouriers = nbCouriers;
        this.listCouriers = [];
        this.demandsList = [];
        this.toursList = [];
        this.nextDemandId = 1; //paramètre pour gérer les id des demandes ajoutées.
    }

    async loadPlan(fileInput) {

        // 1. Vérifier qu'un fichier est sélectionné
        if (fileInput.files.length === 0) {
            return { success: false, error: " Aucun fichier sélectionné. Veuillez choisir un fichier XML." };
        }

        const file = fileInput.files[0];

        // 2. Vérifier l'extension et le type MIME
        const fileName = file.name.toLowerCase();
        const isXmlExtension = fileName.endsWith(".xml");
        const isXmlMime = file.type === "text/xml" || file.type === "application/xml" || file.type === "";

        if (!isXmlExtension && !isXmlMime) {
            return { success: false, error: "Le fichier sélectionné n'est pas un fichier XML." };
        }

        // 3. Lire le contenu du fichier
        let text;
        try {
            text = await file.text();
        } catch (error) {
            return { success: false, error: "Impossible de lire le fichier. Vérifiez qu'il n'est pas corrompu." };

        }

        // 4. Parser le XML
        const xmlDoc = new DOMParser().parseFromString(text, "application/xml");

        // Vérifier les erreurs de parsing
        if (xmlDoc.getElementsByTagName("parsererror").length > 0) {
            return { success: false, error: "Le contenu du fichier XML est invalide ou mal formé." };
        }

        const reseau = xmlDoc.getElementsByTagName("reseau")[0];
        const noeuds = xmlDoc.getElementsByTagName("noeud");
        const troncons = xmlDoc.getElementsByTagName("troncon");

        if (!reseau) {
            return { success: false, error: "Le XML ne contient pas la balise <reseau>. Ce n'est pas un plan valide." };
        }

        if (noeuds.length === 0) {
            return { success: false, error: "Aucun noeud trouvé dans le XML. Ce fichier ne correspond pas à un plan." };
        }

        if (troncons.length === 0) {
            return { success: false, error: "Aucun troncon trouvé dans le XML. Ce fichier ne correspond pas à un plan." };
        }

        // Validación de atributos esenciales
        let estructuraValida = true;

        for (let n of noeuds) {
            if (!n.getAttribute("id") || !n.getAttribute("latitude") || !n.getAttribute("longitude")) {
                estructuraValida = false;
                console.log(n);
                break;
            }
        }

        for (let t of troncons) {
            if (!t.getAttribute("origine") || !t.getAttribute("destination") || !t.getAttribute("longueur")) {
                estructuraValida = false;
                console.log(t);
                break;
            }
        }

        if (!estructuraValida) {
            return { success: false, error: "Le XML n'a pas la structure d'un plan de carte (noeud/ troncon incorrects)." };
        }

        const nodes = Array.from(noeuds).map(n => new Node(
            n.getAttribute("id"),
            parseFloat(n.getAttribute("latitude")),
            parseFloat(n.getAttribute("longitude")),
            []
        ));

        const nodeMap = new Map(nodes.map(n => [n.id, n]));

        // Initialize distance matrix
        this.distanceMatrix = new Map();

        const segments = Array.from(troncons).map(t => {
            const originId = t.getAttribute("origine");
            const destId = t.getAttribute("destination");
            const name = t.getAttribute("nomRue") || "";
            const length = parseFloat(t.getAttribute("longueur"));

            const originNode = nodeMap.get(originId) || null;
            const destinationNode = nodeMap.get(destId) || null;

            const seg = new Segment(
                originNode,
                destinationNode,
                name,
                length
            );

            if (originNode) {
                originNode.segments.push(seg);

                // Add to distance matrix
                if (!this.distanceMatrix.has(originNode.id)) {
                    this.distanceMatrix.set(originNode.id, new Map());
                }

                // Calculate time for this segment (distance / 15 km/h * 60 minutes)
                const travelTimeMinutes = (length / 15) * 60;
                this.distanceMatrix.get(originNode.id).set(destinationNode.id, travelTimeMinutes);
            }

            return seg;
        });

        console.log("Segments loaded:", segments);
        console.log("Distance matrix populated:", this.distanceMatrix);

        const planJSON = {
            nodes: nodes.map(n => n.toJSON()),
            segments: segments.map(s => s.toJSON())
        };


        // 5. Créer le plan avec nodeMap (Map) au lieu de nodes (Array)
        this.plan = new Plan();
        this.plan.nodes = nodeMap;
        this.plan.segments = segments;

        return { success: true, plan: planJSON }
    }

    loadTourFromJSON(data) {
        if (!data) return null;

        const courier = data.courier
            ? new Courier(data.courier.id, data.courier.name)
            : null;

        const tour = new Tour(data.id || null, data.departureTime || "08:00", courier);

        const nodeMap = new Map();
        const getOrCreateNode = (nodeJson) => {
            if (!nodeJson) return null;
            if (nodeMap.has(nodeJson.id)) return nodeMap.get(nodeJson.id);
            const node = new Node(nodeJson.id, nodeJson.latitude, nodeJson.longitude, []);
            nodeMap.set(node.id, node);
            return node;
        };

        const demandMap = new Map();
        const getOrCreateDemand = (demandJson) => {
            if (!demandJson) return null;
            if (demandMap.has(demandJson.id)) return demandMap.get(demandJson.id);
            const demand = new Demand(
                demandJson.pickupAddress,
                demandJson.deliveryAddress,
                demandJson.pickupDuration,
                demandJson.deliveryDuration,
                demandJson.id
            );
            demandMap.set(demand.id, demand);
            return demand;
        };

        (data.stops || []).forEach(s => {
            const node = getOrCreateNode(s.node);
            const demand = s.demand ? getOrCreateDemand(s.demand) : null;
            const tp = new TourPoint(node, s.serviceDuration || 0, s.type, demand);
            tour.addStop(tp);
        });

        (data.legs || []).forEach(l => {
            const pathNodes = (l.pathNode || l.path || []).map(getOrCreateNode);
            const pathSegments = (l.pathSegment || []);
            const leg = new Leg(null, null, pathNodes, pathSegments, l.distance || 0, l.travelTime || 0);
            tour.addLeg(leg);
        });

        tour.calculateTotalDistance();
        tour.calculateTotalDuration();
        return tour;
    }

    loadTourFromFile(fileInput) {
        return new Promise((resolve, reject) => {
            if (!fileInput || !fileInput.files || fileInput.files.length === 0) {
                resolve({ success: false, error: "Aucun fichier sélectionné." });
                return;
            }

            const file = fileInput.files[0];
            const fileName = file.name.toLowerCase();

            // Vérifier que c'est un fichier JSON
            if (!fileName.endsWith(".json")) {
                resolve({ success: false, error: "Le fichier sélectionné n'est pas un fichier JSON." });
                return;
            }

            const reader = new FileReader();

            reader.onload = (event) => {
                try {
                    const jsonData = JSON.parse(event.target.result);
                    const tour = this.loadTourFromJSON(jsonData);

                    if (tour) {
                        this.toursList.push(tour);
                        resolve({ success: true, tour: tour });
                    } else {
                        resolve({ success: false, error: "Impossible de charger la tournée depuis le fichier JSON." });
                    }
                } catch (error) {
                    resolve({ success: false, error: "Erreur lors de la lecture du fichier JSON: " + error.message });
                }
            };

            reader.onerror = (error) => {
                resolve({ success: false, error: "Erreur lors de la lecture du fichier: " + error.message });
            };

            // Lire le fichier en tant que texte
            reader.readAsText(file);
        });
    }

    saveTourToServer(tour) {
        return new Promise((resolve, reject) => {
            if (!tour) {
                resolve({ success: false, error: "Aucune tournée à sauvegarder." });
                return;
            }

            try {
                // S'assurer que distance et durée sont à jour
                if (typeof tour.calculateTotalDistance === "function") {
                    tour.calculateTotalDistance();
                }
                if (typeof tour.calculateTotalDuration === "function") {
                    tour.calculateTotalDuration();
                }

                const departureTime = tour.departureTime || "8:00";
                const departureToken = departureTime.replace(":", "h"); // ex : 8:00 -> 8h00

                const courierNameRaw = tour.courier && tour.courier.name
                    ? String(tour.courier.name).trim()
                    : "Inconnu";

                const courierToken = courierNameRaw
                    .replace(/\s+/g, "-")
                    .replace(/_/g, "-")
                    .replace(/[^A-Za-z0-9\-]/g, "");

                const totalDuration = typeof tour.totalDuration === "number"
                    ? Math.round(tour.totalDuration)
                    : 0;
                const totalDistance = typeof tour.totalDistance === "number"
                    ? Math.round(tour.totalDistance)
                    : 0;

                const currentId = typeof tour.id === "string" ? tour.id : "";
                const alreadyFormatted = /^[^_]+_[^_]+_[^_]+_[0-9]+_[0-9]+$/.test(currentId);

                let formattedId;
                if (alreadyFormatted) {
                    // Si l'id est déjà du type id_heure_livreur_duree_distance, on le garde
                    formattedId = currentId;
                } else {
                    // Première sauvegarde : on construit l'id complet
                    const rawId = currentId || `tour_${Date.now()}`;
                    const idToken = rawId
                        .replace(/\s+/g, "-")
                        .replace(/_/g, "-")
                        .replace(/[^A-Za-z0-9\-]/g, "");

                    // Format : id_heureDepart_livreur_totalDuration_totalDistance
                    formattedId = `${idToken}_${departureToken}_${courierToken}_${totalDuration}_${totalDistance}`;
                }

                tour.id = formattedId;

                const tourJSON = tour.toJSON ? tour.toJSON() : {
                    id: formattedId,
                    departureTime: departureTime,
                    courier: tour.courier ? { id: tour.courier.id, name: tour.courier.name } : null,
                    stops: tour.stops || [],
                    legs: tour.legs || [],
                    totalDistance: totalDistance,
                    totalDuration: totalDuration
                };

                const payload = JSON.stringify(tourJSON);

                fetch('/api/tours/save', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: payload
                })
                    .then(response => response.json())
                    .then(data => {
                        resolve({
                            success: true,
                            message: data.message,
                            tourId: data.tourId,
                            filename: data.filename
                        });
                    })
                    .catch(error => {
                        resolve({ success: false, error: error.message });
                    });
            } catch (error) {
                resolve({ success: false, error: error.message });
            }
        });
    }

    /**
    * Charge la liste des tournées sauvegardées depuis le serveur
    * et retourne un tableau d'objets avec les infos importantes.
    * Format attendu du nom de fichier :
    *   id_departureTime_courier_totalDuration_totalDistance.json
    * ex : T1_08h00_Pierre_5280_5200.json
    */
    async loadSavedToursSummary() {
        try {
            const res = await fetch('/api/tours/list', { cache: 'no-store' });
            if (!res.ok) {
                return { success: false, error: `Erreur HTTP ${res.status}` };
            }

            const data = await res.json();
            if (!data.success) {
                return { success: false, error: data.error || 'Erreur API liste tournées' };
            }

            const tours = (data.tours || [])
                .map(item => {
                    const parsed = this._parseTourFilename(item.filename);
                    if (!parsed) return null;
                    return {
                        ...parsed,
                        tourId: item.tourId  // ex: "T1_08h00_Pierre_5280_5200"
                    };
                })
                .filter(Boolean);

            return { success: true, tours };
        } catch (e) {
            return { success: false, error: e.message };
        }
    }


    /**
     * Parse un nom de fichier :
     *   id_departureTime_courier_totalDuration_totalDistance.json
     */
    _parseTourFilename(filename) {
        if (!filename) return null;

        const base = filename.replace(/\.json$/i, '');
        const parts = base.split('_');
        if (parts.length !== 5) {
            return null;
        }

        const [id, departureTimeRaw, courierRaw, totalDurationRaw, totalDistanceRaw] = parts;

        const totalDuration = Number(totalDurationRaw);
        const totalDistance = Number(totalDistanceRaw);

        return {
            filename,
            id,
            departureTime: departureTimeRaw,
            courier: courierRaw.replace(/-/g, ' '),
            totalDuration: isNaN(totalDuration) ? 0 : totalDuration,
            totalDistance: isNaN(totalDistance) ? 0 : totalDistance
        };
    }

    async loadTourFromServer(tourIdOrFilename) {
        if (!tourIdOrFilename) {
            return { success: false, error: "Aucun identifiant de tournée fourni." };
        }

        const tourId = tourIdOrFilename.replace(/\.json$/i, '');

        try {
            const res = await fetch(`/api/tours/load/${encodeURIComponent(tourId)}`, { cache: 'no-store' });
            if (!res.ok) {
                return { success: false, error: `Erreur HTTP ${res.status}` };
            }

            const data = await res.json();
            const tour = this.loadTourFromJSON(data);

            if (!tour) {
                return { success: false, error: "Impossible de reconstruire la tournée à partir du JSON." };
            }

            this.toursList.push(tour);
            return { success: true, tour };
        } catch (e) {
            return { success: false, error: e.message };
        }
    }


    //lire un fichier XML de demandes de livraison.
    //parser parser <livraison .../>, pour chaque livraison créer un objet Demand
    //Ajouter les objets Demande à this.demandsList
    //Accepte soit un filePath (Node.js) soit un fileInput (navigateur)

    async loadDemandsFromXML(filePathOrInput) {
        let xmlContent;

        // Cas 1: Navigateur - fileInput avec files
        if (filePathOrInput && filePathOrInput.files) {
            // Vérifier qu'un fichier est sélectionné
            if (filePathOrInput.files.length === 0) {
                return { success: false, error: "Aucun fichier sélectionné. Veuillez choisir un fichier XML." };
            }

            const file = filePathOrInput.files[0];

            // Vérifier l'extension et le type MIME
            const fileName = file.name.toLowerCase();
            const isXmlExtension = fileName.endsWith(".xml");
            const isXmlMime = file.type === "text/xml" || file.type === "application/xml" || file.type === "";

            if (!isXmlExtension && !isXmlMime) {
                return { success: false, error: "Le fichier sélectionné n'est pas un fichier XML." };
            }

            // Lire le contenu du fichier
            try {
                xmlContent = await file.text();
            } catch (error) {
                return { success: false, error: "Impossible de lire le fichier. Vérifiez qu'il n'est pas corrompu." };
            }

            // Parser avec DOMParser (navigateur)
            const xmlDoc = new DOMParser().parseFromString(xmlContent, "application/xml");

            if (xmlDoc.getElementsByTagName("parsererror").length > 0) {
                return { success: false, error: "Le contenu du fichier XML est invalide ou mal formé." };
            }

            const root = xmlDoc.getElementsByTagName("demandeDeLivraisons")[0];
            if (!root) {
                return { success: false, error: "Le XML ne contient pas la balise <demandeDeLivraisons>." };
            }

            const entrepot = xmlDoc.getElementsByTagName("entrepot")[0];
            const livraisons = xmlDoc.getElementsByTagName("livraison");

            if (!entrepot) {
                return { success: false, error: "Aucun entrepôt trouvé dans le XML." };
            }

            if (livraisons.length === 0) {
                return { success: false, error: "Aucune livraison trouvée dans le XML." };
            }

            // Récupérer l'adresse de l'entrepôt et l'heure de départ
            const warehouseAddress = entrepot.getAttribute("adresse");
            const departureTime = entrepot.getAttribute("heureDepart");

            // Initialiser le warehouse dans le plan si le plan est chargé
            if (this.plan && warehouseAddress) {
                const warehouseNode = this.plan.getNodeById(warehouseAddress);
                if (warehouseNode) {
                    this.plan.warehouse = warehouseNode;
                    console.log('Entrepôt défini:', warehouseAddress);
                } else {
                    console.warn('Noeud d\'entrepôt non trouvé dans le plan:', warehouseAddress);
                }
            }

            // Créer un coursier par défaut si aucun n'existe
            if (this.listCouriers.length === 0) {
                const defaultCourier = new Courier(1, 'Pierre');
                this.listCouriers.push(defaultCourier);
                console.log('Coursier par défaut créé:', defaultCourier.name);
            }

            // Ne pas vider la liste pour conserver les demandes ajoutées manuellement
            // this.demandsList = [];

            let demandsLoaded = 0;
            let invalidCount = 0;

            for (let livraison of livraisons) {
                const pickupAddress = livraison.getAttribute("adresseEnlevement");
                const deliveryAddress = livraison.getAttribute("adresseLivraison");
                const pickupDuration = parseInt(livraison.getAttribute("dureeEnlevement"));
                const deliveryDuration = parseInt(livraison.getAttribute("dureeLivraison"));

                // Vérification basique des champs
                if (!pickupAddress || !deliveryAddress || isNaN(pickupDuration) || isNaN(deliveryDuration)) {
                    invalidCount++;
                    continue;
                }

                // Si un plan est chargé, vérifier que les nœuds existent
                if (this.plan && typeof this.plan.getNodeById === "function") {
                    const pickupNode = this.plan.getNodeById(pickupAddress);
                    const deliveryNode = this.plan.getNodeById(deliveryAddress);

                    if (!pickupNode || !deliveryNode) {
                        console.warn(
                            "Demande invalide (noeud introuvable) :",
                            { pickupAddress, deliveryAddress }
                        );
                        invalidCount++;
                        continue;
                    }
                }

                // Demande valide → on l'ajoute
                const demande = new Demand(
                    pickupAddress,
                    deliveryAddress,
                    pickupDuration,
                    deliveryDuration,
                    this.nextDemandId++
                );
                this.demandsList.push(demande);
                demandsLoaded++;
            }

            console.log(`${demandsLoaded} demandes valides chargées. ${invalidCount} demandes invalides ignorées.`);

            const result = {
                success: demandsLoaded > 0,
                demands: this.demandsList,
                warehouse: { address: warehouseAddress, departureTime: departureTime },
                count: demandsLoaded,
                invalidCount: invalidCount
            };

            if (invalidCount > 0 && demandsLoaded > 0) {
                result.warning = `${invalidCount} demandes ne sont pas valides et ont été ignorées.`;
            } else if (demandsLoaded === 0) {
                result.error = "Toutes les demandes du fichier sont invalides.";
            }

            return result;
        }

        // Cas 2: Node.js - filePath (string)
        if (typeof require === 'undefined') {
            console.error("loadDemandsFromXML can only be used in Node.js environment for file paths");
            return { success: false, error: "Environnement Node.js requis pour charger depuis un chemin de fichier" };
        }

        try {
            const fs = require("fs");
            const xml2js = require("xml2js");

            xmlContent = await fs.promises.readFile(filePathOrInput, "utf-8");

            const json = await xml2js.parseStringPromise(xmlContent);

            const root = json.demandeDeLivraisons;
            if (!root || !root.livraison) {
                console.log("Aucune balise <livraison> trouvée dans le XML.");
                return { success: false, error: "Aucune balise <livraison> trouvée dans le XML." };
            }

            const livraisons = root.livraison;
            console.log("Nombre de livraisons :", livraisons.length);

            let demandsLoaded = 0;
            let invalidCount = 0;

            for (const livraisonNode of livraisons) {
                const attrs = livraisonNode.$ || {};
                const pickupAddress = attrs.adresseEnlevement;
                const deliveryAddress = attrs.adresseLivraison;
                const pickupDuration = Number(attrs.dureeEnlevement);
                const deliveryDuration = Number(attrs.dureeLivraison);

                if (!pickupAddress || !deliveryAddress || isNaN(pickupDuration) || isNaN(deliveryDuration)) {
                    invalidCount++;
                    continue;
                }

                // Validation optionnelle via plan si disponible dans les tests Node
                if (this.plan && typeof this.plan.getNodeById === "function") {
                    const pickupNode = this.plan.getNodeById(pickupAddress);
                    const deliveryNode = this.plan.getNodeById(deliveryAddress);
                    if (!pickupNode || !deliveryNode) {
                        invalidCount++;
                        continue;
                    }
                }

                const demande = new Demand(
                    pickupAddress,
                    deliveryAddress,
                    pickupDuration,
                    deliveryDuration,
                    this.nextDemandId++
                );
                this.demandsList.push(demande);
            };

            return { success: true, demands: this.demandsList, count: this.demandsList.length };

        } catch (error) {
            console.error("Error while reading demand XML:", error);
            return { success: false, error: error.message };
        }
    }


    addDemand(pickupAddress, deliveryAddress, pickupDuration, deliveryDuration) {
        //Vérifie si un plan est chargé
        if (!this.plan) {
            return { success: false, error: "Aucun plan chargé. Impossible d'ajouter une demande." };
        }
        //Verfier que les noeuds existent dans le plan
        const pickupNode = this.plan.getNodeById(pickupAddress);
        const deliveryNode = this.plan.getNodeById(deliveryAddress);
        if (!pickupNode || !deliveryNode) {
            return { success: false, error: `Le noeud indiqué n'existe pas sur la map` };
        }
        // Créer la demande avec les IDs (comme loadDemandsFromXML), pas les objets Node
        // Cela permet à calculateTour d'utiliser correctement findShortestPath avec les IDs
        const demande = new Demand(pickupAddress, deliveryAddress, pickupDuration, deliveryDuration, this.nextDemandId++);
        this.demandsList.push(demande);
        return { success: true, demand: demande };
    }

    updateDemand(idDemand, pickupAddress, deliveryAddress, pickupDuration, deliveryDuration) {
        //Vérifie si un plan est chargé
        if (!this.plan) {
            return { success: false, error: "Aucun plan chargé. Impossible d'ajouter une demande." };
        }
        //Vérifier que la demande existe et la récupérer grace à son id
        const demandeIndex = this.demandsList.findIndex(d => d.id === idDemand);
        if (demandeIndex === -1) {
            return { success: false, error: `La demande avec l'id ${idDemand} n'existe pas.` };
        }
        const demande = this.demandsList[demandeIndex];

        //Verfier que les noeuds existent dans le plan
        const pickupNode = this.plan.getNodeById(pickupAddress);
        const deliveryNode = this.plan.getNodeById(deliveryAddress);
        if (!pickupNode || !deliveryNode) {
            return { success: false, error: `Le noeud indiqué n'existe pas sur la map` };
        }
        //MAJ les attributs de la demande
        demande.pickupAddress = pickupAddress;
        demande.deliveryAddress = deliveryAddress;
        demande.pickupDuration = Number(pickupDuration);
        demande.deliveryDuration = Number(deliveryDuration);

        return { success: true, demand: demande };
    }

    removeDemandById(id) {
        const index = this.demandsList.findIndex(d => d.id === id);
        if (index !== -1) {
            this.demandsList.splice(index, 1);
            return true;
        }
        return false;
    }

    /**
     * Calculate travel time from distance
     * @param {number} distance - Distance in meters
     * @returns {number} Travel time in seconds (assuming 15 km/h average speed)
     */
    calculateTravelTime(distance) {
        const speedMPerS = 15000 / 3600; // 15 km/h = 4.17 m/s
        return Math.round(distance / speedMPerS);
    }

    calculateTour(demands) {
        // Check if demands list is empty or null
        if (!demands || demands.length === 0) {
            console.error("Cannot calculate tour: no demands provided");
            return null;
        }

        // Check if there are couriers in the system
        if (!this.listCouriers || this.listCouriers.length === 0) {
            console.error("Cannot calculate tour: no couriers in the system");
            return null;
        }

        // Check if plan and warehouse are set
        if (!this.plan || !this.plan.warehouse) {
            console.error("Cannot calculate tour: plan or warehouse not set");
            return null;
        }

        let tour = new Tour(null, "8:00", this.listCouriers[0]);

        // First leg: warehouse to first pickup
        let { path, distance, segments } = this.plan.findShortestPath(this.plan.warehouse.id, demands[0].pickupAddress);
        let travelTime = this.calculateTravelTime(distance);
        let leg = new Leg(this.plan.warehouse, path[path.length - 1], path, segments, distance, travelTime);
        tour.addLeg(leg);
        tour.addStop(new TourPoint(this.plan.warehouse, 0, "WAREHOUSE", demands[0]));

        for (let i = 0; i < demands.length - 1; ++i) {
            let demand = demands[i];
            let nextDemand = demands[i + 1];
            let { path, distance, segments } = this.plan.findShortestPath(demand.pickupAddress, demand.deliveryAddress);
            let travelTime = this.calculateTravelTime(distance);
            let leg = new Leg(path[0], path[path.length - 1], path, segments, distance, travelTime);
            tour.addLeg(leg);
            tour.addStop(new TourPoint(path[0], demand.pickupDuration, "PICKUP", demand));
            tour.addStop(new TourPoint(path[path.length - 1], demand.deliveryDuration, "DELIVERY", demand));

            let { path: nextPath, distance: nextDistance, segments: nextSegments } = this.plan.findShortestPath(demand.deliveryAddress, nextDemand.pickupAddress);
            let nextTravelTime = this.calculateTravelTime(nextDistance);
            let nextLeg = new Leg(nextPath[0], nextPath[nextPath.length - 1], nextPath, nextSegments, nextDistance, nextTravelTime);
            tour.addLeg(nextLeg);
        }

        // Last demand pickup and delivery
        let lastDemand = demands[demands.length - 1];
        let { path: lastPath, distance: lastDistance, segments: lastSegments } = this.plan.findShortestPath(lastDemand.pickupAddress, lastDemand.deliveryAddress);
        let lastTravelTime = this.calculateTravelTime(lastDistance);
        let lastLeg = new Leg(lastPath[0], lastPath[lastPath.length - 1], lastPath, lastSegments, lastDistance, lastTravelTime);
        tour.addLeg(lastLeg);
        tour.addStop(new TourPoint(lastPath[0], lastDemand.pickupDuration, "PICKUP", lastDemand));
        tour.addStop(new TourPoint(lastPath[lastPath.length - 1], lastDemand.deliveryDuration, "DELIVERY", lastDemand));
        // Retour à l'entrepôt
        let { path: returnPath, distance: returnDistance, segments: returnSegments } = this.plan.findShortestPath(lastDemand.deliveryAddress, this.plan.warehouse.id);
        let returnTravelTime = this.calculateTravelTime(returnDistance);
        let returnLeg = new Leg(returnPath[0], this.plan.warehouse, returnPath, returnSegments, returnDistance, returnTravelTime);
        tour.addLeg(returnLeg);
        tour.addStop(new TourPoint(this.plan.warehouse, 0, "WAREHOUSE", null));

        // Calculate total distance and duration
        tour.calculateTotalDistance();
        tour.calculateTotalDuration();

        this.toursList.push(tour);
        return tour;
    }


    /**
     * Distribute demands among couriers using K-means clustering by proximity
     * Groups nearby demands together for each courier
     * @param {number} nbCouriers - Number of couriers to distribute among
     * @returns {Array<Array<Demand>>} Array of demand groups, one per courier
     */
    distributeDemands(nbCouriers) {
        if (!this.demandsList || this.demandsList.length === 0) {
            console.error("Cannot distribute demands: no demands in list");
            return [];
        }

        const numCouriers = Math.min(nbCouriers, this.demandsList.length);
        console.log(`\n${'='.repeat(60)}`);
        console.log(`DISTRIBUTING ${this.demandsList.length} demands among ${numCouriers} couriers using K-means`);
        console.log(`${'='.repeat(60)}\n`);

        if (this.demandsList.length <= numCouriers) {
            // Each demand gets assigned to one courier
            console.log("Demands <= Couriers: assigning one demand per courier");
            const groups = [];
            for (let i = 0; i < this.demandsList.length; i++) {
                groups.push([this.demandsList[i]]);
            }
            // Fill remaining couriers with empty arrays
            for (let i = this.demandsList.length; i < numCouriers; i++) {
                groups.push([]);
            }
            return groups;
        }

        // Use K-means clustering to group demands by geographic proximity
        const clusters = this.kmeansClustering(this.demandsList, numCouriers);

        // Extract demand groups from clusters
        const demandGroups = clusters.map(cluster => cluster.demands);

        console.log(`Distribution complete: ${demandGroups.length} groups created`);
        demandGroups.forEach((group, idx) => {
            console.log(`  Courier ${idx + 1}: ${group.length} demands`);
        });

        return demandGroups;
    }

    /**
     * Compute optimal tours for couriers using K-means distribution + ComputerTour TSP
     * Each tour:
     * - Starts from warehouse at 8:00
     * - Visits all pickups and deliveries for that courier's demands
     * - Returns to warehouse
     * - Minimizes total arrival time at warehouse using ComputerTour class
     * @param {Array<Courier>} couriers - List of couriers to assign tours
     * @returns {{code: number, tours: Array<Tour>}} Result object with:
     *   - code: 0 = success, 1 = error (plan/demands/computation failure), 2 = tour exceeds 8h limit
     *   - tours: Array of computed tours (empty on error/time limit exceeded)
     */
    computeTours(couriers) {
        const startTime = Date.now();

        if (!this.plan || !this.plan.nodes || this.demandsList.length === 0) {
            console.error("Cannot compute tours: plan or demands are missing");
            return { code: 1, tours: [] };
        }

        if (!couriers || couriers.length === 0) {
            console.error("Cannot compute tours: no couriers available");
            return { code: 1, tours: [] };
        }

        const nomCouriers = couriers.length;

        // Step 1: Distribute demands among couriers using K-means
        const demandGroups = this.distributeDemands(nomCouriers);

        const distributionTime = (Date.now() - startTime) / 1000;
        console.log(`\nDemand distribution completed in ${distributionTime.toFixed(2)} seconds`);

        // Step 2: Create warehouse TourPoint for ComputerTour
        const warehouse = this.plan.warehouse;
        if (!warehouse) {
            console.error("Cannot compute tours: no warehouse defined");
            return { code: 1, tours: [] };
        }
        const warehouseTourPoint = new TourPoint(warehouse, 0, TypePoint.WAREHOUSE, null);

        // Step 3: Build optimal tour for each courier's demand group using ComputerTour
        const tours = [];
        for (let i = 0; i < Math.min(demandGroups.length, nomCouriers); i++) {
            let computeStartTime = Date.now();
            const courier = couriers[i];
            const courierDemands = demandGroups[i];

            if (courierDemands.length === 0) {
                console.log(`⚠️  Courier ${courier.name} has no demands assigned`);
                continue;
            }

            console.log(`\nComputing tour for ${courier.name} (${courierDemands.length} demands) using ComputerTour...`);

            // Convert demands to pickup/delivery TourPoint pairs
            const pickupDeliveryPairs = this.createTourPointPairs(courierDemands);

            if (pickupDeliveryPairs.length === 0) {
                console.warn(`⚠️  No valid pickup/delivery pairs for courier ${courier.name}`);
                return { code: 1, tours: [] };
            }

            // Create ComputerTour instance
            const computerTour = new ComputerTour(this.plan, warehouseTourPoint);

            // Compute the optimal tour
            const tour = computerTour.computeTour(pickupDeliveryPairs, courier);

            let computeEndTime = Date.now();
            let computeDuration = (computeEndTime - computeStartTime) / 1000;
            console.log(`Tour computed in ${computeDuration.toFixed(2)} seconds`);

            if (tour) {

                tour.calculateTotalDuration();
                const maxDurationSeconds = 8 * 60 * 60;
                const tourDurationSeconds = tour.totalDuration || 0;

                if (tourDurationSeconds > maxDurationSeconds) {
                    tours.push(tour);
                    this.toursList.push(tour);
                    return { code: 2, tours: tours };
                }

                tours.push(tour);
                this.toursList.push(tour);
                console.log(`✅ Tour completed: ${tour.stops?.length || 0} stops, ${(tour.totalDistance / 1000).toFixed(2)} km, ${(tourDurationSeconds / 3600).toFixed(1)}h`);

            } else {
                console.error(`❌ Failed to compute tour for courier ${courier.name}`);
                return { code: 1, tours: [] };
            }
        }
        // Nombre de couriers insuffisant (code = 2) :
        //return {code: 2, tours: ?};

        // Erreur autre (code = 1) :
        //  return {code: 1, tours: ?};

        // Succés (code = 0) :
        return { code: 0, tours: tours };
    }

    /**
     * Create TourPoint pairs (pickup, delivery) from demands
     * @param {Array<Demand>} demands - Array of demands
     * @returns {Array<[TourPoint, TourPoint]>} Array of pickup/delivery TourPoint pairs
     */
    createTourPointPairs(demands) {
        const pairs = [];

        for (const demand of demands) {
            try {
                // Get pickup and delivery nodes
                const pickupNodeId = demand.pickupAddress?.id || demand.pickupAddress;
                const deliveryNodeId = demand.deliveryAddress?.id || demand.deliveryAddress;

                const pickupNode = this.plan.nodes.get(pickupNodeId);
                const deliveryNode = this.plan.nodes.get(deliveryNodeId);

                if (!pickupNode) {
                    console.error(`Pickup node not found: ${pickupNodeId} for demand ${demand.id}`);
                    continue;
                }

                if (!deliveryNode) {
                    console.error(`Delivery node not found: ${deliveryNodeId} for demand ${demand.id}`);
                    continue;
                }

                // Create TourPoint objects
                const pickupTourPoint = new TourPoint(
                    pickupNode,
                    demand.pickupDuration || 300, // 5 minutes default
                    TypePoint.PICKUP,
                    demand
                );

                const deliveryTourPoint = new TourPoint(
                    deliveryNode,
                    demand.deliveryDuration || 300, // 5 minutes default
                    TypePoint.DELIVERY,
                    demand
                );

                pairs.push([pickupTourPoint, deliveryTourPoint]);
                console.log(`  ✓ Created TourPoint pair for demand ${demand.id}: ${pickupNodeId} → ${deliveryNodeId}`);

            } catch (error) {
                console.error(`Error creating TourPoint pair for demand ${demand.id}:`, error);
            }
        }

        console.log(`Created ${pairs.length} pickup/delivery pairs from ${demands.length} demands`);
        return pairs;
    }

    /**
     * Dijkstra's algorithm to find shortest path between two nodes
     * @param {string} startId - Start node ID
     * @param {string} endId - End node ID
     * @returns {object} {path: [], distance: number} or {path: [], distance: Infinity} if unreachable
     */
    dijkstra(startId, endId) {
        if (startId === endId) {
            return { path: [startId], distance: 0 };
        }

        const distances = new Map();
        const previous = new Map();
        const unvisited = new Set();

        // Initialize distances
        for (const [nodeId] of this.plan.nodes) {
            distances.set(nodeId, Infinity);
            unvisited.add(nodeId);
        }
        distances.set(startId, 0);

        while (unvisited.size > 0) {
            // Find unvisited node with minimum distance
            let current = null;
            let minDist = Infinity;
            for (const nodeId of unvisited) {
                const dist = distances.get(nodeId);
                if (dist < minDist) {
                    minDist = dist;
                    current = nodeId;
                }
            }

            if (current === null || minDist === Infinity) break;
            if (current === endId) break;

            unvisited.delete(current);

            // Check neighbors through distance matrix
            if (this.distanceMatrix.has(current)) {
                const neighbors = this.distanceMatrix.get(current);
                for (const [neighborId, edgeDistance] of neighbors) {
                    if (!unvisited.has(neighborId)) continue;

                    const alt = distances.get(current) + edgeDistance;
                    if (alt < distances.get(neighborId)) {
                        distances.set(neighborId, alt);
                        previous.set(neighborId, current);
                    }
                }
            }
        }

        // Reconstruct path
        const path = [];
        let current = endId;

        if (distances.get(endId) === Infinity) {
            return { path: [], distance: Infinity };
        }

        while (current !== undefined) {
            path.unshift(current);
            current = previous.get(current);
        }

        return {
            path: path,
            distance: distances.get(endId)
        };
    }

    /**
     * Recalculate legs of an existing tour after manual reordering of stops.
     * Uses Dijkstra on the current plan to rebuild each leg so the polyline
     * follows the real graph instead of straight lines.
     * @param {Tour} tour
     */
    recalculateTourLegs(tour) {
        if (!tour || !Array.isArray(tour.stops) || tour.stops.length < 2) {
            console.warn("System.recalculateTourLegs: invalid tour or not enough stops");
            return;
        }
        if (!this.plan || !this.plan.nodes || !(this.plan.nodes instanceof Map)) {
            console.warn("System.recalculateTourLegs: plan or nodes map not initialized");
            return;
        }
        if (!this.distanceMatrix) {
            console.warn("System.recalculateTourLegs: distanceMatrix not initialized");
            return;
        }

        const newLegs = [];
        let hadError = false;

        for (let i = 0; i < tour.stops.length - 1; i++) {
            const fromStop = tour.stops[i];
            const toStop = tour.stops[i + 1];

            const fromNode = fromStop && fromStop.node;
            const toNode = toStop && toStop.node;

            if (!fromNode || !toNode || !fromNode.id || !toNode.id) {
                console.warn("System.recalculateTourLegs: missing node for stops", i, i + 1);
                hadError = true;
                break;
            }

            const result = this.dijkstra(fromNode.id, toNode.id);
            if (!result || !Array.isArray(result.path) || result.path.length < 2 || result.distance === Infinity) {
                console.warn(`System.recalculateTourLegs: no path found between ${fromNode.id} and ${toNode.id}`);
                hadError = true;
                break;
            }

            const pathNodes = result.path
                .map(id => this.plan.nodes.get(id))
                .filter(n => n);

            if (pathNodes.length < 2) {
                console.warn("System.recalculateTourLegs: insufficient path nodes between stops", i, i + 1);
                hadError = true;
                break;
            }

            // Compute distance in meters by summing segment lengths along the path
            let distance = 0;
            for (let j = 0; j < pathNodes.length - 1; j++) {
                const origin = pathNodes[j];
                const dest = pathNodes[j + 1];
                if (!origin || !origin.segments) continue;
                const seg = origin.segments.find(s => s.destination && s.destination.id === dest.id);
                if (seg && typeof seg.length === "number") {
                    distance += seg.length;
                }
            }

            const travelTime = this.calculateTravelTime(distance);
            const leg = new Leg(pathNodes[0], pathNodes[pathNodes.length - 1], pathNodes, [], distance, travelTime);
            newLegs.push(leg);
        }

        // If any leg failed to be rebuilt, keep existing legs to avoid corrupting the tour
        if (hadError || newLegs.length !== tour.stops.length - 1) {
            console.warn("System.recalculateTourLegs: keeping existing legs due to errors");
            return;
        }

        tour.legs = newLegs;

        if (typeof tour.calculateTotalDistance === "function") {
            tour.calculateTotalDistance();
        }
        if (typeof tour.calculateTotalDuration === "function") {
            tour.calculateTotalDuration();
        }
    }

    /**
     * K-means clustering algorithm to group demands by geographic proximity
     * IMPORTANT: Respects that each demand is atomic - pickup and delivery stay together
     * @param {Array<Demand>} demands - Demands to cluster (must be complete with pickup+delivery)
     * @param {number} k - Number of clusters (couriers)
     * @returns {Array<Object>} Clusters with {demands: [], centroid: {lat, lon}}
     */
    kmeansClustering(demands, k) {
        const maxIterations = 10;
        const convergenceThreshold = 0.001;
        let clusters = [];

        // Validate: Each demand must be complete (have pickup and delivery addresses)
        for (const demand of demands) {
            if (!demand.pickupAddress || !demand.deliveryAddress) {
                console.error(`Invalid demand: ${demand.id} missing pickup or delivery address`);
                return [];
            }
        }

        // Step 1: Initialize centroids using k-means++ (well-spread starting points)
        const centroids = this.initializeKmeansPlusPlus(demands, k);
        console.log(`K-means initialized with ${k} centroids`);
        console.log(`Each demand will be kept ATOMIC (pickup + delivery together in same cluster)`);

        // Step 2: Iterative clustering
        for (let iteration = 0; iteration < maxIterations; iteration++) {
            // Assign demands to nearest centroid
            // IMPORTANT: We assign the ENTIRE demand (pickup+delivery) to one cluster
            clusters = new Array(k).fill(null).map(() => ({ demands: [], centroid: null }));

            for (const demand of demands) {
                // Calculate centroid based on BOTH pickup and delivery locations
                const demandCenter = this.calculateDemandCentroid(demand);
                let minDist = Infinity;
                let closestCluster = 0;

                // Find closest cluster centroid
                for (let i = 0; i < centroids.length; i++) {
                    const dist = this.euclideanDistance(demandCenter, centroids[i]);
                    if (dist < minDist) {
                        minDist = dist;
                        closestCluster = i;
                    }
                }

                // Assign ENTIRE demand to the cluster
                // This ensures pickup and delivery stay together
                clusters[closestCluster].demands.push(demand);

                console.log(`  Demand ${demand.id}: assigned to cluster ${closestCluster} (distance: ${minDist.toFixed(4)})`);
            }

            // Recalculate centroids
            const oldCentroids = JSON.parse(JSON.stringify(centroids));
            for (let i = 0; i < k; i++) {
                if (clusters[i].demands.length > 0) {
                    centroids[i] = this.calculateClusterCentroid(clusters[i].demands);
                    clusters[i].centroid = centroids[i];
                    console.log(`  Cluster ${i} centroid: (${centroids[i].lat.toFixed(4)}, ${centroids[i].lon.toFixed(4)}), ${clusters[i].demands.length} demands`);
                } else {
                    // Keep old centroid if no demands
                    centroids[i] = oldCentroids[i];
                }
            }

            // Check for convergence
            let converged = true;
            for (let i = 0; i < k; i++) {
                const distance = this.euclideanDistance(oldCentroids[i], centroids[i]);
                if (distance > convergenceThreshold) {
                    converged = false;
                    break;
                }
            }

            if (converged) {
                console.log(`K-means converged after ${iteration + 1} iterations`);
                break;
            }
        }

        // Filter empty clusters
        clusters = clusters.filter(c => c.demands.length > 0);
        console.log(`K-means complete: ${clusters.length} non-empty clusters`);

        // Validation: Verify each cluster has complete demands
        for (let i = 0; i < clusters.length; i++) {
            let pickupCount = 0, deliveryCount = 0;
            for (const demand of clusters[i].demands) {
                if (demand.pickupAddress) pickupCount++;
                if (demand.deliveryAddress) deliveryCount++;
            }
            console.log(`  Cluster ${i}: ${clusters[i].demands.length} demands (${pickupCount} pickups, ${deliveryCount} deliveries)`);
        }

        return clusters;
    }

    /**
     * Initialize K-means++ centroids (spread out for better convergence)
     * @param {Array<Demand>} demands - Demands to cluster
     * @param {number} k - Number of clusters
     * @returns {Array<Object>} Initial centroids as {lat, lon}
     */
    initializeKmeansPlusPlus(demands, k) {
        const centroids = [];

        // First centroid: random demand center
        const firstDemand = demands[Math.floor(Math.random() * demands.length)];
        centroids.push(this.calculateDemandCentroid(firstDemand));

        // Subsequent centroids: choose points with maximum distance to existing centroids
        for (let i = 1; i < k; i++) {
            let maxMinDist = -Infinity;
            let bestDemand = null;

            for (const demand of demands) {
                const demandCenter = this.calculateDemandCentroid(demand);
                let minDist = Infinity;

                for (const centroid of centroids) {
                    const dist = this.euclideanDistance(demandCenter, centroid);
                    minDist = Math.min(minDist, dist);
                }

                if (minDist > maxMinDist) {
                    maxMinDist = minDist;
                    bestDemand = demand;
                }
            }

            if (bestDemand) {
                centroids.push(this.calculateDemandCentroid(bestDemand));
            }
        }

        return centroids;
    }

    /**
     * Calculate geographic centroid of a demand (average of pickup and delivery coordinates)
     * @param {Demand} demand - The demand
     * @returns {Object} {lat, lon} coordinates
     */
    calculateDemandCentroid(demand) {
        const pickupNode = this.plan.nodes.get(demand.pickupAddress.id || demand.pickupAddress);
        const deliveryNode = this.plan.nodes.get(demand.deliveryAddress.id || demand.deliveryAddress);

        if (!pickupNode || !deliveryNode) {
            return { lat: 0, lon: 0 };
        }

        return {
            lat: (pickupNode.latitude + deliveryNode.latitude) / 2,
            lon: (pickupNode.longitude + deliveryNode.longitude) / 2
        };
    }

    /**
     * Calculate centroid of a cluster of demands
     * @param {Array<Demand>} demands - Demands in the cluster
     * @returns {Object} {lat, lon} cluster center
     */
    calculateClusterCentroid(demands) {
        if (demands.length === 0) {
            return { lat: 0, lon: 0 };
        }

        let totalLat = 0;
        let totalLon = 0;

        for (const demand of demands) {
            const center = this.calculateDemandCentroid(demand);
            totalLat += center.lat;
            totalLon += center.lon;
        }

        return {
            lat: totalLat / demands.length,
            lon: totalLon / demands.length
        };
    }

    /**
     * Euclidean distance between two geographic points
     * @param {Object} point1 - {lat, lon}
     * @param {Object} point2 - {lat, lon}
     * @returns {number} Distance
     */
    euclideanDistance(point1, point2) {
        const dLat = point1.lat - point2.lat;
        const dLon = point1.lon - point2.lon;
        return Math.sqrt(dLat * dLat + dLon * dLon);
    }

    /**
     * Build a tour for a courier using Nearest Neighbor with Dijkstra pathfinding
     * Ensures pickup is visited before corresponding delivery
     * Uses real graph distances via Dijkstra algorithm
     * Creates Leg objects for each segment of the path
     *
     * CONSTRAINTS ENFORCED:
     * - Pickup ALWAYS visited before corresponding delivery
     * - Each demand kept atomically (pickup + delivery together)
     * - Tour starts and ends at warehouse
     *
     * @param {Courier} courier - The courier
     * @param {Array<Demand>} demands - Demands to fulfill (must be complete pickup+delivery pairs)
     * @param {Map} distanceMatrix - Pre-computed distance matrix from loadPlan
     * @returns {Tour} Computed tour
     */
    buildTourForCourier(courier, demands, distanceMatrix) {
        if (demands.length === 0) return null;

        // Validate: All demands must have pickup AND delivery addresses
        console.log(`\n📋 Validating ${demands.length} demands for courier ${courier.name}...`);
        for (let i = 0; i < demands.length; i++) {
            const demand = demands[i];
            if (!demand.pickupAddress || !demand.deliveryAddress) {
                console.error(`❌ INVALID DEMAND ${i}: Missing pickup or delivery address`);
                return null;
            }
            console.log(`   ✓ Demand ${i + 1}: ${demand.pickupAddress} → ${demand.deliveryAddress}`);
        }

        const warehouse = this.plan.warehouse;
        const tour = new Tour(null, "08:00", courier);

        let currentPoint = warehouse;
        const sequence = [currentPoint];
        const pickupsVisited = new Set();
        const deliveriesVisited = new Set();

        console.log(`\n🚗 Building tour for ${courier.name} with ${demands.length} demands...`);

        // Keep visiting points until all pickups and deliveries are done
        // This enforces: pickup MUST be visited before delivery
        while (pickupsVisited.size < demands.length || deliveriesVisited.size < demands.length) {
            let bestDistance = Infinity;
            let bestPath = [];
            let nextTargetId = null;
            let targetDemandIndex = -1;
            let targetType = null; // 'pickup' or 'delivery'

            // Find nearest target using Dijkstra from current position
            for (let i = 0; i < demands.length; i++) {
                const demand = demands[i];
                const pickupId = demand.pickupAddress.id || demand.pickupAddress;
                const deliveryId = demand.deliveryAddress.id || demand.deliveryAddress;

                // Priority 1: Unvisited pickups - MUST visit pickup first
                if (!pickupsVisited.has(pickupId)) {
                    const dijkstraResult = this.dijkstra(currentPoint.id, pickupId);
                    if (dijkstraResult.distance < bestDistance && dijkstraResult.distance !== Infinity) {
                        bestDistance = dijkstraResult.distance;
                        bestPath = dijkstraResult.path;
                        nextTargetId = pickupId;
                        targetDemandIndex = i;
                        targetType = 'pickup';
                    }
                }
                // Priority 2: Deliveries where pickup is ALREADY done
                // This constraint enforces: pickup → delivery order
                else if (pickupsVisited.has(pickupId) && !deliveriesVisited.has(deliveryId)) {
                    const dijkstraResult = this.dijkstra(currentPoint.id, deliveryId);
                    if (dijkstraResult.distance < bestDistance && dijkstraResult.distance !== Infinity) {
                        bestDistance = dijkstraResult.distance;
                        bestPath = dijkstraResult.path;
                        nextTargetId = deliveryId;
                        targetDemandIndex = i;
                        targetType = 'delivery';
                    }
                }
            }

            if (targetDemandIndex === -1 || bestPath.length === 0) {
                console.error(`❌ No valid path found! pickups: ${pickupsVisited.size}/${demands.length}, deliveries: ${deliveriesVisited.size}/${demands.length}`);
                break;
            }

            // Convert path IDs to node objects
            const pathNodes = bestPath.map(nodeId => this.plan.nodes.get(nodeId)).filter(n => n !== undefined);

            // Create a Leg for this segment
            if (pathNodes.length > 0) {
                const originNode = pathNodes[0];
                const destNode = pathNodes[pathNodes.length - 1];
                const travelTime = this.calculateTravelTime(bestDistance);
                const leg = new Leg(originNode, destNode, pathNodes, [], bestDistance, travelTime);
                tour.addLeg(leg);
            }

            // Add all intermediate nodes from the Dijkstra path to sequence
            // Skip the first node (current) and add the rest
            for (let i = 1; i < bestPath.length; i++) {
                const nodeId = bestPath[i];
                const node = this.plan.nodes.get(nodeId);
                if (node) {
                    sequence.push(node);
                }
            }

            // Mark demand points as visited
            if (targetType === 'pickup') {
                pickupsVisited.add(nextTargetId);
            } else if (targetType === 'delivery') {
                deliveriesVisited.add(nextTargetId);
            }

            // Update current point to the target
            currentPoint = this.plan.nodes.get(nextTargetId);
        }

        // Add warehouse as final point (return to origin) with a Leg
        const returnPath = this.dijkstra(currentPoint.id, warehouse.id);
        if (returnPath.path.length > 0) {
            const returnPathNodes = returnPath.path.map(nodeId => this.plan.nodes.get(nodeId)).filter(n => n !== undefined);
            if (returnPathNodes.length > 0) {
                const returnTravelTime = this.calculateTravelTime(returnPath.distance);
                const returnLeg = new Leg(returnPathNodes[0], warehouse, returnPathNodes, [], returnPath.distance, returnTravelTime);
                tour.addLeg(returnLeg);
            }

            for (let i = 1; i < returnPath.path.length; i++) {
                const nodeId = returnPath.path[i];
                const node = this.plan.nodes.get(nodeId);
                if (node) {
                    sequence.push(node);
                }
            }
        }

        // Build tour with the complete sequence
        for (let i = 0; i < sequence.length; i++) {
            const point = sequence[i];
            tour.addStop({
                id: point.id,
                address: point,
                arrivalTime: "08:00",
                departureTime: "08:00"
            });
        }

        // Calculate total distance and duration using Tour's methods
        tour.calculateTotalDistance();

        const totalDistance = tour.totalDistance;

        // Validation: Verify all demands were completed
        console.log(`\n✅ Tour Summary for ${courier.name}:`);
        console.log(`   Total stops: ${sequence.length}`);
        console.log(`   Pickups completed: ${pickupsVisited.size}/${demands.length}`);
        console.log(`   Deliveries completed: ${deliveriesVisited.size}/${demands.length}`);
        console.log(`   Total distance: ${totalDistance.toFixed(2)}`);
        console.log(`   Route: Warehouse → [${pickupsVisited.size} pickups + ${deliveriesVisited.size} deliveries] → Warehouse`);

        // Warn if not all demands completed
        if (pickupsVisited.size !== demands.length || deliveriesVisited.size !== demands.length) {
            console.warn(`⚠️  WARNING: Not all demands completed!`);
            console.warn(`   Expected: ${demands.length} pickups and ${demands.length} deliveries`);
            console.warn(`   Got: ${pickupsVisited.size} pickups and ${deliveriesVisited.size} deliveries`);
        }

        return tour;
    }

    /**
     * Get K-means clusters for the current demands
     * @param {number} k - Number of clusters (couriers)
     * @returns {Array} Array of clusters with demands and centroids
     */
    getKMeansClusters(k) {
        if (!this.demandsList || this.demandsList.length === 0) {
            console.warn('No demands loaded');
            return [];
        }

        if (k < 1 || k > this.demandsList.length) {
            console.warn(`Invalid k: ${k}. Must be between 1 and ${this.demandsList.length}`);
            return [];
        }

        console.log(`\n📊 Computing K-means clusters for ${this.demandsList.length} demands with ${k} couriers`);
        const clusters = this.kmeansClustering(this.demandsList, k);
        console.log(`✅ K-means clustering complete: ${clusters.length} clusters\n`);

        return clusters;
    }

    /**
     * Gets distance from pre-computed distance matrix
     * Returns Infinity if no direct connection exists
     * @param {Map<string, Map<string, number>>} distanceMatrix - Pre-computed distance matrix
     * @param {string|number} fromId - Origin node ID
     * @param {string|number} toId - Destination node ID
     * @returns {number} Distance/time or Infinity if not connected
     */
    getDistance(distanceMatrix, fromId, toId) {
        if (fromId === toId) return 0;
        if (!distanceMatrix.has(fromId)) return Infinity;
        const distance = distanceMatrix.get(fromId).get(toId);
        return distance !== undefined ? distance : Infinity;
    }





}

// Export for Node and Browser
if (typeof module !== "undefined" && module.exports) {
    module.exports = System;
}

if (typeof window !== "undefined") {
    window.System = System;
}

