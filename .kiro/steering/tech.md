---
inclusion: always
---

# Technology Stack & Development Guidelines

## Core Technologies

- **3D Engine**: Babylon.js v7.47.2 (WebGL/WebGPU rendering)
- **Physics Engine**: Havok Physics v1.3.10
- **UI Framework**: Babylon.js GUI
- **Language**: JavaScript (ES6 modules) with ongoing TypeScript migration
- **Package Manager**: pnpm (REQUIRED - do not use npm or yarn)
- **Test Framework**: Node.js built-in test runner with c8 coverage
- **Server**: Fastify v5.2.0 with CORS and static file serving

## Critical Dependencies

External libraries loaded via CDN (do NOT bundle):
- `babylon.js` - Core 3D engine
- `HavokPhysics_umd.js` - Physics simulation
- `babylon.gui.min.js` - UI components
- `babylonjs.loaders.min.js` - Asset loading (GLTF, OBJ, etc.)
- `babylonjs.materials.min.js` - Material library

## Development Workflow

### Installation
```bash
pnpm install  # Always use pnpm
```

### Running the Simulation
```bash
pnpm start    # Production server (port 3000)
pnpm dev      # Development with auto-reload
```
Access at `http://localhost:3000`

### Testing Commands
```bash
pnpm test                    # Run all tests
pnpm run test:coverage       # Generate coverage report
pnpm run coverage:browser    # Browser-based coverage
pnpm run coverage:analyze    # Analyze coverage data
pnpm run coverage:open       # Open HTML coverage report
```

### Performance Testing
```bash
node run-performance-tests.js      # Full performance suite
node run-cpu-profiler-tests.js     # CPU profiling
node run-data-storage-tests.js     # Data storage tests
```

## Code Style & Conventions

### File Organization
- Place agent code in `MyHavokSimCode/Agents/{AgentType}/`
- Core systems go in `MyHavokSimCode/core/`
- Tests co-locate with source: `{module}/tests/{module}.test.js`
- Use ES6 module syntax (`import`/`export`)

### Naming Conventions
- **Classes**: PascalCase (e.g., `VillageEngine`, `ZombieBehaviour`)
- **Files**: Match class names (e.g., `VillageEngine` → `NewVillageEngine.js`)
- **Instances**: camelCase (e.g., `waterSim`, `fishSystem`)
- **Behaviors**: Suffix with `Behaviour` (e.g., `VillagerBehaviour`)
- **Systems**: Suffix with `System` (e.g., `SpawnSystem`)

### TypeScript Migration
- Project is migrating from JavaScript to TypeScript
- Prioritize core systems and utilities first
- Maintain backward compatibility during migration
- Use `.ts` extension for new TypeScript files
- Keep type definitions strict and explicit

## Architecture Patterns

### Component-Based Agents
All agents follow a three-layer pattern:
1. **Model**: 3D mesh, animations, visual representation
2. **Behaviour**: State machines, AI logic, group coordination
3. **Agent**: Individual instances with unique state

### Error Handling
- Use decorator pattern from `core/ErrorHandling.js`
- Apply decorators programmatically for JavaScript compatibility
- All critical methods should have error recovery

### System Initialization
- Systems configured declaratively in `SYSTEM_CONFIGS` (see `Havokimport.js`)
- Conditional loading based on level requirements
- Use dependency injection where possible

## Testing Requirements

### Test Structure
- Use Node.js built-in `test` and `assert` modules
- Co-locate tests with source code in `tests/` subdirectories
- Name test files: `{ModuleName}.test.js`

### Coverage Standards
- Aim for >80% coverage on core systems
- Use c8 for coverage reporting
- Browser-based tests for Babylon.js integration

### Test Execution
- Tests run in Node.js environment
- Mock Babylon.js dependencies when needed
- Use `CompatibilityTestFramework.js` for browser compatibility tests

## Performance Considerations

### Optimization Systems
- LOD (Level of Detail) management via `LODManager.js`
- Hardware capability detection via `HardwareDetector.js`
- Adaptive quality scaling via `AdaptiveQualityManager.js`
- Spatial partitioning for agent queries

### Performance Monitoring
- Built-in performance dashboard (`Performance/PerformanceDashboard.js`)
- Frame rate tracking and alerting
- Memory monitoring and cleanup systems

## Browser Compatibility

- **Required**: Modern browsers with WebGL 2.0 or WebGPU support
- **Tested**: Chrome 90+, Firefox 88+, Safari 14+, Edge 90+
- Includes runtime compatibility checks and graceful degradation
- Use `CompatibilityTestFramework.js` for validation

## Configuration Files

- `dev.config.js` - Development server configuration
- `.c8rc.json` - Coverage tool settings
- `tsconfig.json` - TypeScript compiler options
- `package.json` - Dependencies and scripts

## Common Pitfalls

- **DO NOT** use npm or yarn - only pnpm
- **DO NOT** bundle CDN dependencies - they must load externally
- **DO NOT** modify Babylon.js or Havok core files
- **ALWAYS** test in browser after changes to rendering/physics code
- **ALWAYS** check coverage after adding new modules
