import fastify from 'fastify';
import path from 'path';
import { fileURLToPath } from 'url';
import cors from '@fastify/cors';
import staticFiles from '@fastify/static';
import { exec } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const server = fastify({ logger: true });

// Register CORS plugin
server.register(cors, {
    origin: true
});

// Register static file serving
server.register(staticFiles, {
    root: path.join(__dirname),
    prefix: '/',
    // Serve index.html for root path explicitly
    index: ['index.html'],
    // Ignore ecs-rebuild directory to prevent conflicts
    ignore: (file) => {
        return file.includes('ecs-rebuild');
    }
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
 * Open browser automatically (Windows-compatible)
 */
function openBrowser(url) {
    const platform = process.platform;
    let command;
    let options = {};
    
    switch (platform) {
        case 'win32':
            // Windows: Use cmd.exe to execute start command
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
        console.log(`Server ready at ${url}`); // VS Code-friendly pattern
        
        // Auto-open browser if requested
        if (process.env.AUTO_OPEN_BROWSER === 'true') {
            setTimeout(() => openBrowser(url), 1000); // Small delay to ensure server is ready
        }
    } catch (err) {
        server.log.error(err);
        process.exit(1);
    }
};

start();