# Zombie AI Agent - Design & Implementation Plan

This document outlines the design considerations and implementation strategy for the `Zombie` AI agent within the 3D Village Simulation.

## 1. Overview

Zombies are hostile agents intended to add an element of threat or challenge to the simulation, particularly interacting with `Villager` agents if implemented. They exhibit predatory behaviors like hunting targets, group coordination (swarming), and potentially reacting differently based on the time of day (e.g., more active at night).

## 2. Core Mechanics

### 2.1. Target Acquisition
*   Zombies will actively scan their surroundings for potential targets (initially `Villager` agents, potentially others later).
*   Detection range and field of view will be configurable.
*   Line-of-sight checks might be necessary to prevent seeing through walls.

### 2.2. Pathfinding & Pursuit
*   Utilize advanced pathfinding (potentially A* or similar on a navigation mesh) to navigate the environment towards a target.
*   Capable of navigating complex terrain, potentially including simple obstacle overcoming (e.g., climbing small ledges if models support it).
*   Pursuit logic: Maintain pursuit as long as the target is detectable or within a certain range/time after losing sight.

### 2.3. Attack Behavior
*   When within range of a target, transition to an attack state.
*   Attack animation played.
*   (If combat system is implemented) Apply damage or trigger a state change in the target agent.

### 2.4. Group Behavior (Swarming)
*   Zombies can be aware of nearby zombies.
*   **Alerting:** If one zombie detects a target, nearby zombies might also become alerted and converge on the target.
*   **Coordination:** Simple swarming behavior where zombies attempt to surround or approach a target from multiple angles, rather than forming a single-file line.

### 2.5. Day/Night Cycle Response
*   Behavior can change based on the `WorldClock`.
*   **Night:** Potentially increased movement speed, detection range, or aggression.
*   **Day:** Potentially slower movement, reduced activity, or seeking shaded/dark areas (if environment supports this).

### 2.6. Idle/Wandering Behavior
*   When no target is present, zombies will wander the environment, potentially favoring certain areas or pathing less predictably than villagers.

## 3. Implementation Plan

Following the established agent architecture:

### 3.1. `ZombieModel` Component
*   **Responsibilities:** Handles the 3D mesh, materials, and animations for the zombie.
*   **Assets:** Requires zombie 3D model(s) and animations (Idle, Wander/Walk, Run/Pursue, Attack, Alerted/Detect, potentially Day/Night variants).
*   **LOD:** Implement Level of Detail.

### 3.2. `ZombieBehaviour` Component
*   **Responsibilities:** Manages the Finite State Machine (FSM) defining the zombie's actions and transitions.
*   **States:**
    *   `IDLE`: Default state when inactive.
    *   `WANDERING`: Moving aimlessly when no target is detected.
    *   `SCANNING`: Actively looking for targets.
    *   `PURSUING`: Pathfinding towards a detected target.
    *   `ATTACKING`: Performing attack animation/logic when in range.
    *   `ALERTED`: Responding to nearby zombie signals or investigating disturbances.
    *   `(Optional) HIDING/INACTIVE`: State during unfavorable conditions (e.g., daytime).
*   **Dependencies:** `WorldClock`, Navigation System, other Agent Systems (for target detection/interaction), potentially an `AlertSystem` for group communication.

### 3.3. `ZombieAgent` Component
*   **Responsibilities:** Represents an individual zombie instance. Holds its unique state:
    *   Current `ZombieBehaviour` state.
    *   Current target agent (if any).
    *   Last known target position.
    *   Internal timers (e.g., time since last seeing target).
    *   Health/status (if combat/damage is implemented).
*   **Interaction:** Receives updates, performs environment/target queries, updates its `ZombieBehaviour` state.

### 3.4. Integration with `AgentSystem` & `LevelSystem`
*   The `AgentSystem` handles spawning, management, and disposal.
*   The `LevelSystem` (`LevelConfig`) defines:
    *   Number of zombies.
    *   Spawn zones or rules.
    *   Behavioral parameters (detection range, speed, aggression levels, day/night modifiers).
    *   Targetable agent types for this level.

### 3.5. Error Handling & Decorators
*   Apply `@ErrorDecorator` and `@Measure` to `ZombieBehaviour` methods.

## 4. Data Structures
*   Session-based; no database schema needed initially.
*   Agent state stored in `ZombieAgent` instances.
*   Level configuration defines population and behavior parameters.

## 5. Milestones
1.  **Basic Model & Idle/Wander:** Integrate model, implement basic components (`ZombieModel`, `ZombieBehaviour`, `ZombieAgent`) with `IDLE` and `WANDERING` states.
2.  **Target Detection & Pursuit:** Implement `SCANNING` state, target detection logic (simple sphere cast/distance check initially), and `PURSUING` state using pathfinding.
3.  **Attack:** Implement `ATTACKING` state and basic attack animation/range check.
4.  **Day/Night Response:** Integrate with `WorldClock` to modify behavior (e.g., speed, state transitions) based on time.
5.  **Group Behavior (Alerting):** Implement basic alert propagation between nearby zombies.
6.  **(Future)** Advanced swarming tactics, interaction with environment (breaking doors?), more complex target prioritization.

## 6. Open Questions / Considerations
*   Source of zombie models and animations.
*   Complexity of pathfinding required (simple navmesh vs. more advanced A*).
*   Mechanism for group communication/alerting (direct checks vs. event system).
*   Performance impact of many zombies actively scanning and pathfinding.
*   Exact nature of the "attack" (visual only vs. affecting target state).
