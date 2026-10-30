# Village Sim (ECS rebuild)

A low-poly 3D village simulation: Babylon.js + Havok in the browser, with a TypeScript
entity-component-system underneath. Five scenarios (Village, Zombie Apocalypse, Zombie Invasion,
Nature Reserve, Coastal Village) with a full day/night cycle.

## Run

From the repo root:

```bash
npm run dev        # Vite, http://localhost:3000
```

or from this folder: `pnpm dev`. Babylon.js and Havok are loaded from the CDN (see `index.html`),
so you need a network connection.

```bash
pnpm type-check    # tsc --noEmit
pnpm test          # node --test (Node 22.6+/24, uses --experimental-transform-types)
pnpm build         # tsc && vite build
```

> This folder keeps its own pnpm virtual store (`.npmrc`). A globally shared `virtual-store-dir`
> lets the repo root and this project prune each other's packages on every install.

## Controls

| Input | Action |
|-------|--------|
| `W A S D` / arrows | Pan across the ground (Shift = faster) |
| `Q` / `E` | Rotate |
| Mouse wheel / `R` `F` | Zoom |
| Left-drag / right-drag | Orbit / pan |
| Click a creature | Inspect (health, needs, state); **Follow** to chase-cam |
| `Space` | Pause |
| HUD | Scenario menu, 1× / 3× / 10× speed |

## Layout

```
src/
  core/         ECS: World, Entity, ComponentStorage, System
  components/   Plain-data components
  factories/    EntityFactory (entity recipes), SpawnFactory
  systems/      ECS systems
    ai/           villager / zombie / dog / wildlife / infection / steering / pathfinding
    environment/  terrain + water, instanced scatter and forests
    village/      houses, roads, plaza
    survival/     hunger / thirst / energy
  render/       Procedural models (shared materials, merged meshes) and animation helpers
  managers/     GameManager (boot, levels, loop), Atmosphere, Lighting, Camera, Pathfinding
  ui/           DOM HUD
  utils/        math, noise, orientation, spatial grid, logger…
```

Frame order: `GameManager.update` → sub-stepped `World.update` (AI → steering → wildlife →
infection → physics → render → animation) → HUD refresh at 4 Hz.

## Adding a scenario

Add an entry to `LEVELS` in `src/systems/level/LevelConfig.ts`. The HUD menu picks it up
automatically. Notable options: `bay` (carve a lake/sea), `forestDensity`, `startHour`,
`boatCount`, `specialEffects.redSky` / `fog`.

## Debugging

`window.__village` exposes the `GameManager` in the browser console
(`__village.getWorld()`, `__village.switchLevel('COASTAL')`, `__village.setSpeed(10)`…).
