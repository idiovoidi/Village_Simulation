const fastify = require('fastify')({ logger: true });
const path = require('path');

// Register CORS plugin
fastify.register(require('@fastify/cors'), {
  origin: true
});

// Register static file serving
fastify.register(require('@fastify/static'), {
  root: path.join(__dirname),
  prefix: '/'
});

// API routes for village sim
fastify.get('/api/health', async (request, reply) => {
  return { status: 'ok', timestamp: new Date().toISOString() };
});

// Village data endpoints
fastify.get('/api/village/stats', async (request, reply) => {
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
fastify.get('/api/performance', async (request, reply) => {
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
    await fastify.listen({ port, host: '0.0.0.0' });
    console.log(`🚀 Village Sim server running at http://localhost:${port}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();