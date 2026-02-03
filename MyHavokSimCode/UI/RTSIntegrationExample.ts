/**
 * Example integration of RTS UI with existing village simulation
 * Shows how to connect the UI system to your current codebase
 */

import type { Scene } from '@babylonjs/core';
import { RTSInterface } from './RTSInterface';

/**
 * Simple integration for existing JavaScript codebase
 * Use this if you're not using the full ECS system yet
 */
export class RTSIntegrationHelper {
  private rtsUI: RTSInterface;
  private scene: Scene;
  
  constructor(scene: Scene) {
    this.scene = scene;
    this.rtsUI = new RTSInterface(scene);
  }
  
  /**
   * Initialize the UI
   */
  public initialize(): void {
    this.rtsUI.initialize();
    this.setupEntityMetadata();
  }
  
  /**
   * Setup metadata on existing meshes for entity inspection
   */
  private setupEntityMetadata(): void {
    // Example: Add metadata to villager meshes
    const villagerMeshes = this.scene.meshes.filter(m => 
      m.name.includes('villager') || m.name.includes('Villager')
    );
    
    villagerMeshes.forEach((mesh, index) => {
      mesh.metadata = {
        entityId: index + 1,
        entityType: 'Villager',
        health: 100,
        maxHealth: 100,
        state: 'Idle',
      };
    });
    
    // Example: Add metadata to zombie meshes
    const zombieMeshes = this.scene.meshes.filter(m => 
      m.name.includes('zombie') || m.name.includes('Zombie')
    );
    
    zombieMeshes.forEach((mesh, index) => {
      mesh.metadata = {
        entityId: 1000 + index,
        entityType: 'Zombie',
        health: 80,
        maxHealth: 80,
        state: 'Wandering',
      };
    });
  }
  
  /**
   * Update entity metadata (call this when entity state changes)
   */
  public updateEntityMetadata(
    meshName: string,
    updates: Partial<Record<string, unknown>>
  ): void {
    const mesh = this.scene.getMeshByName(meshName);
    if (mesh && mesh.metadata) {
      mesh.metadata = { ...mesh.metadata, ...updates };
    }
  }
  
  /**
   * Update resources display
   */
  public updateResources(villagers: number, zombies: number, food: number): void {
    this.rtsUI.updateResources({
      Villagers: villagers,
      Zombies: zombies,
      Food: food,
    });
  }
  
  /**
   * Update time from day/night cycle
   */
  public updateTimeFromCycle(timeOfDay: number): void {
    // Convert 0-1 time to hours and minutes
    const totalMinutes = timeOfDay * 24 * 60;
    const hours = Math.floor(totalMinutes / 60);
    const minutes = Math.floor(totalMinutes % 60);
    
    this.rtsUI.updateTime(hours, minutes);
  }
  
  /**
   * Update each frame
   */
  public update(): void {
    this.rtsUI.update();
  }
  
  /**
   * Dispose
   */
  public dispose(): void {
    this.rtsUI.dispose();
  }
}

/**
 * Example usage in your existing code:
 * 
 * // In your main scene setup (e.g., Havokimport.js or NewVillageEngine.js)
 * import { RTSIntegrationHelper } from './UI/RTSIntegrationExample';
 * 
 * class LeoScene {
 *   constructor() {
 *     // ... existing code ...
 *     this.rtsUI = null;
 *   }
 * 
 *   async createScene() {
 *     // ... existing scene setup ...
 *     
 *     // Initialize RTS UI
 *     this.rtsUI = new RTSIntegrationHelper(this.scene);
 *     this.rtsUI.initialize();
 *     
 *     return this.scene;
 *   }
 * 
 *   render() {
 *     // ... existing render loop ...
 *     
 *     // Update UI
 *     if (this.rtsUI) {
 *       this.rtsUI.update();
 *       
 *       // Update resources
 *       const villagerCount = this.villagers?.length || 0;
 *       const zombieCount = this.zombies?.length || 0;
 *       this.rtsUI.updateResources(villagerCount, zombieCount, 100);
 *       
 *       // Update time from day/night cycle
 *       if (this.dayNightCycle) {
 *         this.rtsUI.updateTimeFromCycle(this.dayNightCycle.timeOfDay);
 *       }
 *     }
 *     
 *     this.scene.render();
 *   }
 * }
 * 
 * // When updating entity state (e.g., in VillagerBehaviour.js)
 * updateState(newState) {
 *   this.state = newState;
 *   
 *   // Update metadata for UI
 *   if (this.mesh && window.rtsUI) {
 *     window.rtsUI.updateEntityMetadata(this.mesh.name, {
 *       state: newState,
 *       health: this.health,
 *     });
 *   }
 * }
 */
