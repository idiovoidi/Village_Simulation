# Game Loop

## Purpose

The Game Loop coordinates simulation updates and rendering, ensuring physics runs at a fixed timestep for deterministic behavior while rendering occurs as fast as possible for smooth visuals. This separation prevents physics instability from variable frame rates.

## Boundaries

**In Scope:**
- Time tracking and delta time calculation
- Fixed timestep physics scheduling
- Variable timestep render scheduling
- Accumulator management and clamping
- Interpolation factor calculation

**Out of Scope:**
- Physics simulation logic (handled by Physics System)
- Rendering logic (handled by Render System)
- System update logic (handled by individual systems)
- Input processing (handled by Input System)

## Responsibilities

- Track elapsed real time between frames
- Accumulate time for physics updates
- Trigger physics updates at fixed intervals
- Clamp accumulated time to prevent spiral of death
- Limit substeps per frame to bound worst-case frame time
- Trigger render updates each frame
- Provide interpolation factor for visual smoothing

## Core Concepts

### Fixed Timestep

Physics updates occur at a constant interval regardless of frame rate:

```
Fixed Timestep = 16.67ms (60 Hz)

Frame Rate 60 FPS:  1 physics update per frame
Frame Rate 120 FPS: ~0.5 physics updates per frame (alternating)
Frame Rate 30 FPS:  2 physics updates per frame
```

This ensures physics behaves identically regardless of hardware performance.

### Accumulator

The accumulator tracks unprocessed time:

```
Per Frame:
1. accumulator += deltaTime
2. while (accumulator >= fixedTimestep):
   a. physics.update(fixedTimestep)
   b. accumulator -= fixedTimestep
3. render(interpolation)
```

### Interpolation Factor

The interpolation factor smooths rendering between physics states:

```
interpolation = accumulator / fixedTimestep

Range: [0.0, 1.0)
- 0.0 = render at last physics state
- 0.5 = render halfway between states
- 0.99 = render almost at next physics state
```

Visual positions are interpolated: `renderPos = prevPos + (currPos - prevPos) * interpolation`

### Spiral of Death

Without clamping, slow frames cause more physics updates, which cause slower frames:

```
Spiral of Death (unclamped):
Frame 1: deltaTime = 100ms → 6 physics updates → frame takes 120ms
Frame 2: deltaTime = 120ms → 7 physics updates → frame takes 140ms
Frame 3: deltaTime = 140ms → 8 physics updates → frame takes 160ms
... (continues until crash)
```

Clamping the accumulator prevents this:

```
With Clamping (max 250ms):
Frame 1: deltaTime = 100ms → accumulator = 100ms → 6 updates
Frame 2: deltaTime = 300ms → accumulator = min(300, 250) = 250ms → 15 updates
         (but limited by maxSubsteps = 5)
```

## Lifecycle

### 1. Loop Initialization
```
1. Create Game Loop instance
2. Configure timestep parameters
3. Initialize accumulator to 0
4. Record initial timestamp
5. Loop ready to start
```

### 2. Loop Running
```
1. Request animation frame
2. Calculate deltaTime from last frame
3. Clamp deltaTime to maxAccumulatedTime
4. Add deltaTime to accumulator
5. While accumulator >= fixedTimestep (up to maxSubsteps):
   a. Run fixed-step systems (physics, AI, etc.)
   b. Subtract fixedTimestep from accumulator
6. Calculate interpolation factor
7. Run variable-step systems (animation, LOD)
8. Render frame with interpolation
9. Repeat from step 1
```

### 3. Loop Stopped
```
1. Cancel animation frame request
2. Preserve accumulator state (for resume)
3. Loop paused
```

### 4. Loop Disposal
```
1. Stop loop if running
2. Clear all references
3. Loop disposed
```

## Configuration Parameters

| Parameter | Default | Description |
|-----------|---------|-------------|
| `fixedTimestep` | 16.67ms (60 Hz) | Physics update interval |
| `maxAccumulatedTime` | 250ms | Maximum time to accumulate before clamping |
| `maxSubsteps` | 5 | Maximum physics updates per frame |

### Parameter Relationships

```
maxSubsteps * fixedTimestep = maximum physics time per frame

Default: 5 * 16.67ms = 83.35ms of physics per frame

If frame takes longer than this, simulation will slow down
(time dilation) rather than spiral.
```

### Tuning Guidelines

| Scenario | Adjustment |
|----------|------------|
| Physics instability | Decrease fixedTimestep (more updates) |
| Poor performance | Increase fixedTimestep (fewer updates) |
| Hitching on slow frames | Decrease maxSubsteps |
| Time dilation visible | Increase maxSubsteps |

## Frame Timing Diagram

```
Real Time:    |----16ms----|----16ms----|----16ms----|----50ms----|
              ↓            ↓            ↓            ↓
Frame:        1            2            3            4

Frame 1 (16ms):
  accumulator: 0 + 16 = 16ms
  physics updates: 1 (16ms consumed)
  accumulator after: 0ms
  interpolation: 0.0

Frame 2 (16ms):
  accumulator: 0 + 16 = 16ms
  physics updates: 1
  accumulator after: 0ms
  interpolation: 0.0

Frame 3 (16ms):
  accumulator: 0 + 16 = 16ms
  physics updates: 1
  accumulator after: 0ms
  interpolation: 0.0

Frame 4 (50ms - slow frame):
  accumulator: 0 + 50 = 50ms
  physics updates: 3 (48ms consumed, limited by maxSubsteps if needed)
  accumulator after: 2ms
  interpolation: 2/16 = 0.125
```

## Semantics (Normative Guarantees)

### Timestep Guarantees

- Physics updates MUST occur at fixed timestep regardless of frame rate
- Multiple physics updates MAY occur per frame if needed to catch up
- Physics updates MUST receive exactly `fixedTimestep` as delta time

### Clamping Guarantees

- Accumulated time MUST be clamped to `maxAccumulatedTime`
- Clamping MUST occur before physics updates are calculated
- Maximum substeps per frame MUST NOT exceed `maxSubsteps`

### Render Guarantees

- Render updates MUST occur once per frame
- Render updates MUST occur after all physics updates for that frame
- Interpolation factor MUST be provided for visual smoothing
- Interpolation factor MUST be in range [0.0, 1.0)

### Timing Guarantees

- Delta time MUST be calculated from actual elapsed time
- Delta time MUST NOT be negative
- Delta time of 0 SHOULD skip the frame (no updates)

## Correctness Properties

### Property 6: Fixed Timestep Consistency
*For any* sequence of frames, physics updates MUST occur at the configured fixed timestep regardless of frame rate.

**Validates: Requirements 4.3**

## Observability

### Metrics to Track

| Metric | Description | Alert Threshold |
|--------|-------------|-----------------|
| Frame time | Total frame duration | > 33ms (< 30 FPS) |
| Physics substeps | Updates per frame | > maxSubsteps |
| Accumulator value | Unprocessed time | > fixedTimestep * 2 |
| Interpolation factor | Render smoothing value | N/A (informational) |
| Time dilation | Ratio of sim time to real time | < 0.9 |

### Events to Log

| Event | Level | Data |
|-------|-------|------|
| Loop started | Info | fixedTimestep, maxSubsteps |
| Loop stopped | Info | totalFrames, totalTime |
| Accumulator clamped | Warning | originalValue, clampedValue |
| Max substeps reached | Warning | frameTime, substepCount |
| Frame spike | Warning | deltaTime (if > 100ms) |

## Cross-References

- #[[file:docs/Code_Tech_Docs/architecture-overview.md]]
- #[[file:docs/Code_Tech_Docs/core-systems/update-ordering.md]]
- #[[file:docs/Code_Tech_Docs/subsystems/physics-system.md]]
- #[[file:docs/Code_Tech_Docs/correctness-properties.md]]
