/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Pier
 *
 * A fishing jetty: a stone abutment on the beach, a planked walkway on pile
 * bents with cross-bracing and rope-handled railings, and a broad T-head with
 * a net shed, cargo, bollards, a boarding ladder and lanterns.
 */

import { createGableEnds, hashPosition } from '../../render/models/Materials.ts';
import { PartBatch, villagePalette, streetLamp, barrel, crate, bollard, ropeCoil, type VillagePalette } from './VillageKit.ts';
import type { Circle } from './Palisade.ts';

export interface PierOptions {
  center: { x: number; z: number };
  angle: number;
  /** Distance from the centre to start searching for the shoreline (the gate). */
  startRadius: number;
  waterLevel: number;
  heightAt: (x: number, z: number) => number;
}

export interface PierResult {
  meshes: any[];
  footprints: Circle[];
  /** Where the shore road should meet the pier. */
  landing: { x: number; z: number };
}

const WALK_WIDTH = 3.4;
const HEAD_WIDTH = 12;
const HEAD_DEPTH = 6.5;
const BENT_SPACING = 3;

export function buildPier(scene: any, opts: PierOptions): PierResult | null {
  const { center, angle, waterLevel, heightAt } = opts;
  const dir = { x: Math.cos(angle), z: Math.sin(angle) };
  const across = { x: Math.sin(angle), z: -Math.cos(angle) };
  const deckY = waterLevel + 1.05;
  const ground = (d: number) => heightAt(center.x + dir.x * d, center.z + dir.z * d);

  // Find where the beach drops below deck level, then where the water gets deep.
  let landD = -1;
  for (let d = opts.startRadius + 2; d < opts.startRadius + 140; d += 0.25) {
    if (ground(d) < deckY - 0.2) {
      landD = d;
      break;
    }
  }
  if (landD < 0) return null;
  let walkEnd = landD + 14;
  while (walkEnd < landD + 30 && waterLevel - ground(walkEnd) < 2.4) walkEnd += 0.5;

  const startD = landD - 1.2;
  const S = { x: center.x + dir.x * startD, z: center.z + dir.z * startD };
  const walkLen = walkEnd - startD;
  const toWorld = (x: number, z: number) => ({
    x: S.x + across.x * x + dir.x * z,
    z: S.z + across.z * x + dir.z * z,
  });
  /** Seabed/ground height relative to the deck at a local point. */
  const bed = (x: number, z: number) => {
    const w = toWorld(x, z);
    return heightAt(w.x, w.z) - deckY;
  };

  const pal = villagePalette(scene);
  const batch = new PartBatch(scene, 'pier');
  const f = batch.frame(S.x, deckY, S.z, Math.PI / 2 - angle);

  // ── Abutment where the walkway meets the beach ──
  const g0 = bed(0, -0.3);
  if (g0 < -0.1) {
    const h = -0.08 - (g0 - 0.5);
    batch.box(pal.stone, WALK_WIDTH + 1.0, h, 1.3, 0, -0.08 - h / 2, -0.3, { parent: f });
  }

  // ── Walkway deck ──
  deckPlanks(batch, pal, f, WALK_WIDTH, 0.2, walkLen + 0.1);
  for (const x of [-1.25, 0, 1.25]) {
    batch.box(pal.timber, 0.2, 0.24, walkLen, x, -0.18, walkLen / 2, { parent: f });
  }

  // Pile bents, braces and railing posts.
  const posts: number[] = [];
  for (let z = 0.6; z < walkLen - 0.5; z += BENT_SPACING) posts.push(z);
  posts.forEach((z, i) => {
    const half = WALK_WIDTH / 2 + 0.14;
    for (const s of [-1, 1]) pile(batch, pal, f, s * half, z, bed(s * half, z), 1.05);
    batch.box(pal.timber, WALK_WIDTH + 0.7, 0.24, 0.26, 0, -0.42, z, { parent: f });
    const low = Math.max(bed(0, z) + 0.3, -2.0);
    if (low < -0.9) {
      const s = i % 2 === 0 ? 1 : -1;
      batch.beam(pal.timber, { x: -s * half, y: -0.5, z }, { x: s * half, y: low, z }, 0.14, 0.12, false, f);
    }
  });
  for (let i = 0; i < posts.length - 1; i++) {
    for (const s of [-1, 1]) {
      const x = s * (WALK_WIDTH / 2 + 0.14);
      batch.beam(pal.timber, { x, y: 1.0, z: posts[i] }, { x, y: 1.0, z: posts[i + 1] }, 0.14, 0.14, false, f);
      batch.beam(pal.rope, { x, y: 0.55, z: posts[i] }, { x, y: 0.55, z: posts[i + 1] }, 0.06, 0.06, true, f);
    }
  }

  // ── T-head ──
  const h0 = walkLen;
  const h1 = walkLen + HEAD_DEPTH;
  deckPlanks(batch, pal, f, HEAD_WIDTH, h0, h1);
  const cols = [-5.8, -2.9, 0, 2.9, 5.8];
  const rows = [h0 + 0.3, (h0 + h1) / 2, h1 - 0.3];
  for (const x of cols) batch.box(pal.timber, 0.2, 0.24, HEAD_DEPTH, x, -0.18, (h0 + h1) / 2, { parent: f });
  for (const z of rows) {
    batch.box(pal.timber, HEAD_WIDTH + 0.4, 0.24, 0.26, 0, -0.42, z, { parent: f });
    for (const x of cols) {
      const corner = Math.abs(x) > 5 && z !== rows[1];
      pile(batch, pal, f, x, z, bed(x, z), corner ? 0.75 : -0.1);
    }
  }
  // Rub rail around the seaward edge where boats come alongside.
  batch.box(pal.timber, HEAD_WIDTH + 0.4, 0.3, 0.16, 0, -0.05, h1 + 0.1, { parent: f });
  for (const s of [-1, 1]) {
    batch.box(pal.timber, 0.16, 0.3, HEAD_DEPTH, s * (HEAD_WIDTH / 2 + 0.12), -0.05, (h0 + h1) / 2, { parent: f });
  }

  // Lanterns at the seaward corners and at the shore end.
  streetLamp(batch, pal, -HEAD_WIDTH / 2 + 0.5, 0, h1 - 0.5, Math.PI * 0.75, f);
  streetLamp(batch, pal, HEAD_WIDTH / 2 - 0.5, 0, h1 - 0.5, -Math.PI * 0.75, f);
  streetLamp(batch, pal, -WALK_WIDTH / 2 + 0.3, 0, 0.5, Math.PI / 2, f);

  for (const x of [-3.4, -0.4]) bollard(batch, pal, x, 0, h1 - 0.4, f);
  for (const s of [-1, 1]) bollard(batch, pal, s * (HEAD_WIDTH / 2 - 0.4), 0, h0 + 2.2, f);
  ropeCoil(batch, pal, -1.9, 0, h1 - 0.9, f);

  netShed(batch, pal, scene, f, 3.3, h0 + HEAD_DEPTH / 2 + 0.2);

  // Cargo waiting on the landward side of the head.
  barrel(batch, pal, -4.9, 0, h0 + 1.0, f);
  barrel(batch, pal, -4.2, 0, h0 + 1.6, f);
  barrel(batch, pal, -5.0, 0, h0 + 1.9, f);
  crate(batch, pal, 1.0, -3.0, 0, h0 + 1.3, 0.1, f);
  crate(batch, pal, 0.75, -3.0, 1.0, h0 + 1.3, 0.5, f);
  crate(batch, pal, 0.85, -2.6, 0, h0 + 2.5, -0.2, f);

  // Boarding ladder down the west side of the head.
  const lx = -HEAD_WIDTH / 2 - 0.25;
  for (const dz of [-0.3, 0.3]) {
    batch.beam(pal.timber, { x: lx, y: 0.7, z: h0 + 4.2 + dz }, { x: lx, y: -2.2, z: h0 + 4.2 + dz }, 0.1, 0.1, false, f);
  }
  for (let y = 0.3; y > -2.1; y -= 0.42) batch.box(pal.timber, 0.08, 0.07, 0.6, lx, y, h0 + 4.2, { parent: f });

  const landing = toWorld(0, -0.8);
  return {
    meshes: batch.flush(),
    footprints: [{ ...toWorld(0, 0), r: 3 }],
    landing,
  };
}

/** Deck boards laid across local X, between z0 and z1, with small gaps and ragged ends. */
function deckPlanks(batch: PartBatch, pal: VillagePalette, f: any, width: number, z0: number, z1: number): void {
  for (let z = z0 + 0.22; z < z1; z += 0.46) {
    const h = hashPosition(width, z, 21);
    const len = width + (h - 0.5) * 0.3;
    batch.box(pal.planks[Math.floor(h * 3)], len, 0.12, 0.4, (hashPosition(z, width, 5) - 0.5) * 0.14, 0, z, { parent: f });
  }
}

/** A pile from below the seabed up to `top` (deck-relative). */
function pile(batch: PartBatch, pal: VillagePalette, f: any, x: number, z: number, bedY: number, top: number): void {
  const bottom = Math.min(bedY, -0.3) - 0.6;
  batch.beam(pal.pile, { x, y: bottom, z }, { x, y: top, z }, 0.38, 0.38, true, f);
  if (top > 0.3) batch.cyl(pal.pile, { top: 0.1, bottom: 0.4, height: 0.16, tess: 6 }, x, top + 0.08, z, { parent: f });
}

function netShed(batch: PartBatch, pal: VillagePalette, scene: any, parent: any, x: number, z: number): void {
  const w = 3.6;
  const d = 2.8;
  const h = 2.3;
  const f = batch.frame(x, 0, z, 0, parent);
  batch.box(pal.planks[1], w, h, d, 0, h / 2, 0, { parent: f });
  for (const [cx, cz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
    batch.box(pal.timber, 0.2, h + 0.1, 0.2, cx * (w / 2), h / 2, cz * (d / 2), { parent: f });
  }
  // Board-and-batten strips on the long walls.
  for (let i = 1; i < 6; i++) {
    const bx = -w / 2 + (i / 6) * w;
    for (const s of [-1, 1]) batch.box(pal.timber, 0.07, h - 0.1, 0.05, bx, h / 2, s * (d / 2 + 0.03), { parent: f });
  }
  batch.box(pal.timber, 0.08, 1.9, 1.0, -w / 2 - 0.04, 0.95, 0.2, { parent: f });
  batch.box(pal.glass, 0.7, 0.5, 0.06, 0.6, 1.5, d / 2 + 0.04, { parent: f });
  batch.roof(pal.shingle, { width: w, depth: d, height: 1.2, overhang: 0.3 }, 0, h, 0, { parent: f });
  batch.add(createGableEnds(scene, 'pier_shed_gable', w, d, 1.2), pal.planks[1], 0, h, 0, { parent: f });
  // Nets hung to dry on the seaward wall.
  batch.box(pal.rope, 2.2, 1.0, 0.05, -0.4, 1.3, d / 2 + 0.08, { parent: f });
  batch.box(pal.timber, 2.6, 0.08, 0.08, -0.4, 1.85, d / 2 + 0.1, { parent: f });
}
