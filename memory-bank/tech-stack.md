# Technology Stack

This document outlines the core technologies used in the 3D Village Simulation project.

## Core Engine & Physics

*   **3D Engine:** [Babylon.js](https://www.babylonjs.com/) (Version specified in `docs/README.md` - currently v7.47.2)
    *   Handles rendering (WebGL/WebGPU), scene graph management, materials, lighting, and core interactions.
*   **Physics Engine:** [Havok Physics](https://www.havok.com/) (Version specified in `docs/README.md` - currently v1.3.10)
    *   Provides realistic physics simulation for object interactions, collisions, and environmental effects like buoyancy.
    *   Integrated with Babylon.js via its plugin system.

## Frontend & Language

*   **Language:** Assumed TypeScript/JavaScript (Confirm and specify if necessary)
    *   TypeScript is recommended for large projects due to static typing.
*   **User Interface (UI):** [Babylon.js GUI](https://doc.babylonjs.com/features/featuresDeepDive/gui/)
    *   Used for in-simulation UI elements (menus, HUDs, etc.) rendered within the 3D canvas.

## Development & Build

*   **Package Management:** [pnpm](https://pnpm.io/)
    *   Used for managing project dependencies efficiently.
*   **Development Server:** Standard static file server (User choice, e.g., `http-server`, `live-server`).

## Target Platform

*   **Primary:** Modern Web Browsers supporting WebGL and/or WebGPU. 