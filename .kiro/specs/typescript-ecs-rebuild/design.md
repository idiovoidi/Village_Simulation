# Design Document: TypeScript ECS Rebuild

## Overview

This design document specifies the architecture for rebuilding the 3D village simulation using TypeScript, strict ESLint, and a pure Entity-Component-System (ECS) architecture. The rebuild replaces the existing JavaScript codebase with a modern, type-safe implementation using Vite as the build tool.

### Goals

- **Type Safety**: Strict TypeScript with no `any` types for compile-time error detection
- **Clean Architecture**: Pure ECS pattern with clear separation of concerns
- **Performance**: Maintain or improve current performance with efficient component storage
- **Maintainability**: Well-structured codebase with comprehensive testing
- **Feature Parity**: Preserve all existing agent behaviors and environmental systems
- **Extensibility**: Support future features like infection, reproduction, and genetics

### Technology Stack

- **Language**: TypeScript 5.x with strict mode
- **Build Tool**: Vite 5.x for fast development and optimized production builds
- **3D Engine**: Babylon.js v7.47.2 (loaded from CDN)
- **Physics**: Havok Physics v1.3.10 (loaded from CDN)
- **Testing**: Node.js test runner with c8 coverage, property-based testing
- **Package Manager**: pnpm
- **Code Quality**: ESLint with TypeScript support, Prettier

### Architecture Principles

1. **Pure ECS**: Entities are IDs, components are data, systems are logic
2. **Data-Oriented Design**: Components stored in contiguous arrays for cache efficiency
3. **System Independence**: Systems communicate through component state, not direct calls
4. **Rendering Decoupling**: Babylon.js integration isolated in rendering layer
5. **Type-Driven Development**: TypeScript types guide implementation and catch errors early

## Architecture

### ECS Core Architecture

The ECS core provides the foundation for all game logic:


```
┌─────────────────────────────────────────────────────────────┐
│                         World                                │
│  - Manages all entities, components, and systems             │
│  - Provides entity queries and component access              │
│  - Coordinates system execution order                        │
└─────────────────────────────────────────────────────────────┘
                              │
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
        ▼                     ▼                     ▼
┌──────────────┐      ┌──────────────┐     ┌──────────────┐
│   Entities   │      │  Components  │     │   Systems    │
│              │      │              │     │              │
│ - Unique IDs │      │ - Pure Data  │     │ - Logic Only │
│ - Component  │◄─────┤ - Typed      │────►│ - Query      │
│   Masks      │      │ - Serialized │     │   Entities   │
└──────────────┘      └──────────────┘     └──────────────┘
```

#### World Class

The World class is the central coordinator:

```typescript
class World {
  private entities: Map<EntityId, Entity>;
  private componentStorage: ComponentStorage;
  private systems: System[];
  private systemExecutionOrder: SystemId[];
  
  createEntity(): Entity;
  destroyEntity(entity: EntityId): void;
  addComponent<T extends Component>(entity: EntityId, component: T): void;
  removeComponent<T extends Component>(entity: EntityId, componentType: ComponentType<T>): void;
  getComponent<T extends Component>(entity: EntityId, componentType: ComponentType<T>): T | undefined;
  query(signature: ComponentSignature): EntityId[];
  update(deltaTime: number): void;
}
```

#### Entity Representation

Entities are lightweight identifiers with component masks for fast queries:

```typescript
type EntityId = number;

interface Entity {
  id: EntityId;
  componentMask: bigint;  // Bit mask for fast component checks
  active: boolean;
}
```

#### Component Storage

Components are stored in typed arrays for cache efficiency:

```typescript
class ComponentStorage {
  private componentArrays: Map<ComponentType, ComponentArray>;
  private entityToIndex: Map<EntityId, Map<ComponentType, number>>;
  
  add<T extends Component>(entity: EntityId, component: T): void;
  remove<T extends Component>(entity: EntityId, componentType: ComponentType<T>): void;
  get<T extends Component>(entity: EntityId, componentType: ComponentType<T>): T | undefined;
  getAll<T extends Component>(componentType: ComponentType<T>): T[];
}
```


#### System Base Class

All systems extend a base class and implement update logic:

```typescript
abstract class System {
  protected world: World;
  abstract readonly componentSignature: ComponentSignature;
  abstract readonly priority: number;  // Lower = earlier execution
  
  constructor(world: World) {
    this.world = world;
  }
  
  abstract update(deltaTime: number): void;
  
  protected queryEntities(): EntityId[] {
    return this.world.query(this.componentSignature);
  }
}
```

### System Execution Order

Systems execute in priority order each frame:

1. **Input Systems** (priority 0-99): Process user input
2. **AI Systems** (priority 100-199): Decision making, pathfinding, steering
3. **Physics Systems** (priority 200-299): Physics simulation, collision
4. **Game Logic Systems** (priority 300-499): Survival, health, reproduction, infection
5. **Transform Systems** (priority 500-599): Update world transforms
6. **Rendering Systems** (priority 600-699): Animation, culling, rendering

### Component Categories

Components are organized by domain:

#### Core Components
- **Position**: 3D position in world space
- **Velocity**: Movement velocity vector
- **Health**: Current and maximum health
- **Transform**: Full transform matrix (position, rotation, scale)
- **Active**: Entity active state

#### AI Components
- **AIBehaviour**: Current behavior state and parameters
- **Steering**: Steering forces and target
- **Memory**: Short-term memory for AI decisions
- **Schedule**: Daily schedule with activities
- **Goal**: Current goal and priority
- **Threat**: Perceived threats and danger level

#### Creature Components
- **Villager**: Villager-specific data (profession, home)
- **Zombie**: Zombie-specific data (aggression, target)
- **Fish**: Fish-specific data (school ID, depth preference)
- **Bird**: Bird-specific data (flock ID, altitude)
- **Dog**: Dog-specific data (owner, territory)
- **Boat**: Boat-specific data (cargo, destination)
- **Flock**: Flock/school membership and parameters


#### Survival Components
- **Hunger**: Current hunger level (0-100)
- **Thirst**: Current thirst level (0-100)
- **Energy**: Current energy level (0-100)
- **Temperature**: Body temperature and comfort range
- **Mood**: Current mood state and modifiers

#### Health Components
- **StatusEffect**: Active status effects (buffs/debuffs)
- **Injury**: Physical injuries and severity
- **Disease**: Active diseases and symptoms
- **Immunity**: Immunity to specific diseases
- **Infected**: Infection stage and progression

#### Reproduction Components
- **Reproduction**: Fertility and reproduction cooldown
- **Pregnancy**: Pregnancy stage and duration
- **Age**: Current age and life stage
- **Fertility**: Fertility rate and modifiers
- **Genetics**: Genetic traits and alleles

#### World Components
- **House**: House ownership and capacity
- **Road**: Road network node
- **NavMesh**: Navigation mesh data
- **Water**: Water body properties
- **Container**: Storage container with items
- **WorkStation**: Workstation type and recipes
- **Field**: Agricultural field with crops
- **Well**: Water source
- **Bed**: Sleeping location

#### Environment Components
- **Weather**: Current weather state
- **Season**: Current season
- **TimeOfDay**: Time tracking
- **Crop**: Crop type and growth stage
- **Tree**: Tree type and resources
- **Resource**: Harvestable resource

#### Rendering Components
- **AnimationState**: Current animation and playback
- **Model**: 3D model reference
- **Visual**: Visual properties (color, opacity, LOD)



## Components and Interfaces

### Component Type System

All components implement a base interface for type safety:

```typescript
interface Component {
  readonly type: ComponentType;
}

type ComponentType = string;  // Unique identifier for component type

// Component signature for entity queries
type ComponentSignature = Set<ComponentType>;
```

### Core Component Definitions

#### Position Component
```typescript
interface PositionComponent extends Component {
  type: 'Position';
  x: number;
  y: number;
  z: number;
}
```

#### Velocity Component
```typescript
interface VelocityComponent extends Component {
  type: 'Velocity';
  vx: number;
  vy: number;
  vz: number;
  maxSpeed: number;
}
```

#### Health Component
```typescript
interface HealthComponent extends Component {
  type: 'Health';
  current: number;
  maximum: number;
  regenerationRate: number;
}
```

#### Transform Component
```typescript
interface TransformComponent extends Component {
  type: 'Transform';
  position: Vector3;
  rotation: Quaternion;
  scale: Vector3;
  matrix: Matrix;  // Cached transform matrix
  dirty: boolean;  // Needs recalculation
}
```



### AI Component Definitions

#### AIBehaviour Component
```typescript
enum BehaviourState {
  Idle = 'Idle',
  Wander = 'Wander',
  Seek = 'Seek',
  Flee = 'Flee',
  Follow = 'Follow',
  Work = 'Work',
  Sleep = 'Sleep',
  Eat = 'Eat',
  Socialize = 'Socialize'
}

interface AIBehaviourComponent extends Component {
  type: 'AIBehaviour';
  currentState: BehaviourState;
  previousState: BehaviourState;
  stateTimer: number;
  parameters: Record<string, unknown>;
}
```

#### Steering Component
```typescript
interface SteeringComponent extends Component {
  type: 'Steering';
  desiredVelocity: Vector3;
  steeringForce: Vector3;
  target: Vector3 | null;
  arrivalRadius: number;
  maxForce: number;
}
```

#### Schedule Component
```typescript
interface ScheduleActivity {
  name: string;
  startHour: number;
  endHour: number;
  location: Vector3 | null;
  behaviour: BehaviourState;
}

interface ScheduleComponent extends Component {
  type: 'Schedule';
  activities: ScheduleActivity[];
  currentActivityIndex: number;
  overridden: boolean;  // True when needs override schedule
}
```

### Creature Component Definitions

#### Villager Component
```typescript
interface VillagerComponent extends Component {
  type: 'Villager';
  name: string;
  profession: string;
  home: EntityId | null;
  workplace: EntityId | null;
  socialGroup: string[];
}
```

#### Zombie Component
```typescript
interface ZombieComponent extends Component {
  type: 'Zombie';
  aggressionLevel: number;
  targetEntity: EntityId | null;
  detectionRadius: number;
  attackCooldown: number;
}
```



### Survival Component Definitions

#### Hunger Component
```typescript
interface HungerComponent extends Component {
  type: 'Hunger';
  level: number;  // 0-100, 0 = starving, 100 = full
  depletionRate: number;  // Units per second
  criticalThreshold: number;  // Triggers urgent behavior
}
```

#### Energy Component
```typescript
interface EnergyComponent extends Component {
  type: 'Energy';
  level: number;  // 0-100
  depletionRate: number;
  restoreRate: number;  // When sleeping
  activityMultiplier: number;  // Affects depletion based on activity
}
```

### Health Component Definitions

#### Infected Component
```typescript
enum InfectionStage {
  None = 'None',
  Exposed = 'Exposed',
  Incubating = 'Incubating',
  Symptomatic = 'Symptomatic',
  Critical = 'Critical',
  Converted = 'Converted'
}

interface InfectedComponent extends Component {
  type: 'Infected';
  stage: InfectionStage;
  progress: number;  // 0-1 within current stage
  transmissionChance: number;
  conversionTime: number;  // Time until zombie conversion
}
```

### Reproduction Component Definitions

#### Reproduction Component
```typescript
interface ReproductionComponent extends Component {
  type: 'Reproduction';
  canReproduce: boolean;
  partner: EntityId | null;
  cooldownRemaining: number;
  fertilityRate: number;
}
```

#### Pregnancy Component
```typescript
interface PregnancyComponent extends Component {
  type: 'Pregnancy';
  duration: number;  // Total pregnancy duration
  elapsed: number;  // Time elapsed
  parent1: EntityId;
  parent2: EntityId;
  genetics: GeneticData;  // Combined genetics for offspring
}
```

#### Age Component
```typescript
enum LifeStage {
  Child = 'Child',
  Adult = 'Adult',
  Elder = 'Elder'
}

interface AgeComponent extends Component {
  type: 'Age';
  years: number;
  lifeStage: LifeStage;
  mortalityChance: number;  // Increases with age
}
```

#### Genetics Component
```typescript
interface GeneticTrait {
  name: string;
  allele1: string;
  allele2: string;
  dominant: string;
  expressed: string;
}

interface GeneticsComponent extends Component {
  type: 'Genetics';
  traits: GeneticTrait[];
  mutationRate: number;
}
```



### Environment Component Definitions

#### Season Component
```typescript
enum Season {
  Spring = 'Spring',
  Summer = 'Summer',
  Autumn = 'Autumn',
  Winter = 'Winter'
}

interface SeasonComponent extends Component {
  type: 'Season';
  current: Season;
  dayInSeason: number;
  daysPerSeason: number;
  temperatureModifier: number;
  growthRateModifier: number;
}
```

#### Crop Component
```typescript
enum CropStage {
  Planted = 'Planted',
  Sprouting = 'Sprouting',
  Growing = 'Growing',
  Mature = 'Mature',
  Withered = 'Withered'
}

interface CropComponent extends Component {
  type: 'Crop';
  cropType: string;
  stage: CropStage;
  growthProgress: number;  // 0-1
  growthRate: number;
  harvestYield: number;
}
```

### Rendering Component Definitions

#### Model Component
```typescript
interface ModelComponent extends Component {
  type: 'Model';
  meshId: string;
  meshInstance: any;  // Babylon.js mesh reference
  lodLevel: number;
  visible: boolean;
}
```

#### AnimationState Component
```typescript
interface AnimationStateComponent extends Component {
  type: 'AnimationState';
  currentAnimation: string;
  animationSpeed: number;
  looping: boolean;
  blendTime: number;
}
```



## Data Models

### Entity Factory

The Entity Factory creates pre-configured entities with appropriate components:

```typescript
class EntityFactory {
  constructor(private world: World) {}
  
  createVillager(position: Vector3, genetics?: GeneticsComponent): EntityId {
    const entity = this.world.createEntity();
    
    // Core components
    this.world.addComponent(entity, { type: 'Position', ...position });
    this.world.addComponent(entity, { type: 'Velocity', vx: 0, vy: 0, vz: 0, maxSpeed: 5 });
    this.world.addComponent(entity, { type: 'Health', current: 100, maximum: 100, regenerationRate: 0.1 });
    
    // AI components
    this.world.addComponent(entity, { type: 'AIBehaviour', currentState: BehaviourState.Idle, ... });
    this.world.addComponent(entity, { type: 'Steering', ... });
    this.world.addComponent(entity, { type: 'Schedule', activities: [], ... });
    
    // Creature component
    this.world.addComponent(entity, { type: 'Villager', name: generateName(), ... });
    
    // Survival components
    this.world.addComponent(entity, { type: 'Hunger', level: 100, depletionRate: 0.5, ... });
    this.world.addComponent(entity, { type: 'Thirst', level: 100, depletionRate: 0.7, ... });
    this.world.addComponent(entity, { type: 'Energy', level: 100, depletionRate: 0.3, ... });
    
    // Life components
    this.world.addComponent(entity, { type: 'Age', years: 18, lifeStage: LifeStage.Adult, ... });
    this.world.addComponent(entity, { type: 'Reproduction', canReproduce: true, ... });
    this.world.addComponent(entity, genetics || generateGenetics());
    
    // Rendering components
    this.world.addComponent(entity, { type: 'Model', meshId: 'villager', ... });
    this.world.addComponent(entity, { type: 'AnimationState', currentAnimation: 'idle', ... });
    
    return entity;
  }
  
  createZombie(position: Vector3): EntityId {
    const entity = this.world.createEntity();
    
    // Core components
    this.world.addComponent(entity, { type: 'Position', ...position });
    this.world.addComponent(entity, { type: 'Velocity', vx: 0, vy: 0, vz: 0, maxSpeed: 3 });
    this.world.addComponent(entity, { type: 'Health', current: 80, maximum: 80, regenerationRate: 0 });
    
    // AI components
    this.world.addComponent(entity, { type: 'AIBehaviour', currentState: BehaviourState.Wander, ... });
    this.world.addComponent(entity, { type: 'Steering', ... });
    
    // Creature component
    this.world.addComponent(entity, { type: 'Zombie', aggressionLevel: 1.0, ... });
    
    // Rendering components
    this.world.addComponent(entity, { type: 'Model', meshId: 'zombie', ... });
    this.world.addComponent(entity, { type: 'AnimationState', currentAnimation: 'walk', ... });
    
    return entity;
  }
  
  // Similar methods for Fish, Bird, Dog, Boat entities...
}
```



### Level Configuration

Levels define which systems and entities to spawn:

```typescript
interface LevelConfig {
  name: string;
  description: string;
  terrain: TerrainConfig;
  weather: WeatherConfig;
  spawns: SpawnConfig[];
  systems: SystemConfig[];
}

interface SpawnConfig {
  entityType: string;
  count: number;
  spawnArea: BoundingBox;
  spawnPattern: 'random' | 'grid' | 'cluster';
}

interface SystemConfig {
  systemType: string;
  enabled: boolean;
  parameters: Record<string, unknown>;
}

// Example level configuration
const villageLevel: LevelConfig = {
  name: 'Village',
  description: 'A peaceful village with villagers, animals, and crops',
  terrain: { type: 'bowl', radius: 200, depth: 20 },
  weather: { initialSeason: Season.Spring },
  spawns: [
    { entityType: 'villager', count: 20, spawnArea: villageBounds, spawnPattern: 'cluster' },
    { entityType: 'dog', count: 5, spawnArea: villageBounds, spawnPattern: 'random' },
    { entityType: 'bird', count: 10, spawnArea: skyBounds, spawnPattern: 'random' },
    { entityType: 'house', count: 8, spawnArea: villageBounds, spawnPattern: 'grid' },
    { entityType: 'field', count: 4, spawnArea: farmBounds, spawnPattern: 'grid' }
  ],
  systems: [
    { systemType: 'VillagerScheduleSystem', enabled: true, parameters: {} },
    { systemType: 'ReproductionSystem', enabled: true, parameters: { cooldown: 300 } },
    { systemType: 'CropGrowthSystem', enabled: true, parameters: {} }
  ]
};
```

### Spatial Partitioning

For efficient entity queries, use a spatial grid:

```typescript
class SpatialGrid {
  private cellSize: number;
  private cells: Map<string, Set<EntityId>>;
  
  constructor(cellSize: number) {
    this.cellSize = cellSize;
    this.cells = new Map();
  }
  
  insert(entity: EntityId, position: Vector3): void {
    const cellKey = this.getCellKey(position);
    if (!this.cells.has(cellKey)) {
      this.cells.set(cellKey, new Set());
    }
    this.cells.get(cellKey)!.add(entity);
  }
  
  query(position: Vector3, radius: number): EntityId[] {
    const results: EntityId[] = [];
    const cellsToCheck = this.getCellsInRadius(position, radius);
    
    for (const cellKey of cellsToCheck) {
      const cell = this.cells.get(cellKey);
      if (cell) {
        results.push(...Array.from(cell));
      }
    }
    
    return results;
  }
  
  private getCellKey(position: Vector3): string {
    const x = Math.floor(position.x / this.cellSize);
    const z = Math.floor(position.z / this.cellSize);
    return `${x},${z}`;
  }
}
```



## Correctness Properties

A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.

The following properties define the correctness criteria for the TypeScript ECS rebuild. Each property is universally quantified and references the requirements it validates.

### ECS Core Properties

**Property 1: Entity Query Correctness**
*For any* component signature query, all returned entities must possess exactly the components specified in the signature, and no entities with those components should be excluded.
**Validates: Requirements 1.6**

**Property 2: Entity Destruction Cleanup**
*For any* entity with any set of components, when the entity is destroyed, all associated components must be removed from component storage and the entity must no longer appear in any queries.
**Validates: Requirements 1.7**

**Property 3: System Execution Order**
*For any* set of systems with assigned priorities, systems must execute in ascending priority order (lower priority values execute first) during each update cycle.
**Validates: Requirements 1.8**

### Physics Integration Properties

**Property 4: Physics Body Creation**
*For any* entity with a physics component, a corresponding physics body must be created in the Havok physics engine.
**Validates: Requirements 8.2**

**Property 5: Physics Position Synchronization**
*For any* entity with both a physics body and a position component, after physics simulation updates, the position component must match the physics body's position.
**Validates: Requirements 8.3**

**Property 6: Raycast Accuracy**
*For any* raycast query with origin and direction, the returned hit information must correctly identify the first intersecting physics body along the ray path.
**Validates: Requirements 8.6**

**Property 7: Physics Body Cleanup**
*For any* entity with a physics body, when the entity is destroyed, the associated physics body must be removed from the physics engine.
**Validates: Requirements 8.7**


### Rendering Integration Properties

**Property 8: Mesh Creation for Visual Entities**
*For any* entity with a visual component, a corresponding mesh must be created in the Babylon.js scene.
**Validates: Requirements 9.2**

**Property 9: Mesh Transform Synchronization**
*For any* entity with both a mesh and a transform component, when the transform component changes, the mesh's transform must be updated to match.
**Validates: Requirements 9.3**

**Property 10: Frustum Culling Correctness**
*For any* camera position and orientation, only entities within the camera's view frustum should be rendered, and all entities outside the frustum should be culled.
**Validates: Requirements 9.7**

### Survival System Properties

**Property 11: Survival Stat Depletion**
*For any* villager entity with hunger, thirst, and energy components, after time delta passes, all three stat values must decrease by their respective depletion rates multiplied by the time delta.
**Validates: Requirements 19.1, 19.2, 19.3**

**Property 12: Critical Needs Behavior Override**
*For any* villager with a survival stat (hunger, thirst, or energy) below its critical threshold, the villager's behavior state must change to seek the corresponding resource (food, water, or sleep).
**Validates: Requirements 19.6, 19.7, 19.8**

### Infection System Properties

**Property 13: Infection Transmission on Attack**
*For any* zombie attack on a villager without immunity, the villager must receive an Infected component with initial stage set to Exposed.
**Validates: Requirements 20.2**

**Property 14: Infection Progression**
*For any* entity with an Infected component, after time passes, the infection progress must increase, and when progress reaches 1.0, the infection stage must advance to the next stage.
**Validates: Requirements 20.3**

**Property 15: Infected Villager Conversion**
*For any* villager with an Infected component at the Converted stage, the villager entity must be destroyed and a zombie entity must be spawned at the same position.
**Validates: Requirements 20.4, 20.7**


### Reproduction and Genetics Properties

**Property 16: Birth Spawns Child Entity**
*For any* pregnancy component that reaches completion (elapsed >= duration), a new child villager entity must be spawned with genetics inherited from both parents.
**Validates: Requirements 21.3**

**Property 17: Genetic Inheritance**
*For any* child villager spawned from two parents, each genetic trait must have one allele from parent1 and one allele from parent2, with the expressed trait determined by dominance rules.
**Validates: Requirements 21.5, 21.6**

**Property 18: Elder Mortality Increase**
*For any* villager transitioning from Adult to Elder life stage, the mortality chance value must increase.
**Validates: Requirements 21.7**

**Property 19: Child Work Restriction**
*For any* villager with life stage set to Child, work-related behaviors (Work, Farm, Build) must be disabled and not appear in their schedule.
**Validates: Requirements 21.9**

### Environmental System Properties

**Property 20: Season Cycling**
*For any* season component, when dayInSeason reaches daysPerSeason, the season must advance to the next season in the cycle (Spring → Summer → Autumn → Winter → Spring).
**Validates: Requirements 22.1**

**Property 21: Crop Growth Progression**
*For any* crop component, after time delta passes, the growth progress must increase by (growthRate × timeDelta), and when progress reaches 1.0, the crop stage must advance.
**Validates: Requirements 22.2**

**Property 22: Resource Respawning**
*For any* harvested resource entity, after the respawn timer elapses, a new resource entity of the same type must be spawned at the original location.
**Validates: Requirements 22.3**

**Property 23: Mature Crop Harvesting**
*For any* crop entity with stage set to Mature, villagers with harvesting behavior must be able to interact with it and receive the harvest yield.
**Validates: Requirements 22.5**



## Error Handling

### Error Handling Strategy

The system uses a decorator pattern for error handling, similar to the existing codebase but adapted for TypeScript:

```typescript
function withErrorHandling(target: any, propertyKey: string, descriptor: PropertyDescriptor) {
  const originalMethod = descriptor.value;
  
  descriptor.value = async function(...args: any[]) {
    try {
      return await originalMethod.apply(this, args);
    } catch (error) {
      console.error(`Error in ${target.constructor.name}.${propertyKey}:`, error);
      // Log to error tracking service
      // Attempt recovery or graceful degradation
      return null;
    }
  };
  
  return descriptor;
}

// Usage
class PhysicsSystem extends System {
  @withErrorHandling
  update(deltaTime: number): void {
    // Physics update logic
  }
}
```

### Error Categories

1. **Initialization Errors**: Babylon.js or Havok fails to load
   - Fallback: Display error message, disable rendering/physics
   
2. **Component Errors**: Invalid component data
   - Fallback: Remove invalid component, log warning
   
3. **System Errors**: System update throws exception
   - Fallback: Skip system for this frame, log error
   
4. **Asset Loading Errors**: 3D model or texture fails to load
   - Fallback: Use placeholder asset, continue simulation

5. **Physics Errors**: Physics body creation fails
   - Fallback: Entity continues without physics

### Validation

All component additions are validated:

```typescript
function validateComponent<T extends Component>(component: T): boolean {
  // Check required fields exist
  // Check value ranges
  // Check type correctness
  return true;
}
```



## Testing Strategy

### Dual Testing Approach

The system uses both unit tests and property-based tests for comprehensive coverage:

**Unit Tests**: Verify specific examples, edge cases, and error conditions
- Test specific component creation
- Test system initialization
- Test edge cases (empty queries, null values)
- Test error handling paths
- Test integration between specific systems

**Property-Based Tests**: Verify universal properties across all inputs
- Test ECS core operations with random entities and components
- Test physics synchronization with random positions and velocities
- Test survival stat depletion with random time deltas
- Test genetic inheritance with random parent genetics
- Test infection progression with random infection stages

### Property-Based Testing Configuration

**Library**: fast-check (TypeScript property-based testing library)

**Configuration**:
- Minimum 100 iterations per property test
- Each test tagged with feature name and property number
- Tag format: `Feature: typescript-ecs-rebuild, Property N: [property description]`

**Example Property Test**:

```typescript
import fc from 'fast-check';
import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

describe('ECS Core Properties', () => {
  it('Property 1: Entity Query Correctness', () => {
    // Feature: typescript-ecs-rebuild, Property 1: Entity queries return only matching entities
    
    fc.assert(
      fc.property(
        fc.array(fc.record({
          components: fc.array(fc.constantFrom('Position', 'Velocity', 'Health', 'AI'))
        })),
        fc.array(fc.constantFrom('Position', 'Velocity', 'Health', 'AI')),
        (entities, querySignature) => {
          const world = new World();
          const entityIds = entities.map(e => {
            const id = world.createEntity();
            e.components.forEach(c => world.addComponent(id, createComponent(c)));
            return id;
          });
          
          const results = world.query(new Set(querySignature));
          
          // All returned entities must have all queried components
          for (const entityId of results) {
            for (const componentType of querySignature) {
              assert.ok(world.getComponent(entityId, componentType) !== undefined);
            }
          }
          
          // All entities with queried components must be returned
          for (const entityId of entityIds) {
            const hasAll = querySignature.every(c => 
              world.getComponent(entityId, c) !== undefined
            );
            if (hasAll) {
              assert.ok(results.includes(entityId));
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
```



### Test Coverage Goals

- **Core ECS**: 90%+ coverage (critical infrastructure)
- **Systems**: 80%+ coverage (business logic)
- **Components**: 70%+ coverage (data structures)
- **Rendering**: 60%+ coverage (Babylon.js integration, harder to test)
- **Overall**: 80%+ coverage

### Testing Tools

- **Test Runner**: Node.js built-in test runner
- **Assertions**: Node.js built-in assert module
- **Coverage**: c8 for code coverage reporting
- **Property Testing**: fast-check for property-based tests
- **Mocking**: Manual mocks for Babylon.js and Havok Physics

### Mock Strategy

Babylon.js and Havok Physics are mocked for unit tests:

```typescript
// Mock Babylon.js
class MockEngine {
  runRenderLoop(callback: () => void) {}
  dispose() {}
}

class MockScene {
  render() {}
  dispose() {}
}

// Mock Havok Physics
class MockHavokPlugin {
  setGravity(gravity: Vector3) {}
  dispose() {}
}
```

### Integration Testing

Integration tests verify system interactions:

```typescript
describe('Survival and Behavior Integration', () => {
  it('should trigger sleep behavior when energy is depleted', () => {
    const world = new World();
    const hungerSystem = new HungerSystem(world);
    const energySystem = new EnergySystem(world);
    const behaviorSystem = new DecisionSystem(world);
    
    const villager = factory.createVillager({ x: 0, y: 0, z: 0 });
    const energy = world.getComponent(villager, 'Energy');
    energy.level = 0;
    
    behaviorSystem.update(1.0);
    
    const behavior = world.getComponent(villager, 'AIBehaviour');
    assert.equal(behavior.currentState, BehaviourState.Sleep);
  });
});
```



## Migration Strategy

### Migration Approach

The migration from the existing JavaScript codebase to the new TypeScript ECS architecture follows a reference-based approach:

1. **Reference Implementation**: Keep old codebase as reference for behavior validation
2. **Incremental Validation**: Validate each migrated feature against original behavior
3. **Side-by-Side Comparison**: Run both implementations and compare outputs
4. **Behavior Parity Tests**: Write tests that verify identical behavior

### Migration Phases

**Phase 1: Core ECS Infrastructure**
- Implement World, Entity, Component, System base classes
- Implement ComponentStorage with efficient data structures
- Implement entity queries and component access
- Validate with property-based tests

**Phase 2: Rendering Integration**
- Implement BabylonRenderer with scene management
- Implement mesh creation and transform synchronization
- Implement camera controls and input handling
- Validate visual output matches original

**Phase 3: Physics Integration**
- Implement PhysicsSystem with Havok integration
- Implement physics body creation and synchronization
- Implement collision detection
- Validate physics behavior matches original

**Phase 4: Core Agent Behaviors**
- Migrate villager, zombie, fish, bird, dog, boat agents
- Implement AI systems (decision, steering, pathfinding)
- Implement flocking and schooling behaviors
- Validate agent behaviors match original

**Phase 5: Environmental Systems**
- Implement day/night cycle, weather, seasons
- Implement water simulation, clouds
- Implement procedural village generation
- Validate environmental effects match original

**Phase 6: Advanced Features**
- Implement survival systems (hunger, thirst, energy)
- Implement infection and disease systems
- Implement reproduction and genetics systems
- Implement agriculture and resource systems
- Validate new features work correctly

**Phase 7: Performance Optimization**
- Implement LOD system
- Implement spatial partitioning
- Implement instanced rendering
- Validate performance meets or exceeds original



### File Mapping

Mapping between old JavaScript files and new TypeScript modules:

| Old File | New Module | Notes |
|----------|------------|-------|
| `MyHavokSimCode/core/SimulationSetup.js` | `src/core/World.ts` | Core ECS world management |
| `MyHavokSimCode/NewVillageEngine.js` | `src/managers/GameManager.ts` | Main game loop and coordination |
| `MyHavokSimCode/Agents/Villagers/VillagerBehaviour.js` | `src/systems/ai/VillagerScheduleSystem.ts` | Villager AI logic |
| `MyHavokSimCode/Agents/Zombies/ZombieBehaviour.js` | `src/systems/ai/ZombieBehaviorSystem.ts` | Zombie AI logic |
| `MyHavokSimCode/Agents/Fish/FishBehaviour.js` | `src/systems/ai/FlockingSystem.ts` | Fish schooling behavior |
| `MyHavokSimCode/Agents/Birds/BirdBehaviour.js` | `src/systems/ai/FlockingSystem.ts` | Bird flocking behavior |
| `MyHavokSimCode/WaterSimulation.js` | `src/systems/world/WaterSystem.ts` | Water physics |
| `MyHavokSimCode/CloudSystem.js` | `src/systems/world/CloudSystem.ts` | Cloud rendering |
| `MyHavokSimCode/VillageSystem.js` | `src/managers/MapGenerator.ts` | Village generation |
| `MyHavokSimCode/HouseSystem.js` | `src/systems/world/HouseSystem.ts` | House placement |
| `MyHavokSimCode/RoadSystem.js` | `src/systems/world/RoadSystem.ts` | Road network |
| `MyHavokSimCode/BowlCreator.js` | `src/managers/MapGenerator.ts` | Terrain generation |
| `MyHavokSimCode/Navigation/*` | `src/managers/PathfindingManager.ts` | Pathfinding |
| `MyHavokSimCode/Performance/*` | `src/utils/Profiler.ts` | Performance monitoring |
| `MyHavokSimCode/UI/WorldClock.js` | `src/systems/world/DayNightSystem.ts` | Time management |
| `assets/AssetManager.js` | `src/managers/ResourceManager.ts` | Asset loading |

### Behavior Validation

Each migrated feature includes validation tests:

```typescript
describe('Behavior Parity: Villager Schedule', () => {
  it('should follow same schedule as original implementation', () => {
    // Create villager with same initial state as original
    const villager = factory.createVillager({ x: 0, y: 0, z: 0 });
    
    // Run simulation for 24 hours
    for (let hour = 0; hour < 24; hour++) {
      world.update(3600); // 1 hour in seconds
      
      const behavior = world.getComponent(villager, 'AIBehaviour');
      const expectedBehavior = getOriginalBehaviorAtHour(hour);
      
      assert.equal(behavior.currentState, expectedBehavior);
    }
  });
});
```

### Breaking Changes

**Configuration Format**: Level configurations use TypeScript interfaces instead of plain objects
- Migration: Provide conversion utility for old config files

**Component Access**: Components accessed through World instead of direct entity properties
- Migration: Update all component access patterns

**System Registration**: Systems registered with World instead of global array
- Migration: Update system initialization code

**Event System**: New event bus replaces direct system communication
- Migration: Replace direct calls with event emissions



## Build and Development Configuration

### Vite Configuration

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  root: '.',
  publicDir: 'public',
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      external: [
        'babylonjs',
        'babylonjs-loaders',
        'babylonjs-materials',
        'babylonjs-gui',
        '@babylonjs/havok'
      ]
    }
  },
  server: {
    port: 3000,
    open: true
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src')
    }
  }
});
```

### TypeScript Configuration

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "lib": ["ES2020", "DOM"],
    "moduleResolution": "bundler",
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "strictBindCallApply": true,
    "strictPropertyInitialization": true,
    "noImplicitThis": true,
    "alwaysStrict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    },
    "types": ["node"]
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

### ESLint Configuration

```javascript
// eslint.config.js
import tseslint from '@typescript-eslint/eslint-plugin';
import tsparser from '@typescript-eslint/parser';

export default [
  {
    files: ['src/**/*.ts'],
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        project: './tsconfig.json'
      }
    },
    plugins: {
      '@typescript-eslint': tseslint
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': 'error',
      '@typescript-eslint/explicit-function-return-type': 'warn',
      '@typescript-eslint/no-non-null-assertion': 'warn',
      '@typescript-eslint/consistent-type-imports': 'error',
      'max-complexity': ['warn', 10],
      'max-lines-per-function': ['warn', 50],
      'no-console': ['warn', { allow: ['warn', 'error'] }]
    }
  }
];
```

### Package.json Scripts

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "test": "node --test src/**/*.test.ts",
    "test:coverage": "c8 node --test src/**/*.test.ts",
    "test:watch": "node --test --watch src/**/*.test.ts",
    "lint": "eslint src/**/*.ts",
    "lint:fix": "eslint src/**/*.ts --fix",
    "format": "prettier --write src/**/*.ts",
    "type-check": "tsc --noEmit"
  }
}
```

