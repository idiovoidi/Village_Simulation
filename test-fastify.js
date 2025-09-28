const fastify = require('fastify')({ logger: false });

// Simple test to verify Fastify setup
async function testFastify() {
  try {
    // Register a test route
    fastify.get('/test', async (request, reply) => {
      return { message: 'Fastify is working!' };
    });

    // Start server
    await fastify.listen({ port: 3001 });
    console.log('✅ Fastify test server started on port 3001');

    // Test the endpoint
    const response = await fetch('http://localhost:3001/test');
    const data = await response.json();
    
    console.log('✅ Test response:', data);
    
    // Close server
    await fastify.close();
    console.log('✅ Fastify test completed successfully');
    
  } catch (error) {
    console.error('❌ Fastify test failed:', error);
    process.exit(1);
  }
}

testFastify();