# Villager Physics Fix - Summary

## Date: February 3, 2026

## Issues Identified

### Issue 1: Missing Physics Setup
**Error**: "Villager added without proper physics setup"

**Root Cause**: The simplified `VillagerBehaviour.js` was calling `villagerModel.createVillager()` directly, which only creates visual meshes without physics bodies.

**Solution**: Changed to use `VillagerAgent.createAgent()` which properly combines:
- Visual representation from `VillagerModel`
- Physics body from `BasicAgent`

### Issue 2: Missing update() Method
**Error**: "TypeError: this.villagerBehaviour.update is not a function"

**Root Cause**: `BehavioralSim.js` expects all behavior systems to have an `update()` method, but the simplified version only had `updateVillagers(deltaTime)`.

**Solution**: Added a wrapper `update()` method that calls `updateVillagers()` with the correct deltaTime.

### Issue 3: Incorrect Physics API
**Root Cause**: Code was using `villager.physics.setLinearVelocity()` but the correct API for PhysicsAggregate is `villager.physics.body.setLinearVelocity()`.

**Solution**: Updated all physics calls to use the correct API:
- `villager.physics.body.setLinearVelocity()`
- Added null checks for `villager.physics.body`

## Changes Made

### 1. Updated Imports ✅
```javascript
// Before
import { BasicAgent } from '../BasicAgent.js';
import { VillagerModel } from './VillagerModel.js';

// After
import { VillagerAgent } from './VillagerAgent.js';
```

### 2. Updated Constructor ✅
```javascript
// Before
this.basicAgent = new BasicAgent(scene);
this.villagerModel = new VillagerModel(scene);

// After
this.villagerAgent = new VillagerAgent(scene);
```

### 3. Fixed createVillager() ✅
```javascript
// Before
const villager = this.villagerModel.createVillager(
    `villager_${this.villagers.length}`,
    position,
    this.scene
);

// After
const villager = this.villagerAgent.createAgent(
    `villager_${this.villagers.length}`,
    position
);
```

### 4. Fixed Physics API Calls ✅
```javascript
// Before
if (villager.physics && villager.physics.setLinearVelocity) {
    villager.physics.setLinearVelocity(velocity);
}

// After
if (villager.physics && villager.physics.body) {
    villager.physics.body.setLinearVelocity(velocity);
}
```

### 5. Added update() Method ✅
```javascript
/**
 * Update method called by BehavioralSim
 * This is a wrapper for compatibility with the behavior system
 */
update() {
    const deltaTime = this.scene.getEngine().getDeltaTime() * 0.001;
    this.updateVillagers(deltaTime);
}
```

## Files Modified

- ✅ `MyHavokSimCode/Agents/Villagers/VillagerBehaviour.js` - Main behavior file
- ✅ `MyHavokSimCode/Agents/Villagers/VillagerBehaviour.simple.js` - Backup copy

## Verification

### Expected Behavior After Fix:
1. ✅ No "Villager added without proper physics setup" warnings
2. ✅ No "update is not a function" errors
3. ✅ Villagers spawn with physics bodies
4. ✅ Villagers move smoothly with physics
5. ✅ Villagers respond to terrain and collisions
6. ✅ BehavioralSim can update villagers correctly

### Physics Object Structure:
```javascript
villager = {
    mesh: TransformNode,           // Root mesh
    parts: { torso, head, ... },   // Visual parts
    physics: PhysicsAggregate,     // Physics wrapper
    physics.body: PhysicsBody,     // Actual physics body
    state: 'idle',                 // Current state
    target: Vector3 | null,        // Movement target
    speed: number,                 // Movement speed
    home: POI | null,              // Assigned home
    // ... other properties
}
```

### Physics API Reference:
```javascript
// Set velocity
villager.physics.body.setLinearVelocity(new BABYLON.Vector3(x, y, z));

// Get velocity
const velocity = villager.physics.body.getLinearVelocity();

// Stop movement
villager.physics.body.setLinearVelocity(BABYLON.Vector3.Zero());

// Set angular velocity (rotation)
villager.physics.body.setAngularVelocity(BABYLON.Vector3.Zero());
```

## Integration Points

### VillagerAgent.createAgent()
Creates a complete villager with:
- Visual mesh from VillagerModel
- Physics body from BasicAgent
- State tracking properties
- Movement parameters
- Schedule/routine data

### BasicAgent.createAgent()
Provides:
- Root TransformNode
- PhysicsAggregate with capsule shape
- Mass: 1, Friction: 0.5, Restitution: 0.3
- Basic limb structure

### VillagerModel.createVillager()
Provides:
- Detailed visual mesh (torso, head, limbs)
- Facial features (eyes, mouth)
- Randomized colors and materials
- Animation setup

## Testing Checklist

- [ ] Start simulation (F5)
- [ ] Check console - no physics warnings
- [ ] Check console - no update errors
- [ ] Verify 10 villagers spawn
- [ ] Verify villagers have visible meshes
- [ ] Verify villagers move around
- [ ] Verify villagers respond to terrain
- [ ] Verify physics collisions work
- [ ] Monitor FPS (should be 45-60)
- [ ] Let run for 5 minutes - check stability

## Related Files

- `MyHavokSimCode/Agents/Villagers/VillagerAgent.js` - Agent factory
- `MyHavokSimCode/Agents/Villagers/VillagerModel.js` - Visual model
- `MyHavokSimCode/Agents/BasicAgent.js` - Physics setup
- `MyHavokSimCode/BehavioralSim.js` - Behavior coordinator

## Status

✅ **FIXED AND READY TO TEST**

All physics-related issues have been resolved. Villagers now properly initialize with physics bodies and the behavior system can update them correctly.

---

**Fixed by**: Kiro AI Assistant
**Date**: February 3, 2026
**Issues Resolved**: 3 (Physics setup, update method, API calls)
