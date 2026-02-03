# Archived Enhanced Zombie Systems

## Why Archived
These advanced zombie AI systems were not being used in the active codebase. The main simulation uses the simpler `ZombieBehaviour.js` instead.

## Archived Files
- `EnhancedZombieBehaviour.js` (1,164 lines) - Advanced zombie behavior with group coordination
- `ZombieGroupManager.js` (1,444 lines) - Group formation and coordination
- `ZombieIntelligence.js` (1,068 lines) - Learning and adaptation system
- `ZombiePathfinding.js` (1,037 lines) - Advanced pathfinding with A* algorithm

**Total:** 4,713 lines of advanced zombie AI

## What These Systems Provided
- Group formation and pack behavior
- Advanced pathfinding with obstacle avoidance
- Learning and adaptation based on experience
- Memory of dangerous areas and successful strategies
- Communication between zombies
- Dynamic difficulty adjustment

## Current System
The active `ZombieBehaviour.js` provides:
- Basic zombie spawning and movement
- Simple chase behavior toward targets
- Basic collision and physics
- Sufficient for current gameplay needs

## Restoration
To restore these systems:
1. Copy files from `archived/` back to parent directory
2. Update `Havokimport.js` to import `EnhancedZombieBehaviour` instead of `ZombieBehaviour`
3. Update initialization in SYSTEM_CONFIGS
4. Test performance impact

## Performance Notes
These systems were designed for complex zombie AI but may impact performance with large zombie counts. Consider:
- Limiting enhanced behavior to subset of zombies
- Update throttling (every N frames)
- Spatial partitioning for group queries
- Hardware-based scaling

**Archived:** February 3, 2026
**Reason:** Not used in active codebase, simple system sufficient
