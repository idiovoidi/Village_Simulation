# Villager System Fixes
**Date:** February 3, 2026

## Why
Advanced villager AI systems (threat detection, social networks, shelter management) caused FPS to drop to 15-20. Simplified to restore 45-60 FPS performance.

## What Changed

### Archived Systems
Moved to `MyHavokSimCode/Agents/Villagers/archived/`:
- `VillagerSurvivalInstinct.js` - Threat detection/panic
- `VillagerSocialNetwork.js` - Relationship tracking
- `VillagerShelterSystem.js` - Shelter management
- `VillagerBehaviour.advanced.js` - Original complex system

### Simplified System
New `VillagerBehaviour.js`:
- 5 basic states (idle, wander, go_home, at_home, flee)
- Time-based day/night scheduling
- Simple flee response to threats
- No continuous scanning or inter-agent communication

### Physics Integration
Fixed three issues:
1. Changed from `VillagerModel.createVillager()` to `VillagerAgent.createAgent()` for proper physics setup
2. Added `update()` wrapper method for `BehavioralSim` compatibility
3. Fixed physics API calls: `villager.physics.body.setLinearVelocity()` instead of `villager.physics.setLinearVelocity()`

## Results
- **Performance**: 15-20 FPS → 45-60 FPS (expected)
- **Memory**: ~200MB → ~80MB for 20 villagers (expected)
- **Functionality**: Basic behaviors preserved, complex systems removed

## Restoration
To restore advanced systems, copy files from `archived/` back to parent directory. See `archived/README.md` for details.
