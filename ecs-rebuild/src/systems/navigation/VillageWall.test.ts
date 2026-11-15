/**
 * VillageWall Tests
 *
 * The palisade should stop ground agents everywhere except at gates, and
 * route agents whose goal is on the other side through the nearest gate.
 */

import { describe, it, afterEach } from 'node:test';
import { strict as assert } from 'node:assert';
import { VillageWall, type RingWallSpec } from './VillageWall.ts';
import { World } from '../../core/World.ts';
import { SteeringSystem } from '../ai/SteeringSystem.ts';
import { TerrainSystem } from '../environment/TerrainSystem.ts';
import { createPositionComponent, createVelocityComponent } from '../../components/CoreComponents.ts';
import { createSteeringComponent } from '../../components/AIComponents.ts';

/** Radius-20 ring with one gate facing +X (angle 0). */
const wall: RingWallSpec = {
  cx: 0,
  cz: 0,
  radiusAt: () => 20,
  halfThickness: 1,
  gates: [{ angle: 0, halfWidth: 2.3 }],
};

describe('VillageWall', () => {
  afterEach(() => VillageWall.clear());

  it('blocks a step through the wall away from a gate', () => {
    const r = VillageWall.constrainStep(0, 19.5, 0, 20.5, wall);
    assert.equal(r.blocked, true);
    assert.ok(VillageWall.signedDistance(r.x, r.z, wall) < 0, 'agent stays inside');
  });

  it('lets a step through a gate opening', () => {
    const r = VillageWall.constrainStep(19.5, 0, 20.5, 0, wall);
    assert.equal(r.blocked, false);
    assert.equal(r.x, 20.5);
  });

  it('slides a glancing step along the wall', () => {
    const r = VillageWall.constrainStep(0, 18.5, 1, 19.5, wall);
    assert.equal(r.blocked, true);
    assert.ok(r.x > 0.5, 'tangential motion is kept');
  });

  it('ignores the wall where it has a natural break', () => {
    const broken = { ...wall, isSolidAt: (a: number) => Math.abs(a - Math.PI / 2) > 0.2 };
    assert.equal(VillageWall.constrainStep(0, 19.5, 0, 20.5, broken).blocked, false);
  });

  it('routes an outside agent to the outer gate waypoint first', () => {
    const p = VillageWall.routeTarget({ x: 0, z: 30 }, { x: 0, z: 0 }, wall);
    assert.ok(p);
    assert.ok(Math.abs(p.x - 23) < 1e-6 && Math.abs(p.z) < 1e-6);
  });

  it('then walks it through to the inner waypoint', () => {
    const p = VillageWall.routeTarget({ x: 22.5, z: 0.2 }, { x: 0, z: 10 }, wall);
    assert.ok(p);
    assert.ok(Math.abs(p.x - 17) < 1e-6);
  });

  it('does not reroute when both ends are on the same side', () => {
    assert.equal(VillageWall.routeTarget({ x: 5, z: 5 }, { x: -5, z: 2 }, wall), null);
  });

  it('gets a steered agent from outside to a goal inside via the gate', () => {
    VillageWall.set(wall);
    // The default terrain must be dry along the route for this test to mean anything.
    const { waterLevel } = TerrainSystem.getActiveConfig();
    for (const [x, z] of [[0, 30], [23, 0], [0, 5]]) {
      assert.ok(TerrainSystem.getTerrainHeight(x, z) > waterLevel + 0.5, `dry at ${x},${z}`);
    }

    const world = new World();
    world.registerSystem(new SteeringSystem(world));
    const e = world.createEntity();
    world.addComponent(e, createPositionComponent(0, 0, 30));
    world.addComponent(e, createVelocityComponent(0, 0, 0, 4));
    const steering = createSteeringComponent(10, 1);
    steering.target = { x: 0, y: 0, z: 5 };
    world.addComponent(e, steering);

    let crossedOutsideGate = false;
    for (let i = 0; i < 2000; i++) {
      const pos = world.getComponent<{ x: number; z: number }>(e, 'Position')!;
      const before = VillageWall.signedDistance(pos.x, pos.z, wall);
      steering.target = { x: 0, y: 0, z: 5 };
      world.update(1 / 30);
      const after = VillageWall.signedDistance(pos.x, pos.z, wall);
      if (before > 0 && after <= 0 && !VillageWall.inGate(pos.x, pos.z, wall)) crossedOutsideGate = true;
      if (Math.hypot(pos.x, pos.z - 5) < 1.5) break;
    }
    const pos = world.getComponent<{ x: number; z: number }>(e, 'Position')!;
    assert.equal(crossedOutsideGate, false, 'never passed through solid wall');
    assert.ok(Math.hypot(pos.x, pos.z - 5) < 2, `reached goal, ended at ${pos.x.toFixed(1)},${pos.z.toFixed(1)}`);
  });
});
