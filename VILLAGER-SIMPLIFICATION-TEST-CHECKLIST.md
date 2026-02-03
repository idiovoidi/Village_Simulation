# Villager Behavior Simplification - Test Checklist

## Pre-Test Setup
- [x] Advanced systems archived to `archived/` folder
- [x] Simplified VillagerBehaviour.js in place
- [x] No import errors (verified)
- [x] Documentation created

## Test Steps

### 1. Start the Simulation
```bash
# Press F5 in VS Code
# Or manually run:
node launch-with-browser.js
```

**Expected Result:**
- ✅ Server starts on port 3000
- ✅ Browser opens automatically
- ✅ Simulation loads without errors

### 2. Check Console for Errors
Open browser DevTools (F12) and check console.

**Expected Messages:**
- ✅ "VillagerBehaviour: Initialized with simplified behavior (advanced systems disabled)"
- ❌ NO "Enhanced systems disabled due to poor performance" warnings
- ❌ NO import errors for VillagerSurvivalInstinct, VillagerSocialNetwork, or VillagerShelterSystem

### 3. Monitor Performance
Check FPS in browser console or performance overlay.

**Expected Performance:**
- ✅ FPS: 45-60 (good performance)
- ✅ No frame drops or stuttering
- ✅ Smooth camera movement
- ✅ Smooth villager animations

### 4. Test Villager Spawning
Watch the simulation start.

**Expected Behavior:**
- ✅ 10 villagers spawn in a circle
- ✅ Villagers have visible meshes
- ✅ Villagers are standing on terrain
- ✅ No console errors during spawn

### 5. Test Basic Movement
Watch villagers for 1-2 minutes.

**Expected Behavior:**
- ✅ Villagers wander around
- ✅ Villagers move smoothly
- ✅ Villagers rotate to face movement direction
- ✅ Walking animation plays during movement
- ✅ Idle animation plays when stopped

### 6. Test Day/Night Cycle
Wait for time to pass or check time-based behaviors.

**Expected Behavior:**
- ✅ World clock displays time
- ✅ Day/night cycle progresses
- ✅ Lighting changes with time
- ✅ Villagers respond to time changes

### 7. Test Nighttime Behavior
Wait until nighttime (22:00 - 6:00 game time) or fast-forward.

**Expected Behavior:**
- ✅ Villagers move toward their homes
- ✅ Villagers become invisible when reaching home (inside)
- ✅ Villagers reappear in morning
- ✅ No errors when entering/leaving homes

### 8. Test Daytime Behavior
Observe during daytime (9:00 - 17:00 game time).

**Expected Behavior:**
- ✅ Villagers wander around
- ✅ Villagers occasionally idle
- ✅ Villagers move between locations
- ✅ Smooth transitions between states

### 9. Test Zombie Interaction (if zombies present)
Spawn zombies or wait for zombie encounters.

**Expected Behavior:**
- ✅ Villagers flee when zombie approaches
- ✅ Flee direction is away from zombie
- ✅ Villagers run at increased speed
- ✅ No complex threat assessment (simple flee only)

### 10. Performance Stress Test
Let simulation run for 5-10 minutes.

**Expected Results:**
- ✅ FPS remains stable (45-60)
- ✅ No memory leaks (check DevTools Memory tab)
- ✅ No console errors accumulating
- ✅ Smooth performance throughout

## What Should NOT Happen

❌ **No performance warnings** - "Enhanced systems disabled due to poor performance"
❌ **No import errors** - Missing VillagerSurvivalInstinct, etc.
❌ **No complex behaviors** - Social interactions, relationship tracking
❌ **No threat assessment** - Continuous scanning, panic propagation
❌ **No shelter management** - Capacity checks, shelter assignment
❌ **No FPS drops** - Should maintain 45-60 FPS

## Troubleshooting

### If you see import errors:
1. Check that archived files are in `archived/` folder
2. Verify VillagerBehaviour.js doesn't import archived systems
3. Clear browser cache (Ctrl+Shift+Delete)
4. Hard refresh (Ctrl+F5)

### If performance is still poor:
1. Check browser console for other errors
2. Verify no other systems are causing issues
3. Check GPU/CPU usage in Task Manager
4. Try reducing villager count in initialization

### If villagers don't move:
1. Check console for physics errors
2. Verify BowlCreator terrain is loaded
3. Check that villager.physics is properly initialized
4. Verify target positions are being set

### If animations don't play:
1. Check that VillagerModel is loading correctly
2. Verify animation groups are attached
3. Check console for animation errors
4. Verify mesh parts exist

## Success Criteria

✅ **All tests pass**
✅ **FPS: 45-60 consistently**
✅ **No console errors**
✅ **Smooth villager movement**
✅ **Day/night cycle works**
✅ **Basic behaviors functional**

## If Tests Fail

1. **Document the failure** - Screenshot, console logs
2. **Check archived files** - Ensure they're complete
3. **Verify file structure** - Use `listDirectory` tool
4. **Review imports** - Check VillagerBehaviour.js
5. **Restore if needed** - Use instructions in VILLAGER-BEHAVIOR-SIMPLIFICATION.md

## Next Steps After Testing

If tests pass:
1. ✅ Mark simplification as successful
2. ✅ Begin ECS refactoring (see `.kiro/steering/ecs-refactoring-guide.md`)
3. ✅ Focus on other performance optimizations
4. ✅ Document any additional findings

If tests fail:
1. ❌ Debug and fix issues
2. ❌ Consider partial restoration of systems
3. ❌ Review archived README for restoration steps
4. ❌ Consult with user for next steps

---

**Test Date**: _____________
**Tester**: _____________
**Result**: ⬜ PASS / ⬜ FAIL
**Notes**: _____________________________________________
