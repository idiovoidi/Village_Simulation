# 3D Village Simulation with Havok Physics

A dynamic 3D village simulation built with Babylon.js and Havok Physics, featuring intelligent agents, environmental systems, and interactive elements.

## Project Overview

This simulation creates an immersive 3D village environment with multiple integrated systems:

- **Village System**: Roads, buildings, and urban layout
- **Environmental Systems**: Water simulation, cloud systems
- **AI Agents**: 
  - Fish with underwater behavior
  - Birds with flight patterns
  - Dogs with ground navigation
  - Zombies with pathfinding
  - Boats with water navigation
- **Time System**: Dynamic day/night cycle
- **Physics**: Havok-powered physics interactions

## Technical Stack

- **Engine**: Babylon.js v7.47.2
- **Physics**: Havok Physics v1.3.10
- **UI**: Babylon.js GUI
- **Package Management**: pnpm

## Getting Started

1. Install dependencies:
```bash
pnpm install
```

2. Run the development server:
```bash
# Your preferred static server
```

3. Open `index.html` in your browser

## Project Structure

```
├── MyHavokSimCode/       # Main simulation code
│   ├── Agents/          # AI agent behaviors
│   ├── LevelSystem/     # Level configuration
│   └── UI/             # User interface components
├── assets/              # Project assets
├── docs/               # Documentation
└── index.html          # Entry point
```

## System Architecture

The project follows a modular, component-based architecture with clear separation of concerns:

1. **Core Systems**: Base simulation systems (physics, rendering)
2. **Environmental Systems**: Natural environment simulations
3. **Agent Systems**: AI-driven entity behaviors
4. **Management Systems**: Level and time management

## Performance Optimization

The simulation includes several performance optimization features:
- Hardware scaling
- Mesh optimization
- Performance monitoring
- Draw call optimization
- Physics optimization 