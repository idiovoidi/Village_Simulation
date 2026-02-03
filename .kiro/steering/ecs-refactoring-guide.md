---
inclusion: always
---

# ECS Refactoring Guide for Village Simulation

## Overview

This guide provides incremental steps to refactor the existing JavaScript codebase toward an Entity-Component-System (ECS) architecture while maintaining full functionality. Follow the Google TypeScript Style Guide (https://ts.dev/style/) for all code standards.

## Refactoring Strategy

### Phase 1: Code Quality Foundation (Current Priority)
1. **Add ESLint with TypeScript rules** to existing JavaScript
2. **Fix linting errors** incrementally, file by file
3. **Add JSDoc comments** with type annotations
4. **Extract magic numbers** to named constants
5. **Reduce function complexity** (max 10 cyclomatic complexity)

### Phase 2: Gradual TypeScript Migration
1. **Rename .js to .ts** one file at a time, starting with utilities
2. **Add explicit types** to function parameters and returns
3. **Replace `any` types** with proper interfaces
4. **Use strict null checks** (`strictNullChecks: true`)
5. **Leverage discriminated unions** for state machines

### Phase 3: Component Extraction
1. **Identify data structures** that are pure data (no methods)
2. **Extract to separate component files** (e.g., `PositionComponent`, `VelocityComponent`)
3. **Make components immutable** where possible (readonly properties)
4. **Use interfaces** for component definitions
5. **Keep components serializable** (no functions, only data)

### Phase 4: System Separation
1. **Identify logic that operates on components**
2. **Extract to system classes** (e.g., `MovementSystem`, `RenderSystem`)
3. **Systems query for entities** with specific components
4. **Systems update in priority order**
5. **Systems communicate via events**, not direct calls

## TypeScript Style Guidelines (ts.dev/style)

### Naming Conventions

```typescript
// Interfaces: PascalCase, no "I" prefix
interface PositionComponent {
  readonly type: 'Position';
  x: number;
  y: number;
  z: number;
}

// Classes: PascalCase
class MovementSystem {
  update(deltaTime: number): void { }
}

// Functions: camelCase
function calculateDistance(a: Vector3, b: Vector3): number { }

// Constants: SCREAMING_SNAKE_CASE for true constants
const MAX_ENTITIES = 1000;
const DEFAULT_SPEED = 5;

// Enums: PascalCase for enum, PascalCase for members
enum BehaviorState {
  Idle = 'Idle',
  Moving = 'Moving',
  Attacking = 'Attacking'
}

// Private members: prefix with underscore (optional but recommended)
class Agent {
  private _health: number;
  private _position: Vector3;
}
```

### Type Annotations

```typescript
// Always annotate function parameters and return types
function moveEntity(entity: Entity, velocity: Vector3): void {
  entity.position.x += velocity.x;
  entity.position.y += velocity.y;
  entity.position.z += velocity.z;
}

// Use type inference for simple variables
const speed = 5; // inferred as number
const name = 'villager'; // inferred as string

// Explicitly type complex structures
const config: SimulationConfig = {
  maxEntities: 100,
  updateRate: 60
};

// Avoid 'any' - use 'unknown' if type is truly unknown
function processData(data: unknown): void {
  if (typeof data === 'string') {
    console.log(data.toUpperCase());
  }
}
```

### Prefer Interfaces Over Type Aliases

```typescript
// GOOD: Use interfaces for object shapes
interface VillagerData {
  name: string;
  health: number;
  position: Vector3;
}

// GOOD: Use type aliases for unions, primitives, tuples
type EntityId = number;
type BehaviorState = 'idle' | 'moving' | 'attacking';
type Position2D = [number, number];

// AVOID: Type alias for simple object (use interface instead)
type VillagerData = {
  name: string;
  health: number;
};
```

### Use Readonly Where Appropriate

```typescript
// Component data should be readonly to prevent accidental mutation
interface PositionComponent {
  readonly type: 'Position';
  x: number; // Mutable - systems can update
  y: number;
  z: number;
}

// Configuration should be deeply readonly
interface SimulationConfig {
  readonly maxEntities: number;
  readonly systems: readonly SystemConfig[];
}

// Use ReadonlyArray or readonly[] for arrays
function processEntities(entities: readonly Entity[]): void {
  // entities.push() would be a compile error
}
```

### Avoid Null and Undefined

```typescript
// GOOD: Use optional properties
interface VillagerComponent {
  name: string;
  home?: EntityId; // May not have a home yet
}

// GOOD: Use null for "no value" semantics
interface ZombieComponent {
  targetEntity: EntityId | null; // Explicitly no target
}

// AVOID: Mixing null and undefined
interface BadComponent {
  value: number | null | undefined; // Confusing!
}

// GOOD: Provide defaults
function createVillager(name: string, home: EntityId | null = null): Villager {
  return { name, home };
}
```

### Use Discriminated Unions for State

```typescript
// GOOD: Discriminated union for component types
type Component =
  | { type: 'Position'; x: number; y: number; z: number }
  | { type: 'Velocity'; vx: number; vy: number; vz: number }
  | { type: 'Health'; current: number; maximum: number };

function processComponent(component: Component): void {
  switch (component.type) {
    case 'Position':
      // TypeScript knows component has x, y, z
      console.log(component.x, component.y, component.z);
      break;
    case 'Velocity':
      // TypeScript knows component has vx, vy, vz
      console.log(component.vx, component.vy, component.vz);
      break;
    case 'Health':
      // TypeScript knows component has current, maximum
      console.log(component.current, component.maximum);
      break;
  }
}
```

### Prefer const and readonly

```typescript
// GOOD: Use const for variables that don't change
const MAX_SPEED = 10;
const entities: Entity[] = [];

// GOOD: Use readonly for class properties that don't change
class System {
  readonly priority: number;
  readonly componentSignature: Set<string>;
  
  constructor(priority: number) {
    this.priority = priority;
    this.componentSignature = new Set(['Position', 'Velocity']);
  }
}

// AVOID: let for values that never change
let MAX_ENTITIES = 100; // Should be const
```

### Function Complexity Limits

```typescript
// GOOD: Simple, focused functions
function calculateDistance(a: Vector3, b: Vector3): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const dz = b.z - a.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

// AVOID: Complex functions with high cyclomatic complexity
function updateAgent(agent: Agent): void {
  if (agent.health <= 0) {
    if (agent.type === 'villager') {
      if (agent.infected) {
        // Convert to zombie
      } else {
        // Remove agent
      }
    } else if (agent.type === 'zombie') {
      // Remove zombie
    }
  } else if (agent.hunger < 20) {
    if (agent.hasFood) {
      // Eat food
    } else {
      // Find food
    }
  }
  // ... more nested conditions
}

// GOOD: Extract to smaller functions
function updateAgent(agent: Agent): void {
  if (agent.health <= 0) {
    handleDeath(agent);
    return;
  }
  
  if (agent.hunger < 20) {
    handleHunger(agent);
  }
}
```

## ECS Pattern Examples

### Component Definition

```typescript
// Components are pure data, no methods
interface PositionComponent {
  readonly type: 'Position';
  x: number;
  y: number;
  z: number;
}

interface VelocityComponent {
  readonly type: 'Velocity';
  vx: number;
  vy: number;
  vz: number;
  maxSpeed: number;
}

interface HealthComponent {
  readonly type: 'Health';
  current: number;
  maximum: number;
  regenerationRate: number;
}

// Factory functions for creating components
function createPositionComponent(x: number, y: number, z: number): PositionComponent {
  return { type: 'Position', x, y, z };
}
```

### Entity Definition

```typescript
// Entities are just IDs with component collections
type EntityId = number;

interface Entity {
  id: EntityId;
  components: Map<string, Component>;
  active: boolean;
}

// World manages entities
class World {
  private entities: Map<EntityId, Entity> = new Map();
  private nextId = 1;
  
  createEntity(): EntityId {
    const id = this.nextId++;
    this.entities.set(id, {
      id,
      components: new Map(),
      active: true
    });
    return id;
  }
  
  addComponent(entityId: EntityId, component: Component): void {
    const entity = this.entities.get(entityId);
    if (entity) {
      entity.components.set(component.type, component);
    }
  }
  
  getComponent<T extends Component>(entityId: EntityId, type: string): T | undefined {
    const entity = this.entities.get(entityId);
    return entity?.components.get(type) as T | undefined;
  }
}
```

### System Definition

```typescript
// Systems contain logic, operate on components
abstract class System {
  abstract readonly priority: number;
  abstract readonly componentSignature: Set<string>;
  
  constructor(protected world: World) {}
  
  abstract update(deltaTime: number): void;
  
  protected queryEntities(): EntityId[] {
    const results: EntityId[] = [];
    for (const [id, entity] of this.world.getAllEntities()) {
      if (this.matchesSignature(entity)) {
        results.push(id);
      }
    }
    return results;
  }
  
  private matchesSignature(entity: Entity): boolean {
    for (const componentType of this.componentSignature) {
      if (!entity.components.has(componentType)) {
        return false;
      }
    }
    return true;
  }
}

// Example system implementation
class MovementSystem extends System {
  readonly priority = 100;
  readonly componentSignature = new Set(['Position', 'Velocity']);
  
  update(deltaTime: number): void {
    const entities = this.queryEntities();
    
    for (const entityId of entities) {
      const position = this.world.getComponent<PositionComponent>(entityId, 'Position');
      const velocity = this.world.getComponent<VelocityComponent>(entityId, 'Velocity');
      
      if (position && velocity) {
        position.x += velocity.vx * deltaTime;
        position.y += velocity.vy * deltaTime;
        position.z += velocity.vz * deltaTime;
      }
    }
  }
}
```

## Migration Checklist

### For Each File:

- [ ] Add ESLint and fix all errors
- [ ] Add JSDoc comments with type annotations
- [ ] Extract magic numbers to constants
- [ ] Reduce function complexity (max 10)
- [ ] Rename .js to .ts
- [ ] Add explicit type annotations
- [ ] Replace any with proper types
- [ ] Identify data structures (potential components)
- [ ] Identify logic (potential systems)
- [ ] Extract components to separate files
- [ ] Extract systems to separate files
- [ ] Update imports and exports
- [ ] Test functionality

### Priority Order:

1. **Utilities** (MathHelpers, Vector3Helpers, Random, Logger)
2. **Components** (Position, Velocity, Health, AI states)
3. **Core Systems** (Movement, Physics, Rendering)
4. **AI Systems** (Steering, Pathfinding, Decision-making)
5. **Agent Implementations** (Villagers, Zombies, Fish, Birds)
6. **World Systems** (Terrain, Weather, Day/Night)

## Common Patterns to Refactor

### Before: Mixed Data and Logic

```javascript
class Villager {
  constructor(scene, position) {
    this.position = position;
    this.velocity = { x: 0, y: 0, z: 0 };
    this.health = 100;
    this.mesh = this.createMesh(scene);
  }
  
  update(deltaTime) {
    // Update position
    this.position.x += this.velocity.x * deltaTime;
    this.position.y += this.velocity.y * deltaTime;
    this.position.z += this.velocity.z * deltaTime;
    
    // Update mesh
    this.mesh.position.copyFrom(this.position);
    
    // AI logic
    if (this.health < 20) {
      this.findFood();
    }
  }
}
```

### After: Separated Components and Systems

```typescript
// Components (data only)
interface PositionComponent {
  readonly type: 'Position';
  x: number;
  y: number;
  z: number;
}

interface VelocityComponent {
  readonly type: 'Velocity';
  vx: number;
  vy: number;
  vz: number;
}

interface HealthComponent {
  readonly type: 'Health';
  current: number;
  maximum: number;
}

interface VillagerComponent {
  readonly type: 'Villager';
  name: string;
  profession: string;
}

// Systems (logic only)
class MovementSystem extends System {
  update(deltaTime: number): void {
    const entities = this.queryEntities();
    for (const id of entities) {
      const pos = this.world.getComponent<PositionComponent>(id, 'Position');
      const vel = this.world.getComponent<VelocityComponent>(id, 'Velocity');
      if (pos && vel) {
        pos.x += vel.vx * deltaTime;
        pos.y += vel.vy * deltaTime;
        pos.z += vel.vz * deltaTime;
      }
    }
  }
}

class RenderSystem extends System {
  update(deltaTime: number): void {
    const entities = this.queryEntities();
    for (const id of entities) {
      const pos = this.world.getComponent<PositionComponent>(id, 'Position');
      const model = this.world.getComponent<ModelComponent>(id, 'Model');
      if (pos && model && model.mesh) {
        model.mesh.position.set(pos.x, pos.y, pos.z);
      }
    }
  }
}

class VillagerAISystem extends System {
  update(deltaTime: number): void {
    const entities = this.queryEntities();
    for (const id of entities) {
      const health = this.world.getComponent<HealthComponent>(id, 'Health');
      const behavior = this.world.getComponent<AIBehaviorComponent>(id, 'AIBehavior');
      if (health && behavior && health.current < 20) {
        behavior.currentState = 'FindFood';
      }
    }
  }
}
```

## Testing Strategy

### Unit Tests
- Test individual systems in isolation
- Mock component data
- Verify system logic without dependencies

### Integration Tests
- Test system interactions
- Verify component updates propagate correctly
- Test full entity lifecycle

### Property-Based Tests
- Test invariants (e.g., entities always have valid IDs)
- Test system ordering (lower priority executes first)
- Test component queries (correct entities returned)

## Resources

- **TypeScript Style Guide**: https://ts.dev/style/
- **ECS Pattern**: https://github.com/SanderMertens/ecs-faq
- **TypeScript Handbook**: https://www.typescriptlang.org/docs/handbook/
- **ESLint TypeScript**: https://typescript-eslint.io/

## Notes

- **Maintain backward compatibility** during refactoring
- **Test after each change** to ensure functionality
- **Commit frequently** with clear messages
- **Document breaking changes** in commit messages
- **Keep the simulation running** at all times
