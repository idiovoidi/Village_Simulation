/**
 * VillageWall
 *
 * Movement rules for the village palisade, shared by every ground agent.
 * The wall is a ring (with a gentle wobble) broken by gate openings and by
 * stretches where it would stand in water. SteeringSystem asks this module:
 *
 *  - routeTarget(): if the agent's goal is on the other side of the wall,
 *    which gate waypoint to head for first;
 *  - constrainStep(): whether a step would push into or through the wall,
 *    and if so, the step slid along the wall instead.
 *
 * Plain math, no Babylon, so it can be unit-tested directly.
 */

export interface WallGate {
  angle: number;
  /** Half the walkable opening, measured along the wall in metres. */
  halfWidth: number;
}

export interface RingWallSpec {
  cx: number;
  cz: number;
  radiusAt: (angle: number) => number;
  /** Half the thickness of the no-go band around the wall line. */
  halfThickness: number;
  gates: WallGate[];
  /** False where the wall has a natural break (e.g. it would stand in water). */
  isSolidAt?: (angle: number) => boolean;
}

export interface Point2 {
  x: number;
  z: number;
}

/** How far either side of the wall line the gate approach waypoints sit. */
const GATE_APPROACH = 3;

const wrap = (a: number): number => Math.atan2(Math.sin(a), Math.cos(a));

let active: RingWallSpec | null = null;

export const VillageWall = {
  set(spec: RingWallSpec): void {
    active = spec;
  },

  clear(): void {
    active = null;
  },

  get(): RingWallSpec | null {
    return active;
  },

  /** Signed distance from the wall line: negative inside, positive outside. */
  signedDistance(x: number, z: number, wall: RingWallSpec | null = active): number {
    if (!wall) return Infinity;
    const dx = x - wall.cx;
    const dz = z - wall.cz;
    return Math.hypot(dx, dz) - wall.radiusAt(Math.atan2(dz, dx));
  },

  /** True if (x,z) lines up with a gate opening. */
  inGate(x: number, z: number, wall: RingWallSpec | null = active): boolean {
    if (!wall) return false;
    const dx = x - wall.cx;
    const dz = z - wall.cz;
    const a = Math.atan2(dz, dx);
    const r = wall.radiusAt(a);
    return wall.gates.some((g) => Math.abs(wrap(a - g.angle)) * r < g.halfWidth);
  },

  /**
   * Returns a gate waypoint when `target` is on the other side of the wall
   * from `pos`, or null when the agent can head straight for its target.
   */
  routeTarget(pos: Point2, target: Point2, wall: RingWallSpec | null = active): Point2 | null {
    if (!wall || wall.gates.length === 0) return null;
    const dp = this.signedDistance(pos.x, pos.z, wall);
    const dt = this.signedDistance(target.x, target.z, wall);
    if (Math.sign(dp) === Math.sign(dt)) return null;

    // Already in the gateway: walk straight through.
    if (Math.abs(dp) < GATE_APPROACH && this.inGate(pos.x, pos.z, wall)) {
      return this.gatePoint(this.nearestGate(pos, target, wall), dt < 0 ? -1 : 1, wall);
    }

    const gate = this.nearestGate(pos, target, wall);
    const near = this.gatePoint(gate, dp < 0 ? -1 : 1, wall);
    const far = this.gatePoint(gate, dp < 0 ? 1 : -1, wall);
    return Math.hypot(pos.x - near.x, pos.z - near.z) < 1.5 ? far : near;
  },

  /**
   * Checks a step from (x0,z0) to (x1,z1). A blocked step is slid along the
   * wall where possible; otherwise the agent stays put.
   */
  constrainStep(x0: number, z0: number, x1: number, z1: number, wall: RingWallSpec | null = active): { x: number; z: number; blocked: boolean } {
    if (!wall || !this.stepHitsWall(x0, z0, x1, z1, wall)) return { x: x1, z: z1, blocked: false };

    // Remove the radial part of the step so the agent slides along the wall.
    const dx = x0 - wall.cx;
    const dz = z0 - wall.cz;
    const r = Math.hypot(dx, dz) || 1;
    const nx = dx / r;
    const nz = dz / r;
    const sx = x1 - x0;
    const sz = z1 - z0;
    const radial = sx * nx + sz * nz;
    const tx = x0 + sx - nx * radial;
    const tz = z0 + sz - nz * radial;
    if (!this.stepHitsWall(x0, z0, tx, tz, wall)) return { x: tx, z: tz, blocked: true };
    return { x: x0, z: z0, blocked: true };
  },

  stepHitsWall(x0: number, z0: number, x1: number, z1: number, wall: RingWallSpec): boolean {
    const d0 = this.signedDistance(x0, z0, wall);
    const d1 = this.signedDistance(x1, z1, wall);
    const crosses = Math.sign(d0) !== Math.sign(d1);
    const entersBand = Math.abs(d1) < wall.halfThickness && Math.abs(d1) < Math.abs(d0);
    if (!crosses && !entersBand) return false;

    const mx = (x0 + x1) / 2;
    const mz = (z0 + z1) / 2;
    if (this.inGate(x1, z1, wall) || this.inGate(mx, mz, wall)) return false;
    if (wall.isSolidAt) {
      const a = Math.atan2(z1 - wall.cz, x1 - wall.cx);
      if (!wall.isSolidAt(a)) return false;
    }
    return true;
  },

  /** The gate that makes the shortest detour between pos and target. */
  nearestGate(pos: Point2, target: Point2, wall: RingWallSpec): WallGate {
    let best = wall.gates[0];
    let bestCost = Infinity;
    for (const g of wall.gates) {
      const r = wall.radiusAt(g.angle);
      const gx = wall.cx + Math.cos(g.angle) * r;
      const gz = wall.cz + Math.sin(g.angle) * r;
      const cost = Math.hypot(pos.x - gx, pos.z - gz) + Math.hypot(target.x - gx, target.z - gz);
      if (cost < bestCost) {
        bestCost = cost;
        best = g;
      }
    }
    return best;
  },

  /** A point on the gate's centreline, `side` -1 inside or +1 outside the wall. */
  gatePoint(gate: WallGate, side: number, wall: RingWallSpec): Point2 {
    const r = wall.radiusAt(gate.angle) + side * GATE_APPROACH;
    return { x: wall.cx + Math.cos(gate.angle) * r, z: wall.cz + Math.sin(gate.angle) * r };
  },
};
