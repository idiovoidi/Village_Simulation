# TypeScript ECS Rebuild - Setup Complete

## Overview

A new TypeScript-based Entity-Component-System (ECS) rebuild of the 3D Village Simulation has been initialized in the `ecs-rebuild/` directory.

## Location

```
ecs-rebuild/
```

This is a separate project from the main JavaScript codebase, allowing for parallel development and reference-based migration.

## Quick Start

```bash
cd ecs-rebuild
npm install
npm run dev
```

## Documentation

- **Project Setup**: `ecs-rebuild/PROJECT_SETUP.md` - Complete setup verification
- **README**: `ecs-rebuild/README.md` - Project overview and commands
- **Steering Guide**: `ecs-rebuild/.kiro/steering/ecs-rebuild-guidelines.md` - Development guidelines
- **Requirements**: `.kiro/specs/typescript-ecs-rebuild/requirements.md` - Detailed requirements
- **Design**: `.kiro/specs/typescript-ecs-rebuild/design.md` - Architecture and design
- **Tasks**: `.kiro/specs/typescript-ecs-rebuild/tasks.md` - Implementation plan

## Key Features

- **TypeScript 5.7+** with strict mode
- **Vite 6.0+** for fast development and optimized builds
- **Pure ECS Architecture** with clear separation of concerns
- **Comprehensive Testing** with Node.js test runner and fast-check
- **Code Quality** enforced with ESLint and Prettier
- **Coverage Reporting** with c8

## Technology Stack

- Language: TypeScript (strict mode)
- Build Tool: Vite
- 3D Engine: Babylon.js v7.47.2 (CDN)
- Physics: Havok Physics v1.3.10 (CDN)
- Testing: Node.js test runner + fast-check
- Package Manager: npm

## Status

✅ **Task 1: Project Setup and Configuration - COMPLETE**

All configuration files, dependencies, and project structure have been set up and verified.

## Next Steps

Proceed to Task 2: ECS Core Implementation
- Implement World, Entity, Component, System base classes
- Create ComponentStorage with efficient data structures
- Implement entity queries and component access
- Add property-based tests for core ECS operations

## Commands Reference

```bash
# Development
npm run dev              # Start dev server
npm run build            # Build for production
npm run preview          # Preview production build

# Testing
npm test                 # Run tests
npm run test:coverage    # Run with coverage
npm run test:watch       # Watch mode

# Code Quality
npm run lint             # Lint code
npm run lint:fix         # Fix linting issues
npm run format           # Format code
npm run format:check     # Check formatting
npm run type-check       # Type check
```

## Important Notes

1. **Package Manager**: Use npm (NOT pnpm) for this project
2. **CDN Dependencies**: Babylon.js and Havok are loaded from CDN, not bundled
3. **Separate Codebase**: This is independent from the main JavaScript codebase
4. **Reference Migration**: The old codebase serves as a reference for behavior validation

---

For detailed information, see the documentation in the `ecs-rebuild/` directory.
