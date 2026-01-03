# Update Ordering

## Purpose

This document defines the canonical order of update phases within each frame. Consistent ordering ensures deterministic behavior and prevents race conditions between systems.

## Boundaries

**In Scope:**
- Phase ordering within a frame
- System execution order within phases
- Sync point placement
- External event flush timing

**Out of Scope:**
- Individual system implementation details
- Specific update logic
- Performance optimization strategies

## Responsibilities

- Define canonical phase order
- Specify sync point locations
- Document external event flush rules
- Establish system dependencies within phases

## Canonical Phase Order

Each frame executes phases in this exact order:

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRAME START                              │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  PHASE 1: Input Processing                                       │
│  ─────────────────────────────────────────────────────────────  │
│  • Capture user input events                                     │
│  • Process UI interactions                                       │
│  • Queue input commands                                          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  PHASE 2: Fixed-Step Simulation (may repeat)                     │
│  ─────────────────────────────────────────────────────────────  │
│  │                                                               │
│  │  ┌─────────────────────────────────────────────────────────┐ │
│  │  │  2.1 Physics Update                                      │ │
│  │  │  • Step physics simulation                               │ │
│  │  │  • Process collisions                                    │ │
│  │  │  • Update body positions                                 │ │
│  │  │  ──────────────────────────────────────────────────────  │ │
│  │  │  [ECS SYNC POINT]                                        │ │
│  │  └─────────────────────────────────────────────────────────┘ │
│  │                          │                                    │
│  │                          ▼                                    │
│  │  ┌─────────────────────────────────────────────────────────┐ │
│  │  │  2.2 Agent Behavior Update                               │ │
│  │  │  • Update state machines                                 │ │
│  │  │  • Calculate steering forces                             │ │
│  │  │  • Process group behaviors                               │ │
│  │  │  ──────────────────────────────────────────────────────  │ │
│  │  │  [ECS SYNC POINT]                                        │ │
│  │  └─────────────────────────────────────────────────────────┘ │
│  │                          │                                    │
│  │                          ▼                                    │
│  │  ┌─────────────────────────────────────────────────────────┐ │
│  │  │  2.3 Environment Update                                  │ │
│  │  │  • Advance day/night cycle                               │ │
│  │  │  • Update water simulation                               │ │
│  │  │  • Update cloud system                                   │ │
│  │  │  ──────────────────────────────────────────────────────  │ │
│  │  │  [ECS SYNC POINT]                                        │ │
│  │  └─────────────────────────────────────────────────────────┘ │
│  │                          │                                    │
│  │                          ▼                                    │
│  │  ┌─────────────────────────────────────────────────────────┐ │
│  │  │  2.4 External Event Flush                                │ │
│  │  │  • Process physics collision callbacks                   │ │
│  │  │  • Process trigger enter/exit events                     │ │
│  │  │  • Dispatch buffered external events                     │ │
│  │  └─────────────────────────────────────────────────────────┘ │
│  │                                                               │
│  └───────────────────────────────────────────────────────────────│
│      ↑                                                           │
│      └── Repeat if accumulator >= fixedTimestep                  │
│          (up to maxSubsteps times)                               │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  PHASE 3: Variable-Step Update                                   │
│  ─────────────────────────────────────────────────────────────  │
│  • Update animations (with interpolation)                        │
│  • Update LOD levels based on camera distance                    │
│  • Update performance monitoring                                 │
│  • Process quality scaling                                       │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  PHASE 4: Render                                                 │
│  ─────────────────────────────────────────────────────────────  │
│  • Perform frustum culling                                       │
│  • Submit draw calls                                             │
│  • Render UI overlay                                             │
│  • Present frame                                                 │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                          FRAME END                               │
└─────────────────────────────────────────────────────────────────┘
```

## Phase Details

### Phase 1: Input Processing

**Timing**: Once per frame, before simulation

**Purpose**: Capture and queue all input for the frame

**Systems**:
| System | Order | Responsibility |
|--------|-------|----------------|
| Input System | 1 | Capture keyboard, mouse, touch events |
| UI System | 2 | Process UI interactions, consume handled input |
| Command System | 3 | Convert input to simulation commands |

**Rules**:
- Input MUST be captured before any simulation updates
- UI MUST have first opportunity to consume input
- Unconsumed input MUST be available to simulation

### Phase 2: Fixed-Step Simulation

**Timing**: Zero or more times per frame (based on accumulator)

**Purpose**: Deterministic simulation updates

#### 2.1 Physics Update

**Systems**:
| System | Order | Responsibility |
|--------|-------|----------------|
| Physics System | 1 | Step physics world, detect collisions |
| Trigger System | 2 | Process trigger volumes |
| Buoyancy System | 3 | Apply water forces |

**Sync Point**: After physics update, apply queued ECS changes

#### 2.2 Agent Behavior Update

**Systems**:
| System | Order | Responsibility |
|--------|-------|----------------|
| Perception System | 1 | Update agent awareness |
| State Machine System | 2 | Evaluate transitions, update states |
| Steering System | 3 | Calculate movement forces |
| Group Behavior System | 4 | Apply flocking/herding forces |

**Sync Point**: After agent update, apply queued ECS changes

#### 2.3 Environment Update

**Systems**:
| System | Order | Responsibility |
|--------|-------|----------------|
| Time System | 1 | Advance game time |
| Weather System | 2 | Update weather state |
| Water System | 3 | Update wave simulation |
| Cloud System | 4 | Update cloud positions |

**Sync Point**: After environment update, apply queued ECS changes

#### 2.4 External Event Flush

**Purpose**: Process events from external backends

**Events Processed**:
- Physics collision callbacks (onCollisionEnter, onCollisionExit)
- Trigger callbacks (onTriggerEnter, onTriggerExit)
- Asset load completions
- Network messages (if applicable)

**Rules**:
- External events MUST be buffered until flush
- Flush MUST occur after all fixed-step systems complete
- Events MUST be processed in arrival order

### Phase 3: Variable-Step Update

**Timing**: Once per frame, after all fixed-step iterations

**Purpose**: Frame-rate dependent updates

**Systems**:
| System | Order | Responsibility |
|--------|-------|----------------|
| Animation System | 1 | Update skeletal animations with interpolation |
| LOD System | 2 | Update level-of-detail based on camera |
| Particle System | 3 | Update particle effects |
| Performance System | 4 | Monitor metrics, adjust quality |

**Rules**:
- Variable-step systems receive actual delta time
- Interpolation factor MUST be available for smoothing
- No ECS sync points in variable-step phase

### Phase 4: Render

**Timing**: Once per frame, after all updates

**Purpose**: Visual output

**Systems**:
| System | Order | Responsibility |
|--------|-------|----------------|
| Culling System | 1 | Determine visible objects |
| Render System | 2 | Submit draw calls |
| UI Render System | 3 | Render UI overlay |
| Debug Render System | 4 | Render debug visualizations |

**Rules**:
- Render MUST occur after all updates complete
- Render MUST use interpolated positions for smoothness
- UI MUST render on top of 3D scene

## ECS Sync Points

Sync points apply queued structural changes to the ECS world:

```
System Update Flow:
┌─────────────────────────────────────────────────────────────────┐
│  System.update()                                                 │
│  │                                                               │
│  │  Query entities → stable snapshot                            │
│  │  │                                                            │
│  │  │  Process entity 1                                         │
│  │  │  │  Queue: createEntity(...)                              │
│  │  │  │  Queue: addComponent(...)                              │
│  │  │                                                            │
│  │  │  Process entity 2                                         │
│  │  │  │  Queue: destroyEntity(...)                             │
│  │  │                                                            │
│  │  │  Process entity N                                         │
│  │  │                                                            │
│  │  └─ Iteration complete                                       │
│  │                                                               │
│  └─ System update complete                                      │
│                                                                  │
│  [SYNC POINT]                                                    │
│  │                                                               │
│  │  Apply queued changes:                                       │
│  │  • Create new entities                                       │
│  │  • Destroy marked entities                                   │
│  │  • Add/remove components                                     │
│  │                                                               │
│  └─ World state updated                                         │
│                                                                  │
│  Next system sees updated state                                  │
└─────────────────────────────────────────────────────────────────┘
```

## External Event Flush Rules

External backends (physics, rendering) generate events asynchronously. These events are buffered and processed at defined points.

### Physics Events

```
Physics Backend:
  Collision detected → buffer event
  Trigger entered → buffer event
  Trigger exited → buffer event

External Event Flush:
  Process all buffered physics events
  Emit to Event Bus
  Clear buffer
```

### Event Processing Order

Within the external event flush:

1. Collision events (in detection order)
2. Trigger enter events (in detection order)
3. Trigger exit events (in detection order)
4. Other external events (in arrival order)

### Buffering Rules

- Events MUST be buffered, not processed immediately
- Buffer MUST preserve event order
- Buffer MUST be cleared after flush
- Events from previous frames MUST NOT carry over

## Semantics (Normative Guarantees)

### Phase Order Guarantees

- Fixed-step simulation MUST complete all substeps before variable-step update begins
- Render MUST occur after all updates complete
- Input processing MUST occur before simulation

### Sync Point Guarantees

- ECS sync points MUST occur at the end of each system update
- Sync points MUST NOT occur at the start of a frame
- Queries after a sync point MUST reflect all queued changes

### External Event Guarantees

- External events MUST be buffered until their designated flush point
- The Event Bus is immediate (synchronous, depth-first)
- External event flush is for events from external backends only

### System Order Guarantees

- Systems within the same phase MAY execute in any order unless explicit dependencies are declared
- Declared dependencies MUST be respected
- Circular dependencies between systems MUST be detected and reported as errors

## Observability

### Metrics to Track

| Metric | Description | Alert Threshold |
|--------|-------------|-----------------|
| Phase duration | Time per phase | Varies by phase |
| Sync point duration | Time to apply changes | > 2ms |
| External event count | Buffered events per flush | > 100 |
| System update time | Time per system | > 5ms |

### Events to Log

| Event | Level | Data |
|-------|-------|------|
| Phase started | Trace | phaseName |
| Phase completed | Trace | phaseName, duration |
| Sync point applied | Trace | changeCount, duration |
| External flush | Trace | eventCount |
| System dependency violation | Error | systemA, systemB |

## Cross-References

- #[[file:docs/Code_Tech_Docs/core-systems/ecs-pattern.md]]
- #[[file:docs/Code_Tech_Docs/core-systems/event-system.md]]
- #[[file:docs/Code_Tech_Docs/core-systems/game-loop.md]]
- #[[file:docs/Code_Tech_Docs/architecture-overview.md]]
