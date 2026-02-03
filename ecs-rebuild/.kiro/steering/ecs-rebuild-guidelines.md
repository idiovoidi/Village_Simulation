---
inclusion: always
---

# TypeScript ECS Rebuild Guidelines

## Package Manager

**CRITICAL**: This project uses **npm** as the package manager, NOT pnpm.

- Always use `npm install` to install dependencies
- Always use `npm run <script>` to run scripts
- Do NOT use pnpm or yarn commands

## Project Location

The TypeScript ECS rebuild is located in the `ecs-rebuild/` directory, separate from the main JavaScript codebase.

## Technology Stack

- **Language**: TypeScript 5.7+ with strict mode enabled
- **Build Tool**: Vite 6.0+ for fast development and optimized builds
- **3D Engine**: Babylon.js v7.47.2 (loaded from CDN, NOT bundled)
- **Physics**: Havok Physics v1.3.10 (loaded from CDN, NOT bundled)
- **Testing**: Node.js built-in test runner with c8 coverage
- **Property Testing**: fast-check v4.5+
- **Code Quality**: ESLint + Prettier

## Architecture Principles

1. **Pure ECS**: Entities are IDs, components are data, systems are logic
2. **Strict TypeScript**: No `any` types, strict null checks, explicit return types
3. **Data-Oriented Design**: Components stored efficiently for cache performance
4. **System Independence**: Systems communicate through component state and events
5. **Rendering Decoupling**: Babylon.js isolated in rendering layer

## Directory Structure

```
ecs-rebuild/
├── src/
│   ├── core/          # ECS infrastructure (World, Entity, Component, System)
│   ├── components/    # Component definitions (pure data)
│   ├── systems/       # System implementations (pure logic)
│   ├── managers/      # High-level coordinators
│   ├── utils/         # Helper utilities
│   └── main.ts        # Entry point
├── public/
│   └── index.html     # HTML with CDN script tags
└── tests/             # Integration tests
```

## Naming Conventions

- **Files**: PascalCase matching class names (e.g., `World.ts`, `PositionComponent.ts`)
- **Classes**: PascalCase (e.g., `World`, `PhysicsSystem`)
- **Interfaces**: PascalCase with descriptive names (e.g., `Component`, `PositionComponent`)
- **Functions**: camelCase (e.g., `createEntity`, `queryEntities`)
- **Constants**: UPPER_SNAKE_CASE (e.g., `MAX_ENTITIES`)
- **Type aliases**: PascalCase (e.g., `EntityId`, `ComponentType`)

## Component Design

Components are pure data containers:

```typescript
interface PositionComponent extends Component {
  type: 'Position';
  x: number;
  y: number;
  z: number;
}
```

- Use `readonly` for immutable fields
- Include type discriminator for type safety
- No methods, only data
- Keep components small and focused

## System Design

Systems are pure logic processors:

```typescript
class MovementSystem extends System {
  readonly componentSignature = new Set(['Position', 'Velocity']);
  readonly priority = 200;
  
  update(deltaTime: number): void {
    const entities = this.queryEntities();
    for (const entity of entities) {
      // Process entity
    }
  }
}
```

- Extend `System` base class
- Define component signature
- Define priority for execution order
- Implement `update(deltaTime)` method
- Query entities through World

## Testing Requirements

- **Unit Tests**: Co-locate with source files (e.g., `World.test.ts` next to `World.ts`)
- **Property Tests**: Use fast-check for universal properties
- **Coverage**: Minimum 80% overall, 90% for core ECS
- **Test Naming**: Descriptive test names explaining what is tested
- **Property Test Format**: Tag with `Feature: typescript-ecs-rebuild, Property N: [description]`

## Code Quality Standards

- **No `any` types**: Use proper TypeScript types
- **Explicit return types**: All functions must declare return types
- **Max complexity**: 10 cyclomatic complexity
- **Max function length**: 50 lines (excluding comments/blanks)
- **Max parameters**: 4 parameters per function
- **Consistent formatting**: Use Prettier (run `npm run format`)

## CDN Dependencies

These libraries are loaded from CDN and should NOT be bundled:

- `babylonjs`
- `babylonjs-loaders`
- `babylonjs-materials`
- `babylonjs-gui`
- `@babylonjs/havok`

They are marked as external in `vite.config.ts`.

## Development Workflow

1. **Start development server**: `npm run dev`
2. **Run tests**: `npm test`
3. **Check types**: `npm run type-check`
4. **Lint code**: `npm run lint`
5. **Format code**: `npm run format`
6. **Build for production**: `npm run build`

## Migration Reference

The old JavaScript codebase in `MyHavokSimCode/` serves as a reference for behavior validation. When implementing features:

1. Review the corresponding JavaScript implementation
2. Understand the behavior and requirements
3. Implement in TypeScript ECS architecture
4. Validate behavior matches original
5. Write tests to prevent regressions

## Common Patterns

### Creating Entities

```typescript
const entity = world.createEntity();
world.addComponent(entity, { type: 'Position', x: 0, y: 0, z: 0 });
world.addComponent(entity, { type: 'Velocity', vx: 0, vy: 0, vz: 0, maxSpeed: 5 });
```

### Querying Entities

```typescript
const signature = new Set(['Position', 'Velocity']);
const entities = world.query(signature);
```

### Accessing Components

```typescript
const position = world.getComponent(entity, 'Position');
if (position) {
  position.x += velocity.vx * deltaTime;
}
```

### System Execution Order

- Input: 0-99
- AI: 100-199
- Physics: 200-299
- Game Logic: 300-499
- Transform: 500-599
- Rendering: 600-699

## Error Handling

- Use TypeScript's type system to prevent errors at compile time
- Validate component data on creation
- Handle missing components gracefully
- Log errors with context for debugging
- Provide fallbacks for non-critical failures

## Performance Considerations

- Use typed arrays for component storage where applicable
- Implement spatial partitioning for entity queries
- Use object pooling for frequently created/destroyed entities
- Profile system execution times
- Implement LOD and culling for rendering

## Documentation

- Document all public APIs with JSDoc comments
- Include examples in documentation
- Reference requirements in comments
- Explain complex algorithms
- Keep documentation up to date with code changes
