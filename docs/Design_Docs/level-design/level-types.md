# Level Types

## Purpose

This document defines the four primary level types in the 3D Village Simulation. Each level type represents a distinct environment with specific active systems, agent populations, and gameplay characteristics.

## Level Type Overview

| Type | Theme | Primary Focus | Atmosphere |
|------|-------|---------------|------------|
| Village | Dense settlement | Social simulation | Bustling, lively |
| Rural | Sparse farmland | Peaceful observation | Calm, pastoral |
| Coastal | Waterfront area | Marine life | Serene, nautical |
| Wilderness | Natural environment | Survival dynamics | Wild, untamed |

---

## Village Type

### Description

A dense settlement featuring houses, roads, a central plaza, and active villager life. The Village type showcases the full social simulation with villagers going about daily routines, dogs patrolling, and the ever-present zombie threat.

### Visual Characteristics

- Clustered buildings with connecting roads
- Central plaza or gathering area
- Fenced yards and gardens
- Street lighting for night scenes
- Moderate terrain variation

### Active Systems

| System | Status | Notes |
|--------|--------|-------|
| Day/Night Cycle | ✓ Enabled | Full 24-hour cycle |
| Water Simulation | Optional | Small ponds or wells |
| Cloud System | ✓ Enabled | Standard cloud coverage |
| Weather Effects | Optional | Light rain possible |
| Procedural Generation | ✓ Enabled | Village layout generation |
| Road Network | ✓ Enabled | Connects all buildings |

### Agent Populations

| Agent Type | Typical Count | Behavior Focus |
|------------|---------------|----------------|
| Villagers | 15-25 | Full schedule (work, socialize, sleep) |
| Zombies | 5-15 | Patrol and pursuit |
| Dogs | 3-5 | Territory patrol, alert on threats |
| Birds | 10-20 | Ambient flocking |
| Fish | 0-20 | Only if water present |
| Boats | 0 | Not applicable |

### Gameplay Dynamics

- Villagers follow daily schedules based on time of day
- Zombies create tension, especially at night
- Dogs alert villagers to zombie presence
- Social network interactions between villagers
- Buildings provide shelter during zombie attacks

### Environmental Settings

```
terrain:
  size: [200, 200]
  heightVariation: moderate
  waterLevel: null or minimal

lighting:
  ambientIntensity: 0.3
  shadowQuality: high
  
time:
  startTime: 8:00 (morning)
  timeScale: 60x (1 real second = 1 game minute)
```

---

## Rural Type

### Description

Sparse farmland with scattered buildings, open fields, and a peaceful atmosphere. The Rural type emphasizes calm observation with fewer threats and more wildlife activity.

### Visual Characteristics

- Widely spaced farmhouses
- Open fields and meadows
- Dirt paths connecting buildings
- Rolling hills
- Scattered trees and vegetation

### Active Systems

| System | Status | Notes |
|--------|--------|-------|
| Day/Night Cycle | ✓ Enabled | Full 24-hour cycle |
| Water Simulation | Optional | Streams or ponds |
| Cloud System | ✓ Enabled | Varied cloud patterns |
| Weather Effects | Optional | Seasonal weather |
| Procedural Generation | ✓ Enabled | Farm placement |
| Road Network | Minimal | Dirt paths only |

### Agent Populations

| Agent Type | Typical Count | Behavior Focus |
|------------|---------------|----------------|
| Villagers | 5-10 | Farm work, limited social |
| Zombies | 0-5 | Rare encounters |
| Dogs | 2-4 | Farm patrol |
| Birds | 20-30 | Active flocking, migration |
| Fish | 0-15 | If streams present |
| Boats | 0 | Not applicable |

### Gameplay Dynamics

- Emphasis on wildlife observation
- Villagers focused on farming tasks
- Minimal zombie threat
- Bird migration patterns visible
- Peaceful day/night transitions

### Environmental Settings

```
terrain:
  size: [250, 250]
  heightVariation: gentle rolling
  waterLevel: null or stream level

lighting:
  ambientIntensity: 0.35
  shadowQuality: medium
  
time:
  startTime: 6:00 (dawn)
  timeScale: 45x (slower pace)
```

---

## Coastal Type

### Description

A waterfront area featuring a harbor, docks, and marine life. The Coastal type showcases water simulation, boat navigation, and fish shoaling behaviors.

### Visual Characteristics

- Harbor with docking areas
- Waterfront buildings
- Sandy beaches
- Rocky outcrops
- Lighthouse or pier structures
- Seagulls and marine atmosphere

### Active Systems

| System | Status | Notes |
|--------|--------|-------|
| Day/Night Cycle | ✓ Enabled | Full 24-hour cycle |
| Water Simulation | ✓ Enabled | Full wave physics |
| Cloud System | ✓ Enabled | Maritime clouds |
| Weather Effects | ✓ Enabled | Sea weather |
| Procedural Generation | ✓ Enabled | Harbor layout |
| Road Network | ✓ Enabled | Dock connections |
| Buoyancy System | ✓ Enabled | Boat physics |

### Agent Populations

| Agent Type | Typical Count | Behavior Focus |
|------------|---------------|----------------|
| Villagers | 10-15 | Harbor work, fishing |
| Zombies | 0-5 | Optional threat |
| Dogs | 2-3 | Dock patrol |
| Birds | 15-25 | Coastal flocking, diving |
| Fish | 40-60 | Shoaling, feeding |
| Boats | 3-8 | Sailing, docking |

### Gameplay Dynamics

- Fish shoaling in visible water
- Boats sailing and docking
- Villagers working at harbor
- Birds diving for fish
- Tidal water level changes (optional)
- Weather affects boat behavior

### Environmental Settings

```
terrain:
  size: [250, 250]
  heightVariation: coastal slope
  waterLevel: 0.0 (sea level)

lighting:
  ambientIntensity: 0.35
  shadowQuality: high
  reflections: enabled
  
time:
  startTime: 10:00 (mid-morning)
  timeScale: 45x
```

---

## Wilderness Type

### Description

A natural, untamed environment with minimal human presence. The Wilderness type focuses on wildlife behaviors and survival dynamics, featuring zombies as the primary threat in an isolated setting.

### Visual Characteristics

- Dense vegetation
- Natural water bodies (lakes, rivers)
- Rocky terrain
- No buildings or roads
- Atmospheric fog
- Dramatic lighting

### Active Systems

| System | Status | Notes |
|--------|--------|-------|
| Day/Night Cycle | ✓ Enabled | Full 24-hour cycle |
| Water Simulation | ✓ Enabled | Lakes and rivers |
| Cloud System | ✓ Enabled | Dynamic weather |
| Weather Effects | ✓ Enabled | Full weather system |
| Procedural Generation | ✓ Enabled | Terrain features |
| Road Network | ✗ Disabled | No roads |

### Agent Populations

| Agent Type | Typical Count | Behavior Focus |
|------------|---------------|----------------|
| Villagers | 0 | Not present |
| Zombies | 10-25 | Wandering, hunting |
| Dogs | 0 | Not present |
| Birds | 25-40 | Natural flocking |
| Fish | 30-50 | Lake/river shoaling |
| Boats | 0-2 | Abandoned or drifting |

### Gameplay Dynamics

- Pure wildlife observation
- Zombie hordes wandering
- No human settlements
- Natural predator-prey dynamics (zombies vs wildlife)
- Atmospheric environmental effects
- Day/night dramatically affects zombie behavior

### Environmental Settings

```
terrain:
  size: [300, 300]
  heightVariation: dramatic
  waterLevel: variable (lakes, rivers)

lighting:
  ambientIntensity: 0.25
  shadowQuality: high
  fog: enabled
  
time:
  startTime: 18:00 (dusk)
  timeScale: 30x (slower for atmosphere)
```

---

## Level Type Comparison Matrix

### System Activation by Level Type

| System | Village | Rural | Coastal | Wilderness |
|--------|---------|-------|---------|------------|
| Day/Night | ✓ | ✓ | ✓ | ✓ |
| Water | Optional | Optional | ✓ | ✓ |
| Clouds | ✓ | ✓ | ✓ | ✓ |
| Weather | Optional | Optional | ✓ | ✓ |
| Procedural Gen | ✓ | ✓ | ✓ | ✓ |
| Road Network | ✓ | Minimal | ✓ | ✗ |
| Buoyancy | ✗ | ✗ | ✓ | Optional |

### Agent Presence by Level Type

| Agent | Village | Rural | Coastal | Wilderness |
|-------|---------|-------|---------|------------|
| Villagers | High | Low | Medium | None |
| Zombies | Medium | Low | Low | High |
| Dogs | Medium | Medium | Low | None |
| Birds | Medium | High | High | High |
| Fish | Low | Low | High | High |
| Boats | None | None | High | Low |

### Atmosphere Characteristics

| Aspect | Village | Rural | Coastal | Wilderness |
|--------|---------|-------|---------|------------|
| Pace | Busy | Calm | Moderate | Tense |
| Threat Level | Medium | Low | Low | High |
| Wildlife Focus | Low | High | High | High |
| Human Activity | High | Medium | Medium | None |
| Visual Density | High | Low | Medium | Medium |

---

## Special Level Variants

Beyond the four primary types, levels can include special variants:

### Zombie Apocalypse (Village Variant)

A dark version of the Village type with:
- Increased zombie population (20-40)
- Reduced villager population (5-10)
- No dogs (eliminated)
- Atmospheric effects (fog, red sky)
- Damaged buildings

### Zombie Invasion (Village Variant)

Massive zombie horde scenario:
- Very high zombie count (40+)
- Minimal survivors
- Special effects (blood particles, fog)
- Increased zombie aggression
- Smaller safe zones

### Nature Reserve (Wilderness Variant)

Peaceful wildlife sanctuary:
- No zombies
- High bird and fish populations
- No human presence
- Focus on natural behaviors
- Calm atmosphere

---

## Cross-References

- #[[file:docs/Design_Docs/level-design/level-configurations.md]] - Complete configuration examples
- #[[file:docs/Code_Tech_Docs/subsystems/level-system.md]] - Technical level system documentation
- #[[file:docs/Design_Docs/agent-behaviors/villager-mechanics.md]] - Villager behavior details
- #[[file:docs/Design_Docs/agent-behaviors/zombie-mechanics.md]] - Zombie behavior details
- #[[file:docs/Design_Docs/agent-behaviors/wildlife-mechanics.md]] - Wildlife behavior details
- #[[file:docs/Design_Docs/environment-systems/day-night-cycle.md]] - Day/night cycle effects
- #[[file:docs/Design_Docs/environment-systems/water-system.md]] - Water simulation details
