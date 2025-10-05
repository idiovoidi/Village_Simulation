---
inclusion: always
---

# Technology Stack

## Core Technologies

- **3D Engine**: Babylon.js v7.47.2 (WebGL/WebGPU rendering)
- **Physics Engine**: Havok Physics v1.3.10
- **UI Framework**: Babylon.js GUI
- **Language**: JavaScript (ES6 modules)
- **Package Manager**: pnpm

## Dependencies

Key libraries loaded via CDN:
- babylon.js (core engine)
- HavokPhysics_umd.js (physics)
- babylon.gui.min.js (UI)
- babylonjs.loaders.min.js (asset loading)
- babylonjs.materials.min.js (material library)

## Development Setup

### Installation
```bash
pnpm install
```

### Running the Development Server
```bash
# Start the Fastify server
pnpm start

# Or with auto-reload
pnpm dev
```

The server runs on port 3000 by default. Open `http://localhost:3000` in a browser.

### Testing
```bash
# Run all tests
pnpm test

# Run with coverage
pnpm run test:coverage

# Browser-based coverage
pnpm run coverage:browser

# Analyze coverage
pnpm run coverage:analyze

# Open coverage report
pnpm run coverage:open
```

### Performance Testing
```bash
# Run performance tests
node run-performance-tests.js

# Run CPU profiler tests
node run-cpu-profiler-tests.js

# Run data storage tests
node run-data-storage-tests.js
```

## Build Configuration

- **Development Config**: `dev.config.js`
- **Coverage Config**: `.c8rc.json` (c8 coverage tool)
- **Server**: `server.js` (Fastify with CORS and static file serving)

## Browser Compatibility

Requires modern browsers with WebGL or WebGPU support. The simulation includes compatibility checks and error handling for unsupported environments.
