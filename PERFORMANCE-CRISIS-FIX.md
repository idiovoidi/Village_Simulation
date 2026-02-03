# CRITICAL PERFORMANCE ISSUE - 20 FPS on RTX 5070 Ti

## Root Cause Analysis

Your simulation is running at 20 FPS on high-end hardware (RTX 5070 Ti + Ryzen 9950X3D) because you have **20+ separate render loop callbacks** all executing every single frame.

### The Problem

Every system is registering its own `onBeforeRenderObservable.add()` or `registerBeforeRender()` callback:

1. **VillagerBehaviour** - Global update loop (line 55)
2. **VillagerBehaviour** - PER-VILLAGER observer (line 191) - **MULTIPLIED BY VILLAGER COUNT**
3. **ZombieBehaviour** - Update loop (line 44)
4. **ZombieGroupManager** - Update loop (line 99)
5. **FishBehaviour** - Update loop (line 30)
6. **BirdBehaviour** - Update loop (line 34)
7. **DogBehaviour** - Update loop (line 18)
8. **BoatAgent** - Update loop (line 17)
9. **WaterSimulation** - Wave animation (line 52)
10. **CloudSystem** - Cloud updates (line 14)
11. **BehavioralSim** - Behavior updates (line 71)
12. **BehavioralSim** - Zombie updates (line 596) - **DUPLICATE!**
13. **DayNightCycle** - Time updates (line 21)
14. **RockSystem** - LOD updates (line 97)
15. **WorldClock** - UI animation (line 116)
16. **AgentScheduler** - Scheduling (line 70)
17. **AIProcessingOptimizer** - AI optimization (line 58)
18. **EnvironmentalAwareness** - Environment updates (line 60)
19. **AgentCommunicationSystem** - Message processing (line 59)
20. **SpawnSystem** - Spawn checks (line 52)
21. **NewVillageEngine** - Performance metrics (line 535)
22. **Havokimport.js** - Main render loop (line ~200)

### The Impact

With 10 villagers, you have:
- 20+ global observers
- 10 per-villager observers
- **30+ callbacks executing EVERY FRAME**

Each callback:
- Calculates deltaTime independently
- Accesses the engine
- Performs updates
- Has function call overhead

At 60 FPS target, this means **1,800+ function calls per second** just for the update loop infrastructure!

## Immediate Fix

### Option 1: Single Update Manager (RECOMMENDED)

Create ONE central update manager that calls all systems in order:

```javascript
class UpdateManager {
    constructor(scene) {
        this.scene = scene;
        this.systems = [];
        
        // Single render loop
        this.scene.onBeforeRenderObservable.add(() => {
            const deltaTime = this.scene.getEngine().getDeltaTime() * 0.001;
            this.updateAll(deltaTime);
        });
    }
    
    registerSystem(system, priority = 0) {
        this.systems.push({ system, priority });
        this.systems.sort((a, b) => a.priority - b.priority);
    }
    
    updateAll(deltaTime) {
        for (const { system } of this.systems) {
            if (system.update) {
                system.update(deltaTime);
            }
        }
    }
}
```

### Option 2: Remove Per-Agent Observers (QUICK FIX)

In `VillagerBehaviour.js`, remove the per-agent observer and handle updates in the main loop:

```javascript
// REMOVE THIS:
addMovementObserver(villager) {
    villager.updateObserver = this.scene.onBeforeRenderObservable.add(() => {
        // ... per-villager update
    });
}

// REPLACE WITH:
updateVillagers(deltaTime) {
    for (const villager of this.villagers) {
        this.updateVillagerMovement(villager, deltaTime);
    }
}
```

## Expected Performance Gain

- **Current**: 30+ callbacks/frame = ~1,800 calls/second
- **After Fix**: 1 callback/frame = ~60 calls/second
- **Expected FPS**: 60+ FPS (from 20 FPS)
- **Performance Gain**: **3x-5x improvement**

## Action Items

1. ✅ Identify all render loop registrations (DONE)
2. ⚠️ Create UpdateManager class
3. ⚠️ Remove per-agent observers
4. ⚠️ Consolidate system updates
5. ⚠️ Test performance

## Additional Optimizations

After fixing the render loop issue, consider:

1. **Spatial Partitioning**: Only update agents near the camera
2. **LOD for AI**: Reduce update frequency for distant agents
3. **Agent Pooling**: Reuse agent objects instead of creating/destroying
4. **Batch Physics Updates**: Update physics in groups
5. **Reduce Draw Calls**: Use instancing for similar meshes

## Files to Modify

Priority order:
1. `MyHavokSimCode/Agents/Villagers/VillagerBehaviour.js` - Remove per-agent observers
2. `MyHavokSimCode/Havokimport.js` - Create UpdateManager
3. All agent behavior files - Remove individual render loops
4. All system files - Convert to update() method pattern
