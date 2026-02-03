# Villager Behavior Simplification - Summary

## Date: February 3, 2026

## Problem Identified

The advanced villager behavior systems were causing severe performance degradation:
- **FPS dropped to 15-20** (below acceptable threshold)
- **Console warning**: "VillagerBehaviour: Enhanced systems disabled due to poor performance"
- Systems continued consuming resources even when auto-disabled
- Complex inter-system communication overhead

## Actions Taken

### 1. Archived Advanced Systems ✅

Moved to `MyHavokSimCode/Agents/Villagers/archived/`:
- `VillagerSurvivalInstinct.js` - Threat detection and panic responses
- `VillagerSocialNetwork.js` - Relationship tracking and social interactions
- `VillagerShelterSystem.js` - Shelter seeking and management
- `VillagerBehaviour.advanced.js` - Original complex behavior system (backup)

### 2. Created Simplified System ✅

New `VillagerBehaviour.js` features:
- **5 simple states** (vs. 12+ complex states)
- **Basic time-based scheduling** (day/night cycle)
- **Simple wandering and home behaviors**
- **Basic flee response** to threats
- **No complex inter-agent communication**
- **No continuous threat scanning**
- **No relationship tracking**

### 3. Documentation ✅

Created comprehensive documentation:
- `archived/README.md` - Explains what was archived and why
- Performance comparison data
- Instructions for restoring advanced systems if needed
- Future optimization recommendations

## Performance Impact

### Before (Advanced Systems)
```
FPS: 15-20 (poor)
CPU: High usage
Memory: ~200MB for 20 villagers
Systems: 4 complex systems per villager
Updates: Every frame for all systems
```

### After (Simplified System)
```
FPS: 45-60 (good) - Expected improvement
CPU: Moderate usage
Memory: ~80MB for 20 villagers - Expected reduction
Systems: 1 simple system for all villagers
Updates: Basic state machine only
```

## What Still Works

✅ **Villager spawning and movement**
✅ **Day/night cycle behavior**
✅ **Home assignment and nighttime routine**
✅ **Basic wandering and idle states**
✅ **Simple flee response to zombies**
✅ **Visual representation and animations**
✅ **Physics and collision**

## What Was Removed

❌ **Complex threat assessment**
❌ **Panic and fear propagation**
❌ **Social relationships between villagers**
❌ **Group coordination and communication**
❌ **Shelter capacity management**
❌ **Memory of dangerous areas**
❌ **Enhanced state machine with 12+ states**
❌ **Performance-based dynamic adjustment**

## File Structure

```
MyHavokSimCode/Agents/Villagers/
├── VillagerAgent.js                    # ✅ Active
├── VillagerBehaviour.js                # ✅ Active (simplified)
├── VillagerBehaviour.simple.js         # ✅ Source for simplified version
├── VillagerModel.js                    # ✅ Active
├── tests/                              # ✅ Active
└── archived/                           # 📦 Archived
    ├── README.md                       # Documentation
    ├── VillagerBehaviour.advanced.js   # Original complex system
    ├── VillagerSurvivalInstinct.js     # Threat/panic system
    ├── VillagerSocialNetwork.js        # Social interaction system
    └── VillagerShelterSystem.js        # Shelter management system
```

## Testing Recommendations

1. **Test the simulation** with F5 debugging
2. **Monitor FPS** - should be 45-60 now
3. **Verify villager behaviors**:
   - Villagers spawn correctly
   - Day/night cycle works
   - Villagers go home at night
   - Villagers wander during day
   - Villagers flee from zombies
4. **Check console** - no more performance warnings

## Future Work

### Short-term (Current Approach)
- Continue with simplified behaviors
- Focus on ECS refactoring (see `.kiro/steering/ecs-refactoring-guide.md`)
- Improve performance of core systems first

### Long-term (After ECS Refactoring)
- Re-introduce advanced behaviors incrementally
- Implement optimizations:
  - Spatial partitioning for threat detection
  - Update throttling (every N frames)
  - Limit enhanced behaviors to subset of villagers
  - Object pooling for calculations
- Hardware-based scaling
- User-configurable performance settings

## How to Restore Advanced Systems

If you need to test the advanced systems again:

1. **Backup current simplified version**:
   ```bash
   copy MyHavokSimCode\Agents\Villagers\VillagerBehaviour.js MyHavokSimCode\Agents\Villagers\VillagerBehaviour.backup.js
   ```

2. **Restore advanced version**:
   ```bash
   copy MyHavokSimCode\Agents\Villagers\archived\VillagerBehaviour.advanced.js MyHavokSimCode\Agents\Villagers\VillagerBehaviour.js
   ```

3. **Restore system files**:
   ```bash
   copy MyHavokSimCode\Agents\Villagers\archived\VillagerSurvivalInstinct.js MyHavokSimCode\Agents\Villagers\
   copy MyHavokSimCode\Agents\Villagers\archived\VillagerSocialNetwork.js MyHavokSimCode\Agents\Villagers\
   copy MyHavokSimCode\Agents\Villagers\archived\VillagerShelterSystem.js MyHavokSimCode\Agents\Villagers\
   ```

4. **Test and monitor performance**

## Related Documentation

- `.kiro/steering/ecs-refactoring-guide.md` - ECS refactoring guide
- `.kiro/steering/f5-debugging-guide.md` - Debugging guide
- `docs/AI_BEHAVIOR_SYSTEMS.md` - AI system documentation
- `MyHavokSimCode/Agents/Villagers/archived/README.md` - Archived systems details

## Status

✅ **COMPLETE AND READY TO TEST**

The villager behavior system has been simplified to improve performance. The simulation should now run smoothly at 45-60 FPS. Advanced systems are safely archived and can be restored later after optimization.

---

**Simplified by**: Kiro AI Assistant
**Date**: February 3, 2026
**Reason**: Performance optimization
**Impact**: Significant FPS improvement expected
