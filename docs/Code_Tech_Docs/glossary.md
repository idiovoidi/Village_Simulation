# Glossary

This document defines canonical terminology used throughout the simulation documentation. All documents MUST use these terms consistently and MUST NOT introduce synonyms.

## Documentation Terms

| Term | Definition |
|------|------------|
| **Documentation_Set** | The complete collection of Art, Design, and Tech documentation |
| **Tech_Docs** | Technical documentation describing architecture, patterns, and system specifications |
| **Design_Docs** | Design documentation describing gameplay mechanics, behaviors, and rules |
| **Art_Docs** | Art documentation describing visual style, assets, and aesthetic guidelines |
| **ADR** | Architecture Decision Record documenting rationale for key technical choices |
| **Livelink** | Cross-reference format `#[[file:path/to/doc.md]]` connecting related documents |
| **Correctness_Property** | A formal statement about system behavior that must hold true |
| **State_Model** | Documentation of an entity's states, transitions, and triggers |

## Architecture Terms

| Term | Definition |
|------|------------|
| **ECS** | Entity-Component-System pattern for composing game objects from reusable data and behavior |
| **Entity** | A unique identifier with no inherent data, serving as a container for components |
| **Component** | Pure data attached to exactly one entity |
| **System** | Logic that processes entities matching specific component requirements |
| **Event_Bus** | Communication mechanism that decouples systems through event emission and subscription |
| **Game_Loop** | Coordination mechanism for simulation updates and rendering |
| **Fixed_Timestep** | Physics update interval that remains constant regardless of frame rate |
| **Sync_Point** | Point in the update cycle where queued structural changes are applied |
| **Command_Buffer** | Queue for structural changes (entity creation/destruction, component add/remove) applied at sync points |

## Agent Terms

| Term | Definition |
|------|------------|
| **Agent** | An autonomous entity with AI-driven behavior in the simulation |
| **Model_Layer** | Agent layer responsible for visual representation (mesh, materials, animations) |
| **Behavior_Layer** | Agent layer responsible for decision making (state machine, perception, group behavior) |
| **Agent_Layer** | Agent layer responsible for instance management (identity, data, lifecycle coordination) |
| **State_Machine** | Pattern for modeling agent behaviors as discrete states with transitions |
| **Group_Behavior** | Coordinated movement patterns (flocking, shoaling, herding) using cohesion, separation, and alignment forces |
| **Cohesion_Force** | Steering force directing an agent toward the center of its group |
| **Separation_Force** | Steering force directing an agent away from nearby neighbors to prevent crowding |
| **Alignment_Force** | Steering force directing an agent to match the heading of its group |
| **Perception_Radius** | Distance within which an agent can detect neighbors for group behavior calculations |


## Agent Type Terms

| Term | Definition |
|------|------------|
| **Villager** | Ground-based NPC agent with social network, schedule-driven behavior, and threat response |
| **Zombie** | Ground-based antagonist agent with awareness, pursuit, and lurge mechanics |
| **Fish** | Water volume agent with shoaling behavior and water volume constraints |
| **Bird** | Air volume agent with flocking behavior and altitude bounds |
| **Dog** | Ground-based agent with territory rules and alert states |
| **Boat** | Water surface agent with navigation and docking rules |

## Environment Terms

| Term | Definition |
|------|------------|
| **Day_Night_Cycle** | System managing time progression, lighting changes, and agent behavior effects |
| **Procedural_Generation** | System for creating village layouts, roads, and terrain based on seed values |
| **Water_Simulation** | System managing wave behavior, navigation constraints, and buoyancy |
| **Cloud_System** | System managing cloud formation and visual parameters |
| **Terrain** | Ground surface with height queries and bounds validation |

## Level Terms

| Term | Definition |
|------|------------|
| **Level** | A configured simulation scenario with specific systems and agent populations |
| **Level_Configuration** | Schema defining active systems, agent populations, and parameters for a level |
| **Level_Lifecycle** | Sequence of load, run, unload, and transition phases for level management |
| **Level_Type** | Category of level (Village, Rural, Coastal, Wilderness) with predefined characteristics |

## Rendering Terms

| Term | Definition |
|------|------------|
| **Render_System** | System responsible for visual output via rendering backend |
| **LOD** | Level of Detail - technique for reducing visual complexity based on distance |
| **Mesh_Instancing** | Technique for efficiently rendering multiple copies of the same mesh |
| **Shadow_Mapping** | Technique for rendering shadows using depth buffers |
| **PBR** | Physically Based Rendering - material system based on physical light interaction |
| **Frustum_Culling** | Optimization that excludes objects outside the camera view from rendering |

## Physics Terms

| Term | Definition |
|------|------------|
| **Physics_System** | System responsible for physical simulation via physics backend |
| **Static_Body** | Physics body that does not move and is not affected by forces |
| **Dynamic_Body** | Physics body that moves and responds to forces and collisions |
| **Kinematic_Body** | Physics body that moves via direct position control, not forces |
| **Collision_Group** | Category for filtering which physics bodies can interact |
| **Trigger_Volume** | Physics body that detects overlaps without physical response |
| **Buoyancy** | Physics simulation of floating behavior in water |
| **Body_Pool** | Object pool for reusing physics bodies to reduce allocation overhead |

## Performance Terms

| Term | Definition |
|------|------------|
| **Spatial_Partitioning** | Data structure for efficient queries of nearby entities |
| **Quality_Scaling** | System for adjusting visual quality based on frame rate |
| **Behavior_Throttling** | Technique for reducing update frequency of distant agents |
| **Memory_Monitoring** | System for tracking memory usage and triggering cleanup |

## Error Handling Terms

| Term | Definition |
|------|------------|
| **Error_Category** | Classification of errors (physics, render, agent, level, system) |
| **Error_Severity** | Level of error impact (critical, error, warning, info) |
| **Recovery_Strategy** | Approach for handling errors (halt, recover, continue, log) |

## Testing Terms

| Term | Definition |
|------|------------|
| **Unit_Test** | Test verifying individual functions or classes in isolation |
| **Integration_Test** | Test verifying interactions between multiple systems |
| **Property_Test** | Test verifying invariants across randomized inputs |
| **Smoke_Test** | Test verifying basic boot and initialization functionality |
| **Quality_Gate** | Automated check that must pass before code is accepted |

## RFC 2119 Keywords

The following keywords are used in normative statements per RFC 2119:

| Keyword | Meaning |
|---------|---------|
| **MUST** | Absolute requirement |
| **MUST NOT** | Absolute prohibition |
| **SHALL** | Equivalent to MUST |
| **SHALL NOT** | Equivalent to MUST NOT |
| **SHOULD** | Recommended but not required |
| **SHOULD NOT** | Not recommended but not prohibited |
| **MAY** | Optional |
| **REQUIRED** | Equivalent to MUST |
| **RECOMMENDED** | Equivalent to SHOULD |
| **OPTIONAL** | Equivalent to MAY |

Note: Only uppercase RFC 2119 keywords are normative. Lowercase uses (e.g., "should", "may") are informative.

## Cross-References

- #[[file:docs/Code_Tech_Docs/architecture-overview.md]]
- #[[file:docs/Code_Tech_Docs/correctness-properties.md]]
- #[[file:docs/Code_Tech_Docs/adrs/README.md]]
