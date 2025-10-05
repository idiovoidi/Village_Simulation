---
inclusion: always
---

# Project Structure

## Directory Organization

```
├── MyHavokSimCode/              # Main simulation codebase
│   ├── Agents/                  # AI agent implementations
│   │   ├── Birds/              # Bird flocking behavior
│   │   ├── Boats/              # Water navigation agents
│   │   ├── Dogs/               # Ground pathfinding agents
│   │   ├── Fish/               # Underwater swimming behavior
│   │   ├── Villagers/          # NPC villager agents
│   │   └── Zombies/            # Advanced pathfinding enemies
│   ├── core/                    # Core infrastructure
│   │   ├── ErrorHandling.js    # Decorator-based error handling
│   │   └── SimulationSetup.js  # Simulation initialization
│   ├── Effects/                 # Visual effects systems
│   ├── Environment/             # Environmental systems
│   ├── LevelSystem/             # Level configuration and management
│   │   ├── LevelConfig.js      # Level definitions
│   │   └── LevelSelector.js    # Level loading logic
│   ├── Navigation/              # Pathfinding and navigation
│   ├── Performance/             # Performance monitoring
│   ├── systems/                 # Core simulation systems
│   ├── UI/                      # User interface components
│   │   └── WorldClock.js       # Day/night cycle UI
│   ├── Utilities/               # Helper utilities
│   ├── Village/                 # Village generation systems
│   ├── BehavioralSim.js        # Behavioral simulation manager
│   ├── BowlCreator.js          # Terrain generation
│   ├── CloudSystem.js          # Cloud simulation
│   ├── HouseSystem.js          # Building placement
│   ├── NewVillageEngine.js     # Main engine entry point
│   ├── RoadSystem.js           # Road network generation
│   ├── VillageSystem.js        # Village management
│   ├── VortexBall.js           # Physics demo object
│   └── WaterSimulation.js      # Water physics
├── assets/                      # Project assets
│   ├── AssetManager.js         # Asset loading management
│   ├── HD_Textures/            # High-resolution textures
│   ├── textures/               # Standard textures
│   └── test/                   # Test assets
├── coverage/                    # Test coverage reports
├── docs/                        # Documentation
│   ├── AI_SYSTEMS.md           # AI agent documentation
│   ├── ENVIRONMENTAL_SYSTEMS.md # Environment system docs
│   ├── LEVEL_SYSTEM.md         # Level system documentation
│   └── README.md               # Project overview
├── memory-bank/                 # Design documents
│   ├── @architecture.md        # Architecture overview
│   ├── @game-design-document.md # Game design doc
│   ├── @implementation-plan.md  # Implementation roadmap
│   ├── @progress.md            # Development progress
│   └── @tech-stack.md          # Technology decisions
├── index.html                   # Application entry point
├── server.js                    # Fastify development server
└── package.json                 # Dependencies and scripts
```

## Architecture Patterns

### Component-Based Agent Architecture
Agents follow a three-layer composition pattern:
1. **Model Component**: Handles 3D mesh, animation, and visual representation
2. **Behavior Component**: Manages state machines, group behaviors, and coordination
3. **Agent Component**: Individual instances with unique state and decision-making

### System Configuration
Systems are initialized based on level configuration using a declarative approach defined in `SYSTEM_CONFIGS` (see `Havokimport.js`). Systems are conditionally loaded based on level requirements.

### Error Handling
Uses decorator pattern for error recovery and performance measurement. Decorators are applied programmatically for JavaScript compatibility (see `core/ErrorHandling.js`).

## Key Entry Points

- **Main Entry**: `index.html` → `MyHavokSimCode/Havokimport.js` → `LeoScene` class
- **Engine Core**: `NewVillageEngine.js` → `VillageEngine` class
- **Level Loading**: `LevelSystem/LevelSelector.js` → `loadLevel()` method

## Naming Conventions

- Classes use PascalCase (e.g., `VillageEngine`, `FishBehaviour`)
- Files match class names (e.g., `VillageEngine` in `NewVillageEngine.js`)
- System instances use camelCase (e.g., `waterSim`, `fishSystem`)
- Agent behaviors end with "Behaviour" suffix
- System classes end with "System" suffix
