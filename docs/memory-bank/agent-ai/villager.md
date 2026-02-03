# Villager AI Agent - Design & Implementation Plan

This document outlines the design considerations and implementation strategy for the `Villager` AI agent within the 3D Village Simulation.

## 1. Overview

Villagers are intended to be the primary humanoid inhabitants of the simulated villages. They should exhibit a range of believable daily-life behaviors, interact with the environment and potentially other agents, and respond to the dynamic world state (e.g., day/night cycle). They serve to make the village environments feel alive and purposeful.

## 2. Core Mechanics

### 2.1. Needs System (Potential Future Scope)
While not necessarily in the initial implementation, a simple needs system could drive more complex behavior:
*   **Energy/Stamina:** Decreases over time, replenished by resting (e.g., going home at night).
*   **Hunger:** (If resource/food system is implemented) Decreases over time, replenished by eating.
*   **Social:** (If complex interactions are desired) Influenced by interactions with other villagers.

### 2.2. Daily Schedule & Routine
*   Villagers will follow a basic schedule based on the `WorldClock`.
*   **Morning:** Wake up, leave house.
*   **Day:** Engage in activities (see below). Possible activities include:
    *   Walking/Wandering within village bounds (using `RoadSystem` for pathing).
    *   Gathering at designated "social" points (e.g., market square, well).
    *   Performing simple "work" tasks (e.g., tending to a designated plot, interacting with a specific building). This might be purely visual/animation-based initially.
*   **Evening:** Return home.
*   **Night:** Stay inside house.

### 2.3. Environmental Interaction
*   **Navigation:** Utilize the `RoadSystem` and potentially navigation meshes for pathfinding within the village. Avoid obstacles.
*   **Building Interaction:** Enter/Exit designated houses (their own or potentially others if visiting). Interact with specific points on buildings for tasks.
*   **Time/Weather Awareness:** Behavior changes based on time of day (schedule) and potentially extreme weather (seek shelter).

### 2.4. Social Interaction (Simple)
*   **Proximity:** Detect nearby villagers.
*   **Greeting:** Basic animation/acknowledgment when passing another villager closely.
*   **Gathering:** Tendency to move towards designated social hubs during certain times.

### 2.5. Agent Awareness (Future Scope)
*   Reacting to other agent types (e.g., fleeing from `ZombieBehaviour`, observing `DogBehaviour`).

## 3. Implementation Plan

Following the established agent architecture:

### 3.1. `VillagerModel` Component
*   **Responsibilities:** Handles the 3D mesh, materials, and animations for the villager.
*   **Assets:** Requires appropriate 3D model(s) and animations (Idle, Walk, Run (optional), Interact, Greet, Sit, Sleep). Could potentially use stock assets initially.
*   **LOD:** Implement Level of Detail for performance.

### 3.2. `VillagerBehaviour` Component
*   **Responsibilities:** Manages the Finite State Machine (FSM) defining the villager's actions and transitions based on the schedule, environment, and potential needs.
*   **States:**
    *   `IDLE`: Default state, short pauses between actions.
    *   `WANDERING`: Pathfinding along roads/within defined areas.
    *   `MOVING_TO_TARGET`: Pathfinding towards a specific destination (home, work spot, social hub).
    *   `PERFORMING_TASK`: Playing a task-specific animation at a location.
    *   `SOCIALIZING`: Paused near other villagers, potentially playing a greeting animation.
    *   `INSIDE_HOME`: Inactive state while inside their designated house (model likely hidden/disabled).
    *   `FLEEING`: (Future Scope) Moving away from perceived threats.
*   **Dependencies:** `WorldClock`, `RoadSystem`/Navigation, potentially other agent systems for awareness.

### 3.3. `VillagerAgent` Component
*   **Responsibilities:** Represents an individual villager instance. Holds its unique state:
    *   Current `VillagerBehaviour` state.
    *   Designated "home" building/location.
    *   Current target destination/interaction point.
    *   (Future) Needs levels (Energy, Hunger, etc.).
*   **Interaction:** Receives updates from the `AgentSystem`, queries the environment, and updates its `VillagerBehaviour` state.

### 3.4. Integration with `AgentSystem` & `LevelSystem`
*   The `AgentSystem` will be responsible for creating, managing, and disposing of `VillagerAgent` instances.
*   The `LevelSystem` (`LevelConfig`) will define:
    *   Number of villagers to spawn.
    *   Potential spawn locations (or link to `HouseSystem`).
    *   Designated social hubs or work areas within the level.

### 3.5. Error Handling & Decorators
*   Apply the existing error handling and performance measurement decorators (`@ErrorDecorator`, `@Measure`) to `VillagerBehaviour` methods as appropriate.

## 4. Data Structures
*   No specific database schema required initially due to the session-based nature.
*   Agent state (home location, current task) will be held in memory within the `VillagerAgent` instance.
*   Level configuration will define spawn parameters and points of interest.

## 5. Milestones
1.  **Basic Model & Idle State:** Integrate a placeholder villager model, implement the `VillagerModel`, `VillagerBehaviour`, and `VillagerAgent` components with a basic `IDLE` state. Spawnable via `AgentSystem`.
2.  **Navigation & Wandering:** Implement pathfinding using `RoadSystem`, enabling the `WANDERING` state.
3.  **Scheduling & Home:** Implement `WorldClock` integration, `MOVING_TO_TARGET` state for returning home, and `INSIDE_HOME` state. Define "home" locations.
4.  **Tasks & Social Hubs:** Implement `PERFORMING_TASK` state and designate locations/interactions for simple tasks and social gathering points.
5.  **Basic Social Interaction:** Implement proximity detection and simple greeting animations (`SOCIALIZING` state).
6.  **(Future)** Needs system, advanced agent interaction, weather reactions.


## 6. Open Questions / Considerations
*   Source of villager models and animations (custom vs. stock).
*   Complexity of "tasks" - initially visual/animation-based?
*   Level of detail needed for social interactions.
*   Performance implications of many villagers pathfinding simultaneously.
