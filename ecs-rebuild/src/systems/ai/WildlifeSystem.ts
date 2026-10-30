/**
 * WildlifeSystem
 *
 * Drives the animals that don't walk on the ground: birds circling above the
 * bowl in flocks, fish schooling underwater, and boats drifting between
 * waypoints on open water. Each kind integrates its own Position/Transform
 * directly (no ground-bound Steering), and publishes Velocity so the
 * AnimationSystem can scale wing beats and tail swishes.
 */

import { System } from '../../core/System.ts';
import type { World } from '../../core/World.ts';
import type { EntityId } from '../../core/Entity.ts';
import type { PositionComponent, VelocityComponent, TransformComponent } from '../../components/CoreComponents.ts';
import type { BirdComponent, FishComponent } from '../../components/CreatureComponents.ts';
import { TerrainSystem } from '../environment/TerrainSystem.ts';
import { faceVelocity } from '../../utils/Orientation.ts';

interface Pt {
  x: number;
  z: number;
}

interface FlockState {
  center: Pt;
  target: Pt;
}

interface BirdState {
  flock: number;
  angle: number;
  angularSpeed: number;
  radius: number;
  altitude: number;
  bobPhase: number;
}

interface FishState {
  school: number;
  target: Pt;
  depth: number;
  retarget: number;
  speed: number;
}

interface BoatState {
  target: Pt | null;
  speed: number;
}

export class WildlifeSystem extends System {
  readonly componentSignature = new Set(['Position', 'Velocity', 'Transform']);
  readonly priority = 160;

  private flocks = new Map<number, FlockState>();
  private schools = new Map<number, FlockState>();
  private birds = new Map<EntityId, BirdState>();
  private fish = new Map<EntityId, FishState>();
  private boats = new Map<EntityId, BoatState>();
  private clock = 0;

  constructor(world: World) {
    super(world);
  }

  update(dt: number): void {
    this.clock += dt;
    const { waterLevel, bowlRadius } = TerrainSystem.getActiveConfig();

    this.updateFlocks(this.flocks, dt, bowlRadius * 0.55, () => true);
    this.updateFlocks(this.schools, dt, bowlRadius * 0.8, (p) => this.isDeepWater(p.x, p.z, waterLevel, 1.0));

    for (const id of this.world.query(new Set(['Bird', 'Position', 'Velocity', 'Transform']))) {
      this.updateBird(id, dt, waterLevel);
    }
    for (const id of this.world.query(new Set(['Fish', 'Position', 'Velocity', 'Transform']))) {
      this.updateFish(id, dt, waterLevel);
    }
    for (const id of this.world.query(new Set(['Boat', 'Position', 'Velocity', 'Transform']))) {
      this.updateBoat(id, dt, waterLevel, bowlRadius);
    }
  }

  // ── Shared ──────────────────────────────────────────────────────

  private isDeepWater(x: number, z: number, waterLevel: number, depth: number): boolean {
    return waterLevel - TerrainSystem.getTerrainHeight(x, z) > depth;
  }

  /** Slowly wanders each group's anchor between valid points. */
  private updateFlocks(
    groups: Map<number, FlockState>,
    dt: number,
    maxRadius: number,
    valid: (p: Pt) => boolean
  ): void {
    for (const g of groups.values()) {
      const dx = g.target.x - g.center.x;
      const dz = g.target.z - g.center.z;
      const d = Math.hypot(dx, dz);
      if (d < 3) {
        for (let i = 0; i < 12; i++) {
          const a = Math.random() * Math.PI * 2;
          const r = Math.sqrt(Math.random()) * maxRadius;
          const p = { x: Math.cos(a) * r, z: Math.sin(a) * r };
          if (valid(p)) {
            g.target = p;
            break;
          }
        }
      } else {
        const step = Math.min(d, 4 * dt);
        g.center.x += (dx / d) * step;
        g.center.z += (dz / d) * step;
      }
    }
  }

  private setMotion(id: EntityId, x: number, y: number, z: number, vx: number, vz: number, dt: number, turn = 6): void {
    const pos = this.world.getComponent<PositionComponent>(id, 'Position');
    const vel = this.world.getComponent<VelocityComponent>(id, 'Velocity');
    const tr = this.world.getComponent<TransformComponent>(id, 'Transform');
    if (!pos || !vel || !tr) return;

    pos.x = x;
    pos.y = y;
    pos.z = z;
    vel.vx = vx;
    vel.vy = 0;
    vel.vz = vz;
    tr.position.x = x;
    tr.position.y = y;
    tr.position.z = z;
    faceVelocity(tr.rotation, vx, vz, dt, turn, 0.05);
    tr.dirty = true;
  }

  // ── Birds ───────────────────────────────────────────────────────

  private updateBird(id: EntityId, dt: number, waterLevel: number): void {
    const pos = this.world.getComponent<PositionComponent>(id, 'Position');
    if (!pos) return;

    let s = this.birds.get(id);
    if (!s) {
      const bird = this.world.getComponent<BirdComponent>(id, 'Bird');
      const flockId = bird?.flockId ?? id;
      if (!this.flocks.has(flockId)) {
        const a = Math.random() * Math.PI * 2;
        const r = Math.random() * 40;
        const c = { x: Math.cos(a) * r, z: Math.sin(a) * r };
        this.flocks.set(flockId, { center: c, target: { ...c } });
      }
      s = {
        flock: flockId,
        angle: Math.random() * Math.PI * 2,
        angularSpeed: (0.22 + Math.random() * 0.12) * (Math.random() < 0.5 ? 1 : -1),
        radius: 12 + Math.random() * 16,
        altitude: 14 + Math.random() * 14,
        bobPhase: Math.random() * 6,
      };
      this.birds.set(id, s);
    }

    const flock = this.flocks.get(s.flock)!;
    s.angle += s.angularSpeed * dt;
    const x = flock.center.x + Math.cos(s.angle) * s.radius;
    const z = flock.center.z + Math.sin(s.angle) * s.radius;
    const ground = Math.max(TerrainSystem.getTerrainHeight(x, z), waterLevel);
    const y = ground + s.altitude + Math.sin(this.clock * 0.8 + s.bobPhase) * 1.2;

    const vx = (x - pos.x) / Math.max(dt, 1e-3);
    const vz = (z - pos.z) / Math.max(dt, 1e-3);
    // First frame snaps into place instead of "flying in" from the spawn point.
    const fresh = Math.hypot(pos.x - x, pos.z - z) > 60;
    this.setMotion(id, x, y, z, fresh ? 0 : vx, fresh ? 0 : vz, dt, 4);
  }

  // ── Fish ────────────────────────────────────────────────────────

  private updateFish(id: EntityId, dt: number, waterLevel: number): void {
    const pos = this.world.getComponent<PositionComponent>(id, 'Position');
    if (!pos) return;

    let s = this.fish.get(id);
    if (!s) {
      const fish = this.world.getComponent<FishComponent>(id, 'Fish');
      const schoolId = fish?.schoolId ?? id;
      if (!this.schools.has(schoolId)) {
        const c = { x: pos.x, z: pos.z };
        this.schools.set(schoolId, { center: c, target: { ...c } });
      }
      s = {
        school: schoolId,
        target: { x: pos.x, z: pos.z },
        depth: 0.6 + Math.random() * 1.6,
        retarget: 0,
        speed: 1.4 + Math.random() * 1.2,
      };
      this.fish.set(id, s);
    }

    const school = this.schools.get(s.school)!;
    s.retarget -= dt;
    if (s.retarget <= 0) {
      s.retarget = 2 + Math.random() * 3;
      for (let i = 0; i < 8; i++) {
        const a = Math.random() * Math.PI * 2;
        const r = Math.random() * 9;
        const x = school.center.x + Math.cos(a) * r;
        const z = school.center.z + Math.sin(a) * r;
        if (this.isDeepWater(x, z, waterLevel, 0.6)) {
          s.target = { x, z };
          break;
        }
      }
    }

    const dx = s.target.x - pos.x;
    const dz = s.target.z - pos.z;
    const d = Math.hypot(dx, dz) || 1;
    const desiredSpeed = Math.min(s.speed, d * 1.5);
    const vel = this.world.getComponent<VelocityComponent>(id, 'Velocity');
    const vx = (vel?.vx ?? 0) + ((dx / d) * desiredSpeed - (vel?.vx ?? 0)) * Math.min(1, dt * 2.5);
    const vz = (vel?.vz ?? 0) + ((dz / d) * desiredSpeed - (vel?.vz ?? 0)) * Math.min(1, dt * 2.5);

    let x = pos.x + vx * dt;
    let z = pos.z + vz * dt;
    // Never leave the water: bounce back inside.
    if (!this.isDeepWater(x, z, waterLevel, 0.45)) {
      x = pos.x;
      z = pos.z;
      s.target = { x: school.center.x, z: school.center.z };
    }

    const floor = TerrainSystem.getTerrainHeight(x, z) + 0.25;
    const swim = waterLevel - s.depth + Math.sin(this.clock * 1.3 + id) * 0.12;
    // Stay under the surface even in shallows.
    const y = Math.min(waterLevel - 0.15, Math.max(floor, swim));
    this.setMotion(id, x, y, z, vx, vz, dt, 5);
  }

  // ── Boats ───────────────────────────────────────────────────────

  private updateBoat(id: EntityId, dt: number, waterLevel: number, bowlRadius: number): void {
    const pos = this.world.getComponent<PositionComponent>(id, 'Position');
    if (!pos) return;

    let s = this.boats.get(id);
    if (!s) {
      s = { target: null, speed: 2.2 + Math.random() * 0.8 };
      this.boats.set(id, s);
    }

    if (!s.target || Math.hypot(s.target.x - pos.x, s.target.z - pos.z) < 4) {
      s.target = null;
      for (let i = 0; i < 30; i++) {
        const a = Math.random() * Math.PI * 2;
        const r = Math.sqrt(Math.random()) * bowlRadius * 0.8;
        const x = Math.cos(a) * r;
        const z = Math.sin(a) * r;
        if (this.isDeepWater(x, z, waterLevel, 3)) {
          s.target = { x, z };
          break;
        }
      }
      if (!s.target) return;
    }

    const dx = s.target.x - pos.x;
    const dz = s.target.z - pos.z;
    const d = Math.hypot(dx, dz) || 1;
    const vx = (dx / d) * s.speed;
    const vz = (dz / d) * s.speed;
    let x = pos.x + vx * dt;
    let z = pos.z + vz * dt;
    if (!this.isDeepWater(x, z, waterLevel, 1.6)) {
      x = pos.x;
      z = pos.z;
      s.target = null;
    }
    this.setMotion(id, x, waterLevel - 0.15 + Math.sin(this.clock * 0.9 + id) * 0.04, z, vx, vz, dt, 1.4);
  }

  cleanupEntity(entityId: EntityId): void {
    this.birds.delete(entityId);
    this.fish.delete(entityId);
    this.boats.delete(entityId);
  }

  /** Forget group anchors (called on level change). */
  reset(): void {
    this.flocks.clear();
    this.schools.clear();
    this.birds.clear();
    this.fish.clear();
    this.boats.clear();
  }
}
