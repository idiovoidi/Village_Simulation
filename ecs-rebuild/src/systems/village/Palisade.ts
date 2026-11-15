/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Palisade
 *
 * A ring of sharpened log stakes with inner wale rails, roofed timber
 * gatehouses (gates swung open, lanterns either side) and corner watchtowers.
 * The ring wobbles gently so it reads hand-built, and breaks wherever the
 * ground drops into water.
 */

import { hashPosition } from '../../render/models/Materials.ts';
import { PartBatch, villagePalette, lantern, type VillagePalette } from './VillageKit.ts';

export interface Segment {
  ax: number;
  az: number;
  bx: number;
  bz: number;
  w: number;
}

export interface Circle {
  x: number;
  z: number;
  r: number;
}

export interface GateInfo {
  angle: number;
  /** Centre of the opening on the wall line. */
  x: number;
  z: number;
  radius: number;
}

export interface PalisadeOptions {
  center: { x: number; z: number };
  radius: number;
  gateAngles: number[];
  gateWidth: number;
  heightAt: (x: number, z: number) => number;
  isDry: (x: number, z: number) => boolean;
  seed: number;
}

export interface PalisadeResult {
  meshes: any[];
  barriers: Segment[];
  footprints: Circle[];
  gates: GateInfo[];
  /** Wall line radius at an angle (the ring wobbles). */
  radiusAt: (angle: number) => number;
}

const LOG_SPACING = 0.5;
const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));

export function buildPalisade(scene: any, opts: PalisadeOptions): PalisadeResult {
  const pal = villagePalette(scene);
  const batch = new PartBatch(scene, 'palisade');
  const { center, gateAngles, gateWidth, heightAt, isDry } = opts;
  const phase = (opts.seed % 997) * 0.013;
  const radiusAt = (a: number) =>
    opts.radius + Math.sin(a * 3 + phase) * 0.7 + Math.sin(a * 7 + phase * 2) * 0.35;
  const at = (a: number, r = radiusAt(a)) => ({
    x: center.x + Math.cos(a) * r,
    z: center.z + Math.sin(a) * r,
  });

  const barriers: Segment[] = [];
  const footprints: Circle[] = [];
  const gates: GateInfo[] = [];

  // ── Stakes ──
  type Stake = { a: number; x: number; z: number; ground: number };
  const runs: Stake[][] = [];
  let run: Stake[] = [];
  const endRun = () => {
    if (run.length > 1) runs.push(run);
    run = [];
  };

  // Start the sweep at a gate so runs never wrap across angle 0.
  const start = gateAngles[0] ?? 0;
  const step = LOG_SPACING / opts.radius;
  const count = Math.floor((Math.PI * 2) / step);
  for (let i = 0; i < count; i++) {
    const a = start + i * step;
    const r = radiusAt(a);
    const nearGate = gateAngles.some((g) => Math.abs(wrap(a - g)) * r < gateWidth / 2 + 0.95);
    const p = at(a, r);
    if (nearGate || !isDry(p.x, p.z)) {
      endRun();
      continue;
    }
    const h1 = hashPosition(p.x, p.z, 11);
    const h2 = hashPosition(p.x, p.z, 12);
    const ground = heightAt(p.x, p.z);
    const height = 3.5 + h1 * 0.75 + (i % 9 === 0 ? 0.35 : 0);
    const diameter = 0.46 + h2 * 0.1;
    const mat = pal.logs[Math.floor(h2 * pal.logs.length)];
    const bodyLen = height + 0.6;
    batch.cyl(mat, { top: diameter * 0.92, bottom: diameter, height: bodyLen }, p.x, ground - 0.6 + bodyLen / 2, p.z);
    batch.cyl(mat, { top: 0.02, bottom: diameter * 0.92, height: 0.55 + h1 * 0.2 }, p.x, ground + height + 0.3 + h1 * 0.1, p.z);
    run.push({ a, x: p.x, z: p.z, ground });
  }
  endRun();

  // ── Inner wale rails and collision barriers, every few stakes ──
  for (const r of runs) {
    const anchors: Stake[] = [];
    for (let i = 0; i < r.length; i += 7) anchors.push(r[i]);
    if (anchors[anchors.length - 1] !== r[r.length - 1]) anchors.push(r[r.length - 1]);
    for (let i = 0; i < anchors.length - 1; i++) {
      const s0 = anchors[i];
      const s1 = anchors[i + 1];
      const p0 = at(s0.a, radiusAt(s0.a) - 0.36);
      const p1 = at(s1.a, radiusAt(s1.a) - 0.36);
      for (const h of [1.1, 2.75]) {
        batch.beam(pal.timber, { x: p0.x, y: s0.ground + h, z: p0.z }, { x: p1.x, y: s1.ground + h, z: p1.z }, 0.24);
      }
      // A raking prop every other bay braces the wall from inside.
      if (i % 2 === 0) {
        const foot = at(s0.a, radiusAt(s0.a) - 2.1);
        batch.beam(pal.timber, { x: foot.x, y: heightAt(foot.x, foot.z) - 0.1, z: foot.z }, { x: p0.x, y: s0.ground + 2.6, z: p0.z }, 0.22);
      }
      barriers.push({ ax: s0.x, az: s0.z, bx: s1.x, bz: s1.z, w: 1.1 });
    }
  }

  // ── Gatehouses ──
  for (const g of gateAngles) {
    const r = radiusAt(g);
    const c = at(g, r);
    if (!isDry(c.x, c.z)) continue;
    const ground = heightAt(c.x, c.z);
    const f = batch.frame(c.x, ground, c.z, Math.PI / 2 - g);
    buildGatehouse(batch, pal, f, gateWidth);
    gates.push({ angle: g, x: c.x, z: c.z, radius: r });
    const side = { x: Math.sin(g), z: -Math.cos(g) };
    for (const s of [-1, 1]) {
      const off = s * (gateWidth / 2 + 0.45);
      footprints.push({ x: c.x + side.x * off, z: c.z + side.z * off, r: 1.2 });
    }
  }

  // ── Watchtowers midway between gates ──
  const sorted = [...gateAngles].sort((a, b) => a - b);
  for (let i = 0; i < sorted.length; i++) {
    const a0 = sorted[i];
    const a1 = i + 1 < sorted.length ? sorted[i + 1] : sorted[0] + Math.PI * 2;
    if (a1 - a0 < 0.9) continue;
    const a = (a0 + a1) / 2;
    const p = at(a, radiusAt(a) - 2.15);
    if (!isDry(p.x, p.z)) continue;
    const f = batch.frame(p.x, heightAt(p.x, p.z), p.z, Math.PI / 2 - a);
    buildWatchtower(batch, pal, f);
    footprints.push({ x: p.x, z: p.z, r: 2.8 });
  }

  return { meshes: batch.flush(), barriers, footprints, gates, radiusAt };
}

/** Local frame: +Z points out of the village, X runs along the wall. */
function buildGatehouse(batch: PartBatch, pal: VillagePalette, f: any, width: number): void {
  const half = width / 2;
  const postX = half + 0.45;

  for (const s of [-1, 1]) {
    // Paired heavy posts with sharpened tops.
    for (const z of [-0.34, 0.34]) {
      batch.cyl(pal.logs[1], { top: 0.68, bottom: 0.76, height: 6.2 }, s * postX, 2.3, z, { parent: f });
      batch.cyl(pal.logs[1], { top: 0.02, bottom: 0.68, height: 0.75 }, s * postX, 5.78, z, { parent: f });
    }
    // Lanterns on brackets, one facing out and one facing in.
    for (const z of [1, -1]) {
      batch.box(pal.timber, 0.12, 0.12, 0.8, s * postX, 3.65, z * 0.72, { parent: f });
      lantern(batch, pal, s * postX, 3.62, z * 1.05, f);
    }
    // Swung-open leaf, hinged just inside the opening.
    const dir = { x: -s * 0.24, z: -0.97 };
    const leaf = batch.frame(s * (half - 0.05), 0, -0.4, Math.atan2(-dir.z, dir.x), f);
    buildGateLeaf(batch, pal, leaf, half - 0.12);
  }

  // Lintels and a little shingled roof over the passage.
  batch.beam(pal.timber, { x: -postX - 1.0, y: 4.6, z: 0 }, { x: postX + 1.0, y: 4.6, z: 0 }, 0.52, 0.52, true, f);
  batch.box(pal.timber, width + 0.6, 0.26, 0.3, 0, 4.05, 0, { parent: f });
  for (const s of [-1, 1]) {
    batch.beam(pal.timber, { x: s * (half - 0.1), y: 4.05, z: 0 }, { x: s * (postX - 0.2), y: 3.3, z: 0 }, 0.18, 0.18, false, f);
  }
  batch.roof(pal.shingle, { width: width + 2.6, depth: 1.9, height: 1.05, overhang: 0.25 }, 0, 4.86, 0, { parent: f });
  batch.cyl(pal.timber, { top: 0.16, bottom: 0.16, height: width + 3.2, tess: 6 }, 0, 5.91, 0, { parent: f, rz: Math.PI / 2 });
}

/** Leaf built from vertical boards along local +X from the hinge. */
function buildGateLeaf(batch: PartBatch, pal: VillagePalette, f: any, width: number): void {
  const boards = 5;
  const bw = width / boards;
  for (let i = 0; i < boards; i++) {
    const h = 3.0 + (i % 2) * 0.16;
    batch.box(pal.planks[(i + 1) % 3], bw - 0.04, h, 0.14, (i + 0.5) * bw, 0.18 + h / 2, 0, { parent: f });
  }
  for (const y of [0.75, 2.55]) {
    batch.box(pal.timber, width - 0.1, 0.22, 0.1, width / 2, y, -0.12, { parent: f });
    batch.box(pal.iron, 0.55, 0.09, 0.16, 0.28, y, 0.04, { parent: f });
  }
  batch.beam(pal.timber, { x: 0.3, y: 0.85, z: -0.12 }, { x: width - 0.3, y: 2.45, z: -0.12 }, 0.16, 0.1, false, f);
}

/** Square timber tower standing just inside the wall. Local +Z faces outward. */
function buildWatchtower(batch: PartBatch, pal: VillagePalette, f: any): void {
  const L = 1.35;
  const deck = 4.7;
  const top = 6.6;
  const corners = [
    [-L, -L],
    [L, -L],
    [L, L],
    [-L, L],
  ];
  for (const [x, z] of corners) {
    batch.cyl(pal.logs[0], { top: 0.38, bottom: 0.46, height: top + 0.6 }, x, (top - 0.6) / 2, z, { parent: f });
  }
  // X-bracing on every face below the deck.
  for (let i = 0; i < 4; i++) {
    const [x0, z0] = corners[i];
    const [x1, z1] = corners[(i + 1) % 4];
    batch.beam(pal.timber, { x: x0, y: 0.5, z: z0 }, { x: x1, y: deck - 0.4, z: z1 }, 0.16, 0.12, false, f);
    batch.beam(pal.timber, { x: x1, y: 0.5, z: z1 }, { x: x0, y: deck - 0.4, z: z0 }, 0.16, 0.12, false, f);
    batch.beam(pal.timber, { x: x0, y: deck - 0.2, z: z0 }, { x: x1, y: deck - 0.2, z: z1 }, 0.22, 0.22, false, f);
  }
  batch.box(pal.planks[0], 3.5, 0.22, 3.5, 0, deck, 0, { parent: f });

  // Parapet of vertical boards on the outward and side faces; rail on the inside.
  const boards = 9;
  for (let side = 0; side < 3; side++) {
    for (let b = 0; b < boards; b++) {
      const t = -L + ((b + 0.5) / boards) * 2 * L;
      const h = 1.05 + (b % 2) * 0.1;
      const mat = pal.planks[(b + side) % 3];
      const y = deck + 0.1 + h / 2;
      if (side === 0) batch.box(mat, 0.28, h, 0.1, t, y, L + 0.05, { parent: f });
      else batch.box(mat, 0.1, h, 0.28, side === 1 ? L + 0.05 : -L - 0.05, y, t, { parent: f });
    }
  }
  batch.beam(pal.timber, { x: -L, y: deck + 1.0, z: -L }, { x: L, y: deck + 1.0, z: -L }, 0.14, 0.14, false, f);

  // Pyramid roof, finial and pennant.
  batch.cyl(pal.shingle, { top: 0, bottom: 5.0, height: 1.7, tess: 4 }, 0, top + 0.85, 0, { parent: f, ry: Math.PI / 4 });
  batch.cyl(pal.timber, { top: 0.06, bottom: 0.08, height: 1.6, tess: 5 }, 0, top + 2.2, 0, { parent: f });
  const flag = batch.cyl(pal.pennant, { top: 1, bottom: 1, height: 0.04, tess: 3 }, 0.5, top + 2.65, 0, { parent: f, rx: Math.PI / 2 });
  flag.scaling.x = 1.5;
  flag.scaling.z = 0.6;

  // Ladder up the inner face and a lantern under the deck.
  for (const x of [-0.35, 0.35]) {
    batch.beam(pal.timber, { x, y: 0, z: -L - 0.75 }, { x, y: deck + 0.9, z: -L - 0.05 }, 0.1, 0.1, false, f);
  }
  for (let i = 1; i < 11; i++) {
    const t = i / 11;
    batch.box(pal.timber, 0.7, 0.07, 0.09, 0, t * (deck + 0.9), -L - 0.75 + t * 0.7, { parent: f });
  }
  lantern(batch, pal, L, deck - 0.15, -L - 0.25, f);
}
