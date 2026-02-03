# AI Behavior Systems Implementation

This document summarizes the AI behavior systems implemented for Task 10.

## Implemented Systems

### 1. DecisionSystem (Priority: 110)
**File:** `src/systems/ai/DecisionSystem.ts`

**Purpose:** Evaluates current needs, goals, and threats to select appropriate behavior states for entities.

**Key Features:**
- Evaluates survival needs (hunger, thirst, energy) with priority levels
- Assesses environmental threats and triggers flee behavior
- Evaluates entity goals and maps them to behaviors
- Handles creature-specific behaviors (zombies, villagers)
- Implements behavior transitions with state tracking

**Priority Levels:**
- Critical Survival: 100 (energy depleted, critical hunger/thirst)
- High Threat: 90 (dangerous zombies nearby)
- Urgent Survival: 70 (needs approaching critical)
- Moderate Survival: 50 (needs below 50%)
- Goal: 40 (active goals)
- Schedule: 30 (scheduled activities)
- Idle: 0 (default wandering)

**Requirements Validated:** 6.1, 6.2, 6.5, 6.6

---

### 2. VillagerScheduleSystem (Priority: 105)
**File:** `src/systems/ai/VillagerScheduleSystem.ts`

**Purpose:** Manages villager daily schedules based on time of day, with support for need-based overrides.

**Key Features:**
- Loads schedule templates for different professions (peasant, farmer, guard, merchant)
- Updates current activity based on TimeOfDay component
- Handles activities that span midnight
- Assigns locations to activities (home for sleep/meals, workplace for work)
- Allows survival needs to override scheduled activities
- Restores schedule when needs are satisfied

**Schedule Templates:**
- **Peasant:** Standard work schedule (7-12, 13-18), meals, sleep, socialize
- **Farmer:** Early morning schedule (5-6 start), farm work
- **Guard:** Patrol-focused schedule throughout day
- **Merchant:** Trade-focused schedule with social time

**Requirements Validated:** 6.1

---

### 3. ZombieBehaviorSystem (Priority: 115)
**File:** `src/systems/ai/ZombieBehaviorSystem.ts`

**Purpose:** Manages zombie AI including target detection, chasing, and attacking villagers.

**Key Features:**
- Uses SpatialGrid for efficient nearby villager detection
- Detects nearest villager within detection radius
- Validates targets (alive, still exists)
- Chases targets by updating steering component
- Performs attacks when in range (2 units)
- Implements attack cooldown (1 second)
- Applies damage to target health
- Clears target when villager dies
- Falls back to wander behavior when no target

**Attack Mechanics:**
- Attack range: 2 units
- Attack cooldown: 1 second
- Damage: Configurable per zombie (default 10)

**Requirements Validated:** 6.2

---

### 4. ThreatAssessmentSystem (Priority: 108)
**File:** `src/systems/ai/ThreatAssessmentSystem.ts`

**Purpose:** Evaluates environmental threats and updates Threat components for decision-making.

**Key Features:**
- Detects zombies within detection radius (30 units)
- Calculates danger levels based on distance and zombie aggression
- Updates threat memory with last seen position and time
- Ages threats and removes expired ones (10 second memory)
- Tracks highest threat level for quick decision-making
- Updates on interval (0.5 seconds) for performance

**Threat Calculation:**
- Base danger: 0.8 × zombie aggression level
- Distance falloff: Reduces danger with distance
- Detection radius: 30 units
- Memory duration: 10 seconds

**Requirements Validated:** 6.2

---

## System Execution Order

The AI behavior systems execute in the following order each frame:

1. **VillagerScheduleSystem (105)** - Updates scheduled activities
2. **ThreatAssessmentSystem (108)** - Evaluates environmental threats
3. **DecisionSystem (110)** - Selects appropriate behaviors
4. **ZombieBehaviorSystem (115)** - Updates zombie targeting and attacks

This order ensures that:
- Schedules are updated before decisions are made
- Threats are assessed before behavior selection
- Decisions consider all current information
- Zombie behaviors execute after villager decisions

---

## Integration with Existing Systems

These systems integrate with:

**Existing AI Systems:**
- **SteeringSystem:** Receives target positions from behavior systems
- **PathfindingSystem:** Works with steering targets for navigation
- **FlockingSystem:** Handles group behaviors for fish and birds

**Component Dependencies:**
- **AIBehaviour:** Stores current and previous behavior states
- **Schedule:** Manages daily activity schedules
- **Threat:** Tracks perceived threats
- **Goal:** Stores current goals and priorities
- **Survival Components:** Hunger, Thirst, Energy drive decisions
- **Creature Components:** Villager, Zombie define entity types

**Utilities:**
- **SpatialGrid:** Efficient spatial queries for detection
- **EventBus:** Can emit behavior change events (future)

---

## Testing Recommendations

### Unit Tests
- Test decision priority ordering
- Test schedule activity selection at different times
- Test zombie target detection and validation
- Test threat danger level calculations
- Test behavior transitions

### Integration Tests
- Test survival needs overriding schedules
- Test zombie detection and chase behavior
- Test threat assessment influencing decisions
- Test complete behavior cycle (schedule → threat → decision → action)

### Property-Based Tests
- Test that critical needs always override schedules
- Test that zombies always target nearest valid villager
- Test that threat levels decrease with distance
- Test that behavior transitions maintain valid states

---

## Future Enhancements

### Potential Improvements:
1. **Group Coordination:** Use villagerEntities/zombieEntities for horde behavior
2. **Social Behaviors:** Implement villager social interactions
3. **Dynamic Schedules:** Generate schedules based on village needs
4. **Advanced Threat Response:** Coordinated flee behavior, alert others
5. **Zombie Intelligence:** Pack hunting, flanking, memory of villager locations
6. **Profession-Specific Behaviors:** Unique behaviors per profession
7. **Event-Driven Updates:** Use EventBus for behavior change notifications

---

## Performance Considerations

- **SpatialGrid:** O(1) average case for spatial queries
- **Update Intervals:** ThreatAssessmentSystem updates every 0.5s
- **Threat Memory:** Limited to 10 seconds to prevent unbounded growth
- **Component Queries:** Cached entity lists updated per frame
- **Priority-Based Execution:** Systems execute in optimal order

---

## Configuration

All systems use configurable constants that can be adjusted:

**DecisionSystem:**
- Priority thresholds for different needs
- Critical/urgent/moderate thresholds

**VillagerScheduleSystem:**
- Schedule templates per profession
- Activity timings and locations

**ZombieBehaviorSystem:**
- Detection radius
- Attack range and cooldown
- Attack damage

**ThreatAssessmentSystem:**
- Detection radius (30 units)
- Memory duration (10 seconds)
- Update interval (0.5 seconds)
- Danger calculation parameters

