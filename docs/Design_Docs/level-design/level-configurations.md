# Level Configurations

## Purpose

This document provides complete configuration examples for each level type in the 3D Village Simulation. These configurations serve as reference implementations for Part 2 development.

## Configuration Schema Reference

See #[[file:docs/Code_Tech_Docs/subsystems/level-system.md]] for the complete schema specification.

---

## Village Level Configuration

### village_01: Peaceful Village

The standard Village level showcasing full social simulation.

```yaml
id: "village_01"
name: "Peaceful Village"
type: "Village"
description: "A peaceful village with houses, dogs, and a central plaza"

terrain:
  size: [200, 200]
  heightmap: "assets/heightmaps/village_01.png"
  waterLevel: -2.0
  bowlRadius: 100
  bowlDepth: 25

systems:
  dayNight: true
  water: true
  clouds: true
  weather: false
  proceduralGeneration: true
  roadNetwork: true

generation:
  villageRadius: 60
  houseCount: 15
  plazaEnabled: true
  fencesEnabled: true

agents:
  villagers:
    enabled: true
    count: 20
    spawnArea:
      min: [-50, 0, -50]
      max: [50, 0, 50]
    respawn: true
    scheduleEnabled: true
    
  zombies:
    enabled: true
    count: 5
    spawnArea:
      min: [-90, 0, -90]
      max: [90, 0, 90]
    respawn: true
    spawnAtNight: true
    
  dogs:
    enabled: true
    count: 3
    spawnArea:
      min: [-40, 0, -40]
      max: [40, 0, 40]
    respawn: false
    territoryRadius: 30
    
  birds:
    enabled: true
    count: 15
    spawnArea:
      min: [-80, 15, -80]
      max: [80, 40, 80]
    respawn: true
    flockSize: 5
    
  fish:
    enabled: true
    count: 20
    spawnArea:
      min: [-30, -5, -30]
      max: [30, -1, 30]
    respawn: true
    shoalSize: 8
    
  boats:
    enabled: false

environment:
  startTime: 8.0
  timeScale: 60.0
  ambientColor: [0.3, 0.3, 0.35]
  
lighting:
  sunIntensity: 1.0
  shadowsEnabled: true
  shadowQuality: "high"
  
audio:
  ambientSounds: true
  agentSounds: true
```

### village_02: Zombie Apocalypse

Dark variant with increased zombie threat.

```yaml
id: "village_02"
name: "Zombie Apocalypse"
type: "Village"
description: "A dark version of the village overrun by zombies"

terrain:
  size: [200, 200]
  heightmap: "assets/heightmaps/village_01.png"
  waterLevel: -5.0
  bowlRadius: 100
  bowlDepth: 30

systems:
  dayNight: true
  water: true
  clouds: false
  weather: false
  proceduralGeneration: true
  roadNetwork: true

generation:
  villageRadius: 60
  houseCount: 10
  plazaEnabled: true
  damagedBuildings: true

agents:
  villagers:
    enabled: true
    count: 8
    spawnArea:
      min: [-30, 0, -30]
      max: [30, 0, 30]
    respawn: false
    fleeingEnabled: true
    
  zombies:
    enabled: true
    count: 20
    spawnArea:
      min: [-95, 0, -95]
      max: [95, 0, 95]
    respawn: true
    aggressiveness: 1.2
    nightBonus: 1.5
    
  dogs:
    enabled: false
    
  birds:
    enabled: true
    count: 5
    spawnArea:
      min: [-80, 20, -80]
      max: [80, 50, 80]
    respawn: false
    
  fish:
    enabled: false
    
  boats:
    enabled: false

environment:
  startTime: 22.0
  timeScale: 30.0
  ambientColor: [0.15, 0.1, 0.1]
  
lighting:
  sunIntensity: 0.3
  moonIntensity: 0.8
  shadowsEnabled: true
  shadowQuality: "high"
  
effects:
  fog:
    enabled: true
    density: 0.02
    color: [0.1, 0.05, 0.05]
  bloodParticles: true
  redSky: true
```

---

## Rural Level Configuration

### rural_01: Farmland

Peaceful farmland with scattered buildings.

```yaml
id: "rural_01"
name: "Peaceful Farmland"
type: "Rural"
description: "Sparse farmland with scattered buildings and open fields"

terrain:
  size: [250, 250]
  heightmap: "assets/heightmaps/rural_01.png"
  waterLevel: null
  bowlRadius: 120
  bowlDepth: 15

systems:
  dayNight: true
  water: false
  clouds: true
  weather: true
  proceduralGeneration: true
  roadNetwork: false

generation:
  farmCount: 4
  fieldCount: 8
  treeClusterCount: 12
  pathsEnabled: true

agents:
  villagers:
    enabled: true
    count: 8
    spawnArea:
      min: [-100, 0, -100]
      max: [100, 0, 100]
    respawn: true
    farmWorkEnabled: true
    
  zombies:
    enabled: true
    count: 3
    spawnArea:
      min: [-120, 0, -120]
      max: [120, 0, 120]
    respawn: false
    wanderOnly: true
    
  dogs:
    enabled: true
    count: 4
    spawnArea:
      min: [-80, 0, -80]
      max: [80, 0, 80]
    respawn: true
    farmPatrol: true
    
  birds:
    enabled: true
    count: 30
    spawnArea:
      min: [-120, 10, -120]
      max: [120, 60, 120]
    respawn: true
    flockSize: 10
    migrationEnabled: true
    
  fish:
    enabled: false
    
  boats:
    enabled: false

environment:
  startTime: 6.0
  timeScale: 45.0
  ambientColor: [0.35, 0.35, 0.3]
  
lighting:
  sunIntensity: 1.2
  shadowsEnabled: true
  shadowQuality: "medium"
  
weather:
  enabled: true
  rainChance: 0.2
  cloudVariation: "high"
```

### rural_02: Stream Valley

Rural area with a stream running through.

```yaml
id: "rural_02"
name: "Stream Valley"
type: "Rural"
description: "Rolling farmland with a stream running through the valley"

terrain:
  size: [280, 280]
  heightmap: "assets/heightmaps/rural_02.png"
  waterLevel: -1.0
  bowlRadius: 130
  bowlDepth: 20

systems:
  dayNight: true
  water: true
  clouds: true
  weather: true
  proceduralGeneration: true
  roadNetwork: false

generation:
  farmCount: 3
  fieldCount: 6
  streamPath: "valley_center"
  bridgeCount: 2

agents:
  villagers:
    enabled: true
    count: 6
    spawnArea:
      min: [-80, 0, -80]
      max: [80, 0, 80]
    respawn: true
    
  zombies:
    enabled: false
    
  dogs:
    enabled: true
    count: 2
    spawnArea:
      min: [-60, 0, -60]
      max: [60, 0, 60]
    respawn: true
    
  birds:
    enabled: true
    count: 25
    spawnArea:
      min: [-130, 8, -130]
      max: [130, 45, 130]
    respawn: true
    flockSize: 8
    
  fish:
    enabled: true
    count: 15
    spawnArea:
      min: [-100, -3, -20]
      max: [100, -0.5, 20]
    respawn: true
    shoalSize: 5
    streamBehavior: true
    
  boats:
    enabled: false

environment:
  startTime: 7.0
  timeScale: 50.0
  ambientColor: [0.32, 0.35, 0.3]
```

---

## Coastal Level Configuration

### coastal_01: Harbor Town

Full coastal experience with harbor and marine life.

```yaml
id: "coastal_01"
name: "Harbor Town"
type: "Coastal"
description: "A bustling harbor town with docks, boats, and marine life"

terrain:
  size: [250, 250]
  heightmap: "assets/heightmaps/coastal_01.png"
  waterLevel: 0.0
  bowlRadius: 120
  bowlDepth: 25
  coastlineOffset: 80

systems:
  dayNight: true
  water: true
  clouds: true
  weather: true
  proceduralGeneration: true
  roadNetwork: true
  buoyancy: true

generation:
  harborEnabled: true
  dockCount: 4
  pierLength: 30
  lighthouseEnabled: true
  beachEnabled: true

agents:
  villagers:
    enabled: true
    count: 15
    spawnArea:
      min: [-60, 0, 20]
      max: [60, 0, 100]
    respawn: true
    harborWorkEnabled: true
    fishingEnabled: true
    
  zombies:
    enabled: false
    
  dogs:
    enabled: true
    count: 3
    spawnArea:
      min: [-40, 0, 30]
      max: [40, 0, 80]
    respawn: false
    dockPatrol: true
    
  birds:
    enabled: true
    count: 20
    spawnArea:
      min: [-120, 5, -120]
      max: [120, 35, 120]
    respawn: true
    flockSize: 6
    divingEnabled: true
    coastalBehavior: true
    
  fish:
    enabled: true
    count: 50
    spawnArea:
      min: [-100, -12, -100]
      max: [100, -1, 20]
    respawn: true
    shoalSize: 12
    feedingZones:
      - center: [0, -5, -40]
        radius: 30
    
  boats:
    enabled: true
    count: 5
    spawnArea:
      min: [-80, 0, -80]
      max: [80, 0, -20]
    respawn: false
    dockingEnabled: true
    sailingRoutes:
      - start: [-60, 0, -60]
        end: [60, 0, -60]
      - start: [0, 0, -80]
        end: [0, 0, 20]

environment:
  startTime: 10.0
  timeScale: 45.0
  ambientColor: [0.35, 0.38, 0.42]
  
lighting:
  sunIntensity: 1.1
  shadowsEnabled: true
  shadowQuality: "high"
  waterReflections: true
  
water:
  waveHeight: 0.5
  waveFrequency: 0.8
  transparency: 0.7
  color: [0.1, 0.3, 0.5]
```

### coastal_02: Fishing Village

Smaller coastal settlement focused on fishing.

```yaml
id: "coastal_02"
name: "Fishing Village"
type: "Coastal"
description: "A small fishing village with abundant marine life"

terrain:
  size: [200, 200]
  heightmap: "assets/heightmaps/coastal_02.png"
  waterLevel: 0.0
  bowlRadius: 90
  bowlDepth: 20

systems:
  dayNight: true
  water: true
  clouds: true
  weather: false
  proceduralGeneration: true
  roadNetwork: true
  buoyancy: true

generation:
  harborEnabled: true
  dockCount: 2
  houseCount: 8

agents:
  villagers:
    enabled: true
    count: 10
    spawnArea:
      min: [-40, 0, 10]
      max: [40, 0, 70]
    respawn: true
    fishingEnabled: true
    
  zombies:
    enabled: true
    count: 3
    spawnArea:
      min: [-85, 0, 40]
      max: [85, 0, 85]
    respawn: false
    
  dogs:
    enabled: true
    count: 2
    spawnArea:
      min: [-30, 0, 20]
      max: [30, 0, 60]
    respawn: true
    
  birds:
    enabled: true
    count: 25
    spawnArea:
      min: [-90, 3, -90]
      max: [90, 30, 90]
    respawn: true
    divingEnabled: true
    
  fish:
    enabled: true
    count: 60
    spawnArea:
      min: [-80, -10, -80]
      max: [80, -1, 10]
    respawn: true
    shoalSize: 15
    
  boats:
    enabled: true
    count: 8
    spawnArea:
      min: [-60, 0, -60]
      max: [60, 0, -10]
    respawn: true
    fishingBoats: true

environment:
  startTime: 5.0
  timeScale: 40.0
  ambientColor: [0.3, 0.35, 0.4]
```

---

## Wilderness Level Configuration

### wilderness_01: Dark Forest

Atmospheric wilderness with zombie presence.

```yaml
id: "wilderness_01"
name: "Dark Forest"
type: "Wilderness"
description: "A dark, atmospheric forest with wandering zombies"

terrain:
  size: [300, 300]
  heightmap: "assets/heightmaps/wilderness_01.png"
  waterLevel: -3.0
  bowlRadius: 140
  bowlDepth: 35

systems:
  dayNight: true
  water: true
  clouds: true
  weather: true
  proceduralGeneration: true
  roadNetwork: false

generation:
  treesDensity: "high"
  rockFormations: true
  clearingCount: 3
  lakeEnabled: true

agents:
  villagers:
    enabled: false
    
  zombies:
    enabled: true
    count: 15
    spawnArea:
      min: [-130, 0, -130]
      max: [130, 0, 130]
    respawn: true
    wanderRadius: 100
    hordeEnabled: true
    hordeSize: 5
    
  dogs:
    enabled: false
    
  birds:
    enabled: true
    count: 30
    spawnArea:
      min: [-140, 15, -140]
      max: [140, 60, 140]
    respawn: true
    flockSize: 8
    forestBehavior: true
    
  fish:
    enabled: true
    count: 35
    spawnArea:
      min: [-50, -8, -50]
      max: [50, -1, 50]
    respawn: true
    shoalSize: 10
    
  boats:
    enabled: true
    count: 1
    spawnArea:
      min: [-20, 0, -20]
      max: [20, 0, 20]
    respawn: false
    abandoned: true
    drifting: true

environment:
  startTime: 18.0
  timeScale: 30.0
  ambientColor: [0.15, 0.18, 0.12]
  
lighting:
  sunIntensity: 0.6
  moonIntensity: 0.4
  shadowsEnabled: true
  shadowQuality: "high"
  
effects:
  fog:
    enabled: true
    density: 0.015
    color: [0.1, 0.12, 0.08]
  atmosphericScattering: true
```

### wilderness_02: Nature Reserve

Peaceful wildlife sanctuary without threats.

```yaml
id: "wilderness_02"
name: "Nature Reserve"
type: "Wilderness"
description: "A peaceful natural environment with birds and fish"

terrain:
  size: [280, 280]
  heightmap: "assets/heightmaps/wilderness_02.png"
  waterLevel: -1.0
  bowlRadius: 130
  bowlDepth: 20

systems:
  dayNight: true
  water: true
  clouds: true
  weather: true
  proceduralGeneration: true
  roadNetwork: false

generation:
  treesDensity: "medium"
  meadowCount: 4
  lakeEnabled: true
  riverEnabled: true

agents:
  villagers:
    enabled: false
    
  zombies:
    enabled: false
    
  dogs:
    enabled: false
    
  birds:
    enabled: true
    count: 40
    spawnArea:
      min: [-125, 5, -125]
      max: [125, 50, 125]
    respawn: true
    flockSize: 12
    migrationEnabled: true
    diverseSpecies: true
    
  fish:
    enabled: true
    count: 50
    spawnArea:
      min: [-100, -6, -100]
      max: [100, -0.5, 100]
    respawn: true
    shoalSize: 15
    feedingBehavior: true
    
  boats:
    enabled: false

environment:
  startTime: 8.0
  timeScale: 60.0
  ambientColor: [0.35, 0.4, 0.35]
  
lighting:
  sunIntensity: 1.0
  shadowsEnabled: true
  shadowQuality: "medium"
  
weather:
  enabled: true
  rainChance: 0.15
  clearSkies: 0.6
```

### wilderness_03: Zombie Invasion

Extreme zombie scenario in wilderness setting.

```yaml
id: "wilderness_03"
name: "Zombie Invasion"
type: "Wilderness"
description: "A massive zombie horde invading the countryside"

terrain:
  size: [320, 320]
  heightmap: "assets/heightmaps/wilderness_03.png"
  waterLevel: -10.0
  bowlRadius: 150
  bowlDepth: 40

systems:
  dayNight: true
  water: true
  clouds: false
  weather: false
  proceduralGeneration: true
  roadNetwork: false

generation:
  treesDensity: "sparse"
  deadTrees: true
  ruinedStructures: 3

agents:
  villagers:
    enabled: false
    
  zombies:
    enabled: true
    count: 40
    spawnArea:
      min: [-145, 0, -145]
      max: [145, 0, 145]
    respawn: true
    aggressiveness: 1.5
    hordeEnabled: true
    hordeSize: 10
    hordeCount: 4
    
  dogs:
    enabled: false
    
  birds:
    enabled: false
    
  fish:
    enabled: false
    
  boats:
    enabled: false

environment:
  startTime: 0.0
  timeScale: 20.0
  ambientColor: [0.1, 0.05, 0.05]
  
lighting:
  sunIntensity: 0.2
  moonIntensity: 0.6
  shadowsEnabled: true
  shadowQuality: "high"
  
effects:
  fog:
    enabled: true
    density: 0.025
    color: [0.15, 0.05, 0.05]
  bloodParticles: true
  redSky: true
  lightning: true
```

---

## Configuration Validation Rules

### Required Fields

Every level configuration MUST include:
- `id` - Unique identifier
- `name` - Display name
- `type` - One of: Village, Rural, Coastal, Wilderness
- `terrain.size` - World dimensions
- `systems` - System activation flags
- `agents` - Agent configuration (can be empty)
- `environment.startTime` - Initial game time
- `environment.timeScale` - Time progression rate

### System Dependencies

The following dependencies MUST be satisfied:

| If Enabled | Requires |
|------------|----------|
| boats | water: true |
| fish | water: true |
| buoyancy | water: true |
| roadNetwork | proceduralGeneration: true |

### Agent Spawn Validation

- Spawn areas MUST be within terrain bounds
- Fish spawn areas MUST be below water level
- Bird spawn areas MUST have positive Y values
- Boat spawn areas MUST be at water level (Y ≈ waterLevel)

---

## Cross-References

- #[[file:docs/Design_Docs/level-design/level-types.md]] - Level type definitions
- #[[file:docs/Code_Tech_Docs/subsystems/level-system.md]] - Technical level system documentation
- #[[file:docs/Code_Tech_Docs/subsystems/agent-system.md]] - Agent spawning details
- #[[file:docs/Design_Docs/environment-systems/procedural-generation.md]] - Generation algorithms
