import fastify from 'fastify';
import path from 'path';
import { fileURLToPath } from 'url';
import cors from '@fastify/cors';
import staticFiles from '@fastify/static';

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
    prefix: '/'
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

// Start server
const start = async () => {
    try {
        const port = process.env.PORT || 3000;
        await server.listen({ port, host: '0.0.0.0' });
        console.log(`🚀 Village Sim server running at http://localhost:${port}`);
    } catch (err) {
        server.log.error(err);
        process.exit(1);
    }
};

start();