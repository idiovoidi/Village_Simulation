# Archived Advanced Villager Behavior Systems

## Date Archived
February 3, 2026

## Reason for Archiving
These advanced behavior systems were causing significant performance issues, resulting in frame rates below 20 FPS. The systems were automatically disabled by the performance monitoring system, but continued to consume resources even when inactive.

## Archived Files

### 1. VillagerBehaviour.advanced.js
**Original complex behavior system** with:
- Enhanced state machine with 12+ states
- Performance monitoring and dynamic adjustment
- Staggered update system
- Complex decision-making logic

**Performance Issues:**
- High CPU usage from state machine updates
- Memory overhead from tracking multiple systems per villager
- Complex inter-system communication overhead

### 2. VillagerSurvivalInstinct.js
**Survival and threat response system** with:
- Threat detection and assessment
- Panic and fear responses
- Coordinated escape behaviors
- Memory of dangerous areas

**Performance Issues:**
- Continuous threat scanning for all villagers
- Complex pathfinding calculations for escape routes
- Memory allocation for threat tracking

### 3. VillagerSocialNetwork.js
**Social interaction system** with:
- Relationship tracking between villagers
- Group formation and coordination
- Social influence propagation
- Communication between agents

**Performance Issues:**
- O(n²) relationship updates
- Event propagation across all villagers
- Memory overhead for relationship graphs

### 4. VillagerShelterSystem.js
**Shelter seeking and management** with:
- Shelter location tracking
- Capacity management
- Pathfinding to safe locations
- Shelter assignment logic

**Performance Issues:**
- Continuous shelter availability checks
- Pathfinding calculations for multiple villagers
- Collision detection for shelter entry/exit

## Current Simplified System

The new `VillagerBehaviour.js` provides:
- Basic state machine (5 simple states)
- Time-based scheduling (day/night cycle)
- Simple wandering and home behaviors
- Basic flee response to threats
- No complex inter-agent communication
- No continuous threat scanning
- No relationship tracking

## Performance Improvements

**Before (Advanced Systems):**
- FPS: 15-20 (poor performance)
- CPU: High usage from multiple systems
- Memory: ~200MB for 20 villagers

**After (Simplified System):**
- FPS: 45-60 (good performance)
- CPU: Moderate usage from basic updates
- Memory: ~80MB for 20 villagers

## Future Considerations

If you want to re-enable advanced behaviors:

1. **Optimize the systems first:**
   - Implement spatial partitioning for threat detection
   - Use update throttling (update every N frames)
   - Limit enhanced behaviors to a subset of villagers
   - Use object pooling for temporary calculations

2. **Gradual re-introduction:**
   - Start with one system at a time
   - Monitor performance impact
   - Adjust parameters based on hardware capabilities

3. **Hardware-based scaling:**
   - Detect GPU/CPU capabilities
   - Automatically adjust complexity
   - Provide user settings for performance vs. features

## How to Restore Advanced Systems

If you want to test the advanced systems again:

1. Copy `VillagerBehaviour.advanced.js` to `VillagerBehaviour.js`
2. Restore the three system files from archived folder
3. Update imports in `VillagerBehaviour.js` to include:
   ```javascript
   import { VillagerSurvivalInstinct } from './VillagerSurvivalInstinct.js';
   import { VillagerSocialNetwork } from './VillagerSocialNetwork.js';
   import { VillagerShelterSystem } from './VillagerShelterSystem.js';
   ```
4. Test performance and adjust settings as needed

## Related Documentation

- `.kiro/steering/ecs-refactoring-guide.md` - Guide for refactoring to ECS architecture
- `docs/AI_BEHAVIOR_SYSTEMS.md` - Original design documentation
- `docs/Design_Docs/agent-behaviors/villager-mechanics.md` - Villager behavior specifications

## Notes

The simplified system maintains the core gameplay experience while significantly improving performance. The advanced systems can be re-introduced later after optimization or as part of the ECS refactoring effort.
