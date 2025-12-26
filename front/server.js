// Simple HTTP server pour servir l'application DelivHub
// Lancer avec: node server.js

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

let PORT = 8080;

// Types MIME pour les différentes extensions de fichiers
const mimeTypes = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'text/javascript',
    '.json': 'application/json',
    '.xml': 'application/xml',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon'
};

// Dossier des tournées sauvegardées
const SAVED_TOURS_DIR = path.join(__dirname, '..', 'saved_tours');

// Créer le dossier s'il n'existe pas
if (!fs.existsSync(SAVED_TOURS_DIR)) {
    fs.mkdirSync(SAVED_TOURS_DIR, { recursive: true });
}

// Dossier pour données persistées (coursiers, etc.)
const SAVED_DATA_DIR = path.join(__dirname, '..', 'saved_data');
const COURIERS_FILE = path.join(SAVED_DATA_DIR, 'couriers.json');

// Ensure saved_data and couriers file exist
if (!fs.existsSync(SAVED_DATA_DIR)) {
    fs.mkdirSync(SAVED_DATA_DIR, { recursive: true });
}

if (!fs.existsSync(COURIERS_FILE)) {
    try {
        fs.writeFileSync(COURIERS_FILE, JSON.stringify([], null, 2));
    } catch (e) {
        console.error('Impossible de créer le fichier des coursiers:', e.message);
    }
}

const server = http.createServer((req, res) => {
    const parsedUrl = url.parse(req.url, true);
    const pathname = parsedUrl.pathname;
    const query = parsedUrl.query;

    console.log(`${req.method} ${req.url}`);

    // Routes API pour sauvegarde/chargement des tournées
    if (pathname === '/api/tours/save' && req.method === 'POST') {
        handleSaveTour(req, res);
        return;
    }

    if (pathname === '/api/tours/list' && req.method === 'GET') {
        handleListTours(req, res);
        return;
    }

    // Couriers API
    if (pathname === '/api/couriers' && req.method === 'GET') {
        handleListCouriers(req, res);
        return;
    }

    if (pathname === '/api/couriers' && req.method === 'POST') {
        handleCreateCourier(req, res);
        return;
    }

    if (pathname.startsWith('/api/tours/load/') && req.method === 'GET') {
        const tourId = pathname.replace('/api/tours/load/', '');
        handleLoadTourFile(tourId, res);
        return;
    }

    // Route par défaut vers index.html
    let filePath = pathname;
    if (filePath === '/' || filePath === '') {
        filePath = '/index.html';
    }

    // Construire le chemin complet du fichier
    let fullPath;

    if (filePath.startsWith('/backend/')) {
        // Fichiers backend (un niveau au-dessus)
        fullPath = path.join(__dirname, '..', filePath);
    } else if (filePath.startsWith('/front/')) {
        // Fichiers front avec chemin complet /front/...
        fullPath = path.join(__dirname, '..', filePath);
    } else if (filePath.startsWith('/fichiersXMLPickupDelivery/')) {
        // Fichiers XML (un niveau au-dessus)
        fullPath = path.join(__dirname, '..', filePath);
    } else {
        // Fichiers dans le dossier front (par défaut)
        fullPath = path.join(__dirname, filePath);
    }

    // Obtenir l'extension du fichier
    const extname = String(path.extname(fullPath)).toLowerCase();
    const contentType = mimeTypes[extname] || 'application/octet-stream';

    // Lire et servir le fichier
    fs.readFile(fullPath, (err, content) => {
        if (err) {
            if (err.code === 'ENOENT') {
                // Fichier non trouvé
                res.writeHead(404, { 'Content-Type': 'text/html' });
                res.end(`
                    <h1>404 - Fichier non trouvé</h1>
                    <p>Le fichier <code>${filePath}</code> n'existe pas.</p>
                    <p>Chemin complet: <code>${fullPath}</code></p>
                `, 'utf-8');
            } else {
                // Erreur serveur
                res.writeHead(500);
                res.end(`Erreur serveur: ${err.code}`, 'utf-8');
            }
        } else {
            // Succès
            res.writeHead(200, {
                'Content-Type': contentType,
                'Access-Control-Allow-Origin': '*' // Enable CORS
            });
            res.end(content, 'utf-8');
        }
    });
});

// Gestionnaire de sauvegarde de tournée
function handleSaveTour(req, res) {
    let body = '';

    req.on('data', chunk => {
        body += chunk.toString();
    });

    req.on('end', () => {
        try {
            const tourData = JSON.parse(body);
            const tourId = tourData.id || `tour_${Date.now()}`;
            const filename = `${tourId}.json`;
            const filepath = path.join(SAVED_TOURS_DIR, filename);

            // Écrire le fichier JSON
            fs.writeFileSync(filepath, JSON.stringify(tourData, null, 2));

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                success: true,
                message: `Tournée sauvegardée: ${filename}`,
                tourId: tourId,
                filename: filename
            }));
        } catch (error) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                success: false,
                error: error.message
            }));
        }
    });
}

// Gestionnaire de listage des tournées sauvegardées
function handleListTours(req, res) {
    try {
        const files = fs.readdirSync(SAVED_TOURS_DIR);
        const tours = files
            .filter(f => f.endsWith('.json'))
            .map(f => ({
                filename: f,
                tourId: f.replace('.json', ''),
                path: f
            }));

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            success: true,
            tours: tours
        }));
    } catch (error) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            success: false,
            error: error.message
        }));
    }
}

// Gestionnaire de chargement d'une tournée
/**
 * Handles GET requests to load a specific tour file by ID
 * Reads the tour JSON file and returns its contents
 * @param {string} tourId - Tour identifier (filename without .json extension)
 * @param {http.ServerResponse} res - HTTP response object
 */
function handleLoadTourFile(tourId, res) {
    try {
        const filename = `${tourId}.json`;
        const filepath = path.join(SAVED_TOURS_DIR, filename);

        if (!fs.existsSync(filepath)) {
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                success: false,
                error: `Tournée ${tourId} non trouvée`
            }));
            return;
        }

        const tourData = fs.readFileSync(filepath, 'utf-8');
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(tourData);
    } catch (error) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            success: false,
            error: error.message
        }));
    }
}

// Gestionnaire de listage des coursiers (single file)
function handleListCouriers(req, res) {
    try {
        if (!fs.existsSync(COURIERS_FILE)) {
            fs.writeFileSync(COURIERS_FILE, JSON.stringify([], null, 2));
        }
        const content = fs.readFileSync(COURIERS_FILE, 'utf-8');
        const couriers = JSON.parse(content || '[]');

        res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
        res.end(JSON.stringify({ success: true, couriers: couriers }));
    } catch (error) {
        res.writeHead(500, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
        res.end(JSON.stringify({ success: false, error: error.message }));
    }
}

// Gestionnaire de création / mise à jour d'un coursier
function handleCreateCourier(req, res) {
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', () => {
        try {
            const payload = JSON.parse(body || '{}');
            const name = (payload.name || '').trim();
            if (!name) {
                res.writeHead(400, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
                res.end(JSON.stringify({ success: false, error: 'Nom du coursier requis' }));
                return;
            }

            const fileContent = fs.existsSync(COURIERS_FILE) ? fs.readFileSync(COURIERS_FILE, 'utf-8') : '[]';
            const list = JSON.parse(fileContent || '[]');

            // If id supplied, update existing courier
            if (payload.id) {
                const idx = list.findIndex(c => String(c.id) === String(payload.id));
                if (idx !== -1) {
                    list[idx].name = name;
                } else {
                    list.push({ id: payload.id, name });
                }
            } else {
                // generate a simple id
                const nextId = Date.now();
                const newCourier = { id: `C${nextId}`, name };
                list.push(newCourier);
                payload.id = newCourier.id;
            }

            fs.writeFileSync(COURIERS_FILE, JSON.stringify(list, null, 2));

            res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
            res.end(JSON.stringify({ success: true, courier: { id: payload.id, name }, message: 'Coursier enregistré' }));
        } catch (error) {
            res.writeHead(500, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
            res.end(JSON.stringify({ success: false, error: error.message }));
        }
    });
}

function startServer(port) {
    server.listen(port, () => {
        console.log(`\n========================================`);
        console.log(`🚀 Serveur DelivHub démarré !`);
        console.log(`========================================`);
        console.log(`📍 URL: http://localhost:${port}/`);
        console.log(`📂 Dossier: ${__dirname}`);
        console.log(`💾 Tournées: ${SAVED_TOURS_DIR}`);
        console.log(`\n👉 Ouvrez http://localhost:${port}/ dans votre navigateur`);
        console.log(`\nAppuyez sur Ctrl+C pour arrêter le serveur\n`);
    });

    server.on('error', (err) => {
        if (err && err.code === 'EADDRINUSE') {
            const next = port + 1;
            console.warn(`Port ${port} occupé. Tentative sur ${next}...`);
            // Remove previous 'error' listener to avoid duplicate logs
            server.removeAllListeners('error');
            // Retry listen on next port by creating a new server instance sharing handlers
            PORT = next;
            // Create a new server bound to same request handler
            const http2 = require('http');
            const newServer = http2.createServer(server.listeners('request')[0]);
            // Replace reference
            server.close(() => {
                // Start the new server
                newServer.listen(next, () => {
                    console.log(`\n========================================`);
                    console.log(`🚀 Serveur DelivHub démarré !`);
                    console.log(`========================================`);
                    console.log(`📍 URL: http://localhost:${next}/`);
                    console.log(`📂 Dossier: ${__dirname}`);
                    console.log(`💾 Tournées: ${SAVED_TOURS_DIR}`);
                    console.log(`\n👉 Ouvrez http://localhost:${next}/ dans votre navigateur`);
                    console.log(`\nAppuyez sur Ctrl+C pour arrêter le serveur\n`);
                });
                // Rebind global server reference to allow future logs or controls (optional)
            });
        } else {
            console.error('Erreur serveur:', err);
        }
    });
}

startServer(PORT);

