// Simple HTTP server to serve the front-end application
// Run with: node server.js

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 8080;

// MIME types for different file extensions
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

const server = http.createServer((req, res) => {
    console.log(`${req.method} ${req.url}`);

    // Parse URL and remove query string
    let filePath = req.url.split('?')[0];

    // Default to index.html
    if (filePath === '/') {
        filePath = '/index.html';
    }

    // Construct file path
    let fullPath;
    if (filePath.startsWith('/fichiersXMLPickupDelivery/')) {
        // Handle XML files from parent directory (2 levels up from test folder)
        fullPath = path.join(__dirname, '..', '..', 'fichiersXMLPickupDelivery', path.basename(filePath));
    } else if (filePath.startsWith('/front/')) {
        // Handle front folder files (script/view.js, etc.)
        fullPath = path.join(__dirname, '..', '..', filePath);
    } else if (filePath.startsWith('/styles/') || filePath.startsWith('/scripts/')) {
        // Handle styles and scripts from parent front folder
        fullPath = path.join(__dirname, '..', filePath);
    } else if (filePath === '/script/view.js' || filePath === '/index.html') {
        // Handle script/view.js and index.html from parent front folder
        fullPath = path.join(__dirname, '..', filePath);
    } else if (filePath.startsWith('/backend/')) {
        // Handle backend files from backend folder (2 levels up)
        fullPath = path.join(__dirname, '..', '..', filePath);
    } else {
        // Handle front-end files from test folder
        fullPath = path.join(__dirname, filePath);
    }

    // Get file extension
    const extname = String(path.extname(fullPath)).toLowerCase();
    const contentType = mimeTypes[extname] || 'application/octet-stream';

    // Read and serve the file
    fs.readFile(fullPath, (err, content) => {
        if (err) {
            if (err.code === 'ENOENT') {
                // File not found
                res.writeHead(404, { 'Content-Type': 'text/html' });
                res.end('<h1>404 - File Not Found</h1>', 'utf-8');
            } else {
                // Server error
                res.writeHead(500);
                res.end(`Server Error: ${err.code}`, 'utf-8');
            }
        } else {
            // Success
            res.writeHead(200, {
                'Content-Type': contentType,
                'Access-Control-Allow-Origin': '*' // Enable CORS
            });
            res.end(content, 'utf-8');
        }
    });
});

server.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}/`);
    console.log(`Open http://localhost:${PORT}/ in your browser to view the application`);
});

