# 3D Village Simulation (ECS Rebuild)

The **live runtime** is the TypeScript ECS app in [`ecs-rebuild/`](../ecs-rebuild/).

[`MyHavokSimCode/`](../MyHavokSimCode/) is **reference / archive only** — behavior source for ports, not launched by `npm start` / `npm run dev`.

## Quick start

From the repo root (Vite is rooted at `ecs-rebuild/`):

```bash
npm install
npm run dev
```

Open the URL Vite prints (default port **3000**).

Or from the package itself:

```bash
cd ecs-rebuild
npm install
npm run dev
```

(`ecs-rebuild` Vite defaults to port **5173** when run from that folder.)

## Village vertical slice (current milestone)

On boot, `GameManager` loads the **VILLAGE** level:

- Bowl terrain + water (`TerrainSystem`)
- Houses, radial roads, trees, wells (`VillageSystem` + render models)
- Nav mesh (`PathfindingManager.createNavMesh`)
- Villagers with schedule / behavior / steering / pathfinding
- WorldClock UI + level selector
- Single `World.update` loop (no dual legacy orchestrators)

## Scripts

| Command | Role |
|---------|------|
| `npm run dev` / `npm start` | Vite → ECS rebuild |
| `npm run start:static` | Fastify static shell (does **not** transpile TS; prefer Vite) |
| `npm run build` | Vite production build of ecs-rebuild |

## Legacy code

Do not wire `MyHavokSimCode/Havokimport.js` (`LeoScene`) as the app entry. Use those modules only as behavior references while completing ECS ports.

See also [`ecs-rebuild/REFACTOR_CHECKLIST.md`](../ecs-rebuild/REFACTOR_CHECKLIST.md).
