# Codebase Cleanup
**Date:** February 3, 2026

## Why
Removed ~20,000 lines of unused code to improve maintainability, reduce bundle size, and clarify active systems.

## What Was Removed

### Deleted Files (17 files)
- Test files: `test-*.js`, `test-*.html`, `compatibility-test.html`
- TypeScript duplicates: `*.ts` files where `.js` version is used
- Type definitions: `*.d.ts` files (not needed for JS)
- Emergency patch: `EMERGENCY-PERFORMANCE-PATCH.js`
- Backup: `VillagerBehaviour.simple.js`
- UI demos: `RTSInterfaceDemo.html`, `RTS*.ts` files

### Archived Systems

**Enhanced Zombie AI** (4,713 lines) → `MyHavokSimCode/Agents/Zombies/archived/`
- `EnhancedZombieBehaviour.js` - Advanced zombie behavior
- `ZombieGroupManager.js` - Group coordination
- `ZombieIntelligence.js` - Learning system
- `ZombiePathfinding.js` - A* pathfinding

**Dinosaur System** (401 lines) → `MyHavokSimCode/Agents/Dinosaurs/archived/`
- `DinosaurBehaviour.js` - Dinosaur AI
- `DinosaurModel.js` - Visual model

### Code Updates
- `BehavioralSim.js` - Removed dinosaur imports, initialization, updates, and disposal

## Impact
- **~20,000 lines removed** from active codebase
- **Clearer system boundaries** - only active systems remain
- **Easier maintenance** - less code to understand and update
- **Preserved functionality** - archived systems documented for restoration

## Restoration
All archived systems include README.md with restoration instructions. See:
- `MyHavokSimCode/Agents/Zombies/archived/README.md`
- `MyHavokSimCode/Agents/Dinosaurs/archived/README.md`
- `MyHavokSimCode/Agents/Villagers/archived/README.md` (from previous cleanup)
