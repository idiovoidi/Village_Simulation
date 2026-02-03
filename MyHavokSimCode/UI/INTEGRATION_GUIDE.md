# Complete UI Integration Guide

This guide shows how to integrate the new RTS Interface with your existing village simulation, including the WorldClock.

## Quick Integration Steps

### 1. Add to Your Main Scene File

In `Havokimport.js` or `NewVillageEngine.js`:

```javascript
import { RTSIntegrationHelper } from './UI/RTSIntegrationExample';
import { WorldClock } from './UI/WorldClock';

class LeoScene {
  constructor() {
    // ... existing code ...
    this.rtsUI = null;
    this.worldClock = null;
  }

  async createScene() {
    // ... existing scene setup ...
    
    // Initialize RTS UI
    this.rtsUI = new RTSIntegrationHelper(this.scene);
    this.rtsUI.initialize();
    
    // Initialize WorldClock (if not already done)
    this.worldClock = new WorldClock(this.scene);
    
    return this.scene;
  }

  render() {
    // ... existing render code ...
    
    // Update RTS UI
    if (this.rtsUI) {
      this.rtsUI.update();
      
      // Update resources
      const villagerCount = this.villagers?.length || 0;
      const zombieCount = this.zombies?.length || 0;
      const dogCount = this.dogs?.length || 0;
      
      this.rtsUI.updateResources(villagerCount, zombieCount, dogCount);
      
      // Update time from day/night cycle
      if (this.dayNightCycle) {
        this.rtsUI.updateTimeFromCycle(this.dayNightCycle.timeOfDay);
        
        // Also update WorldClock
        const gameMinutes = this.dayNightCycle.timeOfDay * 24 * 60;
        this.worldClock?.updateTime(gameMinutes);
      }
    }
    
    this.scene.render();
  }
}
```

### 2. Add Metadata to Your Agents

In `VillagerBehaviour.js`, `ZombieBehaviour.js`, etc.:

```javascript
class VillagerBehaviour {
  constructor(scene, position) {
    // ... existing code ...
    
    // Add metadata to mesh for UI
    if (this.mesh) {
      this.mesh.metadata = {
        entityId: this.id,
        entityType: 'Villager',
        health: this.health,
        maxHealth: this.maxHealth,
        state: this.state,
      };
    }
  }
  
  setState(newState) {
    this.state = newState;
    
    // Update metadata for UI
    if (this.mesh && this.mesh.metadata) {
      this.mesh.metadata.state = newState;
    }
  }
  
  takeDamage(amount) {
    this.health -= amount;
    
    // Update metadata for UI
    if (this.mesh && this.mesh.metadata) {
      this.mesh.metadata.health = this.health;
    }
  }
}
```

### 3. Coordinate UI Positioning

The RTS UI and WorldClock can coexist. Here's the layout:

```
┌─────────────────────────────────────────────────┐
│ [WorldClock]  Resources | Time | FPS  [Top Bar] │ ← Top 60px
├─────────────────────────────────────────────────┤
│                                                  │
│                                                  │
│              3D Scene Area                       │
│                                                  │
│                                                  │
├─────────────────────────────────────────────────┤
│ Selected Entity Info              [Bottom Bar]  │ ← Bottom 200px
└─────────────────────────────────────────────────┘
```

To adjust WorldClock position to not overlap with RTS top bar:

```javascript
// In WorldClock.js, modify the container positioning:
container.top = "80px";  // Move below the RTS top bar (60px + 20px margin)
container.left = "20px";
```

Or move it to the right side:

```javascript
container.horizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_RIGHT;
container.right = "20px";
container.top = "80px";
```

## Complete Example

Here's a complete integration example:

```javascript
// In Havokimport.js or your main scene file

import { RTSIntegrationHelper } from './UI/RTSIntegrationExample';
import { WorldClock } from './UI/WorldClock';

export class LeoScene {
  constructor() {
    this.canvas = document.getElementById('renderCanvas');
    this.engine = new BABYLON.Engine(this.canvas, true);
    this.scene = null;
    this.rtsUI = null;
    this.worldClock = null;
    this.dayNightCycle = null;
    this.villagers = [];
    this.zombies = [];
    this.dogs = [];
  }

  async createScene() {
    this.scene = new BABYLON.Scene(this.engine);
    
    // ... camera, lights, terrain setup ...
    
    // Initialize day/night cycle
    this.dayNightCycle = new DayNightCycle(this.scene);
    
    // Initialize UI systems
    this.initializeUI();
    
    // Spawn agents
    await this.spawnAgents();
    
    return this.scene;
  }

  initializeUI() {
    // RTS Interface
    this.rtsUI = new RTSIntegrationHelper(this.scene);
    this.rtsUI.initialize();
    
    // World Clock (positioned to not overlap)
    this.worldClock = new WorldClock(this.scene);
    
    // Adjust WorldClock position if needed
    // (modify WorldClock.js as shown above)
  }

  async spawnAgents() {
    // Spawn villagers
    for (let i = 0; i < 5; i++) {
      const villager = new VillagerAgent(this.scene, {
        position: this.getRandomPosition(),
        id: i + 1,
      });
      
      // Ensure metadata is set
      if (villager.mesh) {
        villager.mesh.metadata = {
          entityId: i + 1,
          entityType: 'Villager',
          health: 100,
          maxHealth: 100,
          state: 'Idle',
        };
      }
      
      this.villagers.push(villager);
    }
    
    // Similar for zombies, dogs, etc.
  }

  updateAgents(deltaTime) {
    // Update villagers
    this.villagers.forEach(villager => {
      villager.update(deltaTime);
      
      // Update metadata
      if (villager.mesh && villager.mesh.metadata) {
        villager.mesh.metadata.health = villager.health;
        villager.mesh.metadata.state = villager.state;
      }
    });
    
    // Similar for other agents
  }

  render() {
    this.engine.runRenderLoop(() => {
      const deltaTime = this.engine.getDeltaTime() / 1000;
      
      // Update day/night cycle
      if (this.dayNightCycle) {
        this.dayNightCycle.update(deltaTime);
      }
      
      // Update agents
      this.updateAgents(deltaTime);
      
      // Update UI
      this.updateUI();
      
      // Render scene
      this.scene.render();
    });
  }

  updateUI() {
    if (!this.rtsUI) return;
    
    // Update RTS UI
    this.rtsUI.update();
    
    // Update resources
    this.rtsUI.updateResources(
      this.villagers.length,
      this.zombies.length,
      this.dogs.length
    );
    
    // Update time
    if (this.dayNightCycle) {
      const timeOfDay = this.dayNightCycle.timeOfDay; // 0-1
      this.rtsUI.updateTimeFromCycle(timeOfDay);
      
      // Update WorldClock
      const gameMinutes = timeOfDay * 24 * 60;
      this.worldClock?.updateTime(gameMinutes);
    }
  }

  dispose() {
    this.rtsUI?.dispose();
    this.worldClock?.dispose();
    this.scene?.dispose();
    this.engine?.dispose();
  }
}

// Initialize and run
const app = new LeoScene();
app.createScene().then(() => {
  app.render();
});

// Handle window resize
window.addEventListener('resize', () => {
  app.engine.resize();
});
```

## Customization Options

### Adjust RTS UI Colors

```javascript
const rtsUI = new RTSInterface(scene, {
  topBarHeight: 60,
  bottomBarHeight: 200,
  backgroundColor: '#2a2a2aee',  // Darker background
  textColor: '#ffffff',           // White text
  accentColor: '#00ff00',         // Green accent
});
```

### Hide/Show UI Elements

```javascript
// Hide inspector panel
rtsUI.hideInspector();

// Show inspector panel
rtsUI.showInspector();

// Clear selection
rtsUI.clearSelection();
```

### Custom Resource Display

```javascript
// Show custom resources
rtsUI.updateResources({
  'Villagers': 10,
  'Zombies': 5,
  'Food': 150,
  'Wood': 200,
  'Stone': 75,
  'Gold': 1000,
});
```

## Troubleshooting

### WorldClock overlaps with RTS UI

Modify `WorldClock.js` line ~20:

```javascript
// Move to right side
container.horizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_RIGHT;
container.right = "20px";
container.top = "80px";  // Below RTS top bar
```

### Entities not selectable

Ensure meshes have metadata:

```javascript
mesh.metadata = {
  entityId: 1,
  entityType: 'Villager',
  health: 100,
  maxHealth: 100,
  state: 'Idle',
};
```

And ensure meshes are pickable:

```javascript
mesh.isPickable = true;
```

### UI not updating

Make sure you call `update()` in your render loop:

```javascript
this.rtsUI.update();
```

### Performance issues

- Limit metadata updates to only when values change
- Use object pooling for UI elements
- Reduce update frequency for non-critical displays

## Best Practices

1. **Update metadata only when values change**
   ```javascript
   if (this.health !== oldHealth) {
     this.mesh.metadata.health = this.health;
   }
   ```

2. **Batch UI updates**
   ```javascript
   // Update once per frame, not per entity
   updateUI() {
     const resources = this.calculateResources();
     this.rtsUI.updateResources(resources);
   }
   ```

3. **Use consistent entity IDs**
   ```javascript
   // Use a counter or UUID system
   this.nextEntityId = 1;
   entity.id = this.nextEntityId++;
   ```

4. **Clean up on entity removal**
   ```javascript
   removeEntity(entity) {
     if (this.selectedEntity === entity) {
       this.rtsUI.clearSelection();
     }
     entity.dispose();
   }
   ```

## Next Steps

- See `RTSInterfaceDemo.html` for a working demo
- Check `RTS_UI_README.md` for API reference
- Review `RTSIntegrationExample.ts` for more examples
- Explore ECS integration with `RTSInterfaceSystem.ts`
