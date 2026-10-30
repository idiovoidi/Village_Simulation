# ECS Refactoring Checklist

Status means **wired into the live `GameManager` / `World` loop**, not merely "file exists on disk".

---

## Live bootstrap (GameManager)

| Item | Wired | Notes |
|------|-------|-------|
| World ECS | Yes | Sole live core |
| Atmosphere (sky shader, fog, shadows, post-FX) | Yes | `AtmosphereManager`; driven by `LightingManager` |
| Lighting + day/night | Yes | Sun/moon direction, colour, lit windows at night |
| Camera (RTS pan / orbit / follow) | Yes | Terrain-following target, bounds-clamped |
| HUD (clock, scenarios, speed, stats, inspector, toasts) | Yes | `src/ui/Hud.ts` + `hud.css`; replaces Babylon GUI widgets |
| Terrain + water | Yes | Slope/height colouring, optional bay/lake, depth-shaded water |
| Village (houses, ring + spoke roads, plaza, wells, market) | Yes | Seeded, dry-land-only placement |
| Scatter (grass, flowers, rocks, bushes, forest) | Yes | Thin instances |
| Villagers (schedule, behaviour, survival, threat) | Yes | |
| Zombies (behaviour + infection) | Yes | `InfectionSystem` converts dead villagers |
| Dogs | Yes | `DogBehaviorSystem` → `SteeringSystem` |
| Birds / Fish / Boats | Yes | `WildlifeSystem` (own movement; no ground Steering) |
| Animation (gait, wings, tails) | Yes | `AnimationSystem` |
| Steering / Pathfinding / Decision | Yes | Steering faces travel direction, avoids water |
| In-place level switching | Yes | No page reload |
| Pause / 1× / 3× / 10× | Yes | Bounded sub-steps keep the sim stable |
| Entity picking + inspector + follow cam | Yes | |

## Not wired / deferred

| Item | Status |
|------|--------|
| `FlockingSystem` | Exists, unused: birds/fish are handled by `WildlifeSystem` |
| `DinosaurBehaviorSystem`, `BoatNavigationSystem`, `FishSwimSystem` | Exist, unused (superseded by `WildlifeSystem`) |
| `EffectsSystem` (blood decals/particles) | Exists, unused (level config has `bloodParticles`) |
| `PerformanceSystem`, `NavigationMesh` | Exist, unused |
| PhysicsSystem tests | **Skipped**: written for an older raw-Havok API; need a new mock |

## Removed

`SimulationCore`, `SimulationSetup` (deprecated DI bootstrap), `CloudSystem` and `WaterSimulation`
(superseded by the sky shader and terrain water), `LevelSelector` and `WorldClock` (Babylon GUI, replaced by the HUD).

## Ideas for next

1. Wire `EffectsSystem` for zombie-level blood effects
2. Let villagers take shelter in houses when threatened (`isInsideHome` exists)
3. Rewrite the PhysicsSystem tests against `HavokPlugin` / `PhysicsAggregate`
4. Pin Babylon CDN versions in `index.html` (currently "latest")
5. Replace the remaining `any`-typed Babylon access with real types
