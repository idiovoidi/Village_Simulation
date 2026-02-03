/**
 * ECS System for RTS UI
 * Queries entities and updates UI based on component data
 */

import type { Scene } from '@babylonjs/core';
import { RTSInterface } from './RTSInterface';

interface Component {
  readonly type: string;
}

interface HealthComponent extends Component {
  readonly type: 'Health';
  current: number;
  maximum: number;
}

interface PositionComponent extends Component {
  readonly type: 'Position';
  x: number;
  y: number;
  z: number;
}

interface StateComponent extends Component {
  readonly type: 'State';
  current: string;
}

interface ResourceComponent extends Component {
  readonly type: 'Resource';
  resources: Record<string, number>;
}

interface TimeComponent extends Component {
  readonly type: 'Time';
  hours: number;
  minutes: number;
}

interface Entity {
  id: number;
  components: Map<string, Component>;
  active: boolean;
}

interface World {
  getAllEntities(): Map<number, Entity>;
  getComponent<T extends Component>(entityId: number, type: string): T | undefined;
}

/**
 * RTS UI System - Updates UI based on entity component data
 */
export class RTSInterfaceSystem {
  private readonly rtsUI: RTSInterface;
  private readonly world: World | null = null;
  private selectedEntityId: number | null = null;
  
  readonly priority = 1000; // Run late in update cycle
  readonly componentSignature = new Set<string>(); // Observes all entities
  
  constructor(scene: Scene, world?: World) {
    this.rtsUI = new RTSInterface(scene);
    if (world) {
      this.world = world;
    }
  }
  
  /**
   * Initialize the UI system
   */
  public initialize(): void {
    this.rtsUI.initialize();
  }
  
  /**
   * Update the UI system each frame
   */
  public update(deltaTime: number): void {
    this.rtsUI.update();
    
    if (!this.world) return;
    
    // Update resources from player entity
    this.updateResourceDisplay();
    
    // Update time from world time entity
    this.updateTimeDisplay();
    
    // Update selected entity if any
    if (this.selectedEntityId !== null) {
      this.updateSelectedEntity();
    }
  }
  
  /**
   * Update resource display from player entity
   */
  private updateResourceDisplay(): void {
    if (!this.world) return;
    
    // Find player entity with resources
    for (const [id, entity] of this.world.getAllEntities()) {
      const resourceComp = this.world.getComponent<ResourceComponent>(id, 'Resource');
      if (resourceComp) {
        this.rtsUI.updateResources(resourceComp.resources);
        break;
      }
    }
  }
  
  /**
   * Update time display from world time entity
   */
  private updateTimeDisplay(): void {
    if (!this.world) return;
    
    // Find time entity
    for (const [id, entity] of this.world.getAllEntities()) {
      const timeComp = this.world.getComponent<TimeComponent>(id, 'Time');
      if (timeComp) {
        this.rtsUI.updateTime(timeComp.hours, timeComp.minutes);
        break;
      }
    }
  }
  
  /**
   * Update selected entity display
   */
  private updateSelectedEntity(): void {
    if (!this.world || this.selectedEntityId === null) return;
    
    const entity = this.world.getAllEntities().get(this.selectedEntityId);
    if (!entity || !entity.active) {
      this.clearSelection();
      return;
    }
    
    // Gather entity data from components
    const entityData: Record<string, unknown> = {
      id: this.selectedEntityId,
      type: 'Entity',
      name: `Entity ${this.selectedEntityId}`,
    };
    
    // Get health component
    const healthComp = this.world.getComponent<HealthComponent>(this.selectedEntityId, 'Health');
    if (healthComp) {
      entityData.health = healthComp.current;
      entityData.maxHealth = healthComp.maximum;
    }
    
    // Get position component
    const posComp = this.world.getComponent<PositionComponent>(this.selectedEntityId, 'Position');
    if (posComp) {
      entityData.position = {
        x: posComp.x,
        y: posComp.y,
        z: posComp.z,
      };
    }
    
    // Get state component
    const stateComp = this.world.getComponent<StateComponent>(this.selectedEntityId, 'State');
    if (stateComp) {
      entityData.state = stateComp.current;
    }
    
    this.rtsUI.selectEntity(entityData as any);
  }
  
  /**
   * Select an entity by ID
   */
  public selectEntity(entityId: number): void {
    this.selectedEntityId = entityId;
    this.updateSelectedEntity();
  }
  
  /**
   * Clear entity selection
   */
  public clearSelection(): void {
    this.selectedEntityId = null;
    this.rtsUI.clearSelection();
  }
  
  /**
   * Get the underlying RTS UI instance
   */
  public getUI(): RTSInterface {
    return this.rtsUI;
  }
  
  /**
   * Dispose of the system
   */
  public dispose(): void {
    this.rtsUI.dispose();
  }
}
