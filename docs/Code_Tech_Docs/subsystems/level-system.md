# Level System

## Purpose

The Level System manages level configuration, loading, and transitions. It controls which systems are active, agent populations, and environmental settings for each level type. The system ensures proper resource management during level transitions.

## Boundaries

**In Scope:**
- Level configuration schema and validation
- Level lifecycle (load, run, unload, transition)
- System activation/deactivation based on level
- Agent population management
- Resource cleanup during transitions

**Out of Scope:**
- Individual system implementations (see respective subsystem docs)
- Agent behaviors (see #[[file:docs/Code_Tech_Docs/subsystems/agent-system.md]])
- Procedural generation algorithms (see #[[file:docs/Design_Docs/environment-systems/procedural-generation.md]])

## Responsibilities

- Parse and validate level configurations
- Manage level lifecycle states
- Activate/deactivate systems per level requirements
- Spawn initial agent populations
- Coordinate level transitions
- Ensure resource cleanup between levels

## Lifecycle

1. **Load Phase**
   - Parse level configuration
   - Validate configuration schema
   - Initialize required systems
   - Generate/load terrain
   - Spawn agent populations

2. **Run Phase**
   - Normal simulation execution
   - Systems update per game loop
   - Agents behave according to rules

3. **Unload Phase**
   - Despawn all agents
   - Deactivate level-specific systems
   - Dispose level resources
   - Clear level state

4. **Transition Phase**
   - Complete unload of current level
   - Begin load of next level
   - Ensure no resource leaks

## Semantics (Normative Guarantees)

### Level Configuration Schema

Every level configuration MUST include:

```
LevelConfig:
  id: string                    # Unique level identifier
  name: string                  # Display name
  type: LevelType               # Village | Rural | Coastal | Wilderness
  
  terrain:
    size: [width, depth]        # World units
    heightmap: string | null    # Heightmap asset path or null for flat
    waterLevel: number | null   # Water surface height or null for no water
    
  systems:
    dayNight: boolean           # Enable day/night cycle
    water: boolean              # Enable water simulation
    clouds: boolean             # Enable cloud system
    weather: boolean            # Enable weather effects
    
  agents:
    villagers: AgentSpawnConfig
    zombies: AgentSpawnConfig
    fish: AgentSpawnConfig
    birds: AgentSpawnConfig
    dogs: AgentSpawnConfig
    boats: AgentSpawnConfig
    
  environment:
    startTime: number           # Initial game time (0-24)
    timeScale: number           # Time progression rate
    ambientColor: Color3        # Base ambient light
```

**AgentSpawnConfig:**

```
AgentSpawnConfig:
  enabled: boolean              # Whether to spawn this agent type
  count: number                 # Initial population
  spawnArea: BoundingBox        # Area for spawning
  respawn: boolean              # Whether to respawn on death
```

### Level Types

| Type | Description | Active Systems | Typical Agents |
|------|-------------|----------------|----------------|
| Village | Dense settlement | All | Villagers, Zombies, Dogs |
| Rural | Sparse farmland | Day/Night, Clouds | Villagers, Birds, Dogs |
| Coastal | Waterfront area | All + Water | Villagers, Fish, Birds, Boats |
| Wilderness | Natural environment | Day/Night, Water, Clouds | Fish, Birds, Zombies |

### System Activation Rules

- Only systems specified in configuration MUST be active after load
- Systems not in configuration MUST be deactivated
- System activation MUST occur during load phase
- System deactivation MUST occur during unload phase

**System Dependencies:**

| System | Depends On |
|--------|------------|
| Water | Terrain |
| Boats | Water |
| Fish | Water |
| Buoyancy | Water, Physics |
| Shadows | Render |

- Dependent systems MUST NOT be activated without their dependencies
- Configuration validation MUST reject invalid dependency combinations

### Level Lifecycle States

```
┌─────────┐     ┌─────────┐     ┌─────────┐     ┌─────────┐
│ Unloaded│────▶│ Loading │────▶│ Running │────▶│Unloading│
└─────────┘     └─────────┘     └─────────┘     └─────────┘
     ▲                                               │
     └───────────────────────────────────────────────┘
```

**State Transitions:**

| From | To | Trigger | Actions |
|------|-----|---------|---------|
| Unloaded | Loading | loadLevel() | Parse config, init systems |
| Loading | Running | Load complete | Start simulation |
| Running | Unloading | unloadLevel() | Stop simulation |
| Unloading | Unloaded | Unload complete | Cleanup resources |

### Resource Cleanup

- Previous level MUST be fully disposed before new level initializes
- All agents MUST be despawned during unload
- All level-specific meshes MUST be disposed
- All level-specific physics bodies MUST be removed
- Memory MUST be released (no leaks between levels)

### Agent Population

- Agent populations MUST match level configuration after load
- Spawning MUST use agent pools when available
- Spawn positions MUST be within configured spawn areas
- Spawn positions MUST be valid (on terrain, not in obstacles)

## Configuration Parameters

```
levelSystemConfig:
  defaultLevel: "village_01"
  transitionDuration: 1.0       # Seconds for fade transition
  
  validation:
    strictMode: true            # Reject invalid configs
    warnOnMissing: true         # Warn for missing optional fields
    
  loading:
    showProgress: true
    timeout: 30000              # Max load time in ms
```

## Level Configuration Examples

### Village Level

```yaml
id: "village_01"
name: "Peaceful Village"
type: "Village"

terrain:
  size: [200, 200]
  heightmap: "assets/heightmaps/village_01.png"
  waterLevel: null

systems:
  dayNight: true
  water: false
  clouds: true
  weather: false

agents:
  villagers:
    enabled: true
    count: 20
    spawnArea: { min: [-80, 0, -80], max: [80, 0, 80] }
    respawn: true
  zombies:
    enabled: true
    count: 10
    spawnArea: { min: [-100, 0, -100], max: [100, 0, 100] }
    respawn: true
  dogs:
    enabled: true
    count: 5
    spawnArea: { min: [-50, 0, -50], max: [50, 0, 50] }
    respawn: false
  fish:
    enabled: false
  birds:
    enabled: true
    count: 15
    spawnArea: { min: [-100, 20, -100], max: [100, 50, 100] }
    respawn: true
  boats:
    enabled: false

environment:
  startTime: 8.0
  timeScale: 60.0
  ambientColor: [0.3, 0.3, 0.35]
```

### Coastal Level

```yaml
id: "coastal_01"
name: "Harbor Town"
type: "Coastal"

terrain:
  size: [250, 250]
  heightmap: "assets/heightmaps/coastal_01.png"
  waterLevel: 0.0

systems:
  dayNight: true
  water: true
  clouds: true
  weather: true

agents:
  villagers:
    enabled: true
    count: 15
    spawnArea: { min: [-60, 0, 20], max: [60, 0, 100] }
    respawn: true
  zombies:
    enabled: false
  dogs:
    enabled: true
    count: 3
    spawnArea: { min: [-40, 0, 30], max: [40, 0, 80] }
    respawn: false
  fish:
    enabled: true
    count: 50
    spawnArea: { min: [-100, -10, -100], max: [100, -2, 0] }
    respawn: true
  birds:
    enabled: true
    count: 20
    spawnArea: { min: [-120, 10, -120], max: [120, 40, 120] }
    respawn: true
  boats:
    enabled: true
    count: 5
    spawnArea: { min: [-80, 0, -80], max: [80, 0, -20] }
    respawn: false

environment:
  startTime: 10.0
  timeScale: 45.0
  ambientColor: [0.35, 0.35, 0.4]
```

## Correctness Properties

- **Property 12: System Activation** - For any level load, only systems specified in the configuration MUST be active.
  → #[[file:docs/Code_Tech_Docs/correctness-properties.md#property-12]]

- **Property 13: Resource Cleanup** - For any level transition, previous level resources MUST be disposed before new level initializes.
  → #[[file:docs/Code_Tech_Docs/correctness-properties.md#property-13]]

- **Property 14: Population Matching** - For any loaded level, agent populations MUST match the level configuration.
  → #[[file:docs/Code_Tech_Docs/correctness-properties.md#property-14]]

## Observability

### Metrics to Track

- Current level ID
- Level state (loading, running, unloading)
- Load time duration
- Active system count
- Agent population by type
- Memory usage per level

### Events to Log

- Level load started/completed
- Level unload started/completed
- System activation/deactivation
- Agent spawn/despawn counts
- Configuration validation errors
- Resource cleanup completion

## Cross-References

- #[[file:docs/Design_Docs/level-design/level-types.md]] - Level type definitions
- #[[file:docs/Design_Docs/level-design/level-configurations.md]] - Configuration examples
- #[[file:docs/Code_Tech_Docs/subsystems/agent-system.md]] - Agent spawning
- #[[file:docs/Code_Tech_Docs/subsystems/environment-system.md]] - Environment configuration
