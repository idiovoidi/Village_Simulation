# ECS Refactoring Checklist

## Progress: Village Vertical Slice (wiring-focused)

Status below means **wired into the live GameManager / World loop**, not merely "file exists on disk".

---

## Live bootstrap (GameManager)

| Item | Wired | Notes |
|------|-------|-------|
| World ECS | Yes | Sole live core |
| PhysicsSystem | Yes | Havok CDN |
| RenderSystem | Yes | Creatures + house/tree/well/field |
| Steering / Pathfinding / Flocking / Decision | Yes | |
| VillagerSchedule + VillagerBehavior | Yes | |
| Hunger / Thirst / Energy | Yes | |
| ThreatAssessment | Yes | No zombies spawned in peaceful slice |
| TerrainSystem (bowl + water) | Yes | Single water owner |
| VillageSystem (houses, roads, trees, wells) | Yes | Radial roads |
| PathfindingManager.createNavMesh | Yes | Height + water aware |
| SpawnFactory villagers | Yes | Terrain height |
| WorldClock | Yes | Ticks with TimeOfDay |
| LevelSelector + LevelConfig | Yes | VILLAGE primary; others slice-only |
| SimulationCore / SimulationSetup | **No** | Deprecated exports; not live path |

---

## Exists on disk but deferred (not vertical-slice)

| Item | Status |
|------|--------|
| Zombie / Dog / Fish / Bird / Boat / Dinosaur AI | Deferred |
| CloudSystem, WaterSimulation (standalone) | Deferred (terrain owns water) |
| DayNightCycle, RockSystem | Pending port |
| EffectsSystem, PerformanceSystem | Deferred |
| Full road network parity | Deferred (radial roads shipped) |

---

## Phase 13 — Integration

| # | Item | Status |
|---|------|--------|
| 13.1 | TypeScript / babylon ambient types | Improved (CDN globals d.ts) |
| 13.2 | Browser village slice | Target of this milestone |
| 13.3 | Root entry = Vite ecs-rebuild | Done (`npm run dev` / `npm start`) |
| 13.4 | Legacy MyHavokSimCode | Reference / archive only |

---

## Next after slice

1. Port DayNightCycle / RockSystem if needed
2. Wire additional creature AI per level flags
3. Expand PerformanceSystem selectively
4. Delete or quarantine unused SimulationSetup path
