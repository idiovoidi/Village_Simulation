/**
 * Level Selector
 * 
 * Handles level loading and UI selection.
 * Ported from MyHavokSimCode/LevelSystem/LevelSelector.js
 */

import { LevelConfig, LEVELS, type LevelConfiguration, type LevelConfigData } from './LevelConfig';

/**
 * Level change callback type
 */
export type LevelChangeCallback = (levelKey: string, config: LevelConfigData) => void;

/**
 * LevelSelector handles level loading and UI
 */
export class LevelSelector {
  private scene: unknown = null;
  private currentLevel: string = 'VILLAGE';
  private onLevelChange: LevelChangeCallback | null = null;
  private levelUI: unknown = null;

  constructor(scene: unknown, onLevelChange?: LevelChangeCallback) {
    this.scene = scene;
    this.onLevelChange = onLevelChange || null;
  }

  /**
   * Get the current level key
   */
  getCurrentLevel(): string {
    return this.currentLevel;
  }

  /**
   * Get the current level configuration
   */
  getCurrentLevelConfig(): LevelConfigData | null {
    return LevelConfig.getLevelConfig(this.currentLevel);
  }

  /**
   * Load a level by key
   */
  async loadLevel(levelKey: string): Promise<LevelConfigData | null> {
    const level = LevelConfig.getLevel(levelKey);
    
    if (!level) {
      console.error(`Level "${levelKey}" not found`);
      return null;
    }

    this.currentLevel = levelKey;
    LevelConfig.setCurrentLevel(levelKey);

    // Notify level change callback
    if (this.onLevelChange) {
      this.onLevelChange(levelKey, level.config);
    }

    console.log(`Loaded level: ${level.name} - ${level.description}`);
    
    return level.config;
  }

  /**
   * Get all available levels
   */
  getAvailableLevels(): LevelConfiguration[] {
    return Object.values(LEVELS);
  }

  /**
   * Get level names for UI display
   */
  getLevelNames(): string[] {
    return LevelConfig.getLevelKeys();
  }

  /**
   * Create level selection UI
   */
  createLevelUI(): unknown {
    const BABYLON = (window as unknown as { BABYLON: typeof import('babylonjs') }).BABYLON;
    if (!BABYLON || !this.scene) return null;

    // Create advanced dynamic texture
    const advancedTexture = BABYLON.GUI.AdvancedDynamicTexture.CreateFullscreenUI('levelUI', true, this.scene as import('babylonjs').Scene);

    // Create panel
    const panel = new BABYLON.GUI.StackPanel();
    panel.width = '300px';
    panel.horizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_RIGHT;
    panel.verticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_TOP;
    panel.paddingTop = '20px';
    panel.paddingRight = '20px';
    advancedTexture.addControl(panel);

    // Title
    const title = new BABYLON.GUI.TextBlock();
    title.text = 'Select Level';
    title.height = '40px';
    title.color = 'white';
    title.fontSize = 20;
    title.fontWeight = 'bold';
    panel.addControl(title);

    // Create buttons for each level
    for (const [key, level] of Object.entries(LEVELS)) {
      const button = BABYLON.GUI.Button.CreateSimpleButton(key, level.name);
      button.width = '100%';
      button.height = '40px';
      button.color = 'white';
      button.background = key === this.currentLevel ? '#4CAF50' : '#333333';
      button.cornerRadius = 5;
      button.paddingTop = '5px';
      button.paddingBottom = '5px';

      button.onPointerUpObservable.add(() => {
        this.loadLevel(key);
        this.refreshLevelButtons();
      });

      panel.addControl(button);
    }

    this.levelUI = advancedTexture;
    return advancedTexture;
  }

  /**
   * Refresh level button colors
   */
  private refreshLevelButtons(): void {
    // This would update button colors when level changes
    // Simplified for now
  }

  /**
   * Hide level UI
   */
  hideLevelUI(): void {
    if (this.levelUI) {
      (this.levelUI as { isVisible: boolean }).isVisible = false;
    }
  }

  /**
   * Show level UI
   */
  showLevelUI(): void {
    if (this.levelUI) {
      (this.levelUI as { isVisible: boolean }).isVisible = true;
    }
  }

  /**
   * Toggle level UI visibility
   */
  toggleLevelUI(): void {
    if (this.levelUI) {
      const ui = this.levelUI as { isVisible: boolean };
      ui.isVisible = !ui.isVisible;
    }
  }

  /**
   * Dispose of level selector resources
   */
  dispose(): void {
    if (this.levelUI) {
      (this.levelUI as { dispose: () => void }).dispose();
      this.levelUI = null;
    }
  }
}