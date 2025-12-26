class View {
    constructor(startTime, mapElementId) {
        this.startTime = startTime;
        this.listPickupDeliveryPoints = []; // Array of {tourPoint, startTime, endTime}
        this.pairPickupDelivery = []; // Array of {fromTourPoint, toTourPoint}

        // Map display properties
        this.mapElementId = mapElementId;
        this.map = null;
        this.nodeMap = new Map();
        this.tourMarkers = []; // Array to store markers for each stop
        this.selectedMarker = null; // Currently selected marker
        this.selectedStopIndex = null; // Currently selected stop index

        // Node selection mode
        this.nodeSelectionMode = false;
        this.nodeSelectionType = null; // 'pickup' or 'delivery'
        this.selectableNodes = []; // Array of clickable node markers

        if (mapElementId) {
            this.initMap();
        }
    }

    /**
     * Initialize the Leaflet map.
     */
    initMap() {
        this.map = L.map(this.mapElementId);

        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
            maxZoom: 19,
            attribution: "&copy; OpenStreetMap contributors"
        }).addTo(this.map);

        console.log("View: Map initialized");
    }

    /**
     * Display the full plan from { nodes: [...], segments: [...] }
     */
    displayPlan(planJSON) {
        if (!planJSON) {
            console.error("View: planJSON is null");
            return;
        }

        this.clearMap();

        this.nodeMap = new Map(planJSON.nodes.map(n => [n.id, n]));

        this.displaySegments(planJSON.segments);
        this.displayNodes(planJSON.nodes);
        this.fitMapToPlan(planJSON.nodes);

        console.log("View: Plan displayed");
    }

    /**
     * Draw nodes as blue dots (légers pour ne pas dominer la carte)
     */
    displayNodes(nodes) {
        nodes.forEach(node => {
            const marker = L.circleMarker([node.latitude, node.longitude], {
                radius: 2,
                fillColor: "#95a5a6",
                color: "#7f8c8d",
                weight: 1,
                fillOpacity: 0.3,
                opacity: 0.4
            }).addTo(this.map);

            // Stocker une référence aux données du nœud
            marker.nodeData = node;
        });
    }

    /**
     * Active/désactive le mode de sélection de nœuds
     * @param {boolean} active - Activer ou désactiver le mode
     * @param {string} type - 'pickup' ou 'delivery'
     */
    setNodeSelectionMode(active, type = null) {
        this.nodeSelectionMode = active;
        this.nodeSelectionType = type;

        if (active) {
            // Changer le curseur de la carte
            document.getElementById(this.mapElementId).style.cursor = 'crosshair';

            // Rendre tous les nœuds plus visibles et cliquables
            this.makeNodesSelectable();

            console.log(`Mode sélection activé: ${type}`);
        } else {
            // Restaurer le curseur normal
            document.getElementById(this.mapElementId).style.cursor = '';

            // Supprimer les marqueurs de sélection
            this.removeSelectableNodes();

            console.log('Mode sélection désactivé');
        }
    }

    /**
     * Crée des marqueurs cliquables pour tous les nœuds du plan
     */
    makeNodesSelectable() {
        // Supprimer les anciens marqueurs sélectionnables
        this.removeSelectableNodes();

        if (!this.nodeMap || this.nodeMap.size === 0) {
            console.warn('Aucun nœud disponible pour la sélection');
            return;
        }

        // Créer des marqueurs cliquables pour chaque nœud
        this.nodeMap.forEach((node, nodeId) => {
            const color = this.nodeSelectionType === 'pickup' ? '#4caf50' : '#2196f3';

            const marker = L.circleMarker([node.latitude, node.longitude], {
                radius: 6,
                fillColor: color,
                color: '#fff',
                weight: 2,
                fillOpacity: 0.7,
                opacity: 1
            }).addTo(this.map);

            // Tooltip au survol
            marker.bindTooltip(`Point ${nodeId}`, {
                permanent: false,
                direction: 'top'
            });

            // Gestion du clic
            marker.on('click', () => {
                if (this.nodeSelectionMode && window.onNodeSelected) {
                    window.onNodeSelected(node);
                    console.log('Nœud sélectionné:', node.id);
                }
            });

            // Effet de survol
            marker.on('mouseover', function() {
                this.setStyle({
                    radius: 8,
                    fillOpacity: 1
                });
            });

            marker.on('mouseout', function() {
                this.setStyle({
                    radius: 6,
                    fillOpacity: 0.7
                });
            });

            this.selectableNodes.push(marker);
        });

        console.log(`${this.selectableNodes.length} nœuds rendus sélectionnables`);
    }

    /**
     * Supprime tous les marqueurs de sélection
     */
    removeSelectableNodes() {
        this.selectableNodes.forEach(marker => {
            this.map.removeLayer(marker);
        });
        this.selectableNodes = [];
    }

    /**
     * Draw segments as red lines (légers pour ne pas dominer la carte)
     */
    displaySegments(segments) {
        segments.forEach(seg => {
            const origin = this.nodeMap.get(seg.origin);
            const dest = this.nodeMap.get(seg.destination);
            if (!origin || !dest) return;

            L.polyline(
                [
                    [origin.latitude, origin.longitude],
                    [dest.latitude, dest.longitude]
                ],
                {
                    color: "#bdc3c7",
                    weight: 2,
                    opacity: 0.4
                }
            ).addTo(this.map);
        });
    }

    /**
     * Automatic map zoom based on all node positions
     */
    fitMapToPlan(nodes) {
        if (nodes.length === 0) return;
        const bounds = nodes.map(n => [n.latitude, n.longitude]);
        this.map.fitBounds(bounds, { padding: [20, 20] });
    }

    /**
     * Clears all drawn layers from the map except the base tile layer
     * Resets markers and selection state
     */
    clearMap() {
        this.map.eachLayer(layer => {
            if (layer instanceof L.TileLayer) return;
            this.map.removeLayer(layer);
        });
        this.tourMarkers = [];
        this.selectedMarker = null;
        this.selectedStopIndex = null;
    }

    /**
     * Display demands on the map (pickup and delivery points)
     * @param {Array<Demand>} demands - Array of Demand objects
     * @param {Plan} plan - The Plan object to get node coordinates
     */
    displayDemands(demands, plan) {
        if (!demands || demands.length === 0) {
            console.log('View: No demands to display');
            return;
        }

        if (!plan) {
            console.error('View: Plan is required to display demands');
            return;
        }

        demands.forEach((demand, index) => {
            // Get pickup node
            const pickupNode = plan.getNodeById(demand.pickupAddress);
            if (pickupNode) {
                const pickupIcon = L.divIcon({
                    className: 'demand-marker',
                    html: `<div style="
                        background-color: #e67e22;
                        width: 28px;
                        height: 28px;
                        border-radius: 50%;
                        border: 3px solid white;
                        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        font-weight: bold;
                        font-size: 11px;
                        color: white;
                    ">P${index + 1}</div>`,
                    iconSize: [28, 28],
                    iconAnchor: [14, 14]
                });

                const pickupMarker = L.marker([pickupNode.latitude, pickupNode.longitude], {
                    icon: pickupIcon,
                    zIndexOffset: 1000
                }).addTo(this.map);

                pickupMarker.bindPopup(`
                    <strong>📦 Pickup ${index + 1}</strong><br>
                    Client: ${demand.clientName || 'N/A'}<br>
                    Durée: ${Math.round(demand.pickupDuration / 60)} min<br>
                    Node ID: ${pickupNode.id}<br>
                    Coords: (${pickupNode.latitude.toFixed(4)}, ${pickupNode.longitude.toFixed(4)})
                `);
            }

            // Get delivery node
            const deliveryNode = plan.getNodeById(demand.deliveryAddress);
            if (deliveryNode) {
                const deliveryIcon = L.divIcon({
                    className: 'demand-marker',
                    html: `<div style="
                        background-color: #27ae60;
                        width: 28px;
                        height: 28px;
                        border-radius: 50%;
                        border: 3px solid white;
                        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        font-weight: bold;
                        font-size: 11px;
                        color: white;
                    ">D${index + 1}</div>`,
                    iconSize: [28, 28],
                    iconAnchor: [14, 14]
                });

                const deliveryMarker = L.marker([deliveryNode.latitude, deliveryNode.longitude], {
                    icon: deliveryIcon,
                    zIndexOffset: 1000
                }).addTo(this.map);

                deliveryMarker.bindPopup(`
                    <strong>🏠 Delivery ${index + 1}</strong><br>
                    Client: ${demand.clientName || 'N/A'}<br>
                    Durée: ${Math.round(demand.deliveryDuration / 60)} min<br>
                    Node ID: ${deliveryNode.id}<br>
                    Coords: (${deliveryNode.latitude.toFixed(4)}, ${deliveryNode.longitude.toFixed(4)})
                `);
            }

        });

        console.log(`View: ${demands.length} demands displayed on map`);
    }

    /**
     * Display a tour on the map
     * @param {Tour} tour - The Tour object to display
     */
    displayTour(tour) {
        if (!tour) {
            console.error('View: No tour provided');
            return;
        }

        console.log('View: Displaying tour:', tour);

        // Clear existing layers
        this.clearMap();

        // Display the legs (paths between stops)
        this.displayLegs(tour.legs);

        // Display tour stops
        this.displayTourStops(tour.stops);

        // Fit map to show all points
        this.fitMapToTour(tour);
    }

    /**
     * Display the legs (paths between tour points)
     * @param {Array<Leg>} legs - Array of Leg objects
     */
    displayLegs(legs) {
        if (!legs || legs.length === 0) {
            console.log('View: No legs to display');
            return;
        }

        legs.forEach((leg, index) => {
            const pathNodes = leg.pathNode || [];
            if (pathNodes.length === 0) return;

            // Create array of coordinates for the path
            const pathCoordinates = pathNodes.map(node => [node.latitude, node.longitude]);

            // Draw the path
            const pathLine = L.polyline(pathCoordinates, {
                color: '#ff0000',
                weight: 4,
                opacity: 0.7
            }).addTo(this.map);

            pathLine.bindPopup(`
                <strong>Segment ${index + 1}</strong><br>
                Distance: ${(leg.distance / 1000).toFixed(2)} km<br>
                Durée: ${Math.round(leg.travelTime / 60)} min
            `);
        });

        console.log(`View: ${legs.length} legs displayed`);
    }

    /**
     * Display tour stops (pickup/delivery/warehouse points)
     * @param {Array<TourPoint>} stops - Array of TourPoint objects
     */
    displayTourStops(stops) {
        if (!stops || stops.length === 0) {
            console.log('View: No stops to display');
            return;
        }

        // Clear previous markers array
        this.tourMarkers = [];

        stops.forEach((tourPoint, index) => {
            if (!tourPoint || !tourPoint.node) {
                return;
            }

            const node = tourPoint.node;
            const isWarehouse = tourPoint.type === 'WAREHOUSE';
            const isPickup = tourPoint.type === 'PICKUP';
            const isDelivery = tourPoint.type === 'DELIVERY';

            let markerColor = 'blue';
            let label = 'Point';

            if (isWarehouse) {
                markerColor = '#2C3E50';
                label = '🏠 Entrepôt';
            } else if (isPickup) {
                markerColor = '#FFA500';
                label = '📦 Pickup';
            } else if (isDelivery) {
                markerColor = '#4CAF50';
                label = '🏠 Delivery';
            }

            // Create marker with icon
            const icon = L.divIcon({
                className: 'custom-div-icon',
                html: `<div class="tour-marker" data-stop-index="${index}" style="background-color: ${markerColor}; 
                              width: 30px; height: 30px; 
                              border-radius: 50%; 
                              border: 2px solid white;
                              display: flex; 
                              align-items: center; 
                              justify-content: center;
                              font-weight: bold;
                              color: white;
                              transition: all 0.2s;">
                        ${index + 1}
                      </div>`,
                iconSize: [30, 30],
                iconAnchor: [15, 15]
            });

            const marker = L.marker([node.latitude, node.longitude], { icon: icon })
                .addTo(this.map);

            marker.bindPopup(`
                <strong>${label} #${index + 1}</strong><br>
                Type: ${tourPoint.type}<br>
                Durée: ${tourPoint.serviceDuration}s<br>
                Noeud ID: ${node.id}
                ${tourPoint.demand ? `<br>Demande ID: ${tourPoint.demand.id || 'N/A'}` : ''}
            `);

            // Store marker with its index and original color
            this.tourMarkers.push({
                marker: marker,
                index: index,
                node: node,
                tourPoint: tourPoint,
                originalColor: markerColor
            });

            // Add click event to marker
            marker.on('click', () => {
                this.highlightStop(index);
            });
        });

        console.log(`View: ${stops.length} stops displayed`);
    }

    /**
     * Fit the map to show the entire tour
     * @param {Tour} tour - The Tour object
     */
    fitMapToTour(tour) {
        const bounds = [];

        // Add all nodes from legs to bounds
        if (tour.legs && tour.legs.length > 0) {
            tour.legs.forEach(leg => {
                const pathNodes = leg.pathNode || [];
                if (pathNodes.length > 0) {
                    pathNodes.forEach(node => {
                        bounds.push([node.latitude, node.longitude]);
                    });
                }
            });
        }

        // Add stop points to bounds
        if (tour.stops && tour.stops.length > 0) {
            tour.stops.forEach(tourPoint => {
                if (tourPoint.node) {
                    bounds.push([tourPoint.node.latitude, tourPoint.node.longitude]);
                }
            });
        }

        // Fit map to bounds
        if (bounds.length > 0) {
            this.map.fitBounds(bounds, { padding: [50, 50] });
        }
    }

    displayTourDetails(tour, summaryElement, tableBodyElement) {
        if (!summaryElement || !tableBodyElement) return;

        // Si on veut juste nettoyer
        if (!tour) {
            summaryElement.textContent = "";
            tableBodyElement.innerHTML = "";
            return;
        }

        const totalKm = (tour.totalDistance / 1000).toFixed(2);
        const totalMin = Math.round(tour.totalDuration / 60);
        summaryElement.textContent =
            `Tournée ${tour.id} – départ ${tour.departureTime}, ` +
            `distance totale ${totalKm} km, durée totale ~${totalMin} min`;

        tableBodyElement.innerHTML = "";

        let currentSec = this._timeToSeconds(tour.departureTime);

        tour.stops.forEach((stop, index) => {
            const arrivalTime = this._secondsToTime(currentSec);
            const serviceSec = stop.serviceDuration || 0;
            const departureTime = this._secondsToTime(currentSec + serviceSec);

            const tr = document.createElement("tr");

            const tdIndex = document.createElement("td");
            tdIndex.textContent = index + 1;

            const tdType = document.createElement("td");
            tdType.textContent = stop.type;

            const tdNode = document.createElement("td");
            tdNode.textContent = stop.node ? stop.node.id : "";

            const tdDemand = document.createElement("td");
            tdDemand.textContent = stop.demand ? stop.demand.id : "";

            const tdArr = document.createElement("td");
            tdArr.textContent = arrivalTime;

            const tdServ = document.createElement("td");
            tdServ.textContent = Math.round(serviceSec / 60);

            const tdDep = document.createElement("td");
            tdDep.textContent = departureTime;

            tr.appendChild(tdIndex);
            tr.appendChild(tdType);
            tr.appendChild(tdNode);
            tr.appendChild(tdDemand);
            tr.appendChild(tdArr);
            tr.appendChild(tdServ);
            tr.appendChild(tdDep);
            tableBodyElement.appendChild(tr);

            currentSec += serviceSec;
            if (index < tour.legs.length) {
                currentSec += tour.legs[index].travelTime || 0;
            }
        });
    }

    _timeToSeconds(hhmm) {
        const parts = (hhmm || "00:00").split(":").map(Number);
        const h = parts[0] || 0;
        const m = parts[1] || 0;
        return h * 3600 + m * 60;
    }

    _secondsToTime(sec) {
        sec = Math.max(0, Math.floor(sec));
        const h = Math.floor(sec / 3600) % 24;
        const m = Math.floor((sec % 3600) / 60);
        return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
    }


    /**
     * Highlight a specific stop on the map and timeline
     * @param {number} stopIndex - Index of the stop to highlight
     */
    highlightStop(stopIndex) {
        if (!this.tourMarkers || this.tourMarkers.length === 0) {
            console.log('View: No markers to highlight');
            return;
        }

        // Reset previous selection
        if (this.selectedStopIndex !== null && this.selectedStopIndex !== stopIndex) {
            const prevMarkerData = this.tourMarkers[this.selectedStopIndex];
            if (prevMarkerData) {
                const prevElement = prevMarkerData.marker.getElement();
                if (prevElement) {
                    const prevIcon = prevElement.querySelector('.tour-marker');
                    if (prevIcon) {
                        prevIcon.style.backgroundColor = prevMarkerData.originalColor;
                        prevIcon.style.width = '30px';
                        prevIcon.style.height = '30px';
                        prevIcon.style.boxShadow = 'none';
                        prevIcon.style.zIndex = '1000';
                    }
                }
            }
        }

        // Highlight new selection
        const markerData = this.tourMarkers[stopIndex];
        if (markerData) {
            this.selectedStopIndex = stopIndex;
            this.selectedMarker = markerData.marker;

            // Highlight on map
            const element = markerData.marker.getElement();
            if (element) {
                const icon = element.querySelector('.tour-marker');
                if (icon) {
                    icon.style.backgroundColor = '#3498db';
                    icon.style.width = '40px';
                    icon.style.height = '40px';
                    icon.style.boxShadow = '0 0 20px rgba(52, 152, 219, 0.8)';
                    icon.style.zIndex = '2000';
                }
            }

            // Center map on selected marker
            this.map.setView([markerData.node.latitude, markerData.node.longitude], this.map.getZoom());

            // Open popup
            markerData.marker.openPopup();

            // Highlight on timeline
            this.highlightTimelineStep(stopIndex);

            console.log(`View: Stop ${stopIndex} highlighted`);
        }
    }

    /**
     * Highlight the corresponding step in the timeline
     * @param {number} stopIndex - Index of the stop
     */
    highlightTimelineStep(stopIndex) {
        // Remove previous highlights
        document.querySelectorAll('.step').forEach(step => {
            step.classList.remove('step-selected');
        });

        // Add highlight to selected step
        const steps = document.querySelectorAll('.step');
        if (steps[stopIndex]) {
            steps[stopIndex].classList.add('step-selected');
            // Scroll into view
            steps[stopIndex].scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
        }
    }

    /**
     * Affiche la liste des tournées sauvegardées dans une liste jolie.
     * @param {Array} tours - [{ filename, id, departureTime, courier, totalDuration, totalDistance }]
     * @param {HTMLElement} container - élément où afficher la liste
     * @param {HTMLElement} errorElement - élément pour les messages d'erreur (optionnel)
     */
    displayHistoryList(tours, container, errorElement = null, onSelect = null) {
        if (!container) return;

        container.innerHTML = '';

        if (!Array.isArray(tours) || tours.length === 0) {
            container.innerHTML = '<p style="color:#95a5a6;">Aucune tournée trouvée.</p>';
            return;
        }

        const list = document.createElement('div');
        list.className = 'history-list';

        tours.forEach(t => {
            const item = document.createElement('button');
            item.type = 'button';
            item.className = 'history-item';
            item.dataset.tourId = t.tourId || '';
            item.dataset.filename = t.filename || '';

            const title = document.createElement('div');
            title.className = 'history-title';
            title.textContent = t.id || t.filename || '';

            const meta = document.createElement('div');
            meta.className = 'history-meta';

            const time = t.departureTime || '';
            const courier = t.courier || '';

            const durationMin = (typeof t.totalDuration === 'number')
                ? Math.round(t.totalDuration / 60)    // secondes -> minutes
                : null;

            const distanceKm = (typeof t.totalDistance === 'number')
                ? (t.totalDistance / 1000).toFixed(2) // mètres -> km
                : null;

            const metaParts = [];
            if (time) metaParts.push(time);
            if (courier) metaParts.push(courier);
            if (durationMin !== null) metaParts.push(`${durationMin} min`);
            if (distanceKm !== null) metaParts.push(`${distanceKm} km`);

            meta.textContent = metaParts.join(' · ');

            item.appendChild(title);
            item.appendChild(meta);

            if (onSelect) {
                item.addEventListener('click', () => onSelect(t));
            }

            list.appendChild(item);
        });

        container.appendChild(list);

        if (errorElement) {
            errorElement.textContent = '';
        }
    }


    _escapeHtml(s) {
        if (!s) return '';
        return s.replace(/[&<>"']/g, c => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;'
        }[c] || c));
    }


    // Existing methods
    addPickupDeliveryPoint(tourPoint, startTime, endTime) {
        this.listPickupDeliveryPoints.push({ tourPoint, startTime, endTime });
    }

    addPickupDeliveryPair(fromTourPoint, toTourPoint) {
        this.pairPickupDelivery.push({ fromTourPoint, toTourPoint });
    }

    getPickupDeliveryPoints() {
        return this.listPickupDeliveryPoints;
    }

    getPickupDeliveryPairs() {
        return this.pairPickupDelivery;
    }

    setStartTime(time) {
        this.startTime = time;
    }

    getStartTime() {
        return this.startTime;
    }

    /**
     * Display multiple tours on the map with different colors for each courier
     * Each tour is shown with its own polyline color and numbered markers
     * @param {Array<Tour>} tours - Array of tours to display
     */
    displayTours(tours) {
        if (!tours || tours.length === 0) {
            console.warn('No tours to display');
            return;
        }

        // Clear the map first
        this.clearMap();

        // Define 4 high contrast colors for maximum visibility
        const colors = [
            '#FF0000', // Red - Bright
            '#0066FF', // Blue - Bright
            '#00CC00', // Green - Bright
            '#FFB300'  // Orange - Bright
        ];

        console.log(`\n🗺️ Displaying ${tours.length} tours on map with distinct colors`);

        // Display each tour with a different color
        tours.forEach((tour, tourIndex) => {
            const color = colors[tourIndex % colors.length];
            console.log(`   Tour ${tourIndex + 1} (${tour.courier?.name || 'Unknown'}): ${color}`);
            this.displayTourWithColor(tour, color, tourIndex);
        });

        console.log(`✅ All tours displayed on map\n`);
    }

    /**
     * Display a single tour with a specific color
     * @param {Tour} tour - Tour to display
     * @param {string} color - Color for this tour (hex code)
     * @param {number} tourIndex - Index of the tour for labeling
     */
    displayTourWithColor(tour, color = '#3498db', tourIndex = 0) {
        if (!tour || !tour.legs) {
            console.warn(`Tour ${tourIndex} is invalid`);
            return;
        }

        // Draw the route as polylines for each leg
        console.log(`   Drawing ${tour.legs.length} legs for tour ${tourIndex + 1}`);
        
        tour.legs.forEach((leg, legIndex) => {
            if (leg.pathNode && leg.pathNode.length > 1) {
                // Convert nodes to coordinates
                const latlngs = leg.pathNode.map(node => [node.latitude, node.longitude]);
                
                // Draw polyline with the tour's color
                L.polyline(latlngs, {
                    color: color,
                    weight: 3,
                    opacity: 0.8,
                    dashArray: '5, 5',
                    className: `tour-${tourIndex}`
                }).addTo(this.map);
            }
        });

        // Add tour stops with markers
        this.displayTourStopsWithColor(tour.stops, color, tourIndex);
    }

    /**
     * Display tour stops with specific color
     * Adds markers for each pickup, delivery, and warehouse
     * @param {Array<TourPoint>} stops - Tour stops
     * @param {string} color - Color for markers
     * @param {number} tourIndex - Index of the tour
     */
    displayTourStopsWithColor(stops, color = '#3498db', tourIndex = 0) {
        if (!stops || stops.length === 0) {
            console.warn(`Tour ${tourIndex} has no stops`);
            return;
        }

        stops.forEach((tourPoint, stopIndex) => {
            if (!tourPoint || !tourPoint.node) {
                return;
            }

            const node = tourPoint.node;
            const isWarehouse = tourPoint.type === 'WAREHOUSE';
            const isPickup = tourPoint.type === 'PICKUP';
            const isDelivery = tourPoint.type === 'DELIVERY';

            // Determine marker color and emoji based on type
            let markerColor = color;
            let emoji = '📍';
            let label = 'Point';

            if (isWarehouse) {
                markerColor = '#2C3E50';  // Dark gray for warehouse
                emoji = '🏠';
                label = 'Warehouse';
            } else if (isPickup) {
                // Lighter shade of tour color for pickup
                markerColor = color;
                emoji = '📦';
                label = 'Pickup';
            } else if (isDelivery) {
                // Darker shade of tour color for delivery
                markerColor = color;
                emoji = '✓';
                label = 'Delivery';
            }

            // Create custom marker with number
            const icon = L.divIcon({
                className: 'custom-div-icon',
                html: `<div style="
                    background-color: ${markerColor}; 
                    width: 32px; 
                    height: 32px; 
                    border-radius: 50%; 
                    border: 3px solid white;
                    display: flex; 
                    align-items: center; 
                    justify-content: center;
                    font-weight: bold;
                    color: white;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.4);
                    font-size: 14px;
                ">
                    ${stopIndex + 1}
                </div>`,
                iconSize: [32, 32],
                iconAnchor: [16, 16],
                popupAnchor: [0, -16]
            });

            // Add marker to map
            const marker = L.marker([node.latitude, node.longitude], { icon })
                .bindPopup(`
                    <div style="font-family: system-ui; font-size: 12px;">
                        <strong>${emoji} ${label}</strong><br>
                        ID: ${node.id}<br>
                        Tour: ${tourIndex + 1}<br>
                        Stop: ${stopIndex + 1}
                    </div>
                `)
                .addTo(this.map);

            if (!this.tourMarkers) {
                this.tourMarkers = [];
            }
            this.tourMarkers.push(marker);
        });
    }

    /**
     * Display K-means clustering with centroids and demand points
     * Circles (●) = Demand points (pickup/delivery)
     * Stars (★) = Centroids
     * @param {Array} clusters - Array of clusters {demands: [], centroid: {lat, lon}}
     */
    displayToursMulti(tours) {
        if (!tours || tours.length === 0) {
            console.warn('No tours to display');
            return;
        }

        const bounds = [];
        tours.forEach(t => {
            (t.legs || []).forEach(l => {
                (l.pathNode || []).forEach(n => {
                    if (n && n.latitude !== undefined && n.longitude !== undefined) {
                        bounds.push([n.latitude, n.longitude]);
                    }
                });
            });
            (t.stops || []).forEach(s => {
                if (s && s.node && s.node.latitude !== undefined && s.node.longitude !== undefined) {
                    bounds.push([s.node.latitude, s.node.longitude]);
                }
            });
        });

        this.displayTours(tours);

        if (bounds.length > 0 && this.map) {
            try {
                this.map.fitBounds(bounds, { padding: [50, 50] });
            } catch (e) {
                console.warn('Could not fit bounds for multi tours', e);
            }
        }
    }

    displayKMeansClustering(clusters) {
        if (!clusters || clusters.length === 0) {
            console.warn('No clusters to display');
            return;
        }

        // Clear the map first
        this.clearMap();

        // 4 high contrast colors for clusters
        const colors = [
            '#FF0000', // Red
            '#0066FF', // Blue
            '#00CC00', // Green
            '#FFB300'  // Orange
        ];

        console.log(`\n🎯 Displaying K-means clustering: ${clusters.length} clusters`);
        console.log(`● = Cluster points (Pickup/Delivery)`);
        console.log(`★ = Centroides\n`);

        // Helper function to get node ID from demand address
        const getNodeId = (addressObj) => {
            if (!addressObj) return null;
            // If it's already a string/number (node ID), return it
            if (typeof addressObj === 'string' || typeof addressObj === 'number') {
                return addressObj;
            }
            // If it's an object with id property (Node object), return the id
            if (addressObj.id) {
                return addressObj.id;
            }
            return null;
        };

        // Display each cluster
        clusters.forEach((cluster, clusterIndex) => {
            const color = colors[clusterIndex % colors.length];
            const centroid = cluster.centroid;

            if (!centroid) {
                console.warn(`Cluster ${clusterIndex} has no centroid`);
                return;
            }

            let pointCount = 0;

            // 1. Display demand points in this cluster as circles (●)
            if (cluster.demands && cluster.demands.length > 0) {
                cluster.demands.forEach((demand, demandIndex) => {
                    // Pickup point
                    if (demand.pickupAddress) {
                        const pickupNodeId = getNodeId(demand.pickupAddress);
                        const pickupNode = pickupNodeId ? this.nodeMap?.get(pickupNodeId) : null;
                        
                        if (pickupNode && pickupNode.latitude && pickupNode.longitude) {
                            // Circle icon for cluster point
                            const circleIcon = L.divIcon({
                                html: `<div style="background-color: ${color}; width: 16px; height: 16px; 
                                        border-radius: 50%; border: 2px solid white; display: flex; 
                                        align-items: center; justify-content: center; color: white; 
                                        font-size: 8px; font-weight: bold; box-shadow: 0 2px 4px rgba(0,0,0,0.5);">
                                        </div>`,
                                className: 'cluster-point-marker',
                                iconSize: [20, 20],
                                iconAnchor: [10, 10]
                            });

                            const pickupAddress = pickupNode.address || `Node ${pickupNodeId}`;
                            L.marker([pickupNode.latitude, pickupNode.longitude], { icon: circleIcon })
                                .bindPopup(`<strong>● 📦 Pickup</strong><br>Cluster ${clusterIndex + 1}<br>
                                           Demand: ${demand.id}<br>
                                           Node: ${pickupNodeId}<br>
                                           ${pickupAddress}`)
                                .addTo(this.map);
                            
                            pointCount++;
                        } else {
                            console.warn(`Pickup node not found for demand ${demand.id}, nodeId: ${pickupNodeId}`);
                        }
                    }

                    // Delivery point
                    if (demand.deliveryAddress) {
                        const deliveryNodeId = getNodeId(demand.deliveryAddress);
                        const deliveryNode = deliveryNodeId ? this.nodeMap?.get(deliveryNodeId) : null;
                        
                        if (deliveryNode && deliveryNode.latitude && deliveryNode.longitude) {
                            // Circle icon for cluster point
                            const circleIcon = L.divIcon({
                                html: `<div style="background-color: ${color}; width: 16px; height: 16px; 
                                        border-radius: 50%; border: 2px solid white; display: flex; 
                                        align-items: center; justify-content: center; color: white; 
                                        font-size: 8px; font-weight: bold; box-shadow: 0 2px 4px rgba(0,0,0,0.5);">
                                        </div>`,
                                className: 'cluster-point-marker',
                                iconSize: [20, 20],
                                iconAnchor: [10, 10]
                            });

                            const deliveryAddress = deliveryNode.address || `Node ${deliveryNodeId}`;
                            L.marker([deliveryNode.latitude, deliveryNode.longitude], { icon: circleIcon })
                                .bindPopup(`<strong>● ✓ Delivery</strong><br>Cluster ${clusterIndex + 1}<br>
                                           Demand: ${demand.id}<br>
                                           Node: ${deliveryNodeId}<br>
                                           ${deliveryAddress}`)
                                .addTo(this.map);
                            
                            pointCount++;
                        } else {
                            console.warn(`Delivery node not found for demand ${demand.id}, nodeId: ${deliveryNodeId}`);
                        }
                    }
                });
            }

            // 2. Display centroid as star (★)
            const centroidIcon = L.divIcon({
                html: `<div style="background-color: ${color}; width: 40px; height: 40px; 
                        border-radius: 50%; border: 3px solid white; display: flex; 
                        align-items: center; justify-content: center; color: white; 
                        font-size: 22px; font-weight: bold; box-shadow: 0 3px 8px rgba(0,0,0,0.6);">
                        ★</div>`,
                className: 'centroid-marker',
                iconSize: [46, 46],
                iconAnchor: [23, 23]
            });

            L.marker([centroid.lat, centroid.lon], { icon: centroidIcon })
                .bindPopup(`<strong>★ Centroid ${clusterIndex + 1}</strong><br>
                           <strong>Color:</strong> ${color}<br>
                           <strong>Demandas:</strong> ${cluster.demands?.length || 0}<br>
                           <strong>Puntos:</strong> ${pointCount}<br>
                           <strong>Lat:</strong> ${centroid.lat.toFixed(4)}<br>
                           <strong>Lon:</strong> ${centroid.lon.toFixed(4)}`)
                .openPopup()
                .addTo(this.map);

            console.log(`   Cluster ${clusterIndex + 1} ${color} ┃ Demandas: ${cluster.demands?.length} ┃ Puntos: ${pointCount} ┃ Centroid: (${centroid.lat.toFixed(4)}, ${centroid.lon.toFixed(4)})`);
        });

        console.log(`\n✅ K-means clustering displayed`);
        console.log(`   ● = ${clusters.reduce((sum, c) => sum + (c.demands?.length ? c.demands.length * 2 : 0), 0)} puntos de demanda (P+D por demanda)`);
        console.log(`   ★ = ${clusters.length} centroides\n`);

        // Fit map to all markers
        if (this.map) {
            setTimeout(() => {
                try {
                    this.map.fitBounds(this.map.getBounds());
                } catch (e) {
                    console.warn('Could not fit map bounds:', e);
                }
            }, 100);
        }
    }

    /**
     * Clear K-means clustering visualization
     */
    clearKMeansClustering() {
        // Remove all cluster markers
        const clusterMarkers = document.querySelectorAll('.cluster-marker, .centroid-marker');
        clusterMarkers.forEach(marker => marker.remove());
        console.log('🗑️ K-means clustering cleared');
    }
}

// Export for Node.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = View;
}
