# Day/Night Cycle

## Overview

The day/night cycle simulates the passage of time in the village simulation, affecting lighting conditions, sky appearance, and agent behaviors. Time progresses at a configurable rate, creating a dynamic environment that influences gameplay and visual atmosphere.

## Time System

### Time Representation

Time is represented as minutes since midnight (0-1440), with helper methods for hour-based queries:

| Property | Range | Description |
|----------|-------|-------------|
| gameTime | 0-1440 | Minutes since midnight |
| currentHour | 0-23 | Current hour of day |
| timeScale | 1-3600 | Game minutes per real second |

**Default Configuration:**
- Start time: 8:00 AM (480 minutes)
- Time scale: 1200 (1 real second = 20 game minutes)
- Full day cycle: ~72 real seconds

### Time Periods

| Period | Time Range | Duration | Characteristics |
|--------|------------|----------|-----------------|
| Dawn | 5:00 - 7:00 | 2 hours | Sunrise transition, warm colors |
| Morning | 7:00 - 12:00 | 5 hours | Bright daylight, full activity |
| Afternoon | 12:00 - 17:00 | 5 hours | Peak sun, shadows shift |
| Dusk | 17:00 - 19:00 | 2 hours | Sunset transition, warm colors |
| Evening | 19:00 - 22:00 | 3 hours | Twilight, reduced activity |
| Night | 22:00 - 5:00 | 7 hours | Darkness, minimal activity |

## Celestial Bodies

### Sun Movement

The sun follows an orbital path across the sky:

```
Sun Position Calculation:
- Orbit radius: 1000 units
- Maximum height: 800 units (noon)
- Minimum height: -200 units (below horizon)
- Sunrise hour: 6:00
- Sunset hour: 18:00

Position at time t:
  angle = ((t - sunrise) / 24) * 2π
  height = sin(progress * π) * (maxHeight - minHeight) + minHeight
  x = cos(angle) * orbitRadius
  z = sin(angle) * orbitRadius
```

### Moon Movement

The moon follows an opposite orbital path to the sun:

```
Moon Position:
- Orbit radius: 1000 units
- Angle offset: π (opposite to sun)
- Visible during night hours
- Provides ambient illumination
```

### Stars

Stars are visible during night hours with twinkling effects:

| Property | Value | Description |
|----------|-------|-------------|
| Count | 1000 | Number of star particles |
| Distribution | Spherical | Random positions on sky dome |
| Visibility | Night only | Fade based on sun height |
| Twinkling | Per-star | Random speed and intensity |

## Lighting Keyframes

### Sun Light

| Time | Intensity | Diffuse Color | Specular |
|------|-----------|---------------|----------|
| 0:00 | 0.0 | - | - |
| 6:00 | 0.3 | (1.0, 0.5, 0.2) | (0.3, 0.3, 0.3) |
| 12:00 | 1.5 | (1.0, 1.0, 1.0) | (0.3, 0.3, 0.3) |
| 18:00 | 0.3 | (1.0, 0.5, 0.2) | (0.3, 0.3, 0.3) |

### Ambient Light

| Time | Intensity | Diffuse Color | Ground Color |
|------|-----------|---------------|--------------|
| Day | 0.3 | (0.6, 0.6, 0.9) | (0.3, 0.3, 0.3) |
| Twilight | 0.4 | (0.4, 0.4, 0.6) | (0.2, 0.2, 0.3) |
| Night | 0.1 | (0.1, 0.1, 0.3) | (0.05, 0.05, 0.15) |

### Glow Effects

| Object | Day Intensity | Night Intensity |
|--------|---------------|-----------------|
| Sun | 0.5 | 0.0 |
| Moon | 0.0 | 0.4 |

## Sky Colors

### Gradient Keyframes

**Daytime (sun above horizon):**
```
Top:    #00BFFF (Deep sky blue)
Middle: #87CEEB (Sky blue)
Bottom: #E0FFFF (Light cyan)
```

**Dawn/Dusk (sunrise/sunset ±1 hour):**
```
Top:    #FF6B4A (Deep orange)
Upper:  #FF9E8F (Soft pink)
Middle: #FFB6C1 (Light pink)
Lower:  #87CEEB (Sky blue)
Bottom: #4169E1 (Royal blue)
Base:   #191970 (Midnight blue)
```

**Nighttime (sun below horizon):**
```
Top:    #000033 (Dark blue)
Middle: #0000FF (Deep blue)
Bottom: #191970 (Midnight blue)
```

## Atmospheric Effects

### Fog Configuration

| Time Period | Density | Color |
|-------------|---------|-------|
| Day | 0.001 | (0.7, 0.8, 1.0) |
| Dawn/Dusk | 0.005 | (0.9, 0.6, 0.4) |
| Night | 0.003 | (0.05, 0.05, 0.15) |

### Volumetric Light

| Time Period | Exposure | Decay | Weight |
|-------------|----------|-------|--------|
| Day | 0.5 | 0.96 | 0.2 |
| Dawn/Dusk | 0.5 | 0.96 | 0.3 |
| Night | 0.1 | 0.9 | 0.2 |

### Image Processing

Tone mapping and exposure adjustment prevent overblown lighting:

| Parameter | Day Value | Night Value |
|-----------|-----------|-------------|
| Exposure | 0.7-1.0 | 1.0 |
| Contrast | 1.1-1.3 | 1.1 |
| Tone Mapping | ACES | ACES |

## Agent Schedule Effects

The day/night cycle directly affects agent behaviors through schedule rules.

### Villager Schedule

| Time Period | Primary Activity | Behavior Modifier |
|-------------|------------------|-------------------|
| 5:00 - 7:00 | Wake up | Transition from sleeping |
| 7:00 - 12:00 | Working | Full activity |
| 12:00 - 13:00 | Lunch break | Socializing |
| 13:00 - 17:00 | Working | Full activity |
| 17:00 - 20:00 | Leisure | Socializing, wandering |
| 20:00 - 22:00 | Evening | Return home |
| 22:00 - 5:00 | Sleeping | Indoors, inactive |

### Zombie Activity

| Time Period | Activity Level | Behavior |
|-------------|----------------|----------|
| Day | Low (0.3) | Slower movement, reduced awareness |
| Dusk | Medium (0.6) | Increasing activity |
| Night | High (1.0) | Full speed, maximum awareness |
| Dawn | Medium (0.6) | Decreasing activity |

### Wildlife Behavior

| Agent | Day Behavior | Night Behavior |
|-------|--------------|----------------|
| Birds | Active flying, flocking | Perching, minimal movement |
| Fish | Normal swimming | Reduced activity |
| Dogs | Patrolling, alert | Resting near homes |

## Time Query Interface

Systems can query time information:

```
getCurrentTime(): number
  Returns: Game time in minutes (0-1440)

getCurrentHour(): number
  Returns: Current hour (0-23)

getTimeOfDay(): "dawn" | "day" | "dusk" | "night"
  Returns: Current time period

isNightTime(): boolean
  Returns: true if between 19:00 and 5:00

getLightLevel(): number
  Returns: Normalized light level (0.0-1.0)
```

## Configuration Parameters

```yaml
dayNightCycle:
  enabled: true
  startTime: 480           # 8:00 AM in minutes
  timeScale: 1200          # Game minutes per real second
  
  sun:
    orbitRadius: 1000
    maxHeight: 800
    minHeight: -200
    sunriseHour: 6
    sunsetHour: 18
    
  lighting:
    sunIntensity: 1.5
    ambientIntensity: 0.3
    shadowEnabled: true
    
  atmosphere:
    fogEnabled: true
    volumetricLightEnabled: true
    toneMappingEnabled: true
```

## State Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    Day/Night State Machine                   │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│    ┌─────────┐    5:00    ┌─────────┐    7:00    ┌───────┐ │
│    │  Night  │ ─────────► │  Dawn   │ ─────────► │  Day  │ │
│    └─────────┘            └─────────┘            └───────┘ │
│         ▲                                            │      │
│         │                                            │      │
│       22:00                                        17:00    │
│         │                                            │      │
│         │                                            ▼      │
│    ┌─────────┐   19:00    ┌─────────┐            ┌───────┐ │
│    │ Evening │ ◄───────── │  Dusk   │ ◄───────── │Afternoon│
│    └─────────┘            └─────────┘            └───────┘ │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Normative Guarantees

1. Time MUST progress at the configured rate regardless of frame rate
2. Time values MUST wrap from 1440 back to 0 (midnight)
3. Lighting MUST interpolate smoothly between keyframes
4. Agent behaviors MUST be able to query current time
5. Time scale MUST be adjustable at runtime
6. Same time value MUST produce identical lighting conditions

## Cross-References

- #[[file:docs/Code_Tech_Docs/subsystems/environment-system.md]] - Technical implementation
- #[[file:docs/Design_Docs/agent-behaviors/villager-mechanics.md]] - Villager schedules
- #[[file:docs/Design_Docs/agent-behaviors/zombie-mechanics.md]] - Zombie activity levels
- #[[file:docs/Design_Docs/agent-behaviors/wildlife-mechanics.md]] - Wildlife day/night behaviors
