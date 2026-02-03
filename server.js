import fastify from 'fastify';
import path from 'path';
import { fileURLToPath } from 'url';
import cors from '@fastify/cors';
import staticFiles from '@fastify/static';
import { exec } from 'child_process';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const server = fastify({ logger: true });

// Store SSE clients for hot reload
const clients = new Set();

// Register CORS plugin
server.register(cors, {
    origin: true
});

// Register static file serving
server.register(staticFiles, {
    root: path.join(__dirname),
    prefix: '/',
    index: ['index.html'],
    ignore: (file) => {
        return file.includes('ecs-rebuild');
    }
});

// SSE endpoint for hot reload (no extra dependencies needed!)
server.get('/hot-reload', async (request, reply) => {
    reply.raw.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
    });
    
    clients.add(reply.raw);
    console.log('🔌 Hot reload client connected');
    
    // Send initial connection message
    reply.raw.write('data: {"type":"connected"}\n\n');
    
    request.raw.on('close', () => {
        clients.delete(reply.raw);
        console.log('🔌 Hot reload client disconnected');
    });
});

// API routes for village sim
server.get('/api/health', async (request, reply) => {
    return { status: 'ok', timestamp: new Date().toISOString() };
});

// Village data endpoints
server.get('/api/village/stats', async (request, reply) => {
    return {
        population: 0,
        buildings: 0,
        resources: {
            wood: 100,
            stone: 50,
            food: 75
        }
    };
});

// Performance monitoring endpoint
server.get('/api/performance', async (request, reply) => {
    return {
        fps: 60,
        memory: process.memoryUsage(),
        uptime: process.uptime()
    };
});

/**
 * Notify all connected clients to reload
 */
function notifyReload(filename = null) {
    console.log(`🔄 Notifying ${clients.size} client(s) to reload...`);
    const message = JSON.stringify({ type: 'reload', file: filename });
    clients.forEach(client => {
        try {
            client.write(`data: ${message}\n\n`);
        } catch (err) {
            console.error('Error sending reload message:', err);
            clients.delete(client);
        }
    });
}

/**
 * Watch for file changes and trigger reload
 */
function setupFileWatcher() {
    const watchPaths = [
        'MyHavokSimCode',
        'assets',
        'index.html'
    ];
    
    let debounceTimer = null;
    
    watchPaths.forEach(watchPath => {
        if (fs.existsSync(watchPath)) {
            fs.watch(watchPath, { recursive: true }, (eventType, filename) => {
                if (filename && (
                    filename.endsWith('.js') || 
                    filename.endsWith('.ts') ||
                    filename.endsWith('.html') ||
                    filename.endsWith('.css')
                )) {
                    // Debounce to avoid multiple reloads
                    if (debounceTimer) {
                        clearTimeout(debounceTimer);
                    }
                    
                    debounceTimer = setTimeout(() => {
                        console.log(`📝 File changed: ${filename}`);
                        notifyReload(filename);
                    }, 300);
                }
            });
            console.log(`👀 Watching: ${watchPath}`);
        }
    });
}

/**
 * Open browser automatically (Windows-compatible)
 */
function openBrowser(url) {
    const platform = process.platform;
    let command;
    let options = {};
    
    switch (platform) {
        case 'win32':
            command = `cmd.exe /c start "" "${url}"`;
            options = { shell: true };
            break;
        case 'darwin':
            command = `open ${url}`;
            break;
        case 'linux':
            command = `xdg-open ${url}`;
            break;
        default:
            console.log(`🌐 Please open your browser to: ${url}`);
            return;
    }
    
    exec(command, options, (error) => {
        if (error) {
            console.log(`🌐 Please open your browser to: ${url}`);
        } else {
            console.log(`🚀 Browser opened automatically: ${url}`);
        }
    });
}

// Start server
const start = async () => {
    try {
        const port = process.env.PORT || 3000;
        await server.listen({ port, host: '0.0.0.0' });
        const url = `http://localhost:${port}`;
        console.log(`🚀 Village Sim server running at ${url}`);
        console.log(`🔥 Hot reload enabled`);
        console.log(`Server ready at ${url}`);
        
        // Setup file watching for hot reload
        setupFileWatcher();
        
        // Auto-open browser if requested
        if (process.env.AUTO_OPEN_BROWSER === 'true') {
            setTimeout(() => openBrowser(url), 1000);
        }
    } catch (err) {
        server.log.error(err);
        process.exit(1);
    }
};

start();
