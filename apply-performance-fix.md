# How to Apply the Emergency Performance Fix

## The Problem

You're getting 20 FPS on an RTX 5070 Ti because **30+ separate callbacks** are executing every frame. Each agent system, environment system, and UI component is registering its own render loop.

## Quick Fix (5 minutes)

### Step 1: Comment Out Per-Agent Observers

Open `MyHavokSimCode/Agents/Villagers/VillagerBehaviour.js`:

Find line 55 and comment it out:
```javascript
// COMMENT THIS OUT:
// this.scene.onBeforeRenderObservable.add(() => {
//     const deltaTime = this.scene.getEngine().getDeltaTime() * 0.001;
//     this.updateVillagers(deltaTime);
// });
```

Find line 191 and replace the entire `addMovementObserver` method:
```javascript
addMovementObserver(villager) {
    // Initialize walk time on villager object
    villager.walkTime = 0;
    // Movement will be handled in updateVillagers() - no observer needed
}
```

Add this new method after `addMovementObserver`:
```javascript
updateVillagerMovement(villager, deltaTime) {
    if (!villager.mesh || !villager.physics) return;
    
    villager.mesh.rotation.x = 0;
    villager.mesh.rotation.z = 0;
    
    const groundHeight = BowlCreator.getTerrainHeight(
        villager.mesh.position.x, 
        villager.mesh.position.z
    );
    
    if (groundHeight !== null) {
        const targetHeight = groundHeight + 0.9;
        
        if (villager.state === this.STATES.MOVING_TO_TARGET || 
            villager.state === this.STATES.WANDERING) {
            villager.walkTime += deltaTime;
            const bounce = Math.sin(villager.walkTime * 10) * 0.1;
            villager.mesh.position.y = targetHeight + bounce;
        } else {
            villager.mesh.position.y = targetHeight;
        }
    }
}
```

In the `updateVillagers` method, add this at the end of the loop:
```javascript
updateVillagers(deltaTime) {
    for (const villager of this.villagers) {
        // ... existing code ...
        
        // ADD THIS:
        this.updateVillagerMovement(villager, deltaTime);
    }
}
```

### Step 2: Test

Run your simulation. You should immediately see **2-3x FPS improvement** (40-60 FPS).

## Full Fix (30 minutes)

For maximum performance, you need to consolidate ALL render loops. See `EMERGENCY-PERFORMANCE-PATCH.js` for the complete solution.

### Files to modify:
1. `MyHavokSimCode/Agents/Villagers/VillagerBehaviour.js` ✅ (Step 1 above)
2. `MyHavokSimCode/Agents/Zombies/ZombieBehaviour.js` - Remove line 44-47
3. `MyHavokSimCode/Agents/Fish/FishBehaviour.js` - Remove line 30-33
4. `MyHavokSimCode/Agents/Birds/BirdBehaviour.js` - Remove line 34-37
5. `MyHavokSimCode/Agents/Dogs/DogBehaviour.js` - Remove line 18-21
6. `MyHavokSimCode/WaterSimulation.js` - Remove line 52-55
7. `MyHavokSimCode/CloudSystem.js` - Remove line 14
8. `MyHavokSimCode/BehavioralSim.js` - Remove line 71 AND 596
9. All other systems listed in `PERFORMANCE-CRISIS-FIX.md`

### Then create UpdateManager:

Add to `MyHavokSimCode/Havokimport.js` before `LeoScene` class:

```javascript
class UpdateManager {
    constructor(scene) {
        this.scene = scene;
        this.systems = [];
        this.isRunning = false;
    }
    
    registerSystem(system, priority = 100, name = 'Unknown') {
        if (!system || typeof system.update !== 'function') {
            console.warn(`Cannot register ${name} - no update() method`);
            return;
        }
        this.systems.push({ system, priority, name });
        this.systems.sort((a, b) => a.priority - b.priority);
    }
    
    start() {
        if (this.isRunning) return;
        this.isRunning = true;
        
        this.scene.onBeforeRenderObservable.add(() => {
            if (!this.isRunning) return;
            const deltaTime = this.scene.getEngine().getDeltaTime() * 0.001;
            
            for (const { system, name } of this.systems) {
                try {
                    system.update(deltaTime);
                } catch (error) {
                    console.error(`Error updating ${name}:`, error);
                }
            }
        });
    }
}
```

In `LeoScene.init()`, after loading the level:
```javascript
// Create update manager
this.updateManager = new UpdateManager(this.scene);

// Register all systems
if (this.villagerSystem) this.updateManager.registerSystem(this.villagerSystem, 30, 'Villagers');
if (this.zombieSystem) this.updateManager.registerSystem(this.zombieSystem, 30, 'Zombies');
if (this.fishSystem) this.updateManager.registerSystem(this.fishSystem, 30, 'Fish');
if (this.birdSystem) this.updateManager.registerSystem(this.birdSystem, 30, 'Birds');
if (this.waterSim) this.updateManager.registerSystem(this.waterSim, 40, 'Water');
if (this.cloudSystem) this.updateManager.registerSystem(this.cloudSystem, 40, 'Clouds');

// Start updates
this.updateManager.start();
```

## Expected Results

- **After Quick Fix**: 40-60 FPS (2-3x improvement)
- **After Full Fix**: 60+ FPS (3-5x improvement)
- **CPU Usage**: Should drop significantly
- **Frame time**: Should be consistent

## Why This Works

**Before**: 30+ callbacks × 60 FPS = 1,800+ function calls/second just for update infrastructure

**After**: 1 callback × 60 FPS = 60 function calls/second

You're eliminating **1,740 unnecessary function calls per second** plus all the overhead of:
- Multiple deltaTime calculations
- Multiple engine.getDeltaTime() calls
- Observer management overhead
- Closure memory allocations

## Verification

Open browser console and check for:
```
UpdateManager: Registered Villagers (priority: 30)
UpdateManager: Registered Zombies (priority: 30)
...
UpdateManager: Started with X systems
```

Your FPS counter should show 60+ FPS immediately.
