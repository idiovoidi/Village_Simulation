/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * VillageDressing
 *
 * Small-scale set dressing that makes the village feel lived in: picket-fenced
 * kitchen gardens, woodpiles, plaza benches and woodcutters' work yards.
 * Every builder authors in a local frame whose +Z points away from the
 * village centre.
 */

import { hashPosition } from '../../render/models/Materials.ts';
import type { PartBatch, VillagePalette } from './VillageKit.ts';

export const GARDEN_HALF_WIDTH = 2.7;
export const GARDEN_HALF_DEPTH = 2.2;

/** Fenced vegetable plot. The gate is on the -Z side, facing the house. */
export function garden(batch: PartBatch, pal: VillagePalette, x: number, y: number, z: number, yaw: number): void {
  const f = batch.frame(x, y, z, yaw);
  const h = hashPosition(x, z, 31);
  const whitewashed = h > 0.45;
  const picketMat = whitewashed ? pal.picket : pal.planks[2];
  const W = GARDEN_HALF_WIDTH;
  const D = GARDEN_HALF_DEPTH;

  // Beds of turned soil with three kinds of crop.
  for (let row = 0; row < 3; row++) {
    const rz = (row - 1) * 1.15;
    batch.box(pal.soil, 2 * W - 0.6, 0.24, 0.8, 0, 0.02, rz, { parent: f });
    const kind = (Math.floor(h * 3) + row) % 3;
    for (let i = 0; i < 6; i++) {
      const cx = -W + 0.65 + i * ((2 * W - 1.3) / 5);
      const j = hashPosition(cx + x, rz + z, 7);
      if (kind === 0) {
        batch.ico(j > 0.5 ? pal.leaf : pal.leafDark, 0.22 + j * 0.06, cx, 0.22, rz, 0.7, { parent: f });
      } else if (kind === 1) {
        batch.cyl(pal.leafDark, { top: 0.04, bottom: 0.22, height: 0.6 + j * 0.25, tess: 5 }, cx, 0.45, rz, { parent: f });
      } else if (i % 2 === 0) {
        batch.ico(pal.pumpkin, 0.24, cx, 0.24, rz, 0.72, { parent: f });
        batch.ico(pal.leafDark, 0.18, cx + 0.3, 0.2, rz + 0.15, 0.6, { parent: f });
      } else {
        batch.ico(pal.leaf, 0.2, cx, 0.2, rz, 0.6, { parent: f });
      }
    }
  }

  // Picket fence with a gap for the gate on the house side.
  const pickets = (ax: number, az: number, bx: number, bz: number) => {
    const len = Math.hypot(bx - ax, bz - az);
    const n = Math.max(1, Math.round(len / 0.3));
    const along = Math.abs(bx - ax) > Math.abs(bz - az);
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      const ph = 0.82 + (i % 2) * 0.08;
      batch.box(picketMat, along ? 0.1 : 0.05, ph, along ? 0.05 : 0.1, ax + (bx - ax) * t, ph / 2 - 0.08, az + (bz - az) * t, { parent: f });
    }
    for (const ry of [0.24, 0.58]) {
      batch.beam(picketMat, { x: ax, y: ry, z: az }, { x: bx, y: ry, z: bz }, 0.07, 0.07, false, f);
    }
  };
  pickets(-W, D, W, D);
  pickets(-W, -D, -W, D);
  pickets(W, -D, W, D);
  pickets(-W, -D, -0.6, -D);
  pickets(0.6, -D, W, -D);
  for (const [cx, cz] of [[-W, -D], [W, -D], [W, D], [-W, D], [-0.6, -D], [0.6, -D]]) {
    batch.box(pal.timber, 0.14, 1.05, 0.14, cx, 0.42, cz, { parent: f });
  }

  if (hashPosition(x, z, 33) > 0.55) scarecrow(batch, pal, -W + 0.8, D - 0.45, f);
}

function scarecrow(batch: PartBatch, pal: VillagePalette, x: number, z: number, f: any): void {
  batch.cyl(pal.timber, { top: 0.07, bottom: 0.08, height: 2.1, tess: 5 }, x, 0.9, z, { parent: f });
  batch.box(pal.timber, 1.4, 0.07, 0.07, x, 1.5, z, { parent: f });
  batch.box(pal.cloth, 0.6, 0.62, 0.3, x, 1.35, z, { parent: f });
  batch.box(pal.straw, 0.2, 0.18, 0.18, x - 0.75, 1.5, z, { parent: f });
  batch.box(pal.straw, 0.2, 0.18, 0.18, x + 0.75, 1.5, z, { parent: f });
  batch.ico(pal.straw, 0.2, x, 1.9, z, 1, { parent: f });
  batch.cyl(pal.straw, { top: 0.72, bottom: 0.72, height: 0.04, tess: 10 }, x, 2.05, z, { parent: f });
  batch.cyl(pal.straw, { top: 0.04, bottom: 0.4, height: 0.32, tess: 8 }, x, 2.22, z, { parent: f });
}

/** Stacked firewood with a chopping stump. */
export function woodpile(batch: PartBatch, pal: VillagePalette, x: number, y: number, z: number, yaw: number): void {
  const f = batch.frame(x, y, z, yaw);
  const rows = [5, 4, 3];
  rows.forEach((n, row) => {
    for (let i = 0; i < n; i++) {
      const lx = (i - (n - 1) / 2) * 0.3;
      const mat = pal.logs[(i + row) % 3];
      batch.cyl(mat, { top: 0.28, bottom: 0.28, height: 1.5, tess: 6 }, lx, 0.14 + row * 0.25, 0, { parent: f, rx: Math.PI / 2 });
    }
  });
  stump(batch, pal, 1.3, -0.3, f);
}

function stump(batch: PartBatch, pal: VillagePalette, x: number, z: number, f: any): void {
  batch.cyl(pal.logs[1], { top: 0.6, bottom: 0.7, height: 0.55, tess: 8 }, x, 0.25, z, { parent: f });
  // Axe left in the block.
  batch.beam(pal.timber, { x, y: 0.55, z }, { x: x + 0.35, y: 1.15, z: z + 0.1 }, 0.06, 0.06, false, f);
  batch.box(pal.iron, 0.24, 0.14, 0.04, x + 0.04, 0.6, z, { parent: f, rz: 0.5 });
}

/** Woodcutter's yard: sawhorse, log pile, stump and a few rounds. */
export function workyard(batch: PartBatch, pal: VillagePalette, x: number, y: number, z: number, yaw: number): void {
  const f = batch.frame(x, y, z, yaw);
  // Sawhorse with a log across it.
  for (const sx of [-0.55, 0.55]) {
    batch.beam(pal.timber, { x: sx, y: 0, z: -0.35 }, { x: sx, y: 0.85, z: 0 }, 0.09, 0.09, false, f);
    batch.beam(pal.timber, { x: sx, y: 0, z: 0.35 }, { x: sx, y: 0.85, z: 0 }, 0.09, 0.09, false, f);
  }
  batch.beam(pal.logs[0], { x: -1.3, y: 0.95, z: 0 }, { x: 1.4, y: 0.95, z: 0 }, 0.34, 0.34, true, f);
  // Untrimmed trunks waiting their turn.
  for (let i = 0; i < 3; i++) {
    batch.beam(pal.logs[i], { x: -1.8, y: 0.25 + (i === 2 ? 0.4 : 0), z: 1.4 + i * 0.45 - (i === 2 ? 0.67 : 0) }, { x: 1.8, y: 0.25 + (i === 2 ? 0.4 : 0), z: 1.4 + i * 0.45 - (i === 2 ? 0.67 : 0) }, 0.5, 0.5, true, f);
  }
  stump(batch, pal, -1.6, -1.2, f);
  for (const [rx, rz] of [[-0.9, -1.6], [-1.15, -1.95]]) {
    batch.cyl(pal.logs[2], { top: 0.42, bottom: 0.42, height: 0.32, tess: 7 }, rx, 0.16, rz, { parent: f });
  }
}

/** Plank bench on stone feet; sitters face local -Z. */
export function bench(batch: PartBatch, pal: VillagePalette, x: number, y: number, z: number, yaw: number): void {
  const f = batch.frame(x, y, z, yaw);
  batch.box(pal.planks[0], 1.7, 0.1, 0.46, 0, 0.48, 0, { parent: f });
  batch.box(pal.planks[1], 1.7, 0.36, 0.08, 0, 0.84, 0.22, { parent: f });
  for (const sx of [-0.65, 0.65]) {
    batch.box(pal.stone, 0.16, 0.48, 0.42, sx, 0.22, 0, { parent: f });
    batch.box(pal.timber, 0.08, 0.5, 0.08, sx, 0.7, 0.22, { parent: f });
  }
}
