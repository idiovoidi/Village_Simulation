/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Game Manager
 *
 * Main coordinator for the simulation: boots Babylon + Havok, registers the
 * ECS systems once, then builds / tears down scenarios in place (no page
 * reloads). Also owns the HUD, time controls and entity selection.
 */

import { World } from '../core/World.ts';
import type { EntityId } from '../core/Entity.ts';
import { BabylonRenderer } from './BabylonRenderer.ts';
import { CameraManager } from './CameraManager.ts';
import { LightingManager } from './LightingManager.ts';
import { AtmosphereManager } from './AtmosphereManager.ts';
import { PathfindingManager } from './PathfindingManager.ts';
import { PhysicsSystem } from '../systems/PhysicsSystem.ts';
import { RenderSystem } from '../systems/RenderSystem.ts';
import { AnimationSystem } from '../systems/AnimationSystem.ts';
import { SteeringSystem } from '../systems/ai/SteeringSystem.ts';
import { PathfindingSystem } from '../systems/ai/PathfindingSystem.ts';
import { DecisionSystem } from '../systems/ai/DecisionSystem.ts';
import { VillagerScheduleSystem } from '../systems/ai/VillagerScheduleSystem.ts';
import { VillagerBehaviorSystem, type PointOfInterest } from '../systems/ai/VillagerBehaviorSystem.ts';
import { ThreatAssessmentSystem } from '../systems/ai/ThreatAssessmentSystem.ts';
import { ZombieBehaviorSystem } from '../systems/ai/ZombieBehaviorSystem.ts';
import { DogBehaviorSystem } from '../systems/ai/DogBehaviorSystem.ts';
import { InfectionSystem } from '../systems/ai/InfectionSystem.ts';
import { WildlifeSystem } from '../systems/ai/WildlifeSystem.ts';
import { HungerSystem } from '../systems/survival/HungerSystem.ts';
import { ThirstSystem } from '../systems/survival/ThirstSystem.ts';
import { EnergySystem } from '../systems/survival/EnergySystem.ts';
import { TerrainSystem } from '../systems/environment/TerrainSystem.ts';
import { Scatter } from '../systems/environment/Scatter.ts';
import { VillageSystem } from '../systems/village/VillageSystem.ts';
import { LevelConfig, type LevelConfigData } from '../systems/level/LevelConfig.ts';
import { EntityFactory } from '../factories/EntityFactory.ts';
import { SpatialGrid } from '../utils/SpatialGrid.ts';
import { Logger } from '../utils/Logger.ts';
import { Hud, type InspectorInfo } from '../ui/Hud.ts';
import { createTimeOfDayComponent, type TimeOfDayComponent } from '../components/WorldComponents.ts';
import type { HealthComponent, PositionComponent } from '../components/CoreComponents.ts';

type Vec3 = { x: number; y: number; z: number };

/** In-game minutes per real second at 1× speed (a full day takes 6 minutes). */
const BASE_TIME_SCALE = 4;
/** Longest single simulation step; faster speeds run extra sub-steps instead. */
const MAX_STEP = 0.05;

export class GameManager {
  private world: World;
  private renderer: BabylonRenderer;
  private cameraManager!: CameraManager;
  private lightingManager!: LightingManager;
  private atmosphere!: AtmosphereManager;
  private hud!: Hud;
  private pathfindingManager: PathfindingManager;
  private entityFactory: EntityFactory;
  private spatialGrid: SpatialGrid;
  private logger: Logger;

  // Persistent systems (registered once)
  private renderSystem!: RenderSystem;
  private villagerBehavior!: VillagerBehaviorSystem;
  private infection!: InfectionSystem;
  private wildlife!: WildlifeSystem;
  private systemsRegistered = false;

  // Per-level content
  private terrainSystem: TerrainSystem | null = null;
  private villageSystem: VillageSystem | null = null;
  private scatter: Scatter | null = null;
  private timeEntityId: EntityId | null = null;
  private currentLevelKey = 'VILLAGE';
  private loadingLevel = false;
  private wasNight: boolean | null = null;
  private villageFallen = false;

  // Loop state
  private running = false;
  private lastTime = 0;
  private paused = false;
  private speed = 1;
  private hudTimer = 0;
  private selected: EntityId | null = null;
  private selectionMarker: any = null;

  constructor(canvas: HTMLCanvasElement) {
    this.logger = new Logger();
    this.world = new World();
    this.spatialGrid = new SpatialGrid(20);
    this.renderer = new BabylonRenderer(canvas);
    this.pathfindingManager = new PathfindingManager();
    this.entityFactory = new EntityFactory(this.world);
  }

  // ── Boot ────────────────────────────────────────────────────────

  async initialize(): Promise<void> {
    try {
      await this.renderer.initialize();
      const scene = this.renderer.getScene();
      (window as any).BABYLON.sceneInstance = scene;

      this.atmosphere = new AtmosphereManager(scene);
      this.atmosphere.initialize();
      this.lightingManager = new LightingManager(scene, this.atmosphere);
      this.lightingManager.initialize();

      this.cameraManager = new CameraManager(scene, this.renderer.getCanvas());
      this.cameraManager.initialize({ x: 0, y: 0, z: 0 }, 80, -Math.PI / 2, Math.PI / 3.2);
      this.atmosphere.attachPipeline(this.cameraManager.getCamera());

      this.hud = new Hud({
        onLevel: (key) => void this.switchLevel(key),
        onSpeed: (m) => this.setSpeed(m),
        onTogglePause: () => this.togglePause(),
        onFollow: () => this.toggleFollow(),
        onCloseInspector: () => this.select(null),
      });
      this.hud.setLevels(
        Object.entries(LevelConfig.getAllLevels()).map(([key, l]) => ({
          key,
          name: l.name,
          description: l.description,
        })),
        this.currentLevelKey
      );

      const havok = await this.initializeHavok();
      await this.registerSystems(havok);
      this.setupPicking(scene);
      this.createSelectionMarker(scene);

      await this.loadLevel('VILLAGE');
    } catch (error) {
      this.logger.error('GameManager', 'Failed to initialize', error);
      throw error;
    }
  }

  private async initializeHavok(): Promise<unknown> {
    const get = () => (window as any).HavokPhysics as undefined | (() => Promise<unknown>);
    const deadline = performance.now() + 15000;
    while (typeof get() !== 'function') {
      if (performance.now() > deadline) {
        throw new Error('Havok Physics failed to load from the CDN (timed out after 15s)');
      }
      await new Promise((r) => setTimeout(r, 100));
    }
    return get()!();
  }

  private async registerSystems(havokInstance: unknown): Promise<void> {
    if (this.systemsRegistered) return;
    const w = this.world;
    const scene = this.renderer.getScene();

    const schedule = new VillagerScheduleSystem(w);
    w.registerSystem(schedule);
    schedule.initialize?.();

    this.villagerBehavior = new VillagerBehaviorSystem(w, this.spatialGrid);
    w.registerSystem(this.villagerBehavior);
    this.villagerBehavior.initialize();

    w.registerSystem(new ThreatAssessmentSystem(w, this.spatialGrid));
    w.registerSystem(new ZombieBehaviorSystem(w, this.spatialGrid));
    w.registerSystem(
      new DogBehaviorSystem(w, { terrainHeightFn: (x, z) => TerrainSystem.getTerrainHeight(x, z) })
    );
    w.registerSystem(new DecisionSystem(w));
    w.registerSystem(new SteeringSystem(w));
    w.registerSystem(new PathfindingSystem(w, this.pathfindingManager));
    w.registerSystem(new HungerSystem(w));
    w.registerSystem(new ThirstSystem(w));
    w.registerSystem(new EnergySystem(w));

    this.wildlife = new WildlifeSystem(w);
    w.registerSystem(this.wildlife);

    this.infection = new InfectionSystem(w, this.entityFactory, (e) => {
      this.hud.toast(`${e.name} has turned!`, 'bad');
      if (e.survivors === 0 && !this.villageFallen) {
        this.villageFallen = true;
        this.hud.toast('The village has fallen.', 'bad', 6000);
      }
    });
    w.registerSystem(this.infection);

    const physics = new PhysicsSystem(w);
    await physics.initializePhysics(havokInstance, scene);
    w.registerSystem(physics);

    this.renderSystem = new RenderSystem(w, scene);
    this.renderSystem.initialize();
    w.registerSystem(this.renderSystem);
    w.registerSystem(new AnimationSystem(w, this.renderSystem));

    this.systemsRegistered = true;
    this.logger.info('GameManager', `Registered ${w.systemCount} systems`);
  }

  // ── Levels ──────────────────────────────────────────────────────

  /** Switches scenario in place, with the loading overlay covering the rebuild. */
  async switchLevel(key: string): Promise<void> {
    if (this.loadingLevel || key === this.currentLevelKey || !LevelConfig.getLevel(key)) return;
    await this.loadLevel(key);
  }

  async loadLevel(levelKey: string): Promise<void> {
    const level = LevelConfig.getLevel(levelKey);
    if (!level) throw new Error(`Level "${levelKey}" not found`);
    if (this.loadingLevel) return;
    this.loadingLevel = true;

    try {
      this.hud.setLoading(true, `Building ${level.name}…`);
      // Let the overlay paint before the (synchronous) rebuild blocks the thread.
      await new Promise((r) => requestAnimationFrame(() => setTimeout(r, 30)));

      this.unloadLevel();
      this.currentLevelKey = levelKey;
      LevelConfig.setCurrentLevel(levelKey);
      this.hud.setCurrentLevel(levelKey);
      const config = level.config;
      const scene = this.renderer.getScene();
      this.villageFallen = false;

      // Sky/time for the scenario
      this.timeEntityId = this.world.createEntity();
      const startHour = config.startHour ?? 8;
      this.world.addComponent(
        this.timeEntityId,
        createTimeOfDayComponent(Math.floor(startHour), Math.round((startHour % 1) * 60), BASE_TIME_SCALE)
      );
      this.atmosphere.setMood({
        redSky: config.specialEffects?.redSky ?? false,
        heavyFog: config.specialEffects?.fog ?? false,
        cloudCover: config.hasClouds ? 0.5 : 0.28,
      });
      this.wasNight = null;

      // Terrain + water
      this.terrainSystem = new TerrainSystem(this.world, scene, {
        bowlRadius: config.bowlRadius,
        bowlDepth: config.bowlDepth,
        waterLevel: config.waterLevel,
        segments: 128,
        bay: config.bay,
      });
      await this.terrainSystem.initialize();
      this.world.registerSystem(this.terrainSystem);

      // Village
      if (config.hasVillage) {
        this.villageSystem = new VillageSystem(this.world, scene, this.entityFactory, {
          villageRadius: config.villageRadius,
          houseCount: config.houseCount,
          includeMarket: true,
          includeGardens: true,
          seed: this.hashKey(levelKey),
        });
        this.villageSystem.setTerrainSystem(this.terrainSystem);
        await this.villageSystem.initialize();
        this.world.registerSystem(this.villageSystem);
      }

      // Ground dressing
      this.scatter = new Scatter(scene);
      this.scatter.build({
        bowlRadius: config.bowlRadius,
        waterLevel: config.waterLevel,
        heightAt: (x, z) => this.terrainSystem!.getHeightAt(x, z),
        isBlocked: (x, z, m) => this.villageSystem?.isOccupied(x, z, m) ?? false,
        seed: this.hashKey(levelKey) + 3,
        forestDensity: config.forestDensity ?? 0,
        clearingRadius: config.hasVillage ? config.villageRadius * 1.05 : 0,
      });
      const shadows = this.lightingManager.getShadowGenerator();
      this.scatter.getShadowCasters().forEach((m) => shadows?.addShadowCaster(m));

      this.buildNavMesh(config);
      this.refreshVillagerPOIs(config);
      this.populate(config);

      // Camera
      const focus = this.villageSystem?.getVillageCenter() ?? {
        x: 0,
        y: this.terrainSystem.getHeightAt(0, 0),
        z: 0,
      };
      this.cameraManager.setHeightProvider(
        (x, z) => this.terrainSystem?.getHeightAt(x, z) ?? 0,
        config.bowlRadius * 0.9
      );
      this.cameraManager.setTarget(focus);
      this.cameraManager.setRadius(config.bowlRadius * 0.8);
      this.cameraManager.setRotation(-Math.PI / 2, Math.PI / 3.2);

      // Snap lighting to the start time so the first frame isn't wrong.
      this.lightingManager.updateForTimeOfDay(startHour);
      this.logger.info('GameManager', `Level ready: ${level.name} (${this.world.entityCount} entities)`);
    } finally {
      this.loadingLevel = false;
      this.hud.setLoading(false);
      if (this.running) this.lastTime = performance.now();
    }
  }

  private unloadLevel(): void {
    this.select(null);

    for (const id of this.world.getAllEntities()) this.world.destroyEntity(id);
    this.timeEntityId = null;

    for (const sys of [this.terrainSystem, this.villageSystem]) {
      if (!sys) continue;
      this.world.unregisterSystem(sys);
      sys.dispose();
    }
    this.terrainSystem = null;
    this.villageSystem = null;

    this.scatter?.dispose();
    this.scatter = null;
    this.wildlife?.reset();
    this.spatialGrid.clear();
    this.villagerBehavior?.setPOIs([]);
    // Dispose meshes of destroyed entities immediately instead of next frame.
    this.renderSystem?.update(0);
  }

  private hashKey(key: string): number {
    let h = 2166136261;
    for (let i = 0; i < key.length; i++) h = Math.imul(h ^ key.charCodeAt(i), 16777619);
    return (h >>> 0) % 100000;
  }

  private buildNavMesh(config: LevelConfigData): void {
    const radius = Math.max(config.villageRadius * 1.4, 40);
    const obstacles: Vec3[] = [];

    if (this.villageSystem) {
      for (const houseId of this.villageSystem.getHouses()) {
        const pos = this.world.getComponent<PositionComponent>(houseId, 'Position');
        if (pos) obstacles.push({ x: pos.x, y: pos.y, z: pos.z });
      }
    }

    this.pathfindingManager.createNavMesh(
      { min: { x: -radius, y: 0, z: -radius }, max: { x: radius, y: 0, z: radius } },
      obstacles,
      (x, z) => this.terrainSystem!.getHeightAt(x, z),
      config.waterLevel
    );
  }

  private refreshVillagerPOIs(config: LevelConfigData): void {
    if (!this.terrainSystem || !this.villageSystem) return;
    const h = (x: number, z: number) => this.terrainSystem!.getHeightAt(x, z);
    const pois: PointOfInterest[] = [
      { id: 'plaza', position: { x: 0, y: h(0, 0), z: 0 }, type: 'social' },
      { id: 'plaza_market', position: { x: 3, y: h(3, 0), z: 0 }, type: 'market' },
    ];

    const marketX = config.villageRadius * 0.4;
    const marketZ = config.villageRadius * 0.2;
    pois.push({ id: 'market_field', position: { x: marketX, y: h(marketX, marketZ), z: marketZ }, type: 'market' });

    // Wells and work spots around the inner ring
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2 + 0.5;
      const x = Math.cos(a) * config.villageRadius * 0.32;
      const z = Math.sin(a) * config.villageRadius * 0.32;
      pois.push({ id: `well_${i}`, position: { x, y: h(x, z), z }, type: 'well' });
    }
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2 + 0.2;
      const x = Math.cos(a) * config.villageRadius * 0.7;
      const z = Math.sin(a) * config.villageRadius * 0.7;
      if (h(x, z) > config.waterLevel + 1) pois.push({ id: `work_${i}`, position: { x, y: h(x, z), z }, type: 'work' });
    }

    this.villageSystem.getHouses().forEach((houseId, index) => {
      const pos = this.world.getComponent<PositionComponent>(houseId, 'Position');
      if (pos) pois.push({ id: `home_${index}`, position: { x: pos.x, y: pos.y, z: pos.z }, type: 'home' });
    });

    this.villagerBehavior.setPOIs(pois);
  }

  // ── Population ──────────────────────────────────────────────────

  private populate(config: LevelConfigData): void {
    const waterLevel = config.waterLevel;
    const dryAt = (x: number, z: number, clearance = 1) =>
      this.terrainSystem!.getHeightAt(x, z) > waterLevel + clearance;
    const deepAt = (x: number, z: number, depth: number) =>
      waterLevel - this.terrainSystem!.getHeightAt(x, z) > depth;

    const sample = (
      minR: number,
      maxR: number,
      ok: (x: number, z: number) => boolean,
      tries = 60
    ): { x: number; z: number } | null => {
      for (let i = 0; i < tries; i++) {
        const a = Math.random() * Math.PI * 2;
        const r = minR + Math.sqrt(Math.random()) * (maxR - minR);
        const x = Math.cos(a) * r;
        const z = Math.sin(a) * r;
        if (ok(x, z)) return { x, z };
      }
      return null;
    };
    const at = (p: { x: number; z: number }, lift = 0): Vec3 => ({
      x: p.x,
      y: this.terrainSystem!.getHeightAt(p.x, p.z) + lift,
      z: p.z,
    });

    const hasVillage = config.hasVillage && this.villageSystem;
    const bowl = config.bowlRadius;

    // Villagers
    let villagers = 0;
    if (hasVillage) {
      const count = Math.max(5, Math.round(config.houseCount * 0.9));
      for (let i = 0; i < count; i++) {
        const p = sample(
          6,
          config.villageRadius * 0.8,
          (x, z) => dryAt(x, z, 1.2) && !this.villageSystem!.isOccupied(x, z, -2.2)
        );
        if (!p) continue;
        const id = this.entityFactory.createVillager({ position: at(p), name: `Villager_${i + 1}` });
        // Each villager sleeps in a house; extras share.
        const houses = this.villageSystem!.getHouses();
        const villager = this.world.getComponent<any>(id, 'Villager');
        if (villager && houses.length > 0) villager.home = houses[i % houses.length];
        villagers++;
      }
    }

    // Dogs
    if (config.hasDogs && hasVillage) {
      for (let i = 0; i < config.dogCount; i++) {
        const p = sample(8, config.villageRadius * 0.7, (x, z) => dryAt(x, z, 1.2));
        if (p) this.entityFactory.createDog({ position: at(p) });
      }
    }

    // Zombies, in loose groups outside the village
    if (config.hasZombies && config.zombieCount > 0) {
      this.infection.setAggression(config.zombieAggressiveness ?? 1);
      let spawned = 0;
      let guard = 0;
      while (spawned < config.zombieCount && guard++ < config.zombieCount * 6) {
        const c = sample(config.villageRadius * 0.95, bowl * 0.78, (x, z) => dryAt(x, z, 1.5));
        if (!c) break;
        const group = Math.min(config.zombieCount - spawned, 2 + Math.floor(Math.random() * 3));
        for (let g = 0; g < group; g++) {
          const x = c.x + (Math.random() - 0.5) * 7;
          const z = c.z + (Math.random() - 0.5) * 7;
          if (!dryAt(x, z, 1.2)) continue;
          this.entityFactory.createZombie({
            position: at({ x, z }),
            aggressionLevel: config.zombieAggressiveness ?? 1,
          });
          spawned++;
        }
      }
    }

    // Birds in flocks
    if (config.hasBirds) {
      for (let i = 0; i < config.birdCount; i++) {
        const flockId = 1000 + Math.floor(i / 5);
        this.entityFactory.createBird({ position: { x: 0, y: 30, z: 0 }, flockId });
      }
    }

    // Fish in schools, boats on open water
    if (config.hasWater && config.hasFish) {
      let school = 2000;
      let inSchool = 0;
      let anchor: { x: number; z: number } | null = null;
      for (let i = 0; i < config.fishCount; i++) {
        if (!anchor || inSchool >= 6) {
          anchor = sample(0, bowl * 0.8, (x, z) => deepAt(x, z, 1.2));
          school++;
          inSchool = 0;
        }
        if (!anchor) break;
        const x = anchor.x + (Math.random() - 0.5) * 6;
        const z = anchor.z + (Math.random() - 0.5) * 6;
        if (!deepAt(x, z, 0.7)) continue;
        this.entityFactory.createFish({
          position: { x, y: waterLevel - 1, z },
          schoolId: school,
        });
        inSchool++;
      }
    }
    for (let i = 0; i < (config.boatCount ?? 0); i++) {
      const p = sample(0, bowl * 0.75, (x, z) => deepAt(x, z, 3.5));
      if (p) this.entityFactory.createBoat({ position: { x: p.x, y: waterLevel, z: p.z } });
    }

    this.logger.info('GameManager', `Populated: ${villagers} villagers`);
  }

  // ── Time controls ───────────────────────────────────────────────

  setSpeed(multiplier: number): void {
    this.speed = multiplier;
    this.paused = false;
  }

  togglePause(): void {
    this.paused = !this.paused;
  }

  isPaused(): boolean {
    return this.paused;
  }

  // ── Selection ───────────────────────────────────────────────────

  private setupPicking(scene: any): void {
    const B = (window as any).BABYLON;
    scene.onPointerObservable.add((info: any) => {
      if (info.type !== B.PointerEventTypes.POINTERTAP || info.event.button !== 0) return;
      const pick = scene.pick(
        scene.pointerX,
        scene.pointerY,
        (m: any) => m.isPickable && m.isVisible && m.isEnabled()
      );
      const id = pick?.hit ? this.renderSystem.findEntityByMesh(pick.pickedMesh) : null;
      this.select(id);
    });
  }

  private createSelectionMarker(scene: any): void {
    const B = (window as any).BABYLON;
    const ring = B.MeshBuilder.CreateTorus(
      'ui_selection',
      { diameter: 2.6, thickness: 0.09, tessellation: 40 },
      scene
    );
    const mat = new B.StandardMaterial('selectionMat', scene);
    mat.emissiveColor = new B.Color3(1, 0.78, 0.25);
    mat.disableLighting = true;
    mat.fogEnabled = false;
    ring.material = mat;
    ring.isPickable = false;
    ring.isVisible = false;
    this.selectionMarker = ring;
  }

  private select(id: EntityId | null): void {
    if (id !== null && !this.isSelectable(id)) id = null;
    if (id !== this.selected) this.cameraManager?.stopFollowing();
    this.selected = id;
    if (this.selectionMarker) this.selectionMarker.isVisible = id !== null;
    if (id === null) this.hud?.showInspector(null);
    else this.refreshInspector();
  }

  private isSelectable(id: EntityId): boolean {
    return ['Villager', 'Zombie', 'Dog', 'Bird', 'Fish', 'Boat'].some((t) => this.world.hasComponent(id, t));
  }

  private toggleFollow(): void {
    if (this.selected === null) return;
    if (this.cameraManager.isFollowing()) {
      this.cameraManager.stopFollowing();
    } else {
      const id = this.selected;
      this.cameraManager.follow(() => {
        const p = this.world.getComponent<PositionComponent>(id, 'Position');
        return p ? { x: p.x, y: p.y, z: p.z } : null;
      });
    }
    this.refreshInspector();
  }

  private refreshInspector(): void {
    if (this.selected === null) return;
    const id = this.selected;
    const w = this.world;
    if (!w.getEntity(id)) {
      this.select(null);
      return;
    }

    const health = w.getComponent<HealthComponent>(id, 'Health');
    const bars: InspectorInfo['bars'] = [];
    const rows: InspectorInfo['rows'] = [];
    const tone = (v: number, max: number): 'good' | 'warn' | 'bad' =>
      v / max > 0.5 ? 'good' : v / max > 0.25 ? 'warn' : 'bad';

    let title = 'Creature';
    let subtitle: string | undefined;

    const villager = w.getComponent<any>(id, 'Villager');
    const zombie = w.getComponent<any>(id, 'Zombie');
    if (villager) {
      title = villager.name;
      subtitle = villager.profession;
      for (const [label, type] of [
        ['Hunger', 'Hunger'],
        ['Thirst', 'Thirst'],
        ['Energy', 'Energy'],
      ] as const) {
        const c = w.getComponent<any>(id, type);
        if (c) bars.push({ label, value: c.level, max: 100, tone: tone(c.level, 100) });
      }
      const behaviour = w.getComponent<any>(id, 'AIBehaviour');
      if (behaviour) rows.push(['State', String(behaviour.currentState)]);
      if (villager.isFleeing) rows.push(['Status', 'Fleeing']);
      else if (villager.currentPOI) rows.push(['Heading to', String(villager.currentPOI).replace(/_\d+$/, '')]);
    } else if (zombie) {
      title = 'Zombie';
      subtitle = 'Undead';
      rows.push(['Aggression', zombie.aggressionLevel?.toFixed?.(1) ?? '—']);
      rows.push(['Hunting', zombie.targetEntity !== null && zombie.targetEntity !== undefined ? 'Yes' : 'No']);
    } else {
      const model = w.getComponent<any>(id, 'Model');
      title = model ? model.meshId.charAt(0).toUpperCase() + model.meshId.slice(1) : 'Creature';
    }

    if (health) {
      bars.unshift({
        label: 'Health',
        value: health.current,
        max: health.maximum,
        tone: tone(health.current, health.maximum),
      });
    }

    this.hud.showInspector({ title, subtitle, bars, rows, following: this.cameraManager.isFollowing() });
  }

  private updateSelectionMarker(timeSeconds: number): void {
    if (this.selected === null || !this.selectionMarker) return;
    const pos = this.world.getComponent<PositionComponent>(this.selected, 'Position');
    if (!pos) {
      this.select(null);
      return;
    }
    const ground = this.terrainSystem?.getHeightAt(pos.x, pos.z) ?? pos.y;
    const ringY = this.world.hasComponent(this.selected, 'Bird') ? pos.y - 1 : Math.max(ground, pos.y - 1) + 0.12;
    this.selectionMarker.position.set(pos.x, ringY, pos.z);
    const s = 1 + Math.sin(timeSeconds * 4) * 0.06;
    this.selectionMarker.scaling.set(s, 1, s);
  }

  // ── Loop ────────────────────────────────────────────────────────

  start(): void {
    if (this.running) return;
    this.running = true;
    this.lastTime = performance.now();
    this.renderer.startRenderLoop(() => this.update());
  }

  stop(): void {
    this.running = false;
    this.renderer.stopRenderLoop();
  }

  private update(): void {
    if (!this.running || this.loadingLevel) return;

    const now = performance.now();
    const frameDt = Math.min((now - this.lastTime) / 1000, 0.1);
    this.lastTime = now;

    this.atmosphere.tick(frameDt);

    if (!this.paused) {
      // Faster speeds take several bounded steps so the simulation stays stable.
      const total = frameDt * this.speed;
      const steps = Math.max(1, Math.ceil(total / MAX_STEP));
      const step = total / steps;
      for (let i = 0; i < steps; i++) {
        this.advanceTimeOfDay(step);
        this.world.update(step);
      }
    } else {
      // Keep meshes consistent while paused (no simulation time passes).
      this.renderSystem.update(0);
    }

    this.updateSelectionMarker(now / 1000);

    this.hudTimer += frameDt;
    if (this.hudTimer > 0.25) {
      this.hudTimer = 0;
      this.updateHud();
    }
  }

  private advanceTimeOfDay(deltaSeconds: number): void {
    if (this.timeEntityId === null) return;
    const time = this.world.getComponent<TimeOfDayComponent>(this.timeEntityId, 'TimeOfDay');
    if (!time) return;

    let total = time.hour * 60 + time.minute + deltaSeconds * time.timeScale;
    while (total >= 24 * 60) {
      total -= 24 * 60;
      time.dayNumber += 1;
    }
    time.hour = Math.floor(total / 60) % 24;
    time.minute = total % 60;
    this.lightingManager.updateForTimeOfDay(time.hour + time.minute / 60);
  }

  private updateHud(): void {
    const time =
      this.timeEntityId !== null
        ? this.world.getComponent<TimeOfDayComponent>(this.timeEntityId, 'TimeOfDay')
        : null;
    const night = this.lightingManager.isNight();

    if (this.wasNight !== null && night !== this.wasNight) {
      this.hud.toast(night ? 'Night falls…' : 'A new day dawns', 'info');
    }
    this.wasNight = night;

    const count = (type: string) => this.world.query(new Set([type])).length;
    this.hud.update({
      hour: time?.hour ?? 0,
      minute: time?.minute ?? 0,
      day: time?.dayNumber ?? 0,
      night,
      paused: this.paused,
      speed: this.speed,
      fps: this.renderer.getEngine()?.getFps?.() ?? 0,
      villagers: count('Villager'),
      zombies: count('Zombie'),
      animals: count('Dog') + count('Bird') + count('Fish') + count('Boat'),
    });

    this.refreshInspector();
  }

  // ── Accessors ───────────────────────────────────────────────────

  dispose(): void {
    this.stop();
    this.unloadLevel();
    this.hud?.dispose();
    this.cameraManager?.dispose();
    this.atmosphere?.dispose();
    this.lightingManager?.dispose();
    this.world.clear();
    this.renderer.dispose();
  }

  getWorld(): World {
    return this.world;
  }

  getEntityFactory(): EntityFactory {
    return this.entityFactory;
  }

  getRenderer(): BabylonRenderer {
    return this.renderer;
  }

  getCameraManager(): CameraManager {
    return this.cameraManager;
  }

  getCurrentLevelKey(): string {
    return this.currentLevelKey;
  }
}
