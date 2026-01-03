# Physics System

## Purpose

The Physics System provides physical simulation for the 3D Village Simulation, handling rigid body dynamics, collision detection, trigger volumes, and specialized behaviors like buoyancy. It abstracts the underlying physics engine (Havok) through an adapter interface.

## Boundaries

**In Scope:**
- Physics body creation and management
- Collision detection and response
- Trigger volume events
- Buoyancy simulation for water interactions
- Physics body pooling
- Collision group configuration

**Out of Scope:**
- Visual rendering (see #[[file:docs/Code_Tech_Docs/subsystems/render-system.md]])
- Agent decision making (see #[[file:docs/Code_Tech_Docs/subsystems/agent-system.md]])
- Terrain generation (see #[[file:docs/Code_Tech_Docs/subsystems/environment-system.md]])

## Responsibilities

- Initialize and manage physics backend (Havok adapter)
- Create, configure, and dispose physics bodies
- Manage collision groups and interaction rules
- Handle trigger volume enter/exit events
- Simulate buoyancy for water-based objects
- Pool physics bodies for performance
- Synchronize physics state with ECS entities

## Lifecycle

1. **Initialization**
   - Create physics backend adapter
   - Initialize physics world with gravity
   - Configure collision groups
   - Set up body pools

2. **Active Operation**
   - Step physics simulation at fixed timestep
   - Process collision callbacks
   - Fire trigger events
   - Apply buoyancy forces
   - Synchronize body positions to entities

3. **Cleanup/Disposal**
   - Return pooled bodies
   - Dispose all physics bodies
   - Destroy physics world
   - Clean up collision callbacks

## Semantics (Normative Guarantees)

### Physics Body Types

The Physics System MUST support three body types with distinct behaviors:

| Body Type | Movement | Collision Response | Use Case |
|-----------|----------|-------------------|----------|
| Static | None | Immovable, affects others | Terrain, buildings |
| Dynamic | Physics-driven | Full response | Agents, projectiles |
| Kinematic | Code-driven | Affects others, not affected | Moving platforms, doors |

- Static bodies MUST NOT move after creation
- Dynamic bodies MUST respond to forces, impulses, and collisions
- Kinematic bodies MUST be movable via code but MUST NOT respond to physics forces
- Body type MUST be specified at creation and MUST NOT change during lifetime

### Collision Groups

The Physics System MUST support collision groups to control which bodies interact:

| Group | Bit | Collides With |
|-------|-----|---------------|
| DEFAULT | 0x0001 | All |
| TERRAIN | 0x0002 | Agents, Projectiles |
| AGENT | 0x0004 | Terrain, Agents, Triggers |
| PROJECTILE | 0x0008 | Terrain, Agents |
| TRIGGER | 0x0010 | Agents |
| WATER | 0x0020 | Agents, Boats |

- Collision groups MUST be configurable via bitmask
- Bodies MUST only collide with bodies in their collision mask
- Collision group changes MUST take effect on the next physics step

### Trigger Volumes

- Trigger volumes MUST NOT cause physical collision response
- Trigger volumes MUST fire enter events when a body first overlaps
- Trigger volumes MUST fire exit events when a body stops overlapping
- Trigger events MUST include both the trigger body and the entering/exiting body
- Trigger events MUST be delivered via the Event Bus

**Trigger Event Format:**

```
TriggerEnterEvent:
  triggerId: EntityId
  enteredId: EntityId
  position: Vector3

TriggerExitEvent:
  triggerId: EntityId
  exitedId: EntityId
```

### Buoyancy Simulation

- Buoyancy MUST apply upward force proportional to submerged volume
- Buoyancy MUST apply drag force opposing velocity when submerged
- Water surface height MUST be queryable for buoyancy calculations
- Buoyancy-enabled bodies MUST be marked with a buoyancy component

**Buoyancy Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| density | float | 1.0 | Body density relative to water |
| dragCoefficient | float | 0.5 | Drag when submerged |
| angularDrag | float | 0.3 | Rotational drag when submerged |

### Physics Body Pooling

- Frequently created/destroyed bodies MUST use object pooling
- Pool MUST pre-allocate bodies based on configuration
- Acquired bodies MUST be reset to default state
- Released bodies MUST be deactivated, not destroyed
- Pool exhaustion MUST create new bodies (grow pool)

**Pool Configuration:**

| Body Type | Initial Pool Size | Max Pool Size |
|-----------|------------------|---------------|
| Agent | 50 | 200 |
| Projectile | 20 | 100 |
| Debris | 30 | 150 |

## Configuration Parameters

```
physicsConfig:
  backend: "havok"
  gravity: [0, -9.81, 0]
  fixedTimestep: 0.01667      # 60Hz physics
  maxSubsteps: 5
  
  collisionGroups:
    default: 0x0001
    terrain: 0x0002
    agent: 0x0004
    projectile: 0x0008
    trigger: 0x0010
    water: 0x0020
    
  buoyancy:
    enabled: true
    waterDensity: 1.0
    defaultDrag: 0.5
    
  pooling:
    enabled: true
    agentPoolSize: 50
    projectilePoolSize: 20
    debrisPoolSize: 30
```

## Correctness Properties

- Physics body types and collision groups are validated through integration tests
- Trigger volume events are validated through Property 4 (Handler Delivery)
  → #[[file:docs/Code_Tech_Docs/correctness-properties.md#property-4]]

## Observability

### Metrics to Track

- Active body count by type
- Collision pairs per frame
- Trigger events per frame
- Pool utilization (acquired/available)
- Physics step time
- Buoyancy calculations per frame

### Events to Log

- Body creation/disposal
- Pool exhaustion (warning)
- Collision group configuration changes
- Trigger enter/exit events (debug level)
- Physics backend errors

## Cross-References

- #[[file:docs/Code_Tech_Docs/architecture-overview.md]] - Adapter boundary rules
- #[[file:docs/Code_Tech_Docs/core-systems/game-loop.md]] - Fixed timestep integration
- #[[file:docs/Code_Tech_Docs/patterns/object-pooling.md]] - Pooling pattern details
- #[[file:docs/Code_Tech_Docs/subsystems/environment-system.md]] - Water surface queries
- #[[file:docs/Design_Docs/environment-systems/water-system.md]] - Water behavior design
