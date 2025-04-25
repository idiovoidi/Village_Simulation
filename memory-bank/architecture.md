# System Architecture

## Overview

The 3D Village Simulation employs a **modular, component-based architecture**. The goal is to achieve a clear separation of concerns, making the system easier to understand, maintain, and extend.

Key systems are designed as largely independent modules that interact through well-defined interfaces or events.

## Core Architectural Principles

*   **Modularity:** Functionality is broken down into distinct systems (Environment, AI, Level Management, etc.).
*   **Component-Based:** Systems themselves may be composed of smaller, reusable components (e.g., specific AI behaviors, individual environmental effects).
*   **Separation of Concerns:** Different aspects of the simulation (e.g., rendering, physics, AI logic, state management) are handled by dedicated systems.
*   **Data-Driven Configuration:** The Level System (`docs/LEVEL_SYSTEM.md`) allows simulation scenarios to be defined primarily through configuration data, activating/deactivating and parameterizing systems.

## Major System Categories

*(Refer to specific `docs/*.md` files for detailed implementation notes)*

1.  **Core Infrastructure:**
    *   **Rendering Engine:** Babylon.js (Handles scene graph, rendering, materials, lighting).
    *   **Physics Engine:** Havok Physics (Handles collisions, forces, constraints).
    *   **Main Loop/Entry Point:** Orchestrates updates and system initialization.

2.  **Environmental Systems (`docs/ENVIRONMENTAL_SYSTEMS.md`):**
    *   Simulate the natural and built world.
    *   Examples: `WaterSimulation`, `CloudSystem`, `VillageSystem`, `RoadSystem`, `HouseSystem`, `WorldClock`.

3.  **AI Agent Systems (`docs/AI_SYSTEMS.md`):**
    *   Manage intelligent entities within the simulation.
    *   Implement behaviors using State Machines and environmental awareness.
    *   Examples: `FishBehaviour`, `BirdBehaviour`, `DogBehaviour`, `ZombieBehaviour`, `BoatAgent`.
    *   Managed via an `AgentSystem` for initialization and disposal.

4.  **Management Systems:**
    *   **Level System (`docs/LEVEL_SYSTEM.md`):** Manages loading, configuration, and transitions between different simulation setups (`LevelConfig`, `LevelSelector`).
    *   **UI System (`MyHavokSimCode/UI/` - path from README):** Handles user interface elements via Babylon.js GUI.

## Data Flow (High Level)

1.  **Initialization:** `LevelSelector` loads a `LevelConfig`.
2.  **System Activation:** Based on the config, relevant Environmental and AI systems are initialized.
3.  **Update Loop:**
    *   Core engine updates (rendering, physics ticks).
    *   Management systems update (e.g., `WorldClock` advances time).
    *   Environmental systems update state (e.g., water physics, cloud movement).
    *   AI Agent systems update behaviors based on internal state and environmental queries.
4.  **Cleanup:** When changing levels or exiting, systems are disposed of to release resources.

## Database Schema

*(Placeholder - Add details here if/when a database is integrated for persistence)*

Currently, the simulation appears to be session-based without persistent storage. 