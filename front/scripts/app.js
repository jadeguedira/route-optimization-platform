/**
 * Main application script for DelivHub
 */

// Initialize system and view
const system = new System();
const view = new View("08:00", "map");

// État de la vue Livreur (pour restauration après vue Historique)
let courierViewState = null;

function saveCourierViewState() {
    const hasTour = !!window.currentDisplayedTour;
    const hasPlan = !!system.plan;

    courierViewState = {
        mode: hasTour ? 'tour' : (hasPlan ? 'plan' : 'empty'),
        tour: hasTour ? window.currentDisplayedTour : null
    };
}

function resetTimelineToEmpty() {
    const timelineContainer = document.getElementById('timeline');
    if (timelineContainer) {
        timelineContainer.style.display = 'block';
    }

    const timelineScroll = document.querySelector('.timeline-scroll');
    if (!timelineScroll) return;

    timelineScroll.innerHTML =
        '<p style="text-align: center; color: #95a5a6; font-size: 0.85rem; padding: 10px;">' +
        'Aucune tournée chargée. Calculez ou restaurez une tournée.' +
        '</p>';
}

function restoreCourierViewState() {
    const timelineContainer = document.getElementById('timeline');
    if (timelineContainer) {
        timelineContainer.style.display = 'block';
    }

    if (!courierViewState) {
        // Pas d'état sauvegardé : on remet juste la timeline basique
        resetTimelineToEmpty();
        updateCourierInfo(null);
        return;
    }

    if (courierViewState.mode === 'tour' && courierViewState.tour) {
        const tour = courierViewState.tour;
        window.currentDisplayedTour = tour;

        if (view.map) {
            view.displayTour(tour);
        }
        updateTimelineFromTour(tour);
        updateCourierInfo(tour);
    } else if (courierViewState.mode === 'plan' && system.plan) {
        // Revenir à la vue "plan + demandes"
        view.clearMap();
        view.displayPlan(system.plan.toJSON());
        resetTimelineToEmpty();
        updateCourierInfo(null);
        window.currentDisplayedTour = null;
    } else {
        // Rien à afficher
        view.clearMap();
        resetTimelineToEmpty();
        updateCourierInfo(null);
        window.currentDisplayedTour = null;
    }
}


// Handle map loading
async function handleLoadMap() {
    const input = document.getElementById("xmlMapInput");

    // Activer le curseur de chargement
    document.body.style.cursor = 'wait';
    document.body.classList.add('loading');

    try {
        const result = await system.loadPlan(input);

        if (!result.success) {
            alert("Erreur lors du chargement: " + result.error);
            return;
        }

        // Hide placeholder and initialize map if first time
        const placeholder = document.getElementById("mapPlaceholder");
        if (placeholder) {
            placeholder.style.display = "none";
        }

        // Display the plan
        view.displayPlan(result.plan);
        console.log("Plan chargé avec succès!");

        // Enable deliveries upload button
        const deliveriesBox = document.getElementById("deliveriesUploadBox");
        if (deliveriesBox) {
            deliveriesBox.style.opacity = "1";
            deliveriesBox.style.pointerEvents = "auto";
        }
    } finally {
        // Restaurer le curseur normal
        document.body.style.cursor = 'default';
        document.body.classList.remove('loading');
    }
}

// Handle tour loading
async function handleLoadTour() {
    const input = document.getElementById("jsonTourInput");

    // Activer le curseur de chargement
    document.body.style.cursor = 'wait';
    document.body.classList.add('loading');

    try {
        const result = await system.loadTourFromFile(input);

        if (!result.success) {
            alert("Erreur lors du chargement de la tournée: " + result.error);
            return;
        }

        const tour = result.tour;
        console.log("Tournée chargée:", tour);

        // Gérer le cas où le fichier contient une liste de tournées
        const tours = Array.isArray(tour) ? tour : [tour];

        // Store all tours globally
        window.allCalculatedTours = tours;
        window.currentDisplayedTour = tours[0];

        // Show save button
        const saveTourBtn = document.getElementById('saveTourBtn');
        if (saveTourBtn) {
            saveTourBtn.style.display = 'inline-flex';
        }

        // Populate courier selector
        populateCourierTourSelector(tours);

        // Display the first tour on the map
        if (view.map) {
            view.displayTour(tours[0]);
        }

        // Update timeline with tour details
        updateTimelineFromTour(tours[0]);

        let alertMessage = `✅ ${tours.length} tournée(s) chargée(s) avec succès!\n\n`;
        tours.forEach((t, idx) => {
            const courierName = t.courier ? t.courier.name : `Coursier ${idx + 1}`;
            alertMessage += `${courierName}: ${t.stops.length} arrêts, ${(t.totalDistance / 1000).toFixed(2)} km, ${Math.round(t.totalDuration / 60)} min\n`;
        });
        alert(alertMessage);
    } finally {
        // Restaurer le curseur normal
        document.body.style.cursor = 'default';
        document.body.classList.remove('loading');
    }
}

async function handleLoadHistory() {
    const resultsContainer = document.getElementById('historyResults');
    const errorElement = document.getElementById('historyError');
    if (!resultsContainer) return;

    resultsContainer.innerHTML = '<p>Chargement de l\'historique...</p>';
    if (errorElement) errorElement.textContent = '';

    const result = await system.loadSavedToursSummary();

    if (!result.success) {
        if (errorElement) {
            errorElement.textContent = result.error || 'Erreur lors du chargement de l\'historique.';
        } else {
            alert(result.error || 'Erreur lors du chargement de l\'historique.');
        }
        resultsContainer.innerHTML = '';
        return;
    }

    // Callback appelé lorsqu'on clique sur une tournée dans la liste
    const onSelectTour = async (tourSummary) => {
        const loadResult = await system.loadTourFromServer(tourSummary.tourId || tourSummary.filename);
        if (!loadResult.success) {
            alert(loadResult.error || 'Erreur lors du chargement de la tournée.');
            return;
        }

        const tour = loadResult.tour;
        console.log('Tournée chargée via historique:', tour);

        // Même logique que handleLoadTour
        window.currentDisplayedTour = tour;

        const saveTourBtn = document.getElementById('saveTourBtn');
        if (saveTourBtn) {
            saveTourBtn.style.display = 'inline-flex';
        }

        if (view.map) {
            view.displayTour(tour);
        }

        updateTimelineFromTour(tour, true);
        updateCourierInfo(tour);
    };

    view.displayHistoryList(result.tours, resultsContainer, errorElement, onSelectTour);
}

// Nouvelle version: chargement + sélection multiple + affichage simultané
async function handleLoadHistoryMulti() {
    const resultsContainer = document.getElementById('historyResults');
    const errorElement = document.getElementById('historyError');
    if (!resultsContainer) return;

    resultsContainer.innerHTML = '<p>Chargement de l\'historique...</p>';
    if (errorElement) errorElement.textContent = '';

    const result = await system.loadSavedToursSummary();

    if (!result.success) {
        if (errorElement) {
            errorElement.textContent = result.error || 'Erreur lors du chargement de l\'historique.';
        } else {
            alert(result.error || 'Erreur lors du chargement de l\'historique.');
        }
        resultsContainer.innerHTML = '';
        return;
    }

    const selectedTours = new Map();
    const palette = ['#e74c3c', '#3498db', '#27ae60', '#f39c12', '#9b59b6', '#16a085'];

    const setStatus = (msg) => { statusEl.textContent = msg || ''; };

    const loadTourFromSummary = async (tourSummary) => {
        const loadResult = await system.loadTourFromServer(tourSummary.tourId || tourSummary.filename);
        if (!loadResult.success) {
            throw new Error(loadResult.error || 'Erreur lors du chargement de la tournée.');
        }
        const loaded = loadResult.tour;
        return Array.isArray(loaded) ? loaded : [loaded];
    };

    const renderLegend = (tours) => {
        legendEl.innerHTML = '';
        tours.forEach((t, idx) => {
            const color = palette[idx % palette.length];
            const item = document.createElement('div');
            item.className = 'history-legend-item';
            item.innerHTML = `<span class="history-legend-dot" style="background:${color}"></span>${t.courier?.name || t.courier?.id || 'Coursier ?'} (${t.id || 'tour'})`;
            legendEl.appendChild(item);
        });
    };

    const handleShowSelection = async () => {
        if (selectedTours.size === 0) {
            alert('Sélectionnez au moins une tournée à afficher.');
            return;
        }
        setStatus('Chargement des tournées sélectionnées...');
        try {
            const tours = [];
            for (const summary of selectedTours.values()) {
                const arr = await loadTourFromSummary(summary);
                tours.push(...arr);
            }
            if (view.map && typeof view.displayToursMulti === 'function') {
                view.displayToursMulti(tours);
                renderLegend(tours);
            }
            
            // Stocker les tournées pour navigation multi-détail
            window.currentMultiTours = tours;
            window.currentMultiTourIndex = 0;
            
            const first = tours[0];
            window.currentDisplayedTour = first;
            if (typeof updateTimelineFromTour === 'function') {
                updateTimelineFromTour(first, true);
            }
            if (typeof updateCourierInfo === 'function') {
                updateCourierInfo(first);
            }
            
            // Ajouter le dropdown de navigation multi-tournées
            addMultiTourNavigationDropdown(tours);
            
            setStatus(`${tours.length} tournée(s) affichée(s) simultanément.`);
        } catch (e) {
            console.error(e);
            alert(e.message || 'Erreur lors du chargement des tournées sélectionnées.');
            setStatus('');
        }
    };

    const handleShowAll = () => {
        listContainer.querySelectorAll('input[type="checkbox"]').forEach(cb => {
            cb.checked = true;
            selectedTours.set(cb.value, cb._summary);
        });
        handleShowSelection();
    };

    const handleClearSelection = () => {
        listContainer.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.checked = false);
        selectedTours.clear();
        setStatus('Aucune tournée sélectionnée.');
        legendEl.innerHTML = '';
    };

    // Build UI
    resultsContainer.innerHTML = '';
    const controls = document.createElement('div');
    controls.className = 'history-controls';
    controls.innerHTML = `
        <button type="button" class="btn btn-sm" id="historyShowSelected">Afficher la sélection</button>
        <button type="button" class="btn btn-sm" id="historyShowAll">Afficher tout</button>
        <button type="button" class="btn btn-sm" id="historyClear">Vider la sélection</button>
    `;
    const statusEl = document.createElement('div');
    statusEl.className = 'history-status';
    const legendEl = document.createElement('div');
    legendEl.className = 'history-legend';
    const listContainer = document.createElement('div');
    listContainer.className = 'history-list';

    resultsContainer.appendChild(controls);
    resultsContainer.appendChild(statusEl);
    resultsContainer.appendChild(legendEl);
    resultsContainer.appendChild(listContainer);

    // Populate list with checkboxes + single view button
    result.tours.forEach((t, idx) => {
        const item = document.createElement('div');
        item.className = 'history-item';

        const left = document.createElement('div');
        left.className = 'history-left';
        left.style.cursor = 'pointer';

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.value = t.tourId || t.filename || `tour-${idx}`;
        checkbox._summary = t;
        checkbox.addEventListener('change', (e) => {
            if (e.target.checked) {
                selectedTours.set(checkbox.value, t);
            } else {
                selectedTours.delete(checkbox.value);
            }
            setStatus(`${selectedTours.size} tournée(s) sélectionnée(s).`);
        });

        const info = document.createElement('div');
        info.className = 'history-info';
        const title = document.createElement('div');
        title.className = 'history-title';
        title.textContent = t.id || t.filename || '';
        const meta = document.createElement('div');
        meta.className = 'history-meta';
        meta.textContent = [
            t.departureTime || '',
            t.courier || '',
            t.totalDistance ? `${(t.totalDistance / 1000).toFixed(1)} km` : ''
        ].filter(Boolean).join(' • ');
        info.appendChild(title);
        info.appendChild(meta);

        left.appendChild(checkbox);
        left.appendChild(info);

        const actions = document.createElement('div');
        actions.className = 'history-actions';
        const viewBtn = document.createElement('button');
        viewBtn.type = 'button';
        viewBtn.className = 'btn btn-sm';
        viewBtn.textContent = 'Afficher';
        viewBtn.addEventListener('click', async () => {
            setStatus('Chargement de la tournée...');
            try {
                const arr = await loadTourFromSummary(t);
                const tour = arr[0];
                window.currentDisplayedTour = tour;
                if (view.map) view.displayTour(tour);
                if (typeof updateTimelineFromTour === 'function') {
                    updateTimelineFromTour(tour, true);
                }
                if (typeof updateCourierInfo === 'function') {
                    updateCourierInfo(tour);
                }
                setStatus(`Tournée affichée : ${tour.id || ''}`);
                legendEl.innerHTML = '';
            } catch (e) {
                console.error(e);
                alert(e.message || 'Erreur lors du chargement de la tournée.');
                setStatus('');
            }
        });
        actions.appendChild(viewBtn);

        item.appendChild(left);
        item.appendChild(actions);
        listContainer.appendChild(item);

        // Toggle selection when clicking the row (outside the action button)
        item.addEventListener('click', (e) => {
            if (e.target === checkbox) return;
            if (e.target.closest('.history-actions')) return;
            checkbox.checked = !checkbox.checked;
            checkbox.dispatchEvent(new Event('change'));
        });
    });

    // Wire controls
    controls.querySelector('#historyShowSelected').addEventListener('click', handleShowSelection);
    controls.querySelector('#historyShowAll').addEventListener('click', handleShowAll);
    controls.querySelector('#historyClear').addEventListener('click', handleClearSelection);
}

// Fonction pour ajouter un dropdown de navigation entre les tournées en mode multi-affichage
function addMultiTourNavigationDropdown(tours) {
    if (!tours || tours.length <= 1) return;
    
    // Récupérer ou créer le container du dropdown
    let multiTourNavContainer = document.getElementById('multiTourNavContainer');
    if (!multiTourNavContainer) {
        const courierSelectContainer = document.getElementById('courierSelectContainer');
        if (!courierSelectContainer) return;
        
        multiTourNavContainer = document.createElement('div');
        multiTourNavContainer.id = 'multiTourNavContainer';
        multiTourNavContainer.style.display = 'flex';
        multiTourNavContainer.style.alignItems = 'center';
        multiTourNavContainer.style.gap = '8px';
        courierSelectContainer.parentNode.insertBefore(multiTourNavContainer, courierSelectContainer.nextSibling);
    }
    
    multiTourNavContainer.innerHTML = '';
    
    const select = document.createElement('select');
    select.id = 'multiTourDetailSelect';
    select.style.cssText = 'padding: 6px 12px; border: 1px solid #bdc3c7; border-radius: 6px; font-size: 0.85rem; font-weight: 600; color: var(--secondary-color); background: #f8f9fa; cursor: pointer;';
    
    tours.forEach((tour, idx) => {
        const option = document.createElement('option');
        option.value = idx;
        const courierName = tour.courier ? tour.courier.name : `Coursier ${idx + 1}`;
        const distanceKm = (tour.totalDistance / 1000).toFixed(2);
        const durationMin = Math.round(tour.totalDuration / 60);
        option.textContent = `${courierName} - ${tour.stops.length} arrêts (${distanceKm} km, ${durationMin} min)`;
        select.appendChild(option);
    });
    
    select.value = '0';
    select.onchange = function() {
        const idx = parseInt(this.value);
        window.currentMultiTourIndex = idx;
        window.currentDisplayedTour = tours[idx];
        updateTimelineFromTour(tours[idx], true);
        updateCourierInfo(tours[idx]);
    };
    
    multiTourNavContainer.appendChild(select);
}


// Update timeline UI from tour data
/**
 * Updates the timeline UI from tour data
 * Displays all stops with times, addresses (via geocoding), and service durations
 * Supports drag-and-drop reordering if readOnly is false
 * @param {Tour} tour - The tour to display
 * @param {boolean} readOnly - Whether the timeline should be read-only (no drag-drop)
 */
function updateTimelineFromTour(tour, readOnly = false) {
    const timelineScroll = document.querySelector('.timeline-scroll');
    if (!timelineScroll) return;

    // Clear existing timeline
    timelineScroll.innerHTML = '';

    // Helper function to format time from departure time and elapsed seconds
    function formatTime(departureTime, elapsedSeconds) {
        const [hours, minutes] = departureTime.split(':').map(Number);
        const totalMinutes = hours * 60 + minutes + Math.round(elapsedSeconds / 60);
        const newHours = Math.floor(totalMinutes / 60) % 24;
        const newMinutes = totalMinutes % 60;
        return `${String(newHours).padStart(2, '0')}:${String(newMinutes).padStart(2, '0')}`;
    }

    // Track cumulative time
    let cumulativeTime = 0;

    // Shared numbering for pickup/delivery pairs (stable across reorders)
    function getDemandKey(stop) {
        if (!stop) return null;
        const demandId = stop.demand && (stop.demand.id || stop.demand);
        if (demandId) return String(demandId);
        return stop.node && stop.node.id ? `node-${stop.node.id}` : null;
    }

    if (!tour._demandNumberMap) {
        const uniqueKeys = Array.from(
            new Set(
                tour.stops
                    .map(getDemandKey)
                    .filter(Boolean)
            )
        ).sort();
        tour._demandNumberMap = new Map(uniqueKeys.map((k, idx) => [k, idx + 1]));
    }
    const demandNumberMap = tour._demandNumberMap;
    let nextPairNumber = (demandNumberMap.size ? Math.max(...demandNumberMap.values()) : 0) + 1;

    function getPairNumber(stop) {
        const key = getDemandKey(stop);
        if (!key) return null;
        if (!demandNumberMap.has(key)) {
            demandNumberMap.set(key, nextPairNumber++);
        }
        return demandNumberMap.get(key);
    }

    // Link related pickup/delivery tour points so validation can find pairs
    function linkRelatedTourPoints(t) {
        if (!t || !t.stops) return;
        // clear existing links
        t.stops.forEach(tp => { if (tp) delete tp.relatedTourPoint; });

        const pickMap = new Map();
        t.stops.forEach(tp => {
            if (!tp) return;
            // prefer an explicit demand id when present
            const id = tp.demand && (tp.demand.id || tp.demand) ? (tp.demand.id || tp.demand) : (tp.node && tp.node.id);
            if (!id) return;
            if (tp.type === 'PICKUP') pickMap.set(String(id), tp);
        });
        t.stops.forEach(tp => {
            if (!tp) return;
            const id = tp.demand && (tp.demand.id || tp.demand) ? (tp.demand.id || tp.demand) : (tp.node && tp.node.id);
            if (!id) return;
            if (tp.type === 'DELIVERY' && pickMap.has(String(id))) {
                const p = pickMap.get(String(id));
                p.relatedTourPoint = tp;
                tp.relatedTourPoint = p;
            }
        });
    }

    linkRelatedTourPoints(tour);

    // Add each stop to the timeline (optionally with left/right controls)
    tour.stops.forEach((stop, index) => {
        const stepDiv = document.createElement('div');
        stepDiv.className = 'step';
        // index of the stop in the tour.stops array
        stepDiv.dataset.stopIndex = index;

        // Add click event to highlight the stop on the map
        stepDiv.addEventListener('click', () => {
            if (view && view.highlightStop) {
                view.highlightStop(index);
            }
        });

        // Add step icon
        const iconDiv = document.createElement('div');
        iconDiv.className = 'step-icon';

        if (stop.type === 'WAREHOUSE') {
            iconDiv.style.background = 'var(--secondary-color)';
            iconDiv.style.color = 'white';
            iconDiv.innerHTML = '<i class="fa-solid fa-warehouse"></i>';
        } else if (stop.type === 'PICKUP') {
            iconDiv.style.borderColor = 'var(--accent-pickup)';
            iconDiv.style.color = 'var(--accent-pickup)';
            const pairNum = getPairNumber(stop);
            iconDiv.textContent = pairNum ? `P${pairNum}` : 'P?';
        } else if (stop.type === 'DELIVERY') {
            iconDiv.style.borderColor = 'var(--accent-delivery)';
            iconDiv.style.color = 'var(--accent-delivery)';
            const pairNum = getPairNumber(stop);
            iconDiv.textContent = pairNum ? `D${pairNum}` : 'D?';
        }
        stepDiv.appendChild(iconDiv);

        // Add left/right controls for non-depot stops (only if not read-only)
        if (!readOnly && stop.type !== 'WAREHOUSE') {
            const controls = document.createElement('div');
            controls.className = 'step-controls';

            const leftBtn = document.createElement('button');
            leftBtn.type = 'button';
            leftBtn.textContent = '⇦';
            leftBtn.title = 'Déplacer à gauche';
            leftBtn.className = 'btn btn-sm';

            const rightBtn = document.createElement('button');
            rightBtn.type = 'button';
            rightBtn.textContent = '⇨';
            rightBtn.title = 'Déplacer à droite';
            rightBtn.className = 'btn btn-sm';

            // Disable left if this is immediately after the start depot
            if (index === 1) leftBtn.disabled = true;
            // Disable right if this is immediately before the final depot
            if (index === (tour.stops.length - 2)) rightBtn.disabled = true;

            // Click handlers call tour.movePoint and rebuild timeline/view
            leftBtn.addEventListener('click', () => {
                // compute current index from model (safer than relying on DOM dataset)
                const oldIndex = tour.stops.indexOf(stop);
                const newIndex = oldIndex - 1;
                if (oldIndex === -1) return; // safety
                const res = tour.movePoint(oldIndex, newIndex);
                if (!res.valid) {
                    alert(mapMoveReasonToMessage(res));
                    // restore UI from model
                    updateTimelineFromTour(tour);
                    return;
                }
                // Recalculate legs so the path follows the real graph
                if (typeof system !== 'undefined' && typeof system.recalculateTourLegs === 'function') {
                    system.recalculateTourLegs(tour);
                } else {
                    rebuildTourLegs(tour);
                }
                // refresh UI and map
                updateTimelineFromTour(tour);
                if (view && view.displayTour) view.displayTour(tour);
            });

            rightBtn.addEventListener('click', () => {
                const oldIndex = tour.stops.indexOf(stop);
                const newIndex = oldIndex + 1;
                if (oldIndex === -1) return;
                const res = tour.movePoint(oldIndex, newIndex);
                if (!res.valid) {
                    alert(mapMoveReasonToMessage(res));
                    updateTimelineFromTour(tour);
                    return;
                }
                if (typeof system !== 'undefined' && typeof system.recalculateTourLegs === 'function') {
                    system.recalculateTourLegs(tour);
                } else {
                    rebuildTourLegs(tour);
                }
                updateTimelineFromTour(tour);
                if (view && view.displayTour) view.displayTour(tour);
            });

            controls.appendChild(leftBtn);
            controls.appendChild(rightBtn);
            stepDiv.appendChild(controls);
        }

        // Add time
        const timeDiv = document.createElement('div');
        timeDiv.className = 'step-time';
        timeDiv.textContent = formatTime(tour.departureTime, cumulativeTime);
        stepDiv.appendChild(timeDiv);

        // Add description
        const descDiv = document.createElement('div');
        descDiv.className = 'step-desc';
        if (stop.type === 'WAREHOUSE') {
            descDiv.textContent = index === 0 ? 'Départ' : 'Arrivée';
        } else {
            // Afficher "Chargement..." pendant la récupération de l'adresse
            const lat = stop.node?.latitude;
            const lon = stop.node?.longitude;

            if (lat && lon) {
                descDiv.textContent = 'Chargement...';

                // Récupérer l'adresse de manière asynchrone
                if (window.geocodingService) {
                    window.geocodingService.getShortAddress(lat, lon)
                        .then(address => {
                            descDiv.textContent = address;
                            descDiv.title = address; // Tooltip avec l'adresse complète
                        })
                        .catch(() => {
                            // En cas d'erreur, afficher les coordonnées
                            descDiv.textContent = `${lat.toFixed(3)}, ${lon.toFixed(3)}`;
                        });
                } else {
                    // Fallback si le service n'est pas disponible
                    descDiv.textContent = `${lat.toFixed(3)}, ${lon.toFixed(3)}`;
                }
            } else {
                descDiv.textContent = 'Position inconnue';
            }
        }
        stepDiv.appendChild(descDiv);

        timelineScroll.appendChild(stepDiv);

        // Add service duration to cumulative time
        cumulativeTime += stop.serviceDuration;

        // Add travel time from the corresponding leg
        if (index < tour.legs.length) {
            cumulativeTime += tour.legs[index].travelTime;
        }
    });


    // Helper: rebuild simple legs after stops reordering (best-effort)
    function rebuildTourLegs(t) {
        if (typeof Leg === 'undefined' || !t || !t.stops) return;
        t.legs = [];
        for (let i = 0; i < t.stops.length - 1; i++) {
            const from = t.stops[i];
            const to = t.stops[i + 1];
            try {
                const leg = new Leg(from, to, [from.node, to.node], 0, 0);
                t.legs.push(leg);
            } catch (e) {
                // ignore if Leg signature differs
            }
        }
    }

    // Helper: map movePoint reason to a French message
    function mapMoveReasonToMessage(res) {
        const reason = typeof res === 'string' ? res : (res && res.reason ? res.reason : null);
        switch (reason) {
            case 'DEPOT_START':
                return "❌ L'entrepôt de début ne peut pas être déplacé.";
            case 'DEPOT_END_MOVE':
                return "❌ L'entrepôt de fin ne peut pas être déplacé.";
            case 'DEPOT_START_MUST_REMAIN':
                return "❌ L'entrepôt de début doit rester en première position.";
            case 'DEPOT_END_MUST_REMAIN':
                return "❌ L'entrepôt final doit rester en dernière position.";
            case 'PICKUP_AFTER_DELIVERY':
            case 'DELIVERY_BEFORE_PICKUP':
                return "❌ Violations d'ordre: un pickup doit toujours être avant sa livraison.";
            case 'OUT_OF_RANGE':
                return "❌ Indice hors plage.";
            default:
                return "❌ Déplacement interdit.";
        }
    }
}

// Handle demands loading
let currentEditedDemandId = null; // null => on crée, nombre => on édite

// Récupération des éléments du DOM
const addDemandSidebar = document.getElementById("addDemandSidebar");
const addDemandForm = document.getElementById("addDemandForm");
const addDemandBtn = document.getElementById("addDemandBtn");
const addDemandCancelBtn = document.getElementById("addDemandCancelBtn");
const addDemandCloseBtn = document.getElementById("addDemandCloseBtn");
const clearDemandsBtn = document.getElementById("clearDemandsBtn");

// État de sélection des points
let nodeSelectionState = {
    mode: null, // 'pickup' ou 'delivery'
    pickupNode: null,
    deliveryNode: null,
    pickupMarker: null,
    deliveryMarker: null
};

function openAddDemandModal() {
    if (!addDemandSidebar) return;

    // Vérifier qu'un plan est chargé
    if (!system.plan) {
        alert('⚠️ Veuillez d\'abord charger un plan XML pour pouvoir ajouter des demandes.');
        return;
    }

    // Réinitialiser l'état
    if (currentEditedDemandId === null) {
        resetNodeSelection();

        if (addDemandForm) {
            addDemandForm.reset();
        }

        const pickupDisplay   = document.getElementById('pickupAddressDisplay');
        const deliveryDisplay = document.getElementById('deliveryAddressDisplay');

        if (pickupDisplay)   pickupDisplay.value   = '';
        if (deliveryDisplay) deliveryDisplay.value = '';
    }
    addDemandSidebar.style.display = "flex";
}

function closeAddDemandModal() {
    if (!addDemandSidebar) return;
    addDemandSidebar.style.display = "none";

    // Nettoyer les marqueurs de sélection
    if (nodeSelectionState.pickupMarker) {
        view.map.removeLayer(nodeSelectionState.pickupMarker);
    }
    if (nodeSelectionState.deliveryMarker) {
        view.map.removeLayer(nodeSelectionState.deliveryMarker);
    }

    // Réinitialiser le mode de sélection
    nodeSelectionState.mode = null;
    view.setNodeSelectionMode(false);

    if (addDemandForm) {
        addDemandForm.reset();
        document.getElementById('pickupAddressDisplay').value = '';
        document.getElementById('deliveryAddressDisplay').value = '';
    }

    resetNodeSelection();
    // On repasse en mode création par défaut
    currentEditedDemandId = null;

    const title = document.querySelector("#addDemandModal h3");
    if (title) title.textContent = "Ajouter une demande";

    const submitBtn = addDemandForm?.querySelector("button[type='submit']");
    if (submitBtn) submitBtn.textContent = "Ajouter";
}

function resetNodeSelection() {
    nodeSelectionState = {
        mode: null,
        pickupNode: null,
        deliveryNode: null,
        pickupMarker: null,
        deliveryMarker: null
    };

    // Réinitialiser les champs
    const pickupInput = document.getElementById('pickupAddressInput');
    const deliveryInput = document.getElementById('deliveryAddressInput');
    const pickupDisplay = document.getElementById('pickupAddressDisplay');
    const deliveryDisplay = document.getElementById('deliveryAddressDisplay');

    if (pickupInput) pickupInput.value = '';
    if (deliveryInput) deliveryInput.value = '';
    if (pickupDisplay) pickupDisplay.value = '';
    if (deliveryDisplay) deliveryDisplay.value = '';

    // Réinitialiser les styles des boutons
    const selectPickupBtn = document.getElementById('selectPickupBtn');
    const selectDeliveryBtn = document.getElementById('selectDeliveryBtn');

    if (selectPickupBtn) {
        selectPickupBtn.style.background = '';
        selectPickupBtn.innerHTML = '<i class="fa-solid fa-map-marker-alt"></i> Sélectionner sur la carte';
    }
    if (selectDeliveryBtn) {
        selectDeliveryBtn.style.background = '';
        selectDeliveryBtn.innerHTML = '<i class="fa-solid fa-map-marker-alt"></i> Sélectionner sur la carte';
    }
}

// Fonction appelée quand un nœud est sélectionné sur la carte
window.onNodeSelected = function(node) {
    if (!nodeSelectionState.mode) return;

    if (nodeSelectionState.mode === 'pickup') {
        nodeSelectionState.pickupNode = node;

        // Mettre à jour les champs
        document.getElementById('pickupAddressInput').value = node.id;
        document.getElementById('pickupAddressDisplay').value = `Point ${node.id} (${node.latitude.toFixed(4)}, ${node.longitude.toFixed(4)})`;

        // Mettre à jour le bouton
        const btn = document.getElementById('selectPickupBtn');
        btn.style.background = '#4caf50';
        btn.innerHTML = '<i class="fa-solid fa-check"></i> Point sélectionné';

        // Ajouter un marqueur vert sur la carte
        if (nodeSelectionState.pickupMarker) {
            view.map.removeLayer(nodeSelectionState.pickupMarker);
        }

        nodeSelectionState.pickupMarker = L.circleMarker([node.latitude, node.longitude], {
            radius: 12,
            fillColor: '#4caf50',
            color: '#fff',
            weight: 3,
            fillOpacity: 0.8
        }).addTo(view.map);

        nodeSelectionState.pickupMarker.bindPopup(`<b>Point d'enlèvement</b><br>ID: ${node.id}`).openPopup();

    } else if (nodeSelectionState.mode === 'delivery') {
        nodeSelectionState.deliveryNode = node;

        // Mettre à jour les champs
        document.getElementById('deliveryAddressInput').value = node.id;
        document.getElementById('deliveryAddressDisplay').value = `Point ${node.id} (${node.latitude.toFixed(4)}, ${node.longitude.toFixed(4)})`;

        // Mettre à jour le bouton
        const btn = document.getElementById('selectDeliveryBtn');
        btn.style.background = '#2196f3';
        btn.innerHTML = '<i class="fa-solid fa-check"></i> Point sélectionné';

        // Ajouter un marqueur bleu sur la carte
        if (nodeSelectionState.deliveryMarker) {
            view.map.removeLayer(nodeSelectionState.deliveryMarker);
        }

        nodeSelectionState.deliveryMarker = L.circleMarker([node.latitude, node.longitude], {
            radius: 12,
            fillColor: '#2196f3',
            color: '#fff',
            weight: 3,
            fillOpacity: 0.8
        }).addTo(view.map);

        nodeSelectionState.deliveryMarker.bindPopup(`<b>Point de livraison</b><br>ID: ${node.id}`).openPopup();
    }

    // Désactiver le mode de sélection
    nodeSelectionState.mode = null;
    view.setNodeSelectionMode(false);
};

// Ouverture via le bouton +
if (addDemandBtn) {
    addDemandBtn.addEventListener("click", () => {
        currentEditedDemandId = null; // on est en mode AJOUT
        // remettre un titre propre
        const title = document.querySelector("#addDemandModal h3");
        if (title) title.textContent = "Ajouter une demande";
        const submitBtn = addDemandForm?.querySelector("button[type='submit']");
        if (submitBtn) submitBtn.textContent = "Ajouter";
        openAddDemandModal();
    });
}

// Boutons de sélection sur la carte
document.addEventListener('DOMContentLoaded', () => {
    const selectPickupBtn = document.getElementById('selectPickupBtn');
    const selectDeliveryBtn = document.getElementById('selectDeliveryBtn');

    if (selectPickupBtn) {
        selectPickupBtn.addEventListener('click', () => {
            nodeSelectionState.mode = 'pickup';
            view.setNodeSelectionMode(true, 'pickup');

            // Mettre en surbrillance le bouton actif
            selectPickupBtn.style.background = '#ffa726';
            selectPickupBtn.innerHTML = '<i class="fa-solid fa-hand-pointer"></i> Cliquez sur la carte...';

            selectDeliveryBtn.style.background = '';
            selectDeliveryBtn.innerHTML = '<i class="fa-solid fa-map-marker-alt"></i> Sélectionner sur la carte';
        });
    }

    if (selectDeliveryBtn) {
        selectDeliveryBtn.addEventListener('click', () => {
            nodeSelectionState.mode = 'delivery';
            view.setNodeSelectionMode(true, 'delivery');

            // Mettre en surbrillance le bouton actif
            selectDeliveryBtn.style.background = '#ffa726';
            selectDeliveryBtn.innerHTML = '<i class="fa-solid fa-hand-pointer"></i> Cliquez sur la carte...';

            selectPickupBtn.style.background = '';
            selectPickupBtn.innerHTML = '<i class="fa-solid fa-map-marker-alt"></i> Sélectionner sur la carte';
        });
    }
});

// Effacer toutes les demandes via le bouton Clear
if (clearDemandsBtn) {
    clearDemandsBtn.addEventListener("click", () => {
        if (system.demandsList.length === 0) {
            alert("Aucune demande à effacer.");
            return;
        }

        if (confirm(`Êtes-vous sûr de vouloir effacer toutes les ${system.demandsList.length} demandes ?`)) {
            system.demandsList = [];
            system.toursList = [];
            
            updateDemandsUI();
            console.log("Toutes les demandes ont été effacées");
        }
    });
}

// Fermeture via bouton "Annuler" + croix
if (addDemandCancelBtn) {
    addDemandCancelBtn.addEventListener("click", closeAddDemandModal);
}
if (addDemandCloseBtn) {
    addDemandCloseBtn.addEventListener("click", closeAddDemandModal);
}

// La sidebar ne se ferme que via les boutons Annuler ou X (pas de clic sur overlay)

// Soumission du formulaire
// Soumission du formulaire
if (addDemandForm) {
    addDemandForm.addEventListener("submit", (event) => {
        event.preventDefault();

        const pickupAddressInput = document.getElementById("pickupAddressInput");
        const deliveryAddressInput = document.getElementById("deliveryAddressInput");
        const pickupDurationInput = document.getElementById("pickupDurationInput");
        const deliveryDurationInput = document.getElementById("deliveryDurationInput");

        const pickupAddress = pickupAddressInput.value.trim();
        const deliveryAddress = deliveryAddressInput.value.trim();

        const pickupDuration = Number(pickupDurationInput.value);
        const deliveryDuration = Number(deliveryDurationInput.value);

        // Validation améliorée avec messages spécifiques
        if (!pickupAddress) {
            alert("⚠️ Veuillez sélectionner un point d'enlèvement sur la carte.");
            return;
        }

        if (!deliveryAddress) {
            alert("⚠️ Veuillez sélectionner un point de livraison sur la carte.");
            return;
        }

        if (pickupAddress === deliveryAddress) {
            alert("⚠️ Le point d'enlèvement et le point de livraison doivent être différents.");
            return;
        }

        if (isNaN(pickupDuration) || pickupDuration < 0) {
            alert("⚠️ La durée d'enlèvement doit être un nombre positif.");
            return;
        }

        if (isNaN(deliveryDuration) || deliveryDuration < 0) {
            alert("⚠️ La durée de livraison doit être un nombre positif.");
            return;
        }

        let result;
        const isEdit = currentEditedDemandId !== null;

        try {
            if (!isEdit) {
                // 🌱 MODE CRÉATION
                result = system.addDemand(
                    pickupAddress,
                    deliveryAddress,
                    pickupDuration,
                    deliveryDuration
                );
            } else {
                // ✏️ MODE MODIFICATION
                result = system.updateDemand(
                    currentEditedDemandId,
                    pickupAddress,
                    deliveryAddress,
                    pickupDuration,
                    deliveryDuration
                );
            }
        } catch (err) {
            console.error(isEdit ? 'updateDemand threw:' : 'addDemand threw:', err);
            alert('❌ Erreur lors de la ' + (isEdit ? 'modification' : 'création') + ' de la demande: ' + (err && err.message ? err.message : String(err)));
            return;
        }

        if (!result) {
            alert('❌ Erreur inconnue lors de la ' + (isEdit ? 'modification' : 'création') + ' de la demande.');
            return;
        }

        if (!result.success) {
            alert("❌ " + (result.error || 'Erreur inconnue lors de la ' + (isEdit ? 'modification' : 'création') + ' de la demande.'));
            return;
        }

        const demand = result.demand;

        // Nom par défaut pour les demandes manuelles (seulement si pas déjà de clientName)
        if (demand && !demand.clientName) {
            if (!isEdit) {
                demand.clientName = `Demande manuelle #${demand.id}`;
            } else {
                demand.clientName = demand.clientName || `Demande #${demand.id}`;
            }
        }

        // Message de succès avec les détails
        console.log(isEdit ? 'Demande modifiée avec succès:' : 'Demande ajoutée avec succès:', demand);

        if (!isEdit) {
            alert(`✅ Demande ajoutée avec succès!\n\nEnlèvement: Point ${pickupAddress}\nLivraison: Point ${deliveryAddress}\nDurées: ${pickupDuration}s / ${deliveryDuration}s`);
        } else {
            alert(`✏️ Demande #${demand.id} modifiée avec succès.`);
        }

        // Rafraîchir l'UI avec la liste à jour
        updateDemandsUI();

        // Fermer la modale
        closeAddDemandModal();
    });
}


async function handleLoadDemands() {
    const input = document.getElementById("xmlDeliveriesInput");

    // Process multiple files
    if (input.files.length === 0) {
        return;
    }

    // Activer le curseur de chargement
    document.body.style.cursor = 'wait';
    document.body.classList.add('loading');

    try {
        let totalDemandsLoaded = 0;
        const fileNames = [];

        // Process each selected file
        for (let i = 0; i < input.files.length; i++) {
        const file = input.files[i];
        const fileName = file.name.replace(/\.xml$/i, '');
        fileNames.push(fileName);

        // Create a temporary input for this file
        const tempInput = document.createElement('input');
        tempInput.type = 'file';
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(file);
        tempInput.files = dataTransfer.files;

        // Track the number of demands before loading
        const demandsCountBefore = system.demandsList.length;

        const result = await system.loadDemandsFromXML(tempInput);

        if (!result.success) {
            alert(`Erreur lors du chargement de ${fileName}: ${result.error}`);
            continue;
        }
        if (result.warning) {
            alert(result.warning);
        }

        // Update client names for the newly added demands
        for (let j = demandsCountBefore; j < system.demandsList.length; j++) {
            system.demandsList[j].clientName = fileName;
        }

        totalDemandsLoaded += result.count;
        console.log(`${result.count} demandes chargées depuis ${fileName}`);
    }

        // Update UI with loaded demands
        updateDemandsUI();

        if (totalDemandsLoaded > 0) {
            // Clear input files for next load
            input.value = '';
            alert(`${totalDemandsLoaded} demandes chargées avec succès depuis ${input.files.length} fichier(s)!\nFichiers: ${fileNames.join(', ')}`);
        }
    } catch (error) {
        console.error('Error loading demands:', error);
        alert('Erreur lors du chargement des demandes: ' + error.message);
    } finally {
        // Restaurer le curseur normal
        document.body.style.cursor = 'default';
        document.body.classList.remove('loading');
    }
}

// Helper function to format node address for display
function formatNodeAddress(nodeIdOrObject) {
    if (!system.plan) {
        return `Node #${nodeIdOrObject}`;
    }

    // Si c'est déjà un objet Node avec latitude/longitude
    if (nodeIdOrObject && typeof nodeIdOrObject === 'object' && nodeIdOrObject.latitude && nodeIdOrObject.longitude) {
        const lat = nodeIdOrObject.latitude.toFixed(4);
        const lon = nodeIdOrObject.longitude.toFixed(4);
        return `(${lat}, ${lon})`;
    }

    // Sinon, c'est un ID (string ou number)
    let nodeId = nodeIdOrObject;

    // Si l'ID est une string, extraire uniquement le nombre
    if (typeof nodeId === 'string') {
        // Enlever "Node " au début si présent
        nodeId = nodeId.replace(/^Node\s*/i, '').trim();
    }

    const node = system.plan.getNodeById(nodeId);
    if (!node) {
        return `Node #${nodeId} (non trouvé)`;
    }

    // Format coordinates with 4 decimal places
    const lat = node.latitude.toFixed(4);
    const lon = node.longitude.toFixed(4);
    return `(${lat}, ${lon})`;
}

// Update the demands list in the UI
function updateDemandsUI() {
    // Find the container where demands are displayed
    const demandsContainer = document.getElementById('demandsContainer');

    // Remove all existing cards and messages (keep only the title)
    const children = Array.from(demandsContainer.children);
    children.forEach(child => {
        if (!child.classList.contains('section-title')) {
            child.remove();
        }
    });

    // Update demands count badge
    const demandsCountBadge = document.getElementById('demandsCount');
    if (demandsCountBadge) {
        demandsCountBadge.textContent = system.demandsList.length;
        // Change color based on count
        if (system.demandsList.length === 0) {
            demandsCountBadge.style.background = '#95a5a6';
        } else {
            demandsCountBadge.style.background = '#27ae60';
        }
    }

    // Update map display if plan is loaded
    if (system.plan && view.map && system.toursList.length === 0) {
        // Redisplay plan (light segments and nodes)
        const planJSON = system.plan.toJSON();
        view.clearMap();
        view.displaySegments(planJSON.segments);
        view.displayNodes(planJSON.nodes);

        // Display demands on top
        view.displayDemands(system.demandsList, system.plan);
    }

    // Add each demand from system.demandsList
    system.demandsList.forEach((demand) => {
        const demandCard = document.createElement('div');
        demandCard.className = 'demand-card';

        // Convert durations from seconds to minutes for display
        const pickupMinutes = Math.round(demand.pickupDuration / 60);
        const deliveryMinutes = Math.round(demand.deliveryDuration / 60);

        // Get formatted addresses from the plan
        const pickupLocation = formatNodeAddress(demand.pickupAddress);
        const deliveryLocation = formatNodeAddress(demand.deliveryAddress);

        demandCard.innerHTML = `
            <div class="demand-header">
                <span style="font-weight:600; font-size:0.9rem;">${demand.clientName || 'Client #' + demand.id}</span>
                <div class="demand-actions">
                    <button class="btn-icon" title="Modifier la demande" onclick="editDemand(${demand.id})">
                        <i class="fa-solid fa-pencil"></i>
                    </button>
                    <button class="btn-icon delete" title="Supprimer la demande" onclick="deleteDemand(${demand.id})">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </div>
            </div>
            <div class="point-row">
                <div class="dot dot-p"></div>
                <span style="font-size: 0.8rem;">Enlèvement: ${pickupLocation} (${pickupMinutes}min)</span>
            </div>
            <div class="point-row">
                <div class="dot dot-d"></div>
                <span style="font-size: 0.8rem;">Livraison: ${deliveryLocation} (${deliveryMinutes}min)</span>
            </div>
        `;

        demandsContainer.appendChild(demandCard);
    });

    // If no demands, show a message
    if (system.demandsList.length === 0) {
        const emptyMessage = document.createElement('p');
        emptyMessage.style.cssText = 'text-align: center; color: #95a5a6; font-size: 0.85rem; padding: 20px;';
        emptyMessage.textContent = 'Aucune demande chargée. Chargez un fichier XML de livraisons.';
        demandsContainer.appendChild(emptyMessage);
    }
}

// Edit demand function (placeholder)
function editDemand(demandId) {
    const demande = system.demandsList.find(d => d.id === demandId);
    if (!demande) {
        alert(`Demande ${demandId} introuvable.`);
        return;
    }

    // On passe en mode EDITION
    currentEditedDemandId = demande.id;

    // Ouvrir la sidebar sans reset (grâce à la modif d'openAddDemandModal)
    openAddDemandModal();

    // Récupérer les éléments du formulaire
    const pickupAddressInput    = document.getElementById("pickupAddressInput");
    const deliveryAddressInput  = document.getElementById("deliveryAddressInput");
    const pickupAddressDisplay  = document.getElementById("pickupAddressDisplay");
    const deliveryAddressDisplay= document.getElementById("deliveryAddressDisplay");
    const pickupDurationInput   = document.getElementById("pickupDurationInput");
    const deliveryDurationInput = document.getElementById("deliveryDurationInput");

    if (!pickupAddressInput || !deliveryAddressInput ||
        !pickupDurationInput || !deliveryDurationInput) {
        alert("Formulaire de demande introuvable.");
        return;
    }

    // --- 1) Durées (ça fonctionnait déjà chez toi) ---
    pickupDurationInput.value   = demande.pickupDuration;
    deliveryDurationInput.value = demande.deliveryDuration;

    // --- 2) Récupérer les IDs de noeud ---
    const pickupId   = demande.pickupAddress?.id   ?? demande.pickupAddress;
    const deliveryId = demande.deliveryAddress?.id ?? demande.deliveryAddress;

    // --- 3) Récupérer les noeuds dans le plan (pour afficher les coords jolies) ---
    let pickupNode = null;
    let deliveryNode = null;
    if (system.plan && typeof system.plan.getNodeById === "function") {
        if (pickupId)   pickupNode   = system.plan.getNodeById(pickupId);
        if (deliveryId) deliveryNode = system.plan.getNodeById(deliveryId);
    }

    // --- 4) Remplir les champs cachés ---
    if (pickupId)   pickupAddressInput.value   = pickupId;
    if (deliveryId) deliveryAddressInput.value = deliveryId;

    // --- 5) Remplir les champs affichés (à droite des boutons) ---
    if (pickupAddressDisplay) {
        if (pickupNode) {
            pickupAddressDisplay.value =
                `Point ${pickupId} (${pickupNode.latitude.toFixed(4)}, ${pickupNode.longitude.toFixed(4)})`;
        } else if (pickupId) {
            pickupAddressDisplay.value = `Point ${pickupId}`;
        } else {
            pickupAddressDisplay.value = "Aucun point sélectionné";
        }
    }

    if (deliveryAddressDisplay) {
        if (deliveryNode) {
            deliveryAddressDisplay.value =
                `Point ${deliveryId} (${deliveryNode.latitude.toFixed(4)}, ${deliveryNode.longitude.toFixed(4)})`;
        } else if (deliveryId) {
            deliveryAddressDisplay.value = `Point ${deliveryId}`;
        } else {
            deliveryAddressDisplay.value = "Aucun point sélectionné";
        }
    }

    // --- 6) Mettre à jour le style des boutons comme si la carte avait été cliquée ---
    const selectPickupBtn   = document.getElementById('selectPickupBtn');
    const selectDeliveryBtn = document.getElementById('selectDeliveryBtn');

    if (selectPickupBtn) {
        if (pickupId) {
            selectPickupBtn.style.background = '#4caf50';
            selectPickupBtn.innerHTML = '<i class="fa-solid fa-check"></i> Point sélectionné';
        } else {
            selectPickupBtn.style.background = '';
            selectPickupBtn.innerHTML = '<i class="fa-solid fa-map-marker-alt"></i> Sélectionner sur la carte';
        }
    }

    if (selectDeliveryBtn) {
        if (deliveryId) {
            selectDeliveryBtn.style.background = '#2196f3';
            selectDeliveryBtn.innerHTML = '<i class="fa-solid fa-check"></i> Point sélectionné';
        } else {
            selectDeliveryBtn.style.background = '';
            selectDeliveryBtn.innerHTML = '<i class="fa-solid fa-map-marker-alt"></i> Sélectionner sur la carte';
        }
    }

    // --- 7) Mettre à jour le titre + bouton de la sidebar ---
    const title = document.querySelector("#addDemandSidebar h3");
    if (title) title.textContent = `Modifier la demande #${demande.id}`;

    const submitBtn = document.getElementById("addDemandSubmitBtn");
    if (submitBtn) {
        submitBtn.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Enregistrer';
    }

    // (optionnel) mettre à jour l'état interne de sélection si tu veux des marqueurs sur la carte
    nodeSelectionState.pickupNode   = pickupNode || null;
    nodeSelectionState.deliveryNode = deliveryNode || null;
}



// Delete demand function
function deleteDemand(demandId) {
    if (confirm('Êtes-vous sûr de vouloir supprimer cette demande ?')) {
        const removed = system.removeDemandById(demandId);
        if (removed) {
            updateDemandsUI();
            console.log('Demande supprimée:', demandId);
        }
    }
}

// Sauvegarde de la tournée
async function saveTour() {
    // Vérifie qu'il y a des tournées à sauvegarder
    const toursToSave = window.allCalculatedTours || (window.currentDisplayedTour ? [window.currentDisplayedTour] : null);

    if (!toursToSave || toursToSave.length === 0) {
        alert('Aucune tournée à sauvegarder. Calculez ou chargez une tournée d\'abord.');
        return;
    }

    const saveTourBtn = document.getElementById('saveTourBtn');
    const originalText = saveTourBtn.innerHTML;
    saveTourBtn.innerHTML = '<i class="fa-solid fa-spinner"></i> Sauvegarde...';
    saveTourBtn.disabled = true;

    try {
        // Si plusieurs tournées, sauvegarder toutes
        if (toursToSave.length > 1) {
            let savedCount = 0;
            for (const tour of toursToSave) {
                const result = await system.saveTourToServer(tour);
                if (result.success) {
                    savedCount++;
                    tour._savedTourId = result.tourId;
                }
            }
            alert(`✅ ${savedCount} tournée(s) sauvegardée(s) avec succès!`);
            console.log(`${savedCount} tournées sauvegardées`);
        } else {
            // Une seule tournée
            const result = await system.saveTourToServer(toursToSave[0]);

            if (result.success) {
                alert(result.message);
                console.log('Tournée sauvegardée:', result.tourId);
                toursToSave[0]._savedTourId = result.tourId;
            } else {
                alert('Erreur lors de la sauvegarde: ' + result.error);
            }
        }
    } catch (error) {
        alert('Erreur: ' + error.message);
        console.error('Save error:', error);
    } finally {
        saveTourBtn.innerHTML = originalText;
        saveTourBtn.disabled = false;
    }
}

// Fetch list of couriers from server and populate list with checkboxes
async function fetchCouriers() {
    try {
        const resp = await fetch('/api/couriers');
        const data = await resp.json();
        if (!data.success) return;

        const listContainer = document.getElementById('couriersList');
        if (!listContainer) return;

        // Clear list
        listContainer.innerHTML = '';

        const couriers = data.couriers || [];
        system.listCouriers = [];

        if (couriers.length === 0) {
            listContainer.innerHTML = `
                <p style="text-align: center; color: #95a5a6; font-size: 0.85rem; padding: 10px;">
                    Aucun coursier disponible
                </p>
            `;
            return;
        }

        couriers.forEach(c => {
            const item = document.createElement('div');
            item.style.cssText = 'display: flex; align-items: center; gap: 8px; padding: 6px; background: white; border-radius: 4px; margin-bottom: 4px; cursor: pointer;';
            item.classList.add('courier-list-item');

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.id = `courier-cb-${c.id}`;
            checkbox.value = c.id;
            checkbox.dataset.courierName = c.name;
            checkbox.style.cursor = 'pointer';

            // Add listener to update count
            checkbox.addEventListener('change', updateSelectedCouriersCount);

            const label = document.createElement('label');
            label.htmlFor = `courier-cb-${c.id}`;
            label.textContent = `${c.name} (${c.id})`;
            label.style.cssText = 'flex: 1; cursor: pointer; user-select: none;';

            item.appendChild(checkbox);
            item.appendChild(label);
            listContainer.appendChild(item);

            // Add to system list
            try { system.listCouriers.push(new Courier(c.id, c.name)); } catch (e) { system.listCouriers.push(c); }
        });

        // Initialize count display
        updateSelectedCouriersCount();
    } catch (error) {
        console.error('Erreur fetchCouriers:', error);
    }
}

// Create a new courier via server API
async function createCourier() {
    const input = document.getElementById('courierNameInput');
    if (!input) return;
    const name = input.value.trim();
    if (!name) { alert('Entrez un nom pour le coursier'); return; }

    const btn = document.getElementById('createCourierBtn');
    const orig = btn ? btn.innerHTML : null;
    if (btn) { btn.disabled = true; btn.innerHTML = '...'; }

    try {
        const resp = await fetch('/api/couriers', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name })
        });
        const data = await resp.json();
        if (data.success) {
            input.value = '';
            await fetchCouriers();
            // Automatically check the newly created courier
            if (data.courier && data.courier.id) {
                const checkbox = document.getElementById(`courier-cb-${data.courier.id}`);
                if (checkbox) {
                    checkbox.checked = true;
                }
            }
            clearInsufficientCouriersBanner();
            try { closeInsufficientCouriersModal(); } catch (e) {}
            alert('Coursier créé: ' + data.courier.name);
        } else {
            alert('Erreur: ' + (data.error || ''));
        }
    } catch (error) {
        console.error('createCourier error:', error);
        alert('Erreur lors de la création du coursier');
    } finally {
        if (btn) { btn.disabled = false; btn.innerHTML = orig; }
    }
}

// Update the selected couriers count badge
function updateSelectedCouriersCount() {
    const checkboxes = document.querySelectorAll('#couriersList input[type="checkbox"]:checked');
    const count = checkboxes.length;
    const badge = document.getElementById('selectedCouriersCount');
    if (badge) {
        badge.textContent = count;
        // Change color based on selection
        if (count === 0) {
            badge.style.background = '#95a5a6';
        } else {
            badge.style.background = '#3498db';
        }
    }
}

// Get selected couriers from the checkbox list
function getSelectedCouriers() {
    const checkboxes = document.querySelectorAll('#couriersList input[type="checkbox"]:checked');
    const selected = [];

    checkboxes.forEach(cb => {
        const courierId = cb.value;
        const courierName = cb.dataset.courierName;

        // Find courier in system.listCouriers
        const courier = system.listCouriers.find(c => String(c.id) === String(courierId));
        if (courier) {
            selected.push(courier);
        } else {
            // Fallback if not found
            try {
                selected.push(new Courier(courierId, courierName));
            } catch (e) {
                selected.push({ id: courierId, name: courierName });
            }
        }
    });

    return selected;
}

// Show a banner in the courier sidebar asking the user to add couriers
function showInsufficientCouriersBanner(message) {
    const list = document.getElementById('couriersList');
    if (!list) return;

    clearInsufficientCouriersBanner();

    const banner = document.createElement('div');
    banner.id = 'courier-insufficient-banner';
    banner.style.cssText = 'background:#fff3cd;border:1px solid #ffeeba;padding:10px;border-radius:6px;margin-bottom:8px;display:flex;align-items:center;gap:10px;';
    const text = document.createElement('div');
    text.style.flex = '1';
    text.style.color = '#856404';
    text.style.fontWeight = '600';
    text.textContent = message || 'Le nombre de coursiers est insuffisant pour traiter toutes les demandes.';

    banner.appendChild(text);
    

    // Insert banner at top of couriers list container
    list.insertBefore(banner, list.firstChild);
}

function clearInsufficientCouriersBanner() {
    const existing = document.getElementById('courier-insufficient-banner');
    if (existing && existing.parentNode) existing.parentNode.removeChild(existing);
}

// Classic modal popup to invite user to add a courier
function showInsufficientCouriersModal(message) {
    // If already displayed, do nothing
    if (document.getElementById('insufficient-couriers-modal')) return;

    const overlay = document.createElement('div');
    overlay.id = 'insufficient-couriers-modal-overlay';
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center;z-index:2000;';

    const modal = document.createElement('div');
    modal.id = 'insufficient-couriers-modal';
    modal.style.cssText = 'width:420px;background:#fff;border-radius:8px;padding:18px;box-shadow:0 12px 30px rgba(0,0,0,0.25);font-family:inherit;color:#222;';

    const title = document.createElement('h3');
    title.style.margin = '0 0 8px 0';
    title.textContent = 'Nombre de coursiers insuffisant';

    const body = document.createElement('div');
    body.style.marginBottom = '14px';
    body.style.color = '#333';
    body.style.fontSize = '0.95rem';
    body.textContent = message || 'Le nombre de coursiers sélectionné est insuffisant pour traiter toutes les demandes. Ajoutez un coursier puis relancez le calcul.';

    const actions = document.createElement('div');
    actions.style.cssText = 'display:flex;justify-content:flex-end;gap:8px;';

    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'btn btn-sm';
    closeBtn.textContent = 'Fermer';
    closeBtn.onclick = () => closeInsufficientCouriersModal();

    actions.appendChild(closeBtn);

    modal.appendChild(title);
    modal.appendChild(body);
    modal.appendChild(actions);

    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    // Allow ESC to close
    function escHandler(e) {
        if (e.key === 'Escape') closeInsufficientCouriersModal();
    }
    overlay._escHandler = escHandler;
    document.addEventListener('keydown', escHandler);

    // Close when clicking outside modal
    overlay.addEventListener('click', (ev) => {
        if (ev.target === overlay) closeInsufficientCouriersModal();
    });
}

function closeInsufficientCouriersModal() {
    const overlay = document.getElementById('insufficient-couriers-modal-overlay');
    if (!overlay) return;
    if (overlay._escHandler) document.removeEventListener('keydown', overlay._escHandler);
    overlay.parentNode.removeChild(overlay);
}

// Handle tour calculation
async function handleComputeTour() {
    // Vérifier que le plan est chargé
    if (!system.plan) {
        alert('⚠️ Veuillez d\'abord charger un plan XML.');
        return;
    }

    // Vérifier qu'il y a des demandes
    if (!system.demandsList || system.demandsList.length === 0) {
        alert('⚠️ Veuillez d\'abord charger ou ajouter des demandes.');
        return;
    }

    // Récupérer les coursiers sélectionnés
    const selectedCouriers = getSelectedCouriers();

    if (selectedCouriers.length === 0) {
        alert('⚠️ Veuillez sélectionner au moins un coursier pour le calcul de la tournée.');
        return;
    }

    // Récupérer le bouton pour afficher l'état
    const calculateBtn = document.querySelector('.sidebar .btn.btn-primary');
    const originalText = calculateBtn.innerHTML;
    calculateBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Calcul en cours...';
    calculateBtn.disabled = true;

    // Activer le curseur de chargement sur toute la page
    document.body.style.cursor = 'wait';
    document.body.classList.add('loading');

    // Utiliser setTimeout pour permettre au navigateur de mettre à jour l'interface
    // avant de lancer le calcul synchrone qui bloque l'UI
    setTimeout(() => {
        try {
            console.log(`Calcul de tournées pour ${selectedCouriers.length} coursier(s) sélectionné(s)`);
            console.log('Coursiers sélectionnés:', selectedCouriers.map(c => c.name || c.id));

            // Vérifier que l'entrepôt est défini
            if (!system.plan.warehouse) {
                alert('⚠️ Aucun entrepôt défini dans le plan. Chargez un fichier de demandes (XML) qui contient la balise <entrepot> ou définissez l\'entrepôt dans le plan.');
                return;
            }

            // Appeler computeTours avec la liste de coursiers sélectionnés
            const result = system.computeTours(selectedCouriers);

            if (!result) {
                alert('❌ Erreur lors du calcul des tournées. Vérifiez que toutes les demandes sont valides.');
                return;
            }

            // Gérer le code de retour
            if (result.code === 2) {
                // Inform the user via modal and invite to add a courier
                showInsufficientCouriersModal('⚠️ Le nombre de coursiers sélectionné est insuffisant pour traiter toutes les demandes. Ajoutez un coursier et relancez le calcul.');
                return;
            }

            if (result.code === 1) {
                alert('❌ Erreur lors du calcul des tournées.');
                return;
            }

            // Succès (code === 0)
            const tours = result.tours || [];

            if (tours.length === 0) {
                alert('❌ Aucune tournée n\'a pu être calculée.');
                return;
            }

            console.log('Tournées calculées:', tours);

            // Clear any previous insufficient-couriers banner or modal
            clearInsufficientCouriersBanner();
            try { closeInsufficientCouriersModal(); } catch (e) {}

            // Store all tours globally
            window.allCalculatedTours = tours;
            window.currentDisplayedTour = tours[0]; // Afficher la première par défaut

            // Show save button
            const saveTourBtn = document.getElementById('saveTourBtn');
            if (saveTourBtn) {
                saveTourBtn.style.display = 'inline-flex';
            }

            // Populate courier selector
            populateCourierTourSelector(tours);

            // Pré-charger toutes les adresses pour améliorer les performances
            if (window.geocodingService) {
                const allCoordinates = [];
                tours.forEach(tour => {
                    tour.stops.forEach(stop => {
                        if (stop.node && stop.node.latitude && stop.node.longitude) {
                            allCoordinates.push({
                                latitude: stop.node.latitude,
                                longitude: stop.node.longitude
                            });
                        }
                    });
                });

                // Pré-chargement asynchrone (ne bloque pas l'affichage)
                window.geocodingService.preloadAddresses(allCoordinates)
                    .then(() => console.log('✅ Adresses préchargées'))
                    .catch(err => console.warn('⚠️ Erreur préchargement adresses:', err));
            }

            // Display the first tour on the map
            if (view.map) {
                view.displayTour(tours[0]);
            }

            // Update timeline with tour details
            updateTimelineFromTour(tours[0]);

            // Afficher un message de succès
            let successMessage = `✅ ${tours.length} tournée(s) calculée(s) avec succès!\n\n`;
            tours.forEach((tour, index) => {
                const distanceKm = (tour.totalDistance / 1000).toFixed(2);
                const durationMin = Math.round(tour.totalDuration / 60);
                const courierName = tour.courier ? tour.courier.name : `Coursier ${index + 1}`;
                successMessage += `${courierName}: ${tour.stops.length} arrêts, ${distanceKm} km, ${durationMin} min\n`;
            });
            alert(successMessage);

        } catch (error) {
            console.error('Erreur lors du calcul de la tournée:', error);
            alert('❌ Erreur lors du calcul de la tournée: ' + error.message);
        } finally {
            // Restaurer le curseur normal
            document.body.style.cursor = 'default';
            document.body.classList.remove('loading');

            calculateBtn.innerHTML = originalText;
            calculateBtn.disabled = false;
        }
    }, 50); // 50ms de délai pour permettre la mise à jour de l'interface
}

// Populate courier tour selector with all calculated tours
function populateCourierTourSelector(tours) {
    const container = document.getElementById('courierSelectContainer');
    const select = document.getElementById('courierTourSelect');

    if (!container || !select) return;

    // Clear existing options
    select.innerHTML = '<option value="">Sélectionner une tournée...</option>';

    if (!tours || tours.length === 0) {
        container.style.display = 'none';
        return;
    }

    // "all tours" option if more than one tour
    if (tours.length > 1) {
        const allOption = document.createElement('option');
        allOption.value = 'all';
        const totalStops = tours.reduce((sum, tour) => sum + (tour.stops ? tour.stops.length : 0), 0);
        const totalDistance = tours.reduce((sum, tour) => sum + (tour.totalDistance || 0), 0);
        const totalDuration = tours.reduce((sum, tour) => sum + (tour.totalDuration || 0), 0);
        const distanceKm = (totalDistance / 1000).toFixed(2);
        const durationMin = Math.round(totalDuration / 60);
        allOption.textContent = `Toutes les tournées - ${totalStops} arrêts (${distanceKm} km, ${durationMin} min)`;
        select.appendChild(allOption);
    }

    // Add option for each tour
    tours.forEach((tour, index) => {
        const option = document.createElement('option');
        option.value = index;
        const courierName = tour.courier ? tour.courier.name : `Coursier ${index + 1}`;
        const distanceKm = (tour.totalDistance / 1000).toFixed(2);
        const durationMin = Math.round(tour.totalDuration / 60);
        option.textContent = `${courierName} - ${tour.stops.length} arrêts (${distanceKm} km, ${durationMin} min)`;
        select.appendChild(option);
    });

    // Select first tour by default
    select.value = '0';

    // Show the container
    container.style.display = 'block';

    // Add change event listener
    select.onchange = function() {
        if (this.value === 'all') {
            // Display all tours
            window.currentDisplayedTour = null;
            if (view && view.displayToursMulti) {
                view.displayToursMulti(window.allCalculatedTours);
            }
            // Disable timeline for multi-tour view or show consolidated info
            const timelineContainer = document.getElementById('timeline');
            if (timelineContainer) {
                timelineContainer.style.display = 'none';
            }
            console.log('Affichage de toutes les tournées');
        } else {
            const selectedIndex = parseInt(this.value);
            if (!isNaN(selectedIndex) && window.allCalculatedTours && window.allCalculatedTours[selectedIndex]) {
                const selectedTour = window.allCalculatedTours[selectedIndex];
                window.currentDisplayedTour = selectedTour;

                // Display the selected tour
                if (view.map) {
                    view.displayTour(selectedTour);
                }

                // Update timeline
                const timelineContainer = document.getElementById('timeline');
                if (timelineContainer) {
                    timelineContainer.style.display = 'block';
                }
                updateTimelineFromTour(selectedTour);

                console.log('Tournée sélectionnée:', selectedTour);
            }
        }
    };
}

// Note: Le nombre de coursiers est maintenant géré directement dans handleComputeTour()
// qui appelle system.computeTours(couriers) avec la liste de coursiers appropriée

// Setup event listeners when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    const saveTourBtn = document.getElementById('saveTourBtn');
    if (saveTourBtn) {
        saveTourBtn.addEventListener('click', saveTour);
    }

    // Wire courier creation UI
    const createCourierBtn = document.getElementById('createCourierBtn');
    if (createCourierBtn) createCourierBtn.addEventListener('click', createCourier);
    // Fetch existing couriers to populate list
    fetchCouriers();

    // Wire courier selection buttons
    const selectAllBtn = document.getElementById('selectAllCouriersBtn');
    const deselectAllBtn = document.getElementById('deselectAllCouriersBtn');

    if (selectAllBtn) {
        selectAllBtn.addEventListener('click', () => {
            const checkboxes = document.querySelectorAll('#couriersList input[type="checkbox"]');
            checkboxes.forEach(cb => cb.checked = true);
            updateSelectedCouriersCount();
        });
    }

    if (deselectAllBtn) {
        deselectAllBtn.addEventListener('click', () => {
            const checkboxes = document.querySelectorAll('#couriersList input[type="checkbox"]');
            checkboxes.forEach(cb => cb.checked = false);
            updateSelectedCouriersCount();
        });
    }

    // Ajouter le listener pour le bouton de calcul de tournée
    const calculateBtn = document.querySelector('.sidebar .btn.btn-primary');
    if (calculateBtn) {
        calculateBtn.addEventListener('click', handleComputeTour);
    }


    // Switch entre Vue Livreur / Vue Historique dans la sidebar
    const toggleButtons = document.querySelectorAll('.view-toggles .toggle-btn');
    const sidebarLivreur = document.getElementById('sidebar-livreur');
    const sidebarHistory = document.getElementById('sidebar-history');

    toggleButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            toggleButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            const viewName = btn.dataset.view;

            if (viewName === 'history') {
                // On sauve l'état actuel de la vue Livreur
                saveCourierViewState();

                if (sidebarLivreur) sidebarLivreur.style.display = 'none';
                if (sidebarHistory) sidebarHistory.style.display = 'flex';

                // Masquer le dropdown de sélection des tournées (vue historique uniquement)
                const courierSelectContainer = document.getElementById('courierSelectContainer');
                if (courierSelectContainer) courierSelectContainer.style.display = 'none';

                // Si le dropdown multi-tours existe (créé par l'historique multi), l'afficher
                const multiTourNavContainer = document.getElementById('multiTourNavContainer');
                if (multiTourNavContainer) multiTourNavContainer.style.display = 'flex';

                // Nettoyer la carte avant d'afficher l'historique
                if (view.map) {
                    view.clearMap();
                }

                // Réinitialiser les détails de tournée
                resetTimelineToEmpty();
                updateCourierInfo(null);

                // Charger la liste de l'historique
                handleLoadHistoryMulti();
            } else if (viewName === 'courier') {
                // Revenir à la vue Livreur telle qu'elle était
                if (sidebarLivreur) sidebarLivreur.style.display = 'flex';
                if (sidebarHistory) sidebarHistory.style.display = 'none';

                // Réafficher le dropdown si une tournée est calculée
                const courierSelectContainer = document.getElementById('courierSelectContainer');
                if (courierSelectContainer && window.allCalculatedTours && window.allCalculatedTours.length > 0) {
                    courierSelectContainer.style.display = 'flex';
                }

                // Masquer le dropdown multi-tours
                const multiTourNav = document.getElementById('multiTourNavContainer');
                if (multiTourNav) multiTourNav.style.display = 'none';

                // Rafraîchir la liste des coursiers pour s'assurer qu'elle est à jour
                fetchCouriers().then(() => {
                    // Restaurer l'état après le chargement des coursiers
                    restoreCourierViewState();
                });
            } else {
                // Autres vues (ex: globale) -> sidebar Livreur
                if (sidebarLivreur) sidebarLivreur.style.display = 'flex';
                if (sidebarHistory) sidebarHistory.style.display = 'none';

                // Réafficher le dropdown si une tournée est calculée
                const courierSelectContainer = document.getElementById('courierSelectContainer');
                if (courierSelectContainer && window.allCalculatedTours && window.allCalculatedTours.length > 0) {
                    courierSelectContainer.style.display = 'flex';
                }

                // Rafraîchir la liste des coursiers
                fetchCouriers().then(() => {
                    restoreCourierViewState();
                });
            }
        });
    });


    // Bouton interne pour recharger l'historique
    const historyBtn = document.getElementById('historyBtn');
    if (historyBtn) {
        historyBtn.addEventListener('click', handleLoadHistoryMulti);
    }
});
