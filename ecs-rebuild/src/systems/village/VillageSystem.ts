/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Village System
 *
 * Lays out a walled village: a cobbled plaza, main streets running out to
 * four palisade gates (one of them down to the pier on coastal maps), a
 * winding ring lane, and houses clustered along the streets with footpaths,
 * kitchen gardens, woodpiles, lamps and work yards.
 *
 * Layout is seeded so a given level always looks the same; everything is
 * placed on dry land and clear of everything else.
 */

import { System } from '../../core/System.ts';
import type { World } from '../../core/World.ts';
import type { EntityId } from '../../core/Entity.ts';
import type { EntityFactory } from '../../factories/EntityFactory.ts';
import { TerrainSystem } from '../environment/TerrainSystem.ts';
import { Random } from '../../utils/Random.ts';
import { PartBatch, villagePalette, streetLamp } from './VillageKit.ts';
import { buildPalisade, type GateInfo, type Segment } from './Palisade.ts';
import { buildPier } from './Pier.ts';
import { VillageWall } from '../navigation/VillageWall.ts';
import { garden, woodpile, workyard, bench, GARDEN_HALF_DEPTH, GARDEN_HALF_WIDTH } from './VillageDressing.ts';

export interface VillageConfig {
  villageRadius: number;
  houseCount: number;
  includeMarket: boolean;
  includeGardens: boolean;
  dockAngle?: number;
  seed: number;
}

const DEFAULT_CONFIG: VillageConfig = {
  villageRadius: 60,
  houseCount: 15,
  includeMarket: true,
  includeGardens: true,
  seed: 1337,
};

/** Circular keep-out zone used for placement and scatter. */
interface Footprint {
  x: number;
  z: number;
  r: number;
}

interface Point {
  x: number;
  z: number;
}

/** Where villagers eat, drink and work. GameManager turns these into POIs. */
export interface CivicSpots {
  market: Point | null;
  wells: Point[];
  work: Point[];
}

const PLAZA_RADIUS = 7;
const MAIN_STREET_WIDTH = 3.2;
const LANE_WIDTH = 2.2;
const PATH_WIDTH = 1.3;
const GATE_WIDTH = 5.6;
const HOUSE_RADIUS = 4.6;
/** Distance from a house centre to the spot in front of its door. */
const DOOR_OFFSET = 3.3;

export class VillageSystem extends System {
  readonly componentSignature = new Set(['Village']);
  readonly priority = 15;

  private scene: any = null;
  private config: VillageConfig;
  private entityFactory: EntityFactory;
  private terrainSystem: TerrainSystem | null = null;
  private rng: Random;

  private houses: EntityId[] = [];
  private housePoints: Point[] = [];
  private decorations: EntityId[] = [];
  private meshes: any[] = [];
  private footprints: Footprint[] = [];
  private roadSegments: Segment[] = [];
  private barriers: Segment[] = [];
  private mainStreets: Segment[] = [];
  private laneSegments: Segment[] = [];
  private civic: CivicSpots = { market: null, wells: [], work: [] };
  private gates: GateInfo[] = [];
  private wallRadius = 0;
  private initialized = false;
  private fountainObserver: any = null;

  private centerOffset = { x: 0, y: 0, z: 0 };

  constructor(
    world: World,
    scene: unknown,
    entityFactory: EntityFactory,
    config: Partial<VillageConfig> = {}
  ) {
    super(world);
    this.scene = scene;
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.entityFactory = entityFactory;
    this.rng = new Random(this.config.seed);
  }

  setTerrainSystem(terrainSystem: TerrainSystem): void {
    this.terrainSystem = terrainSystem;
  }

  async initialize(): Promise<void> {
    if (this.initialized) {
      console.warn('VillageSystem already initialized');
      return;
    }

    this.centerOffset.y = this.getTerrainHeight(0, 0);
    this.wallRadius = this.config.villageRadius * 0.92 + 2;

    this.createPlaza();
    this.reserveCivicSpots();
    this.createPalisade();
    const landing = this.config.dockAngle !== undefined ? this.createPier(this.config.dockAngle) : null;
    this.createStreets(landing);
    this.createHouses();
    this.createFootpaths();
    this.createDressing();
    this.createTrees();

    this.initialized = true;
  }

  /** True when (x,z) is within `margin` of a building, plaza, well, road or wall. */
  isOccupied(x: number, z: number, margin = 0): boolean {
    return !this.isClear(x, z, margin, margin, margin);
  }

  private isClear(
    x: number,
    z: number,
    footprintMargin: number,
    roadMargin: number,
    wallMargin: number,
    ignore?: Footprint
  ): boolean {
    for (const f of this.footprints) {
      if (f !== ignore && Math.hypot(x - f.x, z - f.z) < f.r + footprintMargin) return false;
    }
    for (const s of this.roadSegments) {
      if (this.distToSegment(x, z, s) < s.w / 2 + roadMargin) return false;
    }
    for (const s of this.barriers) {
      if (this.distToSegment(x, z, s) < s.w / 2 + wallMargin) return false;
    }
    return true;
  }

  private closestOnSegment(px: number, pz: number, s: Segment): Point {
    const dx = s.bx - s.ax;
    const dz = s.bz - s.az;
    const len2 = dx * dx + dz * dz || 1;
    const t = Math.max(0, Math.min(1, ((px - s.ax) * dx + (pz - s.az) * dz) / len2));
    return { x: s.ax + t * dx, z: s.az + t * dz };
  }

  private distToSegment(px: number, pz: number, s: Segment): number {
    const c = this.closestOnSegment(px, pz, s);
    return Math.hypot(px - c.x, pz - c.z);
  }

  private isDry(x: number, z: number, clearance = 1.1): boolean {
    const waterLevel = this.terrainSystem?.getConfig().waterLevel ?? -2;
    return this.getTerrainHeight(x, z) > waterLevel + clearance;
  }

  private gateAngleCache: number[] | null = null;

  /** Four gates; the first lines up with the dock, the rest wander a little. */
  private get gateAngles(): number[] {
    if (!this.gateAngleCache) {
      const base = this.config.dockAngle ?? 0;
      const jitter = new Random(this.config.seed + 17);
      this.gateAngleCache = [0, 1, 2, 3].map(
        (k) => base + (k * Math.PI) / 2 + (k === 0 ? 0 : jitter.nextFloat(-0.2, 0.2))
      );
    }
    return this.gateAngleCache;
  }

  // ── Civic spots ─────────────────────────────────────────────────

  /**
   * Market, wells and work yards are fixed before houses so homes grow
   * around them rather than on top of them.
   */
  private reserveCivicSpots(): void {
    const R = this.config.villageRadius;
    const gateLines = this.gateAngles;
    const offStreet = (x: number, z: number, clearance: number) =>
      gateLines.every((g) => {
        const along = x * Math.cos(g) + z * Math.sin(g);
        const across = Math.abs(-x * Math.sin(g) + z * Math.cos(g));
        return along < 0 || across > clearance;
      });
    const settle = (x0: number, z0: number, r: number, clearance: number): Point | null => {
      const a0 = Math.atan2(z0, x0);
      const d0 = Math.hypot(x0, z0);
      for (const da of [0, 0.12, -0.12, 0.24, -0.24, 0.38, -0.38]) {
        for (const dd of [0, 2.5, -2.5]) {
          const x = Math.cos(a0 + da) * (d0 + dd);
          const z = Math.sin(a0 + da) * (d0 + dd);
          if (!this.isDry(x, z, 1.2) || !offStreet(x, z, clearance)) continue;
          if (!this.isClear(x, z, r, r, r)) continue;
          return { x, z };
        }
      }
      return null;
    };

    if (this.config.includeMarket) {
      const p = settle(R * 0.4, R * 0.2, 6.5, 6.5 + MAIN_STREET_WIDTH / 2 + 0.5);
      if (p) {
        this.civic.market = p;
        this.entityFactory.createField({
          position: { x: p.x, y: this.getTerrainHeight(p.x, p.z), z: p.z },
          fieldType: 'market',
        });
        this.footprints.push({ x: p.x, z: p.z, r: 6.5 });
      }
    }

    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2 + 0.5;
      const p = settle(Math.cos(a) * R * 0.32, Math.sin(a) * R * 0.32, 2, 4.2);
      if (!p) continue;
      this.civic.wells.push(p);
      const wellEntity = this.entityFactory.createWell({
        position: { x: p.x, y: this.getTerrainHeight(p.x, p.z), z: p.z },
      });
      this.decorations.push(wellEntity);
      this.footprints.push({ x: p.x, z: p.z, r: 3.2 });
    }

    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2 + 0.2;
      const p = settle(Math.cos(a) * R * 0.7, Math.sin(a) * R * 0.7, 3.5, 5.5);
      if (!p || Math.hypot(p.x, p.z) > this.wallRadius - 6) continue;
      this.civic.work.push(p);
      this.footprints.push({ x: p.x, z: p.z, r: 4 });
    }
  }

  getCivicSpots(): CivicSpots {
    return {
      market: this.civic.market ? { ...this.civic.market } : null,
      wells: this.civic.wells.map((p) => ({ ...p })),
      work: this.civic.work.map((p) => ({ ...p })),
    };
  }

  // ── Walls and pier ──────────────────────────────────────────────

  private createPalisade(): void {
    if (!this.scene) return;
    const result = buildPalisade(this.scene, {
      center: { x: this.centerOffset.x, z: this.centerOffset.z },
      radius: this.wallRadius,
      gateAngles: this.gateAngles,
      gateWidth: GATE_WIDTH,
      heightAt: (x, z) => this.getTerrainHeight(x, z),
      isDry: (x, z) => this.isDry(x, z, 0.1),
      seed: this.config.seed,
    });
    this.meshes.push(...result.meshes);
    this.barriers.push(...result.barriers);
    this.footprints.push(...result.footprints);
    this.gates = result.gates;

    // Ground agents may only cross the palisade through a gate.
    const { x: cx, z: cz } = this.centerOffset;
    VillageWall.set({
      cx,
      cz,
      radiusAt: result.radiusAt,
      halfThickness: 1.0,
      gates: result.gates.map((g) => ({ angle: g.angle, halfWidth: GATE_WIDTH / 2 - 0.5 })),
      isSolidAt: (a) => {
        const r = result.radiusAt(a);
        return this.isDry(cx + Math.cos(a) * r, cz + Math.sin(a) * r, 0.1);
      },
    });
  }

  /** Mean radius of the palisade ring (0 before the village is built). */
  getWallRadius(): number {
    return this.wallRadius;
  }

  /** Builds the pier and returns where the shore road should end. */
  private createPier(angle: number): Point | null {
    if (!this.scene || !this.terrainSystem) return null;
    const gate = this.gates.find((g) => Math.abs(Math.atan2(Math.sin(g.angle - angle), Math.cos(g.angle - angle))) < 0.01);
    const result = buildPier(this.scene, {
      center: { x: this.centerOffset.x, z: this.centerOffset.z },
      angle,
      startRadius: gate?.radius ?? this.wallRadius,
      waterLevel: this.terrainSystem.getConfig().waterLevel,
      heightAt: (x, z) => this.getTerrainHeight(x, z),
    });
    if (!result) return null;
    this.meshes.push(...result.meshes);
    this.footprints.push(...result.footprints);
    return result.landing;
  }

  // ── Streets ─────────────────────────────────────────────────────

  private ringRadiusAt(a: number): number {
    const phase = (this.config.seed % 389) * 0.02;
    return this.config.villageRadius * 0.64 + Math.sin(a * 2 + phase) * 1.1 + Math.sin(a * 3 + phase * 2) * 0.6;
  }

  /**
   * Main streets run plaza -> gate -> countryside (or down to the pier).
   * The ring lane links the neighbourhoods between them.
   */
  private createStreets(landing: Point | null): void {
    if (!this.scene) return;
    const streetMat = this.createRoadMaterial('villageRoadMat', [0.56, 0.46, 0.34], 0.5);

    this.gates.forEach((gate, i) => {
      const ux = Math.cos(gate.angle);
      const uz = Math.sin(gate.angle);
      const start = { x: ux * (PLAZA_RADIUS - 1), z: uz * (PLAZA_RADIUS - 1) };
      const gatePoint = { x: gate.x, z: gate.z };
      const sway = (i % 2 === 0 ? 1 : -1) * 2.2;
      for (const run of this.splitDry([start, gatePoint], 0.6)) {
        this.mainStreets.push(...this.buildRoad(`street_${i}`, run, MAIN_STREET_WIDTH, streetMat, sway, 0.08));
      }

      const isDock = landing && this.config.dockAngle !== undefined &&
        Math.abs(Math.atan2(Math.sin(gate.angle - this.config.dockAngle), Math.cos(gate.angle - this.config.dockAngle))) < 0.01;
      if (isDock && landing) {
        this.mainStreets.push(...this.buildRoad(`shore_road`, [gatePoint, landing], MAIN_STREET_WIDTH, streetMat, 0, 0.08));
      } else {
        const out = { x: gate.x + ux * 14, z: gate.z + uz * 14 };
        for (const run of this.splitDry([gatePoint, out], 0.6)) {
          this.mainStreets.push(...this.buildRoad(`track_${i}`, run, MAIN_STREET_WIDTH - 0.6, streetMat, -sway * 0.4, 0.08));
        }
      }
    });

    const ring: Point[] = [];
    const steps = 96;
    for (let i = 0; i <= steps; i++) {
      const a = (i / steps) * Math.PI * 2;
      const r = this.ringRadiusAt(a);
      ring.push({ x: Math.cos(a) * r, z: Math.sin(a) * r });
    }
    this.splitDry(ring, 0.6).forEach((run, i) => {
      this.laneSegments.push(...this.buildRoad(`lane_${i}`, run, LANE_WIDTH, streetMat, 0, 0.07));
    });
  }

  /** Splits a polyline into runs that stay on dry land, resampled every ~2m. */
  private splitDry(points: Point[], clearance: number): Point[][] {
    const dense: Point[] = [];
    for (let i = 0; i < points.length - 1; i++) {
      const a = points[i];
      const b = points[i + 1];
      const n = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.z - a.z) / 2));
      for (let k = 0; k < n; k++) dense.push({ x: a.x + ((b.x - a.x) * k) / n, z: a.z + ((b.z - a.z) * k) / n });
    }
    dense.push(points[points.length - 1]);

    const runs: Point[][] = [];
    let cur: Point[] = [];
    for (const p of dense) {
      if (this.isDry(p.x, p.z, clearance)) cur.push(p);
      else {
        if (cur.length > 1) runs.push(cur);
        cur = [];
      }
    }
    if (cur.length > 1) runs.push(cur);
    return runs;
  }

  /** Terrain-hugging ribbon. Returns the centreline segments it occupies. */
  private buildRoad(
    name: string,
    anchors: Point[],
    width: number,
    material: any,
    wiggle: number,
    lift: number
  ): Segment[] {
    const B = (window as any).BABYLON;

    const pts: Point[] = [];
    for (let i = 0; i < anchors.length - 1; i++) {
      const a = anchors[i];
      const b = anchors[i + 1];
      const n = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.z - a.z) / 1.5));
      for (let k = 0; k < n; k++) pts.push({ x: a.x + ((b.x - a.x) * k) / n, z: a.z + ((b.z - a.z) * k) / n });
    }
    pts.push(anchors[anchors.length - 1]);
    if (pts.length < 2) return [];

    const left: any[] = [];
    const right: any[] = [];
    const centre: Point[] = [];
    for (let i = 0; i < pts.length; i++) {
      const prev = pts[Math.max(0, i - 1)];
      const next = pts[Math.min(pts.length - 1, i + 1)];
      let tx = next.x - prev.x;
      let tz = next.z - prev.z;
      const tl = Math.hypot(tx, tz) || 1;
      tx /= tl;
      tz /= tl;

      // Gentle sideways meander (zero at both ends) keeps streets from looking ruled.
      const f = i / (pts.length - 1);
      const sway = Math.sin(f * Math.PI) * wiggle;
      const cx = pts[i].x - tz * sway;
      const cz = pts[i].z + tx * sway;
      centre.push({ x: cx, z: cz });

      // Ragged verges; ends taper a little so streets blend into what they meet.
      const taper = Math.min(1, 0.75 + Math.min(i, pts.length - 1 - i) * 0.12);
      const hw = (width / 2) * taper * (1 + 0.08 * Math.sin(i * 1.7 + width));
      const lx = cx - tz * hw;
      const lz = cz + tx * hw;
      const rx = cx + tz * hw;
      const rz = cz - tx * hw;
      left.push(new B.Vector3(lx, this.getTerrainHeight(lx, lz) + lift, lz));
      right.push(new B.Vector3(rx, this.getTerrainHeight(rx, rz) + lift, rz));
    }

    const road = B.MeshBuilder.CreateRibbon(name, { pathArray: [left, right], sideOrientation: B.Mesh.DOUBLESIDE }, this.scene);
    road.material = material;
    road.receiveShadows = true;
    road.isPickable = false;
    this.meshes.push(road);

    const segments: Segment[] = [];
    for (let i = 0; i < centre.length - 1; i++) {
      segments.push({ ax: centre[i].x, az: centre[i].z, bx: centre[i + 1].x, bz: centre[i + 1].z, w: width });
    }
    this.roadSegments.push(...segments);
    return segments;
  }

  private createRoadMaterial(name: string, color: [number, number, number], tile: number): any {
    const existing = this.scene.getMaterialByName(name);
    if (existing) return existing;
    const B = (window as any).BABYLON;
    const mat = new B.StandardMaterial(name, this.scene);
    mat.diffuseColor = new B.Color3(color[0], color[1], color[2]);
    mat.specularColor = new B.Color3(0.03, 0.03, 0.03);
    mat.backFaceCulling = false;
    mat.twoSidedLighting = true;
    mat.zOffset = -2;

    const size = 128;
    const tex = new B.DynamicTexture(`${name}_tex`, { width: size, height: size }, this.scene, true);
    const ctx = tex.getContext();
    const img = ctx.createImageData(size, size);
    for (let i = 0; i < size * size; i++) {
      const n = 200 + Math.random() * 55;
      const pebble = Math.random() > 0.985 ? -40 : 0;
      const v = Math.max(0, Math.min(255, n + pebble));
      img.data[i * 4] = v;
      img.data[i * 4 + 1] = v;
      img.data[i * 4 + 2] = v;
      img.data[i * 4 + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
    tex.update();
    tex.wrapU = B.Texture.WRAP_ADDRESSMODE;
    tex.wrapV = B.Texture.WRAP_ADDRESSMODE;
    mat.diffuseTexture = tex;
    mat.diffuseTexture.uScale = tile * 4;
    mat.diffuseTexture.vScale = tile * 1;
    return mat;
  }

  // ── Houses ──────────────────────────────────────────────────────

  /**
   * Candidate lots sit in two bands either side of the ring lane. Lots close
   * to a main street are taken first, so houses line the streets and leave
   * greens and yards between neighbourhoods.
   */
  private createHouses(): void {
    const R = this.config.villageRadius;
    const offset = Math.max(6.2, R * 0.13);
    const maxRadius = this.wallRadius - 7;
    const candidates: Array<Point & { score: number }> = [];

    for (const band of [-1, 1]) {
      const meanR = this.ringRadiusAt(0) + band * offset;
      const slots = Math.floor((Math.PI * 2 * meanR) / 9.5);
      for (let k = 0; k < slots; k++) {
        const a = ((k + this.rng.nextFloat(-0.3, 0.3)) / slots) * Math.PI * 2;
        const r = Math.min(maxRadius, this.ringRadiusAt(a) + band * offset + this.rng.nextFloat(-1.2, 1.2));
        const x = Math.cos(a) * r;
        const z = Math.sin(a) * r;
        if (r < PLAZA_RADIUS + 8) continue;
        if (!this.isDry(x, z, 0.9) || !this.isDry(x * 1.1, z * 1.1, 0.7)) continue;
        if (!this.isClear(x, z, 3.6, 3.5, 5.5)) continue;
        let streetDist = Infinity;
        for (const s of this.mainStreets) streetDist = Math.min(streetDist, this.distToSegment(x, z, s));
        candidates.push({ x, z, score: streetDist + this.rng.nextFloat(0, 9) });
      }
    }
    candidates.sort((a, b) => a.score - b.score);

    for (const c of candidates) {
      if (this.houses.length >= this.config.houseCount) break;
      if (this.housePoints.some((h) => Math.hypot(h.x - c.x, h.z - c.z) < 9.6)) continue;
      if (!this.isClear(c.x, c.z, 3.6, 3.5, 5.5)) continue;

      const y = this.getTerrainHeight(c.x, c.z);
      // Pull the house down slightly so the foundation sits in the ground.
      const houseEntity = this.entityFactory.createHouse({
        position: { x: c.x, y: y - 0.05, z: c.z },
        capacity: 4,
      });
      this.houses.push(houseEntity);
      this.housePoints.push({ x: c.x, z: c.z });
      this.footprints.push({ x: c.x, z: c.z, r: HOUSE_RADIUS });
    }
  }

  /** Each front door (doors face the plaza) gets a short path to the nearest street. */
  private createFootpaths(): void {
    if (!this.scene) return;
    const pathMat = this.createRoadMaterial('villagePathMat', [0.64, 0.56, 0.42], 0.35);
    const targets = [...this.mainStreets, ...this.laneSegments];

    this.housePoints.forEach((house, i) => {
      const dist = Math.hypot(house.x, house.z);
      const ux = house.x / dist;
      const uz = house.z / dist;
      const door = { x: house.x - ux * DOOR_OFFSET, z: house.z - uz * DOOR_OFFSET };

      const options: Point[] = [{ x: ux * (PLAZA_RADIUS - 0.5), z: uz * (PLAZA_RADIUS - 0.5) }];
      for (const s of targets) options.push(this.closestOnSegment(door.x, door.z, s));

      let best: Point | null = null;
      let bestLen = Infinity;
      for (const p of options) {
        const len = Math.hypot(p.x - door.x, p.z - door.z);
        if (len >= bestLen || len > 18) continue;
        // Never leave through the back of the house or cut through a neighbour.
        if ((p.x - door.x) * -ux + (p.z - door.z) * -uz < -0.3 * len) continue;
        if (!this.pathIsClear(door, p, i)) continue;
        best = p;
        bestLen = len;
      }
      if (!best || bestLen < 0.8) return;
      this.buildRoad(`path_${i}`, [door, best], PATH_WIDTH, pathMat, (i % 2 ? 1 : -1) * Math.min(0.6, bestLen * 0.08), 0.06);
    });
  }

  private pathIsClear(a: Point, b: Point, ownHouse: number): boolean {
    for (let t = 0.15; t <= 1; t += 0.17) {
      const x = a.x + (b.x - a.x) * t;
      const z = a.z + (b.z - a.z) * t;
      for (let j = 0; j < this.housePoints.length; j++) {
        if (j === ownHouse) continue;
        if (Math.hypot(x - this.housePoints[j].x, z - this.housePoints[j].z) < 3.4) return false;
      }
    }
    return true;
  }

  // ── Dressing ────────────────────────────────────────────────────

  private createDressing(): void {
    if (!this.scene) return;
    const pal = villagePalette(this.scene);
    const batch = new PartBatch(this.scene, 'village_dressing');
    const h = (x: number, z: number) => this.getTerrainHeight(x, z);
    const yawOut = (x: number, z: number) => Math.atan2(x, z);

    // Kitchen gardens behind houses and woodpiles beside them.
    this.housePoints.forEach((house) => {
      const own = this.footprints.find((f) => f.x === house.x && f.z === house.z);
      const d = Math.hypot(house.x, house.z);
      const u = { x: house.x / d, z: house.z / d };
      const t = { x: -u.z, z: u.x };

      if (this.config.includeGardens && this.rng.next() < 0.8) {
        const side = this.rng.next() < 0.5 ? 1 : -1;
        const directions = [u, { x: t.x * side, z: t.z * side }, { x: -t.x * side, z: -t.z * side }];
        for (const v of directions) {
          const across = { x: -v.z, z: v.x };
          const back = 2.9 + GARDEN_HALF_DEPTH;
          const gx = house.x + v.x * back;
          const gz = house.z + v.z * back;
          const corners = [-1, 1].flatMap((sx) =>
            [-1, 1].map((sz) => ({
              x: gx + across.x * sx * GARDEN_HALF_WIDTH + v.x * sz * GARDEN_HALF_DEPTH,
              z: gz + across.z * sx * GARDEN_HALF_WIDTH + v.z * sz * GARDEN_HALF_DEPTH,
            }))
          );
          const fits = [{ x: gx, z: gz }, ...corners].every(
            (p) =>
              Math.hypot(p.x, p.z) < this.wallRadius - 2.6 &&
              this.isDry(p.x, p.z, 0.8) &&
              this.isClear(p.x, p.z, 0.3, 0.3, 1.6, own)
          );
          if (!fits) continue;
          garden(batch, pal, gx, h(gx, gz), gz, Math.atan2(v.x, v.z));
          this.footprints.push({ x: gx, z: gz, r: 3.4 });
          break;
        }
      }

      if (this.rng.next() < 0.55) {
        const s = this.rng.next() < 0.5 ? -1 : 1;
        const wx = house.x + t.x * s * 3.7 + u.x * 0.6;
        const wz = house.z + t.z * s * 3.7 + u.z * 0.6;
        if (this.isClear(wx, wz, 0.5, 0.8, 1.5, own)) {
          woodpile(batch, pal, wx, h(wx, wz), wz, yawOut(house.x, house.z) + (s * Math.PI) / 2);
          this.footprints.push({ x: wx, z: wz, r: 1.4 });
        }
      }
    });

    // Work yards where villagers spend their working day.
    for (const p of this.civic.work) workyard(batch, pal, p.x, h(p.x, p.z), p.z, yawOut(p.x, p.z) + 0.4);

    // Plaza: stone kerb, benches between the streets, a lamp beside each.
    const B = (window as any).BABYLON;
    const kerb = B.MeshBuilder.CreateTorus('plaza_kerb', { diameter: PLAZA_RADIUS * 2, thickness: 0.42, tessellation: 56 }, this.scene);
    kerb.scaling.y = 0.45;
    batch.add(kerb, pal.stone, 0, h(0, 0) + 0.1, 0);
    for (let k = 0; k < 4; k++) {
      const a = (this.config.dockAngle ?? 0) + Math.PI / 4 + (k * Math.PI) / 2;
      const bx = Math.cos(a) * 4.9;
      const bz = Math.sin(a) * 4.9;
      bench(batch, pal, bx, h(bx, bz), bz, yawOut(bx, bz));
      const lx = Math.cos(a + 0.32) * (PLAZA_RADIUS + 0.4);
      const lz = Math.sin(a + 0.32) * (PLAZA_RADIUS + 0.4);
      streetLamp(batch, pal, lx, h(lx, lz), lz, yawOut(-lx, -lz));
    }

    // Lamps along the main streets, alternating sides.
    this.gates.forEach((gate) => {
      const ux = Math.cos(gate.angle);
      const uz = Math.sin(gate.angle);
      const sideX = -uz;
      const sideZ = ux;
      let n = 0;
      for (let d = PLAZA_RADIUS + 7; d < gate.radius - 4; d += 10, n++) {
        const s = n % 2 === 0 ? 1 : -1;
        const cx = ux * d;
        const cz = uz * d;
        let near: Segment | null = null;
        let nd = Infinity;
        for (const seg of this.mainStreets) {
          const dd = this.distToSegment(cx, cz, seg);
          if (dd < nd) { nd = dd; near = seg; }
        }
        const c = near ? this.closestOnSegment(cx, cz, near) : { x: cx, z: cz };
        const off = MAIN_STREET_WIDTH / 2 + 0.7;
        const lx = c.x + sideX * s * off;
        const lz = c.z + sideZ * s * off;
        if (!this.isClear(lx, lz, 0.6, 0.2, 1, undefined) || !this.isDry(lx, lz, 0.8)) continue;
        streetLamp(batch, pal, lx, h(lx, lz), lz, Math.atan2(-sideX * s, -sideZ * s));
        this.footprints.push({ x: lx, z: lz, r: 0.6 });
      }
    });

    this.meshes.push(...batch.flush());
  }

  // ── Plaza ───────────────────────────────────────────────────────

  /** Cobbled plaza with a small central fountain. */
  private createPlaza(): void {
    if (!this.scene) return;
    const B = (window as any).BABYLON;
    const cx = this.centerOffset.x;
    const cz = this.centerOffset.z;
    const y = this.getTerrainHeight(cx, cz);

    let cobble = this.scene.getMaterialByName('plazaMat');
    if (!cobble) {
      cobble = new B.StandardMaterial('plazaMat', this.scene);
      cobble.diffuseColor = new B.Color3(0.62, 0.6, 0.56);
      cobble.specularColor = new B.Color3(0.05, 0.05, 0.05);
      const size = 256;
      const tex = new B.DynamicTexture('plazaTex', { width: size, height: size }, this.scene, true);
      const ctx = tex.getContext();
      ctx.fillStyle = '#6b6862';
      ctx.fillRect(0, 0, size, size);
      const cells = 8;
      const cs = size / cells;
      for (let gy = 0; gy < cells; gy++) {
        for (let gx = 0; gx < cells; gx++) {
          const shade = 150 + Math.floor(Math.random() * 70);
          ctx.fillStyle = `rgb(${shade},${shade - 4},${shade - 10})`;
          const off = gy % 2 ? cs / 2 : 0;
          ctx.fillRect(gx * cs + off + 2, gy * cs + 2, cs - 4, cs - 4);
          if (off) ctx.fillRect(gx * cs + off - size + 2, gy * cs + 2, cs - 4, cs - 4);
        }
      }
      tex.update();
      tex.wrapU = B.Texture.WRAP_ADDRESSMODE;
      tex.wrapV = B.Texture.WRAP_ADDRESSMODE;
      tex.uScale = 3;
      tex.vScale = 3;
      cobble.diffuseTexture = tex;
      cobble.zOffset = -3;
    }

    const plaza = B.MeshBuilder.CreateDisc('villagePlaza', { radius: PLAZA_RADIUS, tessellation: 48 }, this.scene);
    plaza.rotation.x = Math.PI / 2;
    plaza.position.set(cx, y + 0.09, cz);
    plaza.material = cobble;
    plaza.receiveShadows = true;
    plaza.isPickable = false;
    this.meshes.push(plaza);

    // Fountain
    let stone = this.scene.getMaterialByName('fountainStone');
    if (!stone) {
      stone = new B.StandardMaterial('fountainStone', this.scene);
      stone.diffuseColor = new B.Color3(0.66, 0.65, 0.62);
      stone.specularColor = new B.Color3(0.08, 0.08, 0.08);
    }

    const basin = B.MeshBuilder.CreateCylinder('prop_fountain_basin', { diameter: 3.8, height: 0.7, tessellation: 20 }, this.scene);
    basin.position.set(cx, y + 0.4, cz);
    basin.material = stone;
    const pillar = B.MeshBuilder.CreateCylinder('prop_fountain_pillar', { diameterTop: 0.3, diameterBottom: 0.6, height: 1.9, tessellation: 10 }, this.scene);
    pillar.position.set(cx, y + 1.3, cz);
    pillar.material = stone;
    const bowl = B.MeshBuilder.CreateCylinder('prop_fountain_bowl', { diameterTop: 1.6, diameterBottom: 0.5, height: 0.4, tessellation: 14 }, this.scene);
    bowl.position.set(cx, y + 2.2, cz);
    bowl.material = stone;

    let waterMat = this.scene.getMaterialByName('fountainWater');
    if (!waterMat) {
      waterMat = new B.StandardMaterial('fountainWater', this.scene);
      waterMat.diffuseColor = new B.Color3(0.25, 0.55, 0.75);
      waterMat.emissiveColor = new B.Color3(0.03, 0.1, 0.16);
      waterMat.specularColor = new B.Color3(0.9, 0.9, 0.9);
      waterMat.alpha = 0.78;
    }
    const water = B.MeshBuilder.CreateDisc('fountainWaterDisc', { radius: 1.65, tessellation: 24 }, this.scene);
    water.rotation.x = Math.PI / 2;
    water.position.set(cx, y + 0.72, cz);
    water.material = waterMat;
    water.isPickable = false;
    // Gentle rippling
    this.fountainObserver = this.scene.onBeforeRenderObservable.add(() => {
      const t = performance.now() * 0.002;
      water.position.y = y + 0.72 + Math.sin(t) * 0.015;
    });

    this.meshes.push(basin, pillar, bowl, water);
    this.footprints.push({ x: cx, z: cz, r: PLAZA_RADIUS + 0.5 });
  }

  // ── Trees ───────────────────────────────────────────────────────

  private createTrees(): void {
    const { villageRadius } = this.config;

    // Trees on dry land, clear of houses, roads and the wall. Fewer inside the
    // walls (shade trees on the greens), more in the belt outside.
    const treeTarget = Math.round(14 + villageRadius * 0.55);
    const treeSpots: Footprint[] = [];
    let attempts = 0;
    while (treeSpots.length < treeTarget && attempts < treeTarget * 25) {
      attempts++;
      const angle = this.rng.next() * Math.PI * 2;
      const radius = villageRadius * (0.25 + this.rng.next() * 0.95);
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      const inside = radius < this.wallRadius;
      if (inside && this.rng.next() < 0.45) continue;

      if (!this.isDry(x, z, 0.9)) continue;
      if (this.isOccupied(x, z, inside ? 1.8 : 1.5)) continue;
      if (treeSpots.some((t) => Math.hypot(x - t.x, z - t.z) < 5)) continue;
      treeSpots.push({ x, z, r: 1 });
    }

    for (const spot of treeSpots) {
      const y = this.getTerrainHeight(spot.x, spot.z);
      const outer = Math.hypot(spot.x, spot.z) > villageRadius * 0.85;
      const treeEntity = this.entityFactory.createTree({
        position: { x: spot.x, y: y - 0.1, z: spot.z },
        treeType: outer || this.rng.next() > 0.6 ? 'pine' : 'oak',
        age: 5 + Math.floor(this.rng.next() * 15),
      });
      this.decorations.push(treeEntity);
      this.footprints.push({ x: spot.x, z: spot.z, r: 1.1 });
    }
  }

  private getTerrainHeight(x: number, z: number): number {
    if (this.terrainSystem) return this.terrainSystem.getHeightAt(x, z);
    return TerrainSystem.getTerrainHeight(x, z);
  }

  getHouseCount(): number {
    return this.houses.length;
  }

  getHouses(): EntityId[] {
    return [...this.houses];
  }

  getVillageCenter(): { x: number; y: number; z: number } {
    return {
      x: this.centerOffset.x,
      y: this.getTerrainHeight(this.centerOffset.x, this.centerOffset.z),
      z: this.centerOffset.z,
    };
  }

  update(_deltaTime: number): void {
    // Village is static
  }

  dispose(): void {
    if (this.fountainObserver) {
      this.scene?.onBeforeRenderObservable.remove(this.fountainObserver);
      this.fountainObserver = null;
    }
    VillageWall.clear();
    for (const mesh of this.meshes) mesh?.dispose?.();
    this.meshes = [];
    this.roadSegments = [];
    this.barriers = [];
    this.mainStreets = [];
    this.laneSegments = [];
    this.footprints = [];
    this.houses = [];
    this.housePoints = [];
    this.decorations = [];
    this.gates = [];
    this.gateAngleCache = null;
    this.civic = { market: null, wells: [], work: [] };
    this.initialized = false;
  }
}
