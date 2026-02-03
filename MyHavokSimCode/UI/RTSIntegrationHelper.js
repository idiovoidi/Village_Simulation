/**
 * RTS UI Integration Helper - JavaScript version
 * Simple integration for existing JavaScript codebase
 */

export class RTSIntegrationHelper {
  constructor(scene) {
    this.scene = scene;
    this.advancedTexture = null;
    this.topBar = null;
    this.bottomBar = null;
    this.resourceText = null;
    this.timeText = null;
    this.fpsText = null;
    this.selectedEntityPanel = null;
    this.selectedEntity = null;
    
    // Configuration - sleek modern design
    this.config = {
      topBarHeight: 50,
      bottomBarHeight: 180,
      backgroundColor: 'rgba(15, 15, 20, 0.85)',
      borderColor: 'rgba(100, 150, 255, 0.3)',
      textColor: '#e8e8e8',
      accentColor: '#64b5f6',
      highlightColor: '#81c784',
    };
  }

  initialize() {
    this.advancedTexture = BABYLON.GUI.AdvancedDynamicTexture.CreateFullscreenUI('RTSInterface', true, this.scene);
    
    this.createTopBar();
    this.createBottomBar();
    this.setupClickHandler();
    
    console.log('RTS UI initialized');
  }

  createTopBar() {
    this.topBar = new BABYLON.GUI.Rectangle('topBar');
    this.topBar.height = `${this.config.topBarHeight}px`;
    this.topBar.width = '100%';
    this.topBar.verticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_TOP;
    this.topBar.background = this.config.backgroundColor;
    this.topBar.thickness = 2;
    this.topBar.color = this.config.borderColor;
    this.advancedTexture.addControl(this.topBar);
    
    // Resources (left) - moved right to avoid WorldClock
    this.resourceText = this.createText('Resources: Loading...', '15px', this.config.textColor);
    this.resourceText.horizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
    this.resourceText.paddingLeft = '180px'; // Move right of WorldClock
    this.resourceText.fontWeight = '500';
    this.topBar.addControl(this.resourceText);
    
    // Time (center)
    this.timeText = this.createText('Time: 00:00', '16px', this.config.accentColor);
    this.timeText.horizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_CENTER;
    this.timeText.fontWeight = '600';
    this.topBar.addControl(this.timeText);
    
    // FPS (right) - hide it since WorldClock might show FPS
    // We'll skip the FPS display to avoid duplication
  }

  createBottomBar() {
    this.bottomBar = new BABYLON.GUI.Rectangle('bottomBar');
    this.bottomBar.height = `${this.config.bottomBarHeight}px`;
    this.bottomBar.width = '100%';
    this.bottomBar.verticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_BOTTOM;
    this.bottomBar.background = this.config.backgroundColor;
    this.bottomBar.thickness = 2;
    this.bottomBar.color = this.config.borderColor;
    this.advancedTexture.addControl(this.bottomBar);
    
    // Selection panel with better styling
    this.selectedEntityPanel = new BABYLON.GUI.StackPanel('selectedEntityPanel');
    this.selectedEntityPanel.isVertical = true;
    this.selectedEntityPanel.horizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
    this.selectedEntityPanel.verticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_TOP;
    this.selectedEntityPanel.paddingLeft = '25px';
    this.selectedEntityPanel.paddingTop = '20px';
    this.selectedEntityPanel.width = '450px';
    this.bottomBar.addControl(this.selectedEntityPanel);
    
    const noSelectionText = this.createText('Click on an entity to inspect', '14px', 'rgba(255, 255, 255, 0.5)');
    noSelectionText.fontStyle = 'italic';
    this.selectedEntityPanel.addControl(noSelectionText);
  }

  setupClickHandler() {
    this.scene.onPointerObservable.add((pointerInfo) => {
      if (pointerInfo.type === BABYLON.PointerEventTypes.POINTERDOWN) {
        const pickResult = this.scene.pick(this.scene.pointerX, this.scene.pointerY);
        
        if (pickResult?.hit && pickResult.pickedMesh) {
          const mesh = pickResult.pickedMesh;
          if (mesh.metadata && mesh.metadata.entityType) {
            this.selectEntity(mesh);
          } else {
            this.clearSelection();
          }
        } else {
          this.clearSelection();
        }
      }
    });
  }

  selectEntity(mesh) {
    // Clear previous selection highlight
    if (this.selectedEntity && this.selectedEntity.material) {
      this.selectedEntity.material.emissiveColor = new BABYLON.Color3(0, 0, 0);
    }
    
    this.selectedEntity = mesh;
    
    // Highlight selected mesh with a nice glow
    if (mesh.material) {
      mesh.material.emissiveColor = new BABYLON.Color3(0.2, 0.4, 0.6);
    }
    
    this.updateSelectedEntityPanel();
  }

  clearSelection() {
    if (this.selectedEntity && this.selectedEntity.material) {
      this.selectedEntity.material.emissiveColor = new BABYLON.Color3(0, 0, 0);
    }
    
    this.selectedEntity = null;
    this.updateSelectedEntityPanel();
  }

  updateSelectedEntityPanel() {
    if (!this.selectedEntityPanel) return;
    
    this.selectedEntityPanel.clearControls();
    
    if (!this.selectedEntity || !this.selectedEntity.metadata) {
      const noSelectionText = this.createText('Click on an entity to inspect', '14px', 'rgba(255, 255, 255, 0.5)');
      noSelectionText.fontStyle = 'italic';
      this.selectedEntityPanel.addControl(noSelectionText);
      return;
    }
    
    const meta = this.selectedEntity.metadata;
    
    // Entity name with icon
    const nameText = this.createText(`◆ ${this.selectedEntity.name}`, '22px', this.config.accentColor);
    nameText.fontWeight = 'bold';
    nameText.shadowColor = 'rgba(0, 0, 0, 0.5)';
    nameText.shadowBlur = 4;
    this.selectedEntityPanel.addControl(nameText);
    
    // Spacer
    const spacer1 = new BABYLON.GUI.Rectangle();
    spacer1.height = '5px';
    spacer1.thickness = 0;
    this.selectedEntityPanel.addControl(spacer1);
    
    // Entity type with better styling
    const typeText = this.createText(`Type: ${meta.entityType}`, '14px', this.config.textColor);
    typeText.alpha = 0.9;
    this.selectedEntityPanel.addControl(typeText);
    
    // Health bar if available
    if (meta.health !== undefined && meta.maxHealth !== undefined) {
      const spacer2 = new BABYLON.GUI.Rectangle();
      spacer2.height = '8px';
      spacer2.thickness = 0;
      this.selectedEntityPanel.addControl(spacer2);
      
      this.addHealthBar(meta.health, meta.maxHealth);
    }
    
    // State if available
    if (meta.state) {
      const spacer3 = new BABYLON.GUI.Rectangle();
      spacer3.height = '5px';
      spacer3.thickness = 0;
      this.selectedEntityPanel.addControl(spacer3);
      
      const stateText = this.createText(`State: ${meta.state}`, '14px', this.config.highlightColor);
      stateText.fontWeight = '500';
      this.selectedEntityPanel.addControl(stateText);
    }
    
    // Position with better formatting
    const pos = this.selectedEntity.position;
    const posText = this.createText(
      `Position: (${pos.x.toFixed(1)}, ${pos.y.toFixed(1)}, ${pos.z.toFixed(1)})`,
      '12px',
      'rgba(255, 255, 255, 0.6)'
    );
    this.selectedEntityPanel.addControl(posText);
  }

  addHealthBar(current, max) {
    const healthContainer = new BABYLON.GUI.Rectangle('healthContainer');
    healthContainer.height = '35px';
    healthContainer.width = '320px';
    healthContainer.thickness = 0;
    this.selectedEntityPanel.addControl(healthContainer);
    
    // Background with gradient effect
    const healthBg = new BABYLON.GUI.Rectangle('healthBg');
    healthBg.height = '22px';
    healthBg.width = '100%';
    healthBg.background = 'rgba(30, 30, 35, 0.8)';
    healthBg.thickness = 2;
    healthBg.color = 'rgba(100, 150, 255, 0.4)';
    healthBg.cornerRadius = 4;
    healthContainer.addControl(healthBg);
    
    // Health fill with glow
    const healthPercent = (current / max) * 100;
    const healthFill = new BABYLON.GUI.Rectangle('healthFill');
    healthFill.height = '22px';
    healthFill.width = `${healthPercent}%`;
    healthFill.horizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
    healthFill.background = this.getHealthColor(healthPercent);
    healthFill.thickness = 0;
    healthFill.cornerRadius = 4;
    healthContainer.addControl(healthFill);
    
    // Health text with shadow
    const healthText = this.createText(`${Math.round(current)}/${max} HP`, '13px', '#ffffff');
    healthText.fontWeight = '600';
    healthText.shadowColor = 'rgba(0, 0, 0, 0.8)';
    healthText.shadowBlur = 3;
    healthContainer.addControl(healthText);
  }

  getHealthColor(percent) {
    if (percent > 75) return 'rgba(76, 175, 80, 0.9)';   // Green
    if (percent > 50) return 'rgba(156, 204, 101, 0.9)'; // Light green
    if (percent > 25) return 'rgba(255, 152, 0, 0.9)';   // Orange
    return 'rgba(244, 67, 54, 0.9)';                     // Red
  }

  updateResources(villagers, zombies, other) {
    if (!this.resourceText) return;
    
    const parts = [];
    if (villagers !== undefined) parts.push(`👥 ${villagers}`);
    if (zombies !== undefined) parts.push(`🧟 ${zombies}`);
    if (other !== undefined) parts.push(`🐾 ${other}`);
    
    this.resourceText.text = parts.join('  •  ') || 'Loading...';
  }

  updateTimeFromCycle(timeOfDay) {
    if (!this.timeText) return;
    
    const totalMinutes = timeOfDay * 24 * 60;
    const hours = Math.floor(totalMinutes / 60);
    const minutes = Math.floor(totalMinutes % 60);
    
    const hoursStr = hours.toString().padStart(2, '0');
    const minutesStr = minutes.toString().padStart(2, '0');
    this.timeText.text = `Time: ${hoursStr}:${minutesStr}`;
  }

  updateTimeFromMinutes(gameMinutes) {
    if (!this.timeText) return;
    
    const hours = Math.floor(gameMinutes / 60);
    const minutes = Math.floor(gameMinutes % 60);
    
    const hoursStr = hours.toString().padStart(2, '0');
    const minutesStr = minutes.toString().padStart(2, '0');
    
    // Add day/night indicator
    const isNight = hours >= 18 || hours < 6;
    const icon = isNight ? '🌙' : '☀️';
    
    this.timeText.text = `${icon} ${hoursStr}:${minutesStr}`;
  }

  update() {
    // Update selected entity if any
    if (this.selectedEntity) {
      this.updateSelectedEntityPanel();
    }
  }

  createText(text, fontSize, color) {
    const textBlock = new BABYLON.GUI.TextBlock();
    textBlock.text = text;
    textBlock.fontSize = fontSize;
    textBlock.color = color;
    textBlock.textHorizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
    textBlock.height = '30px';
    return textBlock;
  }

  dispose() {
    if (this.advancedTexture) {
      this.advancedTexture.dispose();
      this.advancedTexture = null;
    }
  }
}
