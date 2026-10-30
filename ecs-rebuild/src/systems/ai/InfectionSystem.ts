/**
 * InfectionSystem
 *
 * A villager whose health reaches zero turns into a zombie where they fell.
 * Zombie attacks only reduce Health; this system is what makes that matter.
 */

import { System } from '../../core/System.ts';
import type { World } from '../../core/World.ts';
import type { EntityId } from '../../core/Entity.ts';
import type { EntityFactory } from '../../factories/EntityFactory.ts';
import type { HealthComponent, PositionComponent } from '../../components/CoreComponents.ts';
import type { VillagerComponent } from '../../components/CreatureComponents.ts';

export interface InfectionEvent {
  name: string;
  position: { x: number; y: number; z: number };
  /** Villagers still alive after this conversion. */
  survivors: number;
}

export class InfectionSystem extends System {
  readonly componentSignature = new Set(['Villager', 'Health', 'Position']);
  readonly priority = 170;

  private factory: EntityFactory;
  private onInfected?: (event: InfectionEvent) => void;
  private aggression = 1;

  constructor(world: World, factory: EntityFactory, onInfected?: (event: InfectionEvent) => void) {
    super(world);
    this.factory = factory;
    this.onInfected = onInfected;
  }

  setAggression(value: number): void {
    this.aggression = value;
  }

  update(_deltaTime: number): void {
    const doomed: EntityId[] = [];
    for (const id of this.queryEntities()) {
      const health = this.world.getComponent<HealthComponent>(id, 'Health');
      if (health && health.current <= 0) doomed.push(id);
    }

    for (const id of doomed) {
      const pos = this.world.getComponent<PositionComponent>(id, 'Position');
      const villager = this.world.getComponent<VillagerComponent>(id, 'Villager');
      if (!pos) continue;

      const position = { x: pos.x, y: pos.y, z: pos.z };
      this.world.destroyEntity(id);
      this.factory.createZombie({ position, aggressionLevel: this.aggression });

      this.onInfected?.({
        name: villager?.name ?? 'A villager',
        position,
        survivors: this.queryEntities().length,
      });
    }
  }
}
