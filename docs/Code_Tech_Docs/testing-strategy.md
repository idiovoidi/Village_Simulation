# Testing Strategy

## Purpose

This document defines the testing approach for the 3D Village Simulation, including test categories, quality gates, and verification requirements. The strategy ensures implementation correctness while maintaining development velocity.

## Boundaries

**In Scope**:
- Automated test categories and their purposes
- Quality gates and thresholds
- Smoke test requirements
- Property-based testing configuration
- Code quality tooling (Madge, coverage)

**Out of Scope**:
- Manual testing procedures
- User acceptance testing
- Performance benchmarking methodology (see performance-system.md)

## Test Categories

### Unit Tests

**Purpose**: Verify individual functions, classes, and modules in isolation.

**Scope**: Single unit of code with dependencies mocked or stubbed.

**Characteristics**:
- Fast execution (< 100ms per test)
- No external dependencies (filesystem, network, GPU)
- Deterministic results
- High coverage of edge cases

**When to Use**:
- Testing pure functions
- Testing class methods with mocked dependencies
- Validating input validation logic
- Testing error handling paths

**Framework**: Vitest

**Example Structure**:
```typescript
describe('EntityManager', () => {
  describe('createEntity', () => {
    it('should return unique entity ID', () => { /* ... */ });
    it('should increment entity count', () => { /* ... */ });
  });
});
```

---

### Integration Tests

**Purpose**: Verify interactions between multiple systems or components.

**Scope**: Multiple units working together, may include real dependencies.

**Characteristics**:
- Moderate execution time (< 1s per test)
- Tests real interactions between components
- May use test doubles for external systems (GPU, physics engine)

**When to Use**:
- Testing system-to-system communication via event bus
- Testing ECS queries across multiple components
- Testing level loading with multiple systems
- Testing agent behavior with real state machines

**Framework**: Vitest

**Example Structure**:
```typescript
describe('AgentSystem + EventBus Integration', () => {
  it('should emit agent-spawned event when agent created', () => { /* ... */ });
  it('should update agent when position-changed event received', () => { /* ... */ });
});
```

---

### Property-Based Tests

**Purpose**: Verify invariants hold across a wide range of randomly generated inputs.

**Scope**: Properties that must hold for all valid inputs.

**Characteristics**:
- Tests universal properties ("for all X, Y must hold")
- Generates random test cases automatically
- Shrinks failing cases to minimal examples
- Higher confidence than example-based tests

**When to Use**:
- Testing correctness properties from design document
- Testing serialization/deserialization round-trips
- Testing mathematical properties (commutativity, associativity)
- Testing state machine invariants

**Framework**: fast-check (with Vitest)

**Configuration**:
- Minimum iterations: 100 per property
- Shrink attempts: 100 (default)
- Seed: Configurable for reproducibility

**Example Structure**:
```typescript
import fc from 'fast-check';

describe('Property: Entity-Component Query Inclusion', () => {
  it('should return entity in query results when entity has queried components', () => {
    fc.assert(
      fc.property(
        fc.array(fc.string()), // component types
        (componentTypes) => {
          const entity = world.createEntity();
          componentTypes.forEach(type => world.addComponent(entity, type, {}));
          const results = world.query(...componentTypes);
          return results.includes(entity);
        }
      ),
      { numRuns: 100 }
    );
  });
});
```

---

### Smoke Tests

**Purpose**: Verify basic application functionality works end-to-end.

**Scope**: Full application or major subsystems.

**Characteristics**:
- Quick sanity checks (< 10s total)
- Verifies critical paths work
- Run before detailed testing
- Catches catastrophic failures early

**When to Use**:
- CI/CD pipeline gate
- Pre-release verification
- After major refactoring

#### Node Smoke Test

Verifies core modules load and basic simulation runs without GPU:

```typescript
describe('Node Smoke Test', () => {
  it('should import all core modules without error', async () => {
    await import('./core/EntityManager');
    await import('./core/EventBus');
    await import('./core/GameLoop');
    // ... all core modules
  });

  it('should construct dependency container', () => {
    const container = new Container();
    container.register(/* ... */);
    expect(container.resolve('EntityManager')).toBeDefined();
  });

  it('should run 10 simulation ticks with mocks', () => {
    const sim = createMockSimulation();
    for (let i = 0; i < 10; i++) {
      sim.tick(16.67);
    }
    expect(sim.tickCount).toBe(10);
  });
});
```

#### Browser Smoke Test

Verifies rendering initialization works:

```typescript
describe('Browser Smoke Test', () => {
  it('should create canvas element', () => {
    const canvas = document.createElement('canvas');
    expect(canvas).toBeDefined();
  });

  it('should initialize Babylon engine without errors', async () => {
    const engine = new BABYLON.Engine(canvas);
    expect(engine).toBeDefined();
    engine.dispose();
  });

  it('should create basic scene', async () => {
    const scene = new BABYLON.Scene(engine);
    expect(scene).toBeDefined();
    scene.dispose();
  });
});
```

#### Level Smoke Test

Verifies each level type loads correctly:

```typescript
describe('Level Smoke Test', () => {
  const levelTypes = ['village', 'rural', 'coastal', 'wilderness'];

  levelTypes.forEach(levelType => {
    it(`should load ${levelType} level and run 10 ticks`, async () => {
      const level = await loadLevel(levelType);
      for (let i = 0; i < 10; i++) {
        level.tick(16.67);
      }
      expect(level.isLoaded).toBe(true);
      await level.unload();
    });
  });
});
```

---

## Quality Gates

### Circular Dependency Detection

**Tool**: Madge

**Threshold**: Zero circular dependencies allowed

**Configuration**:
```json
{
  "detectCircular": true,
  "excludeRegExp": [
    "node_modules",
    "\\.test\\.",
    "\\.spec\\."
  ]
}
```

**CI Command**:
```bash
npx madge --circular --extensions ts src/
```

**Failure Action**: Build fails if any circular dependencies detected.

---

### Code Coverage

**Tool**: Vitest with v8 coverage provider

**Thresholds**:
| Metric | Minimum | Target |
|--------|---------|--------|
| Statements | 70% | 80% |
| Branches | 70% | 80% |
| Functions | 70% | 80% |
| Lines | 70% | 80% |

**Configuration** (vitest.config.ts):
```typescript
export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      thresholds: {
        statements: 70,
        branches: 70,
        functions: 70,
        lines: 70
      },
      include: ['src/**/*.ts'],
      exclude: [
        'src/**/*.test.ts',
        'src/**/*.spec.ts',
        'src/**/index.ts',
        'src/**/*.d.ts'
      ]
    }
  }
});
```

**Core Modules** (require 70% minimum):
- `src/core/*` - ECS, Event Bus, Game Loop
- `src/systems/*` - All system implementations
- `src/agents/*` - Agent behaviors

---

### Orphan Module Detection

**Tool**: Madge

**Purpose**: Identify modules not imported by any other module.

**Configuration**:
```bash
npx madge --orphans --extensions ts src/
```

**Expected Orphans** (not flagged as issues):
- `src/index.ts` - Application entrypoint
- `src/main.ts` - Alternative entrypoint
- `src/**/*.test.ts` - Test files
- `src/**/*.spec.ts` - Spec files
- `src/**/*.d.ts` - Type declaration files
- `src/config/*.ts` - Configuration files
- `src/types/*.ts` - Type-only modules

**Failure Action**: Warning only (does not fail build), but unexpected orphans should be investigated.

---

### Dependency Graph Artifact

**Tool**: Madge

**Purpose**: Generate visual dependency graph for architectural review.

**Configuration**:
```bash
npx madge --image dependency-graph.svg --extensions ts src/
npx madge --dot --extensions ts src/ > dependency-graph.dot
```

**When Generated**: On main branch builds only.

**Usage**:
- Commit-to-commit diff analysis
- Architectural review
- Identifying coupling hotspots

---

## Test Organization

### Directory Structure

```
src/
├── core/
│   ├── EntityManager.ts
│   ├── EntityManager.test.ts      # Unit tests co-located
│   └── __tests__/
│       └── EntityManager.integration.test.ts
├── systems/
│   ├── AgentSystem.ts
│   └── AgentSystem.test.ts
└── __tests__/
    ├── smoke/
    │   ├── node.smoke.test.ts
    │   ├── browser.smoke.test.ts
    │   └── level.smoke.test.ts
    ├── integration/
    │   └── full-simulation.integration.test.ts
    └── properties/
        ├── ecs.property.test.ts
        ├── event.property.test.ts
        └── agent.property.test.ts
```

### Naming Conventions

| Test Type | File Pattern | Example |
|-----------|--------------|---------|
| Unit | `*.test.ts` | `EntityManager.test.ts` |
| Integration | `*.integration.test.ts` | `systems.integration.test.ts` |
| Property | `*.property.test.ts` | `ecs.property.test.ts` |
| Smoke | `*.smoke.test.ts` | `node.smoke.test.ts` |

---

## CI/CD Pipeline Integration

### Test Execution Order

1. **Lint** - ESLint checks
2. **Type Check** - TypeScript compilation
3. **Smoke Tests** - Quick sanity checks
4. **Unit Tests** - Fast, isolated tests
5. **Integration Tests** - System interaction tests
6. **Property Tests** - Invariant verification
7. **Coverage Report** - Generate and check thresholds
8. **Dependency Analysis** - Madge circular/orphan checks

### Pipeline Configuration

```yaml
test:
  script:
    - pnpm lint
    - pnpm typecheck
    - pnpm test:smoke
    - pnpm test:unit
    - pnpm test:integration
    - pnpm test:property
    - pnpm test:coverage
    - pnpm madge:check
```

### Failure Handling

| Check | Failure Action |
|-------|---------------|
| Lint | Block merge |
| Type Check | Block merge |
| Smoke Tests | Block merge |
| Unit Tests | Block merge |
| Integration Tests | Block merge |
| Property Tests | Block merge |
| Coverage < 70% | Block merge |
| Circular Dependencies | Block merge |
| Orphan Modules | Warning only |

---

## Property Test Mapping

Each correctness property from the design document maps to a property test:

| Property | Test File | Test Name |
|----------|-----------|-----------|
| 1. Entity-Component Query Inclusion | `ecs.property.test.ts` | `queryIncludesMatchingEntities` |
| 2. Destroyed Entity Exclusion | `ecs.property.test.ts` | `queryExcludesDestroyedEntities` |
| 3. Component Change Visibility | `ecs.property.test.ts` | `queryReflectsComponentChanges` |
| 4. Handler Delivery | `event.property.test.ts` | `handlersReceiveEventsExactlyOnce` |
| 5. Handler Error Isolation | `event.property.test.ts` | `errorInHandlerDoesNotBlockOthers` |
| 6. Fixed Timestep Consistency | `gameloop.property.test.ts` | `physicsUpdatesAtFixedTimestep` |
| 7. Transition Validity | `statemachine.property.test.ts` | `onlyDefinedTransitionsAllowed` |
| 8. State Validity | `statemachine.property.test.ts` | `currentStateAlwaysValid` |
| 9. Group Force Composition | `agent.property.test.ts` | `groupForcesIncludeAllComponents` |
| 10. Agent Initialization Order | `agent.property.test.ts` | `allLayersInitializedBeforeUpdate` |
| 11. Agent Error Recovery | `agent.property.test.ts` | `agentRemainsValidAfterError` |
| 12. System Activation | `level.property.test.ts` | `onlyConfiguredSystemsActive` |
| 13. Resource Cleanup | `level.property.test.ts` | `previousResourcesDisposedBeforeNew` |
| 14. Population Matching | `level.property.test.ts` | `spawnedAgentsMatchConfig` |
| 15. Lighting Consistency | `environment.property.test.ts` | `lightingMatchesTimeOfDay` |
| 16. Procedural Determinism | `environment.property.test.ts` | `sameSeedProducesSameResult` |
| 17. Terrain Query Validity | `environment.property.test.ts` | `heightQueryReturnsValidValue` |
| 18. Frustum Culling | `performance.property.test.ts` | `objectsOutsideFrustumNotRendered` |
| 19. Quality Adjustment | `performance.property.test.ts` | `qualityReducesWhenFrameRateLow` |

---

## Test Data Management

### Fixtures

Store reusable test data in `src/__tests__/fixtures/`:
- `levelConfigs/` - Sample level configurations
- `agentData/` - Agent state snapshots
- `eventSequences/` - Event replay data

### Factories

Use factory functions for test object creation:
```typescript
// src/__tests__/factories/entityFactory.ts
export function createTestEntity(overrides?: Partial<EntityData>): Entity {
  return {
    id: generateId(),
    components: new Map(),
    ...overrides
  };
}
```

### Mocks

Centralize mocks in `src/__tests__/mocks/`:
- `mockEngine.ts` - Babylon.js engine mock
- `mockPhysics.ts` - Havok physics mock
- `mockScene.ts` - Scene mock

---

## Cross-References

- #[[file:docs/Code_Tech_Docs/correctness-properties.md]]
- #[[file:docs/Code_Tech_Docs/traceability-matrix.md]]
- #[[file:docs/Code_Tech_Docs/patterns/error-handling.md]]
- #[[file:docs/Code_Tech_Docs/subsystems/performance-system.md]]
