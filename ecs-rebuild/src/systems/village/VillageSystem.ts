/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Village System
 *
 * Creates and manages the village with houses, roads, and decorations.
 * Layout is seeded so a given level always looks the same; houses and trees
 * are only placed on dry land and clear of each other.
 */

import { System } from '../../core/System.ts';
import type { World } from '../../core/World.ts';
import type { EntityId } from '../../core/Entity.ts';
import type { PositionComponent } from '../../components/CoreComponents.ts';
import type { EntityFactory } from '../../factories/EntityFactory.ts';
import { TerrainSystem } from '../environment/TerrainSystem.ts';
import { Random } from '../../utils/Random.ts';

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

const PLAZA_RADIUS = 7;

export class VillageSystem extends System {
  readonly componentSignature = new Set(['Village']);
  readonly priority = 15;

  private scene: any = null;
  private config: VillageConfig;
  private entityFactory: EntityFactory;
  private terrainSystem: TerrainSystem | null = null;
  private rng: Random;

  private houses: EntityId[] = [];
  private decorations: EntityId[] = [];
  private roadMeshes: any[] = [];
  private dockMaterials: any[] = [];
  private footprints: Footprint[] = [];
  private roadSegments: Array<{ ax: number; az: number; bx: number; bz: number; w: number }> = [];
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
    this.footprints.push({ x: 0, z: 0, r: PLAZA_RADIUS + 1 });

    this.createHouses();
    this.createRoads();
    this.createPlaza();
    if (this.config.dockAngle !== undefined) this.createDock(this.config.dockAngle);
    this.createDecorations();
    if (this.config.includeMarket) this.createMarket();

    this.initialized = true;
  }

  /** True when (x,z) is within `margin` of a building, plaza, well or road. */
  isOccupied(x: number, z: number, margin = 0): boolean {
    for (const f of this.footprints) {
      if (Math.hypot(x - f.x, z - f.z) < f.r + margin) return true;
    }
    for (const s of this.roadSegments) {
      if (this.distToSegment(x, z, s.ax, s.az, s.bx, s.bz) < s.w / 2 + margin) return true;
    }
    return false;
  }

  private distToSegment(px: number, pz: number, ax: number, az: number, bx: number, bz: number): number {
    const dx = bx - ax;
    const dz = bz - az;
    const len2 = dx * dx + dz * dz || 1;
    const t = Math.max(0, Math.min(1, ((px - ax) * dx + (pz - az) * dz) / len2));
    return Math.hypot(px - (ax + t * dx), pz - (az + t * dz));
  }

  private isDry(x: number, z: number, clearance = 1.1): boolean {
    const waterLevel = this.terrainSystem?.getConfig().waterLevel ?? -2;
    return this.getTerrainHeight(x, z) > waterLevel + clearance;
  }

  /**
   * Houses on jittered concentric rings so the village feels organic.
   */
  private createHouses(): void {
    const { houseCount, villageRadius } = this.config;
    const rings = houseCount > 10 ? 2 : 1;
    const placed: Footprint[] = [];

    for (let i = 0; i < houseCount; i++) {
      let pos: { x: number; z: number } | null = null;

      for (let attempt = 0; attempt < 40 && !pos; attempt++) {
        const ring = i % rings;
        const base = rings === 1 ? 0.55 : ring === 0 ? 0.42 : 0.75;
        const radius = villageRadius * (base + this.rng.nextFloat(-0.08, 0.1));
        const angle = (i / houseCount) * Math.PI * 2 + this.rng.nextFloat(-0.12, 0.12);
        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;

        const clear = placed.every((p) => Math.hypot(x - p.x, z - p.z) > 9);
        if (clear && this.isDry(x, z, 0.9)) pos = { x, z };
      }
      if (!pos) continue;

      placed.push({ x: pos.x, z: pos.z, r: 4.5 });
      const y = this.getTerrainHeight(pos.x, pos.z);

      // Pull the house down slightly so the foundation sits in the ground.
      const houseEntity = this.entityFactory.createHouse({
        position: { x: pos.x, y: y - 0.05, z: pos.z },
        capacity: 4,
      });

      this.houses.push(houseEntity);
      this.footprints.push({ x: pos.x, z: pos.z, r: 4.6 });
    }
  }

  /**
   * Dirt roads from the plaza to every front door, plus a ring lane.
   * Ribbons follow the terrain so they never float or clip.
   */
  private createRoads(): void {
    if (!this.scene) return;
    const B = (window as any).BABYLON;
    if (!B) return;

    const roadMat = this.createRoadMaterial('villageRoadMat', [0.56, 0.46, 0.34], 0.5);

    // Spokes: plaza edge -> point in front of each door (doors face the centre).
    for (let i = 0; i < this.houses.length; i++) {
      const pos = this.world.getComponent<PositionComponent>(this.houses[i], 'Position');
      if (!pos) continue;
      const dist = Math.hypot(pos.x, pos.z);
      if (dist < PLAZA_RADIUS + 4) continue;

      const ux = pos.x / dist;
      const uz = pos.z / dist;
      const start = { x: ux * (PLAZA_RADIUS - 1), z: uz * (PLAZA_RADIUS - 1) };
      const end = { x: ux * (dist - 3.4), z: uz * (dist - 3.4) };
      const wiggle = (i % 2 === 0 ? 1 : -1) * 1.2;
      this.buildRoad(`road_${i}`, [start, end], 2.4, roadMat, wiggle);
    }

    // Ring lane between the two house bands.
    const ringR = this.config.villageRadius * 0.6;
    const ringPoints: Array<{ x: number; z: number }> = [];
    const steps = 72;
    for (let i = 0; i <= steps; i++) {
      const a = (i / steps) * Math.PI * 2;
      ringPoints.push({ x: Math.cos(a) * ringR, z: Math.sin(a) * ringR });
    }
    const dryRing = this.splitDry(ringPoints);
    dryRing.forEach((seg, i) => this.buildRoad(`road_ring_${i}`, seg, 2.0, roadMat, 0));
  }

  /** Splits a polyline into runs that stay on dry land. */
  private splitDry(points: Array<{ x: number; z: number }>): Array<Array<{ x: number; z: number }>> {
    const runs: Array<Array<{ x: number; z: number }>> = [];
    let cur: Array<{ x: number; z: number }> = [];
    for (const p of points) {
      if (this.isDry(p.x, p.z, 0.6)) cur.push(p);
      else {
        if (cur.length > 1) runs.push(cur);
        cur = [];
      }
    }
    if (cur.length > 1) runs.push(cur);
    return runs;
  }

  private buildRoad(
    name: string,
    anchors: Array<{ x: number; z: number }>,
    width: number,
    material: any,
    wiggle: number
  ): void {
    const B = (window as any).BABYLON;

    // Resample into short steps so the road hugs the ground.
    const pts: Array<{ x: number; z: number }> = [];
    for (let i = 0; i < anchors.length - 1; i++) {
      const a = anchors[i];
      const b = anchors[i + 1];
      const len = Math.hypot(b.x - a.x, b.z - a.z);
      const n = Math.max(1, Math.ceil(len / 2));
      for (let k = 0; k < n; k++) {
        const t = k / n;
        pts.push({ x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t });
      }
    }
    pts.push(anchors[anchors.length - 1]);
    if (pts.length < 2) return;

    const left: any[] = [];
    const right: any[] = [];
    for (let i = 0; i < pts.length; i++) {
      const prev = pts[Math.max(0, i - 1)];
      const next = pts[Math.min(pts.length - 1, i + 1)];
      let tx = next.x - prev.x;
      let tz = next.z - prev.z;
      const tl = Math.hypot(tx, tz) || 1;
      tx /= tl;
      tz /= tl;

      // Gentle sideways meander (zero at both ends) keeps spokes from looking ruled.
      const f = pts.length > 2 ? i / (pts.length - 1) : 0;
      const sway = Math.sin(f * Math.PI) * wiggle;
      const cx = pts[i].x - tz * sway;
      const cz = pts[i].z + tx * sway;
      pts[i] = { x: cx, z: cz };

      const hw = (width / 2) * (1 + 0.08 * Math.sin(i * 1.7));
      const lx = cx - tz * hw;
      const lz = cz + tx * hw;
      const rx = cx + tz * hw;
      const rz = cz - tx * hw;
      left.push(new B.Vector3(lx, this.getTerrainHeight(lx, lz) + 0.07, lz));
      right.push(new B.Vector3(rx, this.getTerrainHeight(rx, rz) + 0.07, rz));
    }

    const road = B.MeshBuilder.CreateRibbon(
      name,
      { pathArray: [left, right], sideOrientation: B.Mesh.DOUBLESIDE },
      this.scene
    );
    road.material = material;
    road.receiveShadows = true;
    road.isPickable = false;
    this.roadMeshes.push(road);

    for (let i = 0; i < pts.length - 1; i++) {
      this.roadSegments.push({
        ax: pts[i].x,
        az: pts[i].z,
        bx: pts[i + 1].x,
        bz: pts[i + 1].z,
        w: width,
      });
    }
  }

  private createRoadMaterial(name: string, color: [number, number, number], tile: number): any {
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

  /** Cobbled plaza with a small central fountain. */
  private createPlaza(): void {
    if (!this.scene) return;
    const B = (window as any).BABYLON;
    const cx = this.centerOffset.x;
    const cz = this.centerOffset.z;
    const y = this.getTerrainHeight(cx, cz);

    const cobble = new B.StandardMaterial('plazaMat', this.scene);
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

    const plaza = B.MeshBuilder.CreateDisc('villagePlaza', { radius: PLAZA_RADIUS, tessellation: 48 }, this.scene);
    plaza.rotation.x = Math.PI / 2;
    plaza.position.set(cx, y + 0.09, cz);
    plaza.material = cobble;
    plaza.receiveShadows = true;
    plaza.isPickable = false;
    cobble.zOffset = -3;
    this.roadMeshes.push(plaza);

    // Fountain
    const stone = new B.StandardMaterial('fountainStone', this.scene);
    stone.diffuseColor = new B.Color3(0.66, 0.65, 0.62);
    stone.specularColor = new B.Color3(0.08, 0.08, 0.08);

    const basin = B.MeshBuilder.CreateCylinder('prop_fountain_basin', { diameter: 3.8, height: 0.7, tessellation: 20 }, this.scene);
    basin.position.set(cx, y + 0.4, cz);
    basin.material = stone;
    const pillar = B.MeshBuilder.CreateCylinder('prop_fountain_pillar', { diameterTop: 0.3, diameterBottom: 0.6, height: 1.9, tessellation: 10 }, this.scene);
    pillar.position.set(cx, y + 1.3, cz);
    pillar.material = stone;
    const bowl = B.MeshBuilder.CreateCylinder('prop_fountain_bowl', { diameterTop: 1.6, diameterBottom: 0.5, height: 0.4, tessellation: 14 }, this.scene);
    bowl.position.set(cx, y + 2.2, cz);
    bowl.material = stone;

    const waterMat = new B.StandardMaterial('fountainWater', this.scene);
    waterMat.diffuseColor = new B.Color3(0.25, 0.55, 0.75);
    waterMat.emissiveColor = new B.Color3(0.03, 0.1, 0.16);
    waterMat.specularColor = new B.Color3(0.9, 0.9, 0.9);
    waterMat.alpha = 0.78;
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

    this.roadMeshes.push(basin, pillar, bowl, water);
    this.footprints.push({ x: cx, z: cz, r: PLAZA_RADIUS });
  }

  /** A timber boardwalk and pier placed at the edge of a configured bay. */
  private createDock(angle: number): void {
    if (!this.scene || !this.terrainSystem) return;
    const B = (window as any).BABYLON;
    const { waterLevel } = this.terrainSystem.getConfig();
    const direction = { x: Math.cos(angle), z: Math.sin(angle) };
    const side = { x: -direction.z, z: direction.x };
    const deckY = waterLevel + 0.72;
    const dockWidth = 9.2;
    const dockLength = 24;
    const startDistance = this.config.villageRadius * 0.76;
    let shoreDistance = startDistance;
    const shoreLimit = this.config.villageRadius * 2.2;

    while (
      shoreDistance < shoreLimit &&
      this.getTerrainHeight(
        this.centerOffset.x + direction.x * shoreDistance,
        this.centerOffset.z + direction.z * shoreDistance
      ) > deckY
    ) {
      shoreDistance += 0.5;
    }
    const shoreX = this.centerOffset.x + direction.x * shoreDistance;
    const shoreZ = this.centerOffset.z + direction.z * shoreDistance;
    if (this.getTerrainHeight(shoreX, shoreZ) > deckY) return;

    const timber = new B.StandardMaterial('coastalDockTimber', this.scene);
    timber.diffuseColor = new B.Color3(0.34, 0.22, 0.13);
    timber.specularColor = new B.Color3(0.06, 0.05, 0.04);
    const railMaterial = new B.StandardMaterial('coastalDockRail', this.scene);
    railMaterial.diffuseColor = new B.Color3(0.48, 0.34, 0.22);
    railMaterial.specularColor = timber.specularColor;
    this.dockMaterials.push(timber, railMaterial);

    const addBox = (
      name: string,
      dimensions: { width: number; height: number; depth: number },
      x: number,
      y: number,
      z: number,
      rotationY: number,
      material: any
    ): void => {
      const plank = B.MeshBuilder.CreateBox(name, dimensions, this.scene);
      plank.position.set(x, y, z);
      plank.rotation.y = rotationY;
      plank.material = material;
      plank.receiveShadows = true;
      plank.isPickable = false;
      this.roadMeshes.push(plank);
    };

    const rotationY = Math.PI / 2 - angle;

    // A short, gently descending boardwalk joins the outer village to the shore.
    for (let distance = startDistance; distance < shoreDistance - 0.5; distance += 2.1) {
      const x = this.centerOffset.x + direction.x * distance;
      const z = this.centerOffset.z + direction.z * distance;
      const y = Math.max(this.getTerrainHeight(x, z) + 0.18, deckY);
      addBox(
        'dock_boardwalk_plank',
        { width: 3.8, height: 0.28, depth: 1.9 },
        x,
        y,
        z,
        rotationY,
        timber
      );
    }

    // Broad landing pier with open gaps between deck boards.
    for (let distance = 0.9; distance < dockLength; distance += 1.8) {
      const center = shoreDistance + distance;
      const x = this.centerOffset.x + direction.x * center;
      const z = this.centerOffset.z + direction.z * center;
      addBox(
        'dock_deck_plank',
        { width: dockWidth, height: 0.3, depth: 1.55 },
        x,
        deckY,
        z,
        rotationY,
        timber
      );
    }

    // Side rails and paired piles make the structure read clearly from above.
    for (const offset of [-dockWidth / 2 + 0.25, dockWidth / 2 - 0.25]) {
      const x = this.centerOffset.x + direction.x * (shoreDistance + dockLength / 2) + side.x * offset;
      const z = this.centerOffset.z + direction.z * (shoreDistance + dockLength / 2) + side.z * offset;
      addBox(
        'dock_side_rail',
        { width: 0.32, height: 0.7, depth: dockLength },
        x,
        deckY + 0.48,
        z,
        rotationY,
        railMaterial
      );

      for (const distance of [1.2, 8.5, 16, 23.5]) {
        const pileX = this.centerOffset.x + direction.x * (shoreDistance + distance) + side.x * offset;
        const pileZ = this.centerOffset.z + direction.z * (shoreDistance + distance) + side.z * offset;
        const pile = B.MeshBuilder.CreateCylinder(
          'dock_pile',
          { diameter: 0.58, height: 6.4, tessellation: 8 },
          this.scene
        );
        pile.position.set(pileX, deckY - 2.9, pileZ);
        pile.material = railMaterial;
        pile.isPickable = false;
        this.roadMeshes.push(pile);
      }
    }

    const middleDistance = startDistance + (shoreDistance + dockLength / 2 - startDistance) / 2;
    this.footprints.push({
      x: this.centerOffset.x + direction.x * middleDistance,
      z: this.centerOffset.z + direction.z * middleDistance,
      r: (shoreDistance + dockLength - startDistance) / 2 + dockWidth / 2,
    });
  }

  private createDecorations(): void {
    const { villageRadius } = this.config;

    // Trees on dry land, clear of houses and roads.
    const treeTarget = Math.round(14 + villageRadius * 0.55);
    const treeSpots: Footprint[] = [];
    let attempts = 0;
    while (treeSpots.length < treeTarget && attempts < treeTarget * 25) {
      attempts++;
      const angle = this.rng.next() * Math.PI * 2;
      const radius = villageRadius * (0.25 + this.rng.next() * 0.95);
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;

      if (!this.isDry(x, z, 0.9)) continue;
      if (this.isOccupied(x, z, 1.5)) continue;
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

    // Wells beside the inner ring.
    const wellCount = 3;
    for (let i = 0; i < wellCount; i++) {
      const angle = (i / wellCount) * Math.PI * 2 + 0.5;
      const radius = villageRadius * 0.32;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      if (this.isOccupied(x, z, 1.5)) {
        // Nudge sideways off the road.
        this.placeWell(Math.cos(angle + 0.18) * radius, Math.sin(angle + 0.18) * radius);
      } else {
        this.placeWell(x, z);
      }
    }
  }

  private placeWell(x: number, z: number): void {
    const y = this.getTerrainHeight(x, z);
    const wellEntity = this.entityFactory.createWell({ position: { x, y, z } });
    this.decorations.push(wellEntity);
    this.footprints.push({ x, z, r: 2 });
  }

  private createMarket(): void {
    const marketX = this.centerOffset.x + this.config.villageRadius * 0.4;
    const marketZ = this.centerOffset.z + this.config.villageRadius * 0.2;
    const marketY = this.getTerrainHeight(marketX, marketZ);

    this.entityFactory.createField({
      position: { x: marketX, y: marketY, z: marketZ },
      fieldType: 'market',
    });
    this.footprints.push({ x: marketX, z: marketZ, r: 6.5 });
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
    for (const mesh of this.roadMeshes) {
      mesh?.dispose?.();
    }
    this.roadMeshes = [];
    for (const material of this.dockMaterials) {
      material?.dispose?.();
    }
    this.dockMaterials = [];
    this.roadSegments = [];
    this.footprints = [];
    this.houses = [];
    this.decorations = [];
    this.initialized = false;
  }
}
