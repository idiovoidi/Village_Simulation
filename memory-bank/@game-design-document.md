# Game Design Document: 3D Village Simulation

## 1. Overview & Vision

**Project Title:** 3D Village Simulation (Working Title)

**Vision:** To create a dynamic and immersive 3D village simulation showcasing intelligent agent behaviors, rich environmental interactions, and flexible level configurations, powered by Babylon.js and Havok Physics. The simulation aims to model various interconnected systems found in a virtual world.

**Target Platform:** Web Browsers supporting WebGL/WebGPU.

**Core Experience:** Observe and potentially interact with a living, breathing world where different AI agents exhibit distinct behaviors within a procedurally influenced environment featuring dynamic time and weather.

## 2. Key Features

*   **Intelligent AI Agents:** Multiple distinct agent types (Fish, Birds, Dogs, Zombies, Boats) with unique behaviors, navigation (ground, air, water), and interaction logic.
*   **Dynamic Environmental Systems:** Simulated water with physics, dynamic cloud formations, procedural village/road generation, and a world clock driving a day/night cycle.
*   **Interactive Physics:** Leveraging Havok Physics for realistic object interactions and environmental effects (e.g., buoyancy).
*   **Configurable Levels:** A flexible level system allowing different combinations of agents, environments, and simulation parameters.
*   **Performance Optimization:** Built-in considerations for LOD, instancing, and physics optimization to ensure smooth performance.

## 3. Gameplay Loop (Observation Focus)

The primary interaction model appears to be observation-focused:

1.  **Select/Load Level:** Choose a pre-defined level configuration (e.g., Village, Coastal, Wilderness).
2.  **Initialize Simulation:** The environment, agents, and systems corresponding to the level are loaded and initialized.
3.  **Observe:** Watch the simulation unfold. Observe agent behaviors (flocking birds, pathfinding dogs, swimming fish), environmental changes (day/night cycle, weather shifts), and physics interactions.
4.  **(Potential Interaction):** (Future Scope) Allow user interaction to influence the environment or agents.
5.  **Change Level/Exit:** Load a different configuration or end the simulation.

## 4. Core Systems (Summary)

*(Details can be found in the respective `docs/` files)*

### 4.1. Environmental Systems (`docs/ENVIRONMENTAL_SYSTEMS.md`)
*   **Water Simulation:** Dynamic physics, waves, buoyancy, reflections/refractions.
*   **Cloud System:** Dynamic formation, weather patterns, shadows, lighting interaction.
*   **Village System:** Procedural placement, road network integration, NPC pathing support, LOD.
*   **Road System:** Network generation, path optimization, navigation mesh generation.
*   **House System:** Building variety, interior/exterior, resource allocation link.
*   **World Clock:** Day/night cycle, time scaling, event scheduling, weather/lighting integration.

### 4.2. AI Agent Systems (`docs/AI_SYSTEMS.md`)
*   **Core Principles:** State Management (FSM), Environmental Awareness (collision, terrain, time), Performance Optimization (LOD, throttling), Interaction Systems.
*   **Agent Types:**
    *   `FishBehaviour`: Underwater movement, shoaling.
    *   `BirdBehaviour`: Flight patterns, flocking, height navigation.
    *   `DogBehaviour`: Ground pathfinding, NPC interaction, territory.
    *   `ZombieBehaviour`: Advanced pathfinding, target acquisition, group behavior, day/night response.
    *   `BoatAgent`: Water physics interaction, navigation, docking.

### 4.3. Level System (`docs/LEVEL_SYSTEM.md`)
*   **Level Configuration:** Defines active systems, population counts, environmental settings, performance flags per level.
*   **Level Management:** Handles loading, unloading, and transitioning between different simulation scenarios (Village, Rural, Coastal, Wilderness, etc.).

## 5. Technical Summary

*   **Engine:** Babylon.js
*   **Physics:** Havok Physics
*   **UI:** Babylon.js GUI
*   **Language:** (Assumed) TypeScript/JavaScript
*   **Package Management:** pnpm

## 6. Future Scope / Potential Enhancements

*(Placeholder section - to be filled as project evolves)*
*   Direct User Interaction/Control
*   More Complex Agent Goals/Needs
*   Resource Management Mechanics
*   Advanced Weather Effects (Rain, Snow)
*   Persistent World State
*   Multiplayer Functionality 