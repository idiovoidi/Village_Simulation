/**
 * InfectionSystem + WildlifeSystem tests.
 */

import { describe, it, beforeEach } from 'node:test';
import { strict as assert } from 'node:assert';
import { World } from '../../core/World.ts';
import { EntityFactory } from '../../factories/EntityFactory.ts';
import { InfectionSystem, type InfectionEvent } from './InfectionSystem.ts';
import { WildlifeSystem } from './WildlifeSystem.ts';
import { TerrainSystem } from '../environment/TerrainSystem.ts';
import type { HealthComponent, PositionComponent } from '../../components/CoreComponents.ts';

describe('InfectionSystem', () => {
  let world: World;
  let factory: EntityFactory;
  let events: InfectionEvent[];

  beforeEach(() => {
    world = new World();
    factory = new EntityFactory(world);
    events = [];
    world.registerSystem(new InfectionSystem(world, factory, (e) => events.push(e)));
  });

  it('turns a dead villager into a zombie at the same spot', () => {
    const id = factory.createVillager({ position: { x: 12, y: 3, z: -7 }, name: 'Ada' });
    world.getComponent<HealthComponent>(id, 'Health')!.current = 0;

    world.update(0.016);

    assert.equal(world.getEntity(id), undefined, 'villager entity should be gone');
    const zombies = world.query(new Set(['Zombie', 'Position']));
    assert.equal(zombies.length, 1);
    const pos = world.getComponent<PositionComponent>(zombies[0], 'Position')!;
    assert.deepEqual([pos.x, pos.y, pos.z], [12, 3, -7]);
    assert.equal(events.length, 1);
    assert.equal(events[0].name, 'Ada');
  });

  it('leaves healthy villagers alone', () => {
    factory.createVillager({ position: { x: 0, y: 0, z: 0 } });
    world.update(0.016);
    assert.equal(world.query(new Set(['Zombie'])).length, 0);
    assert.equal(world.query(new Set(['Villager'])).length, 1);
    assert.equal(events.length, 0);
  });

  it('reports how many villagers survive each conversion', () => {
    const a = factory.createVillager({ position: { x: 0, y: 0, z: 0 } });
    factory.createVillager({ position: { x: 5, y: 0, z: 0 } });
    world.getComponent<HealthComponent>(a, 'Health')!.current = 0;
    world.update(0.016);
    assert.equal(events[0].survivors, 1);
  });
});

describe('WildlifeSystem', () => {
  let world: World;
  let factory: EntityFactory;

  beforeEach(() => {
    world = new World();
    factory = new EntityFactory(world);
    world.registerSystem(new WildlifeSystem(world));
  });

  it('keeps birds aloft, above the terrain, and moving', () => {
    const id = factory.createBird({ position: { x: 0, y: 30, z: 0 }, flockId: 7 });
    const start = { ...world.getComponent<PositionComponent>(id, 'Position')! };

    for (let i = 0; i < 300; i++) world.update(0.05);

    const pos = world.getComponent<PositionComponent>(id, 'Position')!;
    assert.ok(Math.hypot(pos.x - start.x, pos.z - start.z) > 1, 'bird should have moved');
    const ground = TerrainSystem.getTerrainHeight(pos.x, pos.z);
    assert.ok(pos.y > ground + 5, `bird at ${pos.y.toFixed(1)} should be well above ground ${ground.toFixed(1)}`);
  });

  it('does not attach ground-bound steering to wildlife', () => {
    const bird = factory.createBird({ position: { x: 0, y: 30, z: 0 } });
    const fish = factory.createFish({ position: { x: 0, y: -3, z: 0 } });
    const boat = factory.createBoat({ position: { x: 0, y: -2, z: 0 } });
    for (const id of [bird, fish, boat]) {
      assert.equal(world.hasComponent(id, 'Steering'), false);
    }
  });
});
