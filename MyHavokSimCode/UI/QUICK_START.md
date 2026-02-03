# RTS UI Quick Start Guide

Get the RTS interface running in your project in 5 minutes.

## Step 1: Copy Files (30 seconds)

The UI system is already in `MyHavokSimCode/UI/`. You have:
- ✓ RTSInterface.ts
- ✓ RTSInterfaceSystem.ts  
- ✓ RTSIntegrationExample.ts
- ✓ index.ts

## Step 2: Add to Your Scene (2 minutes)

### Option A: Simple JavaScript Integration

In your main scene file (e.g., `Havokimport.js`):

```javascript
// At the top
import { RTSIntegrationHelper } from './UI/RTSIntegrationExample';

// In your class
class LeoScene {
  constructor() {
    // Add this
    this.rtsUI = null;
  }

  async createScene() {
    // ... your existing scene setup ...
    
    // Add these 2 lines
    this.rtsUI = new RTSIntegrationHelper(this.scene);
    this.rtsUI.initialize();
    
    return this.scene;
  }

  render() {
    // Add this in your render loop
    if (this.rtsUI) {
      this.rtsUI.update();
    }
    
    this.scene.render();
  }
}
```

That's it! You now have a working RTS UI.

## Step 3: Add Entity Metadata (2 minutes)

For entity inspection to work, add metadata to your meshes:

```javascript
// When creating a villager
villagerMesh.metadata = {
  entityId: 1,
  entityType: 'Villager',
  health: 100,
  maxHealth: 100,
  state: 'Idle',
};

// When creating a zombie
zombieMesh.metadata = {
  entityId: 2,
  entityType: 'Zombie',
  health: 80,
  maxHealth: 80,
  state: 'Wandering',
};
```

## Step 4: Update Resources (30 seconds)

In your render loop, update the resource display:

```javascript
render() {
  if (this.rtsUI) {
    this.rtsUI.update();
    
    // Add this
    this.rtsUI.updateResources(
      this.villagers.length,  // Villager count
      this.zombies.length,    // Zombie count
      this.foodCount          // Food count
    );
  }
  
  this.scene.render();
}
```

## Step 5: Connect Time Display (30 seconds)

If you have a day/night cycle:

```javascript
render() {
  if (this.rtsUI && this.dayNightCycle) {
    this.rtsUI.update();
    this.rtsUI.updateResources(/* ... */);
    
    // Add this
    this.rtsUI.updateTimeFromCycle(this.dayNightCycle.timeOfDay);
  }
  
  this.scene.render();
}
```

## Done! 🎉

You now have:
- ✓ Top bar with resources, time, and FPS
- ✓ Bottom bar with entity selection
- ✓ Click-to-select functionality
- ✓ Health bars and entity info

## Test It

1. Run your simulation: `pnpm start`
2. Open browser: `http://localhost:3000`
3. Click on any entity
4. See info appear in bottom bar

## Common Issues

### "Entities not selectable"
Make sure meshes have metadata:
```javascript
mesh.metadata = { entityId: 1, entityType: 'Villager', ... };
```

### "UI not showing"
Check that you called `initialize()`:
```javascript
this.rtsUI.initialize();
```

### "Resources not updating"
Make sure you're calling `updateResources()` in render loop:
```javascript
this.rtsUI.updateResources(v, z, f);
```

## Next Steps

### Customize Colors
```javascript
const rtsUI = new RTSInterface(scene, {
  backgroundColor: '#2a2a2aee',
  textColor: '#ffffff',
  accentColor: '#00ff00',
});
```

### Update Entity State
```javascript
// In your agent behavior
setState(newState) {
  this.state = newState;
  if (this.mesh?.metadata) {
    this.mesh.metadata.state = newState;
  }
}
```

### Show More Resources
```javascript
this.rtsUI.updateResources({
  'Villagers': 10,
  'Zombies': 5,
  'Food': 150,
  'Wood': 200,
  'Stone': 75,
});
```

## Full Example

Here's a complete minimal example:

```javascript
import { RTSIntegrationHelper } from './UI/RTSIntegrationExample';

class MyGame {
  constructor() {
    this.scene = null;
    this.rtsUI = null;
    this.entities = [];
  }

  async init() {
    // Create scene
    this.scene = new BABYLON.Scene(engine);
    
    // Create UI
    this.rtsUI = new RTSIntegrationHelper(this.scene);
    this.rtsUI.initialize();
    
    // Create entities
    this.createEntities();
    
    // Start render loop
    this.render();
  }

  createEntities() {
    for (let i = 0; i < 10; i++) {
      const mesh = BABYLON.MeshBuilder.CreateSphere(`entity_${i}`, {}, this.scene);
      mesh.position.x = (Math.random() - 0.5) * 20;
      mesh.position.z = (Math.random() - 0.5) * 20;
      
      mesh.metadata = {
        entityId: i,
        entityType: 'Unit',
        health: 100,
        maxHealth: 100,
        state: 'Idle',
      };
      
      this.entities.push(mesh);
    }
  }

  render() {
    engine.runRenderLoop(() => {
      // Update UI
      this.rtsUI.update();
      this.rtsUI.updateResources(this.entities.length, 0, 100);
      
      // Render scene
      this.scene.render();
    });
  }
}

// Start game
const game = new MyGame();
game.init();
```

## Demo

Want to see it in action first?

Open `MyHavokSimCode/UI/RTSInterfaceDemo.html` in your browser for a working demo with:
- Multiple entity types
- Click-to-select
- Health bars
- Resource tracking
- Time display

## Documentation

- **API Reference**: See `RTS_UI_README.md`
- **Integration Guide**: See `INTEGRATION_GUIDE.md`
- **Layout Reference**: See `UI_LAYOUT.md`
- **Summary**: See `RTS_UI_SUMMARY.md`

## Support

If you get stuck:
1. Check the demo: `RTSInterfaceDemo.html`
2. Read the integration guide: `INTEGRATION_GUIDE.md`
3. Review the API docs: `RTS_UI_README.md`
4. Check your browser console for errors

## Tips

- Start with the simple integration (RTSIntegrationHelper)
- Add metadata to all selectable entities
- Update resources every frame
- Test with the demo first
- Customize colors to match your theme

---

**Time to implement**: ~5 minutes
**Difficulty**: Easy
**Prerequisites**: Babylon.js scene
**Result**: Full RTS UI with entity inspection
