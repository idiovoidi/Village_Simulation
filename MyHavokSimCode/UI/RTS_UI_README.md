# RTS Interface System

A classic RTS-styled UI with top/bottom bars and entity inspection, built following ECS principles and ESLint standards.

## Features

- **Top Bar**: Resources, time display, FPS counter
- **Bottom Bar**: Selected entity information with health bars
- **Inspector Panel**: Detailed entity inspection (right side)
- **Click-to-Select**: Click any entity mesh to inspect it
- **ECS Compatible**: Works with both ECS and traditional architectures

## Architecture

### Components

1. **RTSInterface** (`RTSInterface.ts`)
   - Core UI rendering and management
   - Handles all Babylon.js GUI elements
   - Pure presentation layer

2. **RTSInterfaceSystem** (`RTSInterfaceSystem.ts`)
   - ECS system that queries entity components
   - Updates UI based on component data
   - Follows ECS pattern strictly

3. **RTSIntegrationHelper** (`RTSIntegrationExample.ts`)
   - Helper for integrating with existing JavaScript code
   - Bridges non-ECS code to the UI system
   - Provides simple API for updates

## Quick Start

### Option 1: Simple Integration (Existing Codebase)

```typescript
import { RTSIntegrationHelper } from './UI/RTSIntegrationExample';

// In your scene setup
class MyScene {
  private rtsUI: RTSIntegrationHelper;
  
  async createScene() {
    // ... existing scene setup ...
    
    this.rtsUI = new RTSIntegrationHelper(this.scene);
    this.rtsUI.initialize();
    
    return this.scene;
  }
  
  render() {
    // Update UI each frame
    this.rtsUI.update();
    
    // Update resources
    this.rtsUI.updateResources(
      this.villagers.length,
      this.zombies.length,
      this.foodCount
    );
    
    // Update time
    if (this.dayNightCycle) {
      this.rtsUI.updateTimeFromCycle(this.dayNightCycle.timeOfDay);
    }
    
    this.scene.render();
  }
}
```

### Option 2: Full ECS Integration

```typescript
import { RTSInterfaceSystem } from './UI/RTSInterfaceSystem';

// In your ECS world setup
class World {
  private systems: System[] = [];
  
  initialize() {
    // Add RTS UI system
    const rtsSystem = new RTSInterfaceSystem(this.scene, this);
    rtsSystem.initialize();
    this.systems.push(rtsSystem);
  }
  
  update(deltaTime: number) {
    // Systems update automatically
    for (const system of this.systems) {
      system.update(deltaTime);
    }
  }
}
```

## Entity Metadata Setup

For entity inspection to work, meshes need metadata:

```typescript
// Add metadata to your entity meshes
villagerMesh.metadata = {
  entityId: 1,
  entityType: 'Villager',
  health: 100,
  maxHealth: 100,
  state: 'Idle',
};

// Update metadata when state changes
villagerMesh.metadata.state = 'Moving';
villagerMesh.metadata.health = 85;
```

## API Reference

### RTSInterface

```typescript
class RTSInterface {
  constructor(scene: Scene, config?: Partial<UIConfig>);
  
  initialize(): void;
  update(): void;
  
  selectEntity(entity: EntityData): void;
  clearSelection(): void;
  
  updateResources(resources: Record<string, number>): void;
  updateTime(hours: number, minutes: number): void;
  updateFPS(fps: number): void;
  
  dispose(): void;
}
```

### RTSIntegrationHelper

```typescript
class RTSIntegrationHelper {
  constructor(scene: Scene);
  
  initialize(): void;
  update(): void;
  
  updateEntityMetadata(meshName: string, updates: Partial<Record<string, unknown>>): void;
  updateResources(villagers: number, zombies: number, food: number): void;
  updateTimeFromCycle(timeOfDay: number): void;
  
  dispose(): void;
}
```

### RTSInterfaceSystem

```typescript
class RTSInterfaceSystem {
  readonly priority: number;
  readonly componentSignature: Set<string>;
  
  constructor(scene: Scene, world?: World);
  
  initialize(): void;
  update(deltaTime: number): void;
  
  selectEntity(entityId: number): void;
  clearSelection(): void;
  
  dispose(): void;
}
```

## Configuration

Customize the UI appearance:

```typescript
const rtsUI = new RTSInterface(scene, {
  topBarHeight: 80,
  bottomBarHeight: 250,
  inspectorWidth: 350,
  backgroundColor: '#2a2a2aee',
  textColor: '#ffffff',
  accentColor: '#00ff00',
});
```

## Integration with Existing Systems

### Day/Night Cycle

```typescript
// In your render loop
if (this.dayNightCycle && this.rtsUI) {
  const timeOfDay = this.dayNightCycle.timeOfDay; // 0-1
  this.rtsUI.updateTimeFromCycle(timeOfDay);
}
```

### Agent Behaviors

```typescript
// In VillagerBehaviour.js or similar
class VillagerBehaviour {
  setState(newState) {
    this.state = newState;
    
    // Update UI metadata
    if (this.mesh) {
      this.mesh.metadata = {
        ...this.mesh.metadata,
        state: newState,
        health: this.health,
      };
    }
  }
}
```

### Resource Management

```typescript
// Update resources whenever they change
this.rtsUI.updateResources({
  Villagers: this.villagers.length,
  Zombies: this.zombies.length,
  Food: this.foodCount,
  Wood: this.woodCount,
  Stone: this.stoneCount,
});
```

## ECS Component Requirements

For full ECS integration, entities should have these components:

```typescript
// Health Component
interface HealthComponent {
  type: 'Health';
  current: number;
  maximum: number;
}

// Position Component
interface PositionComponent {
  type: 'Position';
  x: number;
  y: number;
  z: number;
}

// State Component
interface StateComponent {
  type: 'State';
  current: string;
}

// Resource Component (for player/world entity)
interface ResourceComponent {
  type: 'Resource';
  resources: Record<string, number>;
}

// Time Component (for world entity)
interface TimeComponent {
  type: 'Time';
  hours: number;
  minutes: number;
}
```

## Styling

The UI uses a dark theme by default with these colors:

- Background: `#1a1a1aee` (semi-transparent dark)
- Text: `#e0e0e0` (light gray)
- Accent: `#4a9eff` (blue)
- Health (high): `#4caf50` (green)
- Health (medium): `#ff9800` (orange)
- Health (low): `#f44336` (red)

## Performance

- UI updates run at system priority 1000 (late in update cycle)
- Only selected entity is updated each frame
- Minimal DOM manipulation
- Uses Babylon.js GUI for hardware-accelerated rendering

## Troubleshooting

### Entities not selectable
- Ensure meshes have `metadata` property with `entityId` and `entityType`
- Check that meshes are pickable: `mesh.isPickable = true`

### UI not showing
- Verify `initialize()` is called after scene creation
- Check that Babylon.js GUI is loaded: `@babylonjs/gui`

### Performance issues
- Reduce update frequency for non-critical UI elements
- Use object pooling for frequently created UI elements
- Limit number of entities with detailed metadata

## Examples

See `RTSIntegrationExample.ts` for complete integration examples with:
- Existing JavaScript codebase
- Day/night cycle integration
- Agent behavior updates
- Resource management

## License

Part of the 3D Village Simulation project.
