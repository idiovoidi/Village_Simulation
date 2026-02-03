# TypeScript ECS Village Simulation

A complete rebuild of the 3D Village Simulation using TypeScript and a pure Entity-Component-System (ECS) architecture.

## Project Structure

```
ecs-rebuild/
├── src/
│   ├── core/          # ECS core infrastructure (World, Entity, Component, System)
│   ├── components/    # Component definitions
│   ├── systems/       # System implementations
│   ├── managers/      # High-level managers (GameManager, ResourceManager, etc.)
│   ├── utils/         # Utility classes and helpers
│   └── main.ts        # Application entry point
├── public/
│   └── index.html     # HTML entry point
├── tests/             # Integration tests
└── coverage/          # Test coverage reports
```

## Technology Stack

- **Language**: TypeScript 5.7+ with strict mode
- **Build Tool**: Vite 6.0+
- **3D Engine**: Babylon.js v7.47.2 (loaded from CDN)
- **Physics**: Havok Physics v1.3.10 (loaded from CDN)
- **Testing**: Node.js test runner with c8 coverage
- **Property Testing**: fast-check
- **Package Manager**: npm (REQUIRED)

## Getting Started

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

Access the simulation at `http://localhost:3000`

### Building

```bash
npm run build
```

### Testing

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch
```

### Code Quality

```bash
# Lint code
npm run lint

# Fix linting issues
npm run lint:fix

# Format code
npm run format

# Check formatting
npm run format:check

# Type check
npm run type-check
```

## Architecture

This project follows a pure ECS architecture:

- **Entities**: Unique identifiers representing game objects
- **Components**: Pure data containers attached to entities
- **Systems**: Logic processors that operate on entities with specific components
- **World**: Central coordinator managing entities, components, and systems

## Requirements

See `.kiro/specs/typescript-ecs-rebuild/requirements.md` for detailed requirements.

## Design

See `.kiro/specs/typescript-ecs-rebuild/design.md` for architecture and design decisions.

## Implementation Plan

See `.kiro/specs/typescript-ecs-rebuild/tasks.md` for the implementation task list.

## License

ISC
