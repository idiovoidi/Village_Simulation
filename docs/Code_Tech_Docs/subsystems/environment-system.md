# Environment System

## Purpose

The Environment System manages the simulation's environmental features including the day/night cycle, water simulation, cloud systems, and terrain queries. It provides the world context in which agents operate and affects agent behaviors through environmental conditions.

## Boundaries

**In Scope:**
- Day/night cycle and lighting
- Water simulation and surface queries
- Cloud system management
- Terrain height queries
- Environmental condition queries

**Out of Scope:**
- Agent behaviors (see #[[file:docs/Code_Tech_Docs/subsystems/agent-system.md]])
- Physics simulation (see #[[file:docs/Code_Tech_Docs/subsystems/physics-system.md]])
- Procedural generation (see #[[file:docs/Design_Docs/environment-systems/procedural-generation.md]])

## Responsibilities

- Manage day/night cycle progression
- Update lighting based on time of day
- Simulate water surface behavior
- Manage cloud formation and movement
- Provide terrain height queries
- Expose environmental conditions to other systems

## Lifecycle

1. **Initialization**
   - Initialize day/night cycle with starting time
   - Create water simulation
   - Initialize cloud system
   - Load terrain data

2. **Active Operation**
   - Progress time based on configuration
   - Update lighting values
   - Simulate water waves
   - Update cloud positions
   - Respond to terrain queries

3. **Cleanup/Disposal**
   - Stop time progression
   - Dispose water simulation
   - Dispose cloud system
   - Release terrain data

## Semantics (Normative Guarantees)

### Day/Night Cycle

- Time MUST progress at a configurable rate (game hours per real second)
- Time MUST be queryable by any system
- Time values MUST be in 24-hour format (0.0 to 24.0)
- Lighting MUST interpolate smoothly between time-of-day keyframes

**Time Periods:**

| Period | Time Range | Lighting Characteristics |
|--------|------------|-------------------------|
| Dawn | 5:00 - 7:00 | Orange/pink ambient, low sun angle |
| Day | 7:00 - 17:00 | White/yellow ambient, high sun |
| Dusk | 17:00 - 19:00 | Orange/red ambient, low sun angle |
| Night | 19:00 - 5:00 | Blue ambient, moon lighting |

**Lighting Keyframes:**

| Time | Sun Intensity | Ambient Color | Sun Position (elevation) |
|------|--------------|---------------|-------------------------|
| 0:00 | 0.0 | (0.1, 0.1, 0.2) | -45° |
| 6:00 | 0.3 | (0.8, 0.5, 0.3) | 0° |
| 12:00 | 1.0 | (1.0, 1.0, 0.9) | 90° |
| 18:00 | 0.3 | (0.8, 0.4, 0.2) | 0° |

### Water Simulation

- Water surface height MUST be queryable at any XZ position
- Wave simulation MUST produce smooth, continuous motion
- Water bounds MUST be defined per level configuration
- Buoyancy queries MUST return accurate submerged depth

**Water Query Interface:**

```
getWaterHeight(x: number, z: number): number
  Returns: Y-coordinate of water surface at (x, z)
  
isInWater(position: Vector3): boolean
  Returns: true if position is below water surface
  
getSubmergedDepth(position: Vector3): number
  Returns: Distance below water surface (0 if above)
```

**Wave Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| amplitude | float | 0.5 | Wave height |
| frequency | float | 0.5 | Wave speed |
| wavelength | float | 10.0 | Distance between wave peaks |
| direction | Vector2 | (1, 0) | Primary wave direction |

### Cloud System

- Clouds MUST move based on configurable wind direction and speed
- Cloud density MUST be configurable per level
- Clouds MUST NOT affect gameplay (visual only)
- Cloud system MAY be disabled for performance

**Cloud Configuration:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| density | float | 0.5 | Cloud coverage (0-1) |
| altitude | float | 100 | Cloud layer height |
| windSpeed | float | 5.0 | Movement speed |
| windDirection | Vector2 | (1, 0) | Movement direction |

### Terrain Queries

- Terrain height MUST be queryable at any XZ position within bounds
- Queries outside terrain bounds MUST return an error or default value
- Terrain normal MUST be queryable for slope calculations
- Terrain queries MUST be efficient (O(1) or O(log n))

**Terrain Query Interface:**

```
getTerrainHeight(x: number, z: number): number | null
  Returns: Y-coordinate of terrain at (x, z), null if out of bounds
  
getTerrainNormal(x: number, z: number): Vector3 | null
  Returns: Surface normal at (x, z), null if out of bounds
  
isValidPosition(x: number, z: number): boolean
  Returns: true if (x, z) is within terrain bounds
  
getTerrainBounds(): { min: Vector3, max: Vector3 }
  Returns: Axis-aligned bounding box of terrain
```

### Environmental Condition Queries

Other systems MUST be able to query environmental conditions:

```
getCurrentTime(): number
  Returns: Current game time (0.0 - 24.0)
  
getTimeOfDay(): "dawn" | "day" | "dusk" | "night"
  Returns: Current time period
  
getLightLevel(): number
  Returns: Current ambient light level (0.0 - 1.0)
  
isNightTime(): boolean
  Returns: true if time is between 19:00 and 5:00
```

## Configuration Parameters

```
environmentConfig:
  dayNight:
    enabled: true
    startTime: 8.0              # Starting game time
    timeScale: 60.0             # Game seconds per real second
    
  water:
    enabled: true
    bounds: { min: [-100, -100], max: [100, 100] }
    baseHeight: 0.0
    waveAmplitude: 0.5
    waveFrequency: 0.5
    
  clouds:
    enabled: true
    density: 0.5
    altitude: 100
    windSpeed: 5.0
    windDirection: [1, 0]
    
  terrain:
    heightmapResolution: 256
    worldSize: 200
    maxHeight: 50
```

## Correctness Properties

- **Property 15: Lighting Consistency** - For any game time value, lighting MUST match the expected values for that time of day.
  → #[[file:docs/Code_Tech_Docs/correctness-properties.md#property-15]]

- **Property 17: Terrain Query Validity** - For any position within terrain bounds, height queries MUST return a valid value.
  → #[[file:docs/Code_Tech_Docs/correctness-properties.md#property-17]]

## Observability

### Metrics to Track

- Current game time
- Time scale
- Water query count per frame
- Terrain query count per frame
- Cloud particle count

### Events to Log

- Time period transitions (dawn, day, dusk, night)
- Water bounds changes
- Terrain loading/unloading
- Environmental configuration changes

## Cross-References

- #[[file:docs/Design_Docs/environment-systems/day-night-cycle.md]] - Day/night design
- #[[file:docs/Design_Docs/environment-systems/water-system.md]] - Water design
- #[[file:docs/Code_Tech_Docs/subsystems/physics-system.md]] - Buoyancy integration
- #[[file:docs/Code_Tech_Docs/subsystems/agent-system.md]] - Agent schedule effects
