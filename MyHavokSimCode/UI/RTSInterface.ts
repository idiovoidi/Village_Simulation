/**
 * RTS-style UI system with top/bottom bars and entity inspection
 * Follows ECS pattern - UI is a system that queries entity data
 */

import * as GUI from '@babylonjs/gui';
import type { Scene, AbstractMesh } from '@babylonjs/core';

interface EntityData {
  id: number;
  type: string;
  name: string;
  health?: number;
  maxHealth?: number;
  state?: string;
  position?: { x: number; y: number; z: number };
  [key: string]: unknown;
}

interface UIConfig {
  readonly topBarHeight: number;
  readonly bottomBarHeight: number;
  readonly inspectorWidth: number;
  readonly backgroundColor: string;
  readonly textColor: string;
  readonly accentColor: string;
}

const DEFAULT_CONFIG: UIConfig = {
  topBarHeight: 60,
  bottomBarHeight: 200,
  inspectorWidth: 300,
  backgroundColor: '#1a1a1aee',
  textColor: '#e0e0e0',
  accentColor: '#4a9eff',
};

export class RTSInterface {
  private readonly scene: Scene;
  private readonly config: UIConfig;
  private advancedTexture: GUI.AdvancedDynamicTexture | null = null;
  
  // UI Containers
  private topBar: GUI.Rectangle | null = null;
  private bottomBar: GUI.Rectangle | null = null;
  private inspectorPanel: GUI.Rectangle | null = null;
  
  // UI Elements
  private resourceText: GUI.TextBlock | null = null;
  private timeText: GUI.TextBlock | null = null;
  private fpsText: GUI.TextBlock | null = null;
  private selectedEntityPanel: GUI.StackPanel | null = null;
  
  // State
  private selectedEntity: EntityData | null = null;
  private isInspectorVisible = false;
  
  constructor(scene: Scene, config: Partial<UIConfig> = {}) {
    this.scene = scene;
    this.config = { ...DEFAULT_CONFIG, ...config };
  }
  
  /**
   * Initialize the RTS UI system
   */
  public initialize(): void {
    this.advancedTexture = GUI.AdvancedDynamicTexture.CreateFullscreenUI('RTSInterface', true, this.scene);
    
    this.createTopBar();
    this.createBottomBar();
    this.createInspectorPanel();
    this.setupClickHandler();
  }
  
  /**
   * Create the top bar with resources, time, and FPS
   */
  private createTopBar(): void {
    if (!this.advancedTexture) return;
    
    this.topBar = new GUI.Rectangle('topBar');
    this.topBar.height = `${this.config.topBarHeight}px`;
    this.topBar.width = '100%';
    this.topBar.verticalAlignment = GUI.Control.VERTICAL_ALIGNMENT_TOP;
    this.topBar.background = this.config.backgroundColor;
    this.topBar.thickness = 0;
    this.advancedTexture.addControl(this.topBar);
    
    // Left section - Resources
    const leftStack = new GUI.StackPanel('topBarLeft');
    leftStack.isVertical = false;
    leftStack.horizontalAlignment = GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
    leftStack.paddingLeft = '20px';
    this.topBar.addControl(leftStack);
    
    this.resourceText = this.createText('Resources: Loading...', '16px', this.config.textColor);
    leftStack.addControl(this.resourceText);
    
    // Center section - Time
    this.timeText = this.createText('Time: 00:00', '18px', this.config.accentColor);
    this.timeText.horizontalAlignment = GUI.Control.HORIZONTAL_ALIGNMENT_CENTER;
    this.topBar.addControl(this.timeText);
    
    // Right section - FPS
    const rightStack = new GUI.StackPanel('topBarRight');
    rightStack.isVertical = false;
    rightStack.horizontalAlignment = GUI.Control.HORIZONTAL_ALIGNMENT_RIGHT;
    rightStack.paddingRight = '20px';
    this.topBar.addControl(rightStack);
    
    this.fpsText = this.createText('FPS: 60', '16px', this.config.textColor);
    rightStack.addControl(this.fpsText);
  }
  
  /**
   * Create the bottom bar for unit commands and info
   */
  private createBottomBar(): void {
    if (!this.advancedTexture) return;
    
    this.bottomBar = new GUI.Rectangle('bottomBar');
    this.bottomBar.height = `${this.config.bottomBarHeight}px`;
    this.bottomBar.width = '100%';
    this.bottomBar.verticalAlignment = GUI.Control.VERTICAL_ALIGNMENT_BOTTOM;
    this.bottomBar.background = this.config.backgroundColor;
    this.bottomBar.thickness = 0;
    this.advancedTexture.addControl(this.bottomBar);
    
    // Selection info panel
    this.selectedEntityPanel = new GUI.StackPanel('selectedEntityPanel');
    this.selectedEntityPanel.isVertical = true;
    this.selectedEntityPanel.horizontalAlignment = GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
    this.selectedEntityPanel.verticalAlignment = GUI.Control.VERTICAL_ALIGNMENT_TOP;
    this.selectedEntityPanel.paddingLeft = '20px';
    this.selectedEntityPanel.paddingTop = '20px';
    this.selectedEntityPanel.width = '400px';
    this.bottomBar.addControl(this.selectedEntityPanel);
    
    const noSelectionText = this.createText('No entity selected', '14px', '#888888');
    this.selectedEntityPanel.addControl(noSelectionText);
  }
  
  /**
   * Create the inspector panel (right side)
   */
  private createInspectorPanel(): void {
    if (!this.advancedTexture) return;
    
    this.inspectorPanel = new GUI.Rectangle('inspectorPanel');
    this.inspectorPanel.width = `${this.config.inspectorWidth}px`;
    this.inspectorPanel.height = '100%';
    this.inspectorPanel.horizontalAlignment = GUI.Control.HORIZONTAL_ALIGNMENT_RIGHT;
    this.inspectorPanel.background = this.config.backgroundColor;
    this.inspectorPanel.thickness = 2;
    this.inspectorPanel.color = this.config.accentColor;
    this.inspectorPanel.isVisible = false;
    this.advancedTexture.addControl(this.inspectorPanel);
  }
  
  /**
   * Setup click handler for entity selection
   */
  private setupClickHandler(): void {
    this.scene.onPointerObservable.add((pointerInfo) => {
      if (pointerInfo.type === BABYLON.PointerEventTypes.POINTERDOWN) {
        const pickResult = this.scene.pick(
          this.scene.pointerX,
          this.scene.pointerY
        );
        
        if (pickResult?.hit && pickResult.pickedMesh) {
          this.handleEntityClick(pickResult.pickedMesh);
        } else {
          this.clearSelection();
        }
      }
    });
  }
  
  /**
   * Handle entity click
   */
  private handleEntityClick(mesh: AbstractMesh): void {
    // Extract entity data from mesh metadata
    const entityData = this.extractEntityData(mesh);
    
    if (entityData) {
      this.selectEntity(entityData);
    }
  }
  
  /**
   * Extract entity data from mesh
   */
  private extractEntityData(mesh: AbstractMesh): EntityData | null {
    // Check if mesh has entity metadata
    if (!mesh.metadata) return null;
    
    const metadata = mesh.metadata as Record<string, unknown>;
    
    return {
      id: (metadata.entityId as number) ?? 0,
      type: (metadata.entityType as string) ?? 'Unknown',
      name: mesh.name,
      health: metadata.health as number | undefined,
      maxHealth: metadata.maxHealth as number | undefined,
      state: metadata.state as string | undefined,
      position: {
        x: mesh.position.x,
        y: mesh.position.y,
        z: mesh.position.z,
      },
    };
  }
  
  /**
   * Select an entity and display its info
   */
  public selectEntity(entity: EntityData): void {
    this.selectedEntity = entity;
    this.updateSelectedEntityPanel();
    this.showInspector();
  }
  
  /**
   * Clear entity selection
   */
  public clearSelection(): void {
    this.selectedEntity = null;
    this.updateSelectedEntityPanel();
    this.hideInspector();
  }
  
  /**
   * Update the selected entity panel
   */
  private updateSelectedEntityPanel(): void {
    if (!this.selectedEntityPanel) return;
    
    // Clear existing children
    this.selectedEntityPanel.clearControls();
    
    if (!this.selectedEntity) {
      const noSelectionText = this.createText('No entity selected', '14px', '#888888');
      this.selectedEntityPanel.addControl(noSelectionText);
      return;
    }
    
    // Entity name
    const nameText = this.createText(
      this.selectedEntity.name,
      '20px',
      this.config.accentColor
    );
    nameText.fontWeight = 'bold';
    this.selectedEntityPanel.addControl(nameText);
    
    // Entity type
    const typeText = this.createText(
      `Type: ${this.selectedEntity.type}`,
      '14px',
      this.config.textColor
    );
    this.selectedEntityPanel.addControl(typeText);
    
    // Health bar if available
    if (this.selectedEntity.health !== undefined && this.selectedEntity.maxHealth !== undefined) {
      this.addHealthBar(this.selectedEntity.health, this.selectedEntity.maxHealth);
    }
    
    // State if available
    if (this.selectedEntity.state) {
      const stateText = this.createText(
        `State: ${this.selectedEntity.state}`,
        '14px',
        this.config.textColor
      );
      this.selectedEntityPanel.addControl(stateText);
    }
    
    // Position
    if (this.selectedEntity.position) {
      const pos = this.selectedEntity.position;
      const posText = this.createText(
        `Position: (${pos.x.toFixed(1)}, ${pos.y.toFixed(1)}, ${pos.z.toFixed(1)})`,
        '12px',
        '#aaaaaa'
      );
      this.selectedEntityPanel.addControl(posText);
    }
  }
  
  /**
   * Add health bar to selected entity panel
   */
  private addHealthBar(current: number, max: number): void {
    if (!this.selectedEntityPanel) return;
    
    const healthContainer = new GUI.Rectangle('healthContainer');
    healthContainer.height = '30px';
    healthContainer.width = '300px';
    healthContainer.thickness = 0;
    this.selectedEntityPanel.addControl(healthContainer);
    
    // Background
    const healthBg = new GUI.Rectangle('healthBg');
    healthBg.height = '20px';
    healthBg.width = '100%';
    healthBg.background = '#333333';
    healthBg.thickness = 1;
    healthBg.color = '#666666';
    healthContainer.addControl(healthBg);
    
    // Health fill
    const healthPercent = (current / max) * 100;
    const healthFill = new GUI.Rectangle('healthFill');
    healthFill.height = '20px';
    healthFill.width = `${healthPercent}%`;
    healthFill.horizontalAlignment = GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
    healthFill.background = this.getHealthColor(healthPercent);
    healthFill.thickness = 0;
    healthContainer.addControl(healthFill);
    
    // Health text
    const healthText = this.createText(
      `${current}/${max}`,
      '12px',
      '#ffffff'
    );
    healthContainer.addControl(healthText);
  }
  
  /**
   * Get health bar color based on percentage
   */
  private getHealthColor(percent: number): string {
    if (percent > 66) return '#4caf50';
    if (percent > 33) return '#ff9800';
    return '#f44336';
  }
  
  /**
   * Show inspector panel
   */
  private showInspector(): void {
    if (this.inspectorPanel) {
      this.inspectorPanel.isVisible = true;
      this.isInspectorVisible = true;
    }
  }
  
  /**
   * Hide inspector panel
   */
  private hideInspector(): void {
    if (this.inspectorPanel) {
      this.inspectorPanel.isVisible = false;
      this.isInspectorVisible = false;
    }
  }
  
  /**
   * Update resources display
   */
  public updateResources(resources: Record<string, number>): void {
    if (!this.resourceText) return;
    
    const resourceStrings = Object.entries(resources)
      .map(([key, value]) => `${key}: ${value}`)
      .join(' | ');
    
    this.resourceText.text = resourceStrings || 'No resources';
  }
  
  /**
   * Update time display
   */
  public updateTime(hours: number, minutes: number): void {
    if (!this.timeText) return;
    
    const hoursStr = hours.toString().padStart(2, '0');
    const minutesStr = minutes.toString().padStart(2, '0');
    this.timeText.text = `Time: ${hoursStr}:${minutesStr}`;
  }
  
  /**
   * Update FPS display
   */
  public updateFPS(fps: number): void {
    if (!this.fpsText) return;
    this.fpsText.text = `FPS: ${Math.round(fps)}`;
  }
  
  /**
   * Update system (called each frame)
   */
  public update(): void {
    // Update FPS
    const fps = this.scene.getEngine().getFps();
    this.updateFPS(fps);
    
    // Update selected entity position if still selected
    if (this.selectedEntity && this.selectedEntity.position) {
      // Position updates would come from the ECS system
      this.updateSelectedEntityPanel();
    }
  }
  
  /**
   * Helper to create text blocks
   */
  private createText(text: string, fontSize: string, color: string): GUI.TextBlock {
    const textBlock = new GUI.TextBlock();
    textBlock.text = text;
    textBlock.fontSize = fontSize;
    textBlock.color = color;
    textBlock.textHorizontalAlignment = GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
    textBlock.height = '30px';
    return textBlock;
  }
  
  /**
   * Dispose of UI resources
   */
  public dispose(): void {
    if (this.advancedTexture) {
      this.advancedTexture.dispose();
      this.advancedTexture = null;
    }
    
    this.topBar = null;
    this.bottomBar = null;
    this.inspectorPanel = null;
    this.resourceText = null;
    this.timeText = null;
    this.fpsText = null;
    this.selectedEntityPanel = null;
    this.selectedEntity = null;
  }
}
