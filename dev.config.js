module.exports = {
  server: {
    port: 3000,
    host: '0.0.0.0'
  },
  cors: {
    origin: true,
    credentials: true
  },
  static: {
    root: __dirname,
    prefix: '/'
  },
  logging: {
    level: 'info'
  },
  village: {
    maxPopulation: 1000,
    startingResources: {
      wood: 100,
      stone: 50,
      food: 75
    }
  }
};