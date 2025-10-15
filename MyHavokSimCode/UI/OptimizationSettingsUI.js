/**
 * OptimizationSettingsUI - User interface for optimization settings and controls
 * Provides user-accessible controls for performance optimization configuration
 */

export class OptimizationSettingsUI {
    constructor(scene, optimizationConfig, performanceOptimizer) {
        this.scene = scene;
        this.optimizationConfig = optimizationConfig;
        this.performanceOptimizer = performanceOptimizer;
        
        this.advancedTexture = null;
        this.settingsPanel = null;
        this.isVisible = false;
        this.controls = {};
        
        console.log('OptimizationSettingsUI initialized');
    }
    
    /**
     * Initialize the settings UI
     */
    async initialize() {
        try {
            console.log('Initializing OptimizationSettingsUI...');
            
            // Create GUI texture
            this.advancedTexture = BABYLON.GUI.AdvancedDynamicTexture.CreateFullscreenUI("optimizationSettingsUI");
            
            // Create settings panel
            this.createSettingsPanel();
            
            // Set up event handlers
            this.setupEventHandlers();
            
            // Initially hidden
            this.hide();
            
            console.log('OptimizationSettingsUI initialization complete');
            
        } catch (error) {
            console.error('Failed to initialize OptimizationSettingsUI:', error);
            throw error;
        }
    }
    
    /**
     * Create the main settings panel
     */
    createSettingsPanel() {
        // Create main panel
        this.settingsPanel = new BABYLON.GUI.Rectangle("settingsPanel");
        this.settingsPanel.widthInPixels = 400;
        this.settingsPanel.heightInPixels = 600;
        this.settingsPanel.cornerRadius = 10;
        this.settingsPanel.color = "white";
        this.settingsPanel.thickness = 2;
        this.settingsPanel.background = "rgba(0, 0, 0, 0.8)";
        this.settingsPanel.horizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_RIGHT;
        this.settingsPanel.verticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_CENTER;
        this.settingsPanel.paddingRightInPixels = 20;
        
        this.advancedTexture.addControl(this.settingsPanel);
        
        // Create scroll viewer for content
        const scrollViewer = new BABYLON.GUI.ScrollViewer("settingsScroll");
        scrollViewer.thickness = 0;
        scrollViewer.background = "transparent";
        this.settingsPanel.addControl(scrollViewer);
        
        // Create content stack panel
        const contentPanel = new BABYLON.GUI.StackPanel("settingsContent");
        contentPanel.isVertical = true;
        contentPanel.spacing = 10;
        scrollViewer.addControl(contentPanel);
        
        // Add title
        this.addTitle(contentPanel);
        
        // Add preset selection
        this.addPresetSelection(contentPanel);
        
        // Add optimization level
        this.addOptimizationLevel(contentPanel);
        
        // Add target FPS
        this.addTargetFPS(contentPanel);
        
        // Add quality settings
        this.addQualitySettings(contentPanel);
        
        // Add optimization toggles
        this.addOptimizationToggles(contentPanel);
        
        // Add performance metrics toggle
        this.addPerformanceMetricsToggle(contentPanel);
        
        // Add action buttons
        this.addActionButtons(contentPanel);
        
        // Add close button
        this.addCloseButton();
    }
    
    /**
     * Add title to the panel
     */
    addTitle(parent) {
        const title = new BABYLON.GUI.TextBlock("settingsTitle", "Performance Settings");
        title.color = "white";
        title.fontSize = 20;
        title.fontWeight = "bold";
        title.heightInPixels = 40;
        parent.addControl(title);
    }
    
    /**
     * Add preset selection dropdown
     */
    addPresetSelection(parent) {
        const label = this.createLabel("Quality Preset:");
        parent.addControl(label);
        
        const dropdown = new BABYLON.GUI.DropdownMenu("presetDropdown");
        dropdown.widthInPixels = 300;
        dropdown.heightInPixels = 30;
        dropdown.color = "white";
        dropdown.background = "rgba(255, 255, 255, 0.1)";
        
        // Add preset options
        const presets = this.optimizationConfig.getPresets();
        for (const [key, preset] of Object.entries(presets)) {
            dropdown.addOption(preset.name, key);
        }
        
        // Set current selection
        const currentConfig = this.optimizationConfig.getConfiguration();
        dropdown.selectedIndex = Object.keys(presets).indexOf(currentConfig.qualitySettings.preset);
        
        dropdown.onSelectionChangedObservable.add((selection) => {
            this.optimizationConfig.applyPreset(selection);
            this.updateControlsFromConfig();
        });
        
        parent.addControl(dropdown);
        this.controls.presetDropdown = dropdown;
    }
    
    /**
     * Add optimization level selection
     */
    addOptimizationLevel(parent) {
        const label = this.createLabel("Optimization Level:");
        parent.addControl(label);
        
        const radioGroup = new BABYLON.GUI.StackPanel("optimizationLevelGroup");
        radioGroup.isVertical = false;
        radioGroup.heightInPixels = 30;
        radioGroup.spacing = 20;
        
        const levels = ['conservative', 'balanced', 'aggressive'];
        const currentConfig = this.optimizationConfig.getConfiguration();
        
        levels.forEach(level => {
            const radio = new BABYLON.GUI.RadioButton("level_" + level);
            radio.widthInPixels = 20;
            radio.heightInPixels = 20;
            radio.color = "white";
            radio.background = "rgba(255, 255, 255, 0.1)";
            radio.isChecked = currentConfig.optimizationLevel === level;
            
            radio.onIsCheckedChangedObservable.add((checked) => {
                if (checked) {
                    this.optimizationConfig.updateConfiguration({ optimizationLevel: level });
                    this.performanceOptimizer.setOptimizationLevel(level);
                }
            });
            
            const radioLabel = new BABYLON.GUI.TextBlock("levelLabel_" + level, level);
            radioLabel.color = "white";
            radioLabel.fontSize = 14;
            radioLabel.widthInPixels = 80;
            radioLabel.heightInPixels = 20;
            
            const radioContainer = new BABYLON.GUI.StackPanel("radioContainer_" + level);
            radioContainer.isVertical = false;
            radioContainer.spacing = 5;
            radioContainer.addControl(radio);
            radioContainer.addControl(radioLabel);
            
            radioGroup.addControl(radioContainer);
            this.controls[`level_${level}`] = radio;
        });
        
        parent.addControl(radioGroup);
    }
    
    /**
     * Add target FPS slider
     */
    addTargetFPS(parent) {
        const label = this.createLabel("Target FPS:");
        parent.addControl(label);
        
        const sliderContainer = new BABYLON.GUI.StackPanel("fpsSliderContainer");
        sliderContainer.isVertical = false;
        sliderContainer.heightInPixels = 30;
        sliderContainer.spacing = 10;
        
        const slider = new BABYLON.GUI.Slider("targetFPSSlider");
        slider.minimum = 30;
        slider.maximum = 120;
        slider.step = 15;
        slider.widthInPixels = 200;
        slider.heightInPixels = 20;
        slider.color = "white";
        slider.background = "rgba(255, 255, 255, 0.1)";
        
        const currentConfig = this.optimizationConfig.getConfiguration();
        slider.value = currentConfig.targetFPS;
        
        const valueLabel = new BABYLON.GUI.TextBlock("fpsValue", slider.value.toString());
        valueLabel.color = "white";
        valueLabel.fontSize = 14;
        valueLabel.widthInPixels = 40;
        valueLabel.heightInPixels = 20;
        
        slider.onValueChangedObservable.add((value) => {
            valueLabel.text = Math.round(value).toString();
            this.optimizationConfig.updateConfiguration({ targetFPS: Math.round(value) });
            this.performanceOptimizer.setTargetFPS(Math.round(value));
        });
        
        sliderContainer.addControl(slider);
        sliderContainer.addControl(valueLabel);
        parent.addControl(sliderContainer);
        
        this.controls.targetFPSSlider = slider;
        this.controls.fpsValueLabel = valueLabel;
    }
    
    /**
     * Add quality settings sliders
     */
    addQualitySettings(parent) {
        const qualityLabel = this.createLabel("Quality Settings:");
        parent.addControl(qualityLabel);
        
        const currentConfig = this.optimizationConfig.getConfiguration();
        const qualitySettings = [
            { key: 'shadowQuality', label: 'Shadow Quality', min: 0, max: 3, step: 1 },
            { key: 'textureQuality', label: 'Texture Quality', min: 0, max: 3, step: 1 },
            { key: 'lodDistance', label: 'LOD Distance', min: 20, max: 100, step: 10 },
            { key: 'particleCount', label: 'Particle Count', min: 50, max: 1000, step: 50 }
        ];
        
        qualitySettings.forEach(setting => {
            const settingContainer = new BABYLON.GUI.StackPanel(`${setting.key}Container`);
            settingContainer.isVertical = false;
            settingContainer.heightInPixels = 25;
            settingContainer.spacing = 10;
            
            const settingLabel = new BABYLON.GUI.TextBlock(`${setting.key}Label`, setting.label);
            settingLabel.color = "white";
            settingLabel.fontSize = 12;
            settingLabel.widthInPixels = 120;
            settingLabel.heightInPixels = 20;
            settingLabel.textHorizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
            
            const slider = new BABYLON.GUI.Slider(`${setting.key}Slider`);
            slider.minimum = setting.min;
            slider.maximum = setting.max;
            slider.step = setting.step;
            slider.widthInPixels = 120;
            slider.heightInPixels = 15;
            slider.color = "white";
            slider.background = "rgba(255, 255, 255, 0.1)";
            
            // Set current value
            let currentValue;
            if (setting.key === 'particleCount') {
                currentValue = currentConfig.qualitySettings.effects.particleCount;
            } else {
                currentValue = currentConfig.qualitySettings.rendering[setting.key];
            }
            slider.value = currentValue;
            
            const valueLabel = new BABYLON.GUI.TextBlock(`${setting.key}Value`, currentValue.toString());
            valueLabel.color = "white";
            valueLabel.fontSize = 12;
            valueLabel.widthInPixels = 30;
            valueLabel.heightInPixels = 20;
            
            slider.onValueChangedObservable.add((value) => {
                const roundedValue = Math.round(value);
                valueLabel.text = roundedValue.toString();
                
                // Update configuration
                const updates = { qualitySettings: { ...currentConfig.qualitySettings } };
                if (setting.key === 'particleCount') {
                    updates.qualitySettings.effects = { ...updates.qualitySettings.effects };
                    updates.qualitySettings.effects.particleCount = roundedValue;
                } else {
                    updates.qualitySettings.rendering = { ...updates.qualitySettings.rendering };
                    updates.qualitySettings.rendering[setting.key] = roundedValue;
                }
                
                this.optimizationConfig.updateConfiguration(updates);
            });
            
            settingContainer.addControl(settingLabel);
            settingContainer.addControl(slider);
            settingContainer.addControl(valueLabel);
            parent.addControl(settingContainer);
            
            this.controls[`${setting.key}Slider`] = slider;
            this.controls[`${setting.key}ValueLabel`] = valueLabel;
        });
    }
    
    /**
     * Add optimization feature toggles
     */
    addOptimizationToggles(parent) {
        const toggleLabel = this.createLabel("Optimization Features:");
        parent.addControl(toggleLabel);
        
        const currentConfig = this.optimizationConfig.getConfiguration();
        const optimizations = [
            { key: 'adaptiveQuality', label: 'Adaptive Quality' },
            { key: 'rendering', label: 'Rendering Optimization' },
            { key: 'aiProcessing', label: 'AI Processing Optimization' },
            { key: 'physics', label: 'Physics Optimization' },
            { key: 'memory', label: 'Memory Management' }
        ];
        
        optimizations.forEach(opt => {
            const toggleContainer = new BABYLON.GUI.StackPanel(`${opt.key}ToggleContainer`);
            toggleContainer.isVertical = false;
            toggleContainer.heightInPixels = 25;
            toggleContainer.spacing = 10;
            
            const checkbox = new BABYLON.GUI.Checkbox(`${opt.key}Checkbox`);
            checkbox.widthInPixels = 20;
            checkbox.heightInPixels = 20;
            checkbox.color = "white";
            checkbox.background = "rgba(255, 255, 255, 0.1)";
            
            if (opt.key === 'adaptiveQuality') {
                checkbox.isChecked = currentConfig.adaptiveQualityEnabled;
            } else {
                checkbox.isChecked = currentConfig.enabledOptimizations[opt.key];
            }
            
            checkbox.onIsCheckedChangedObservable.add((checked) => {
                if (opt.key === 'adaptiveQuality') {
                    this.optimizationConfig.updateConfiguration({ adaptiveQualityEnabled: checked });
                    this.performanceOptimizer.enableAdaptiveQuality(checked);
                } else {
                    const updates = {
                        enabledOptimizations: {
                            ...currentConfig.enabledOptimizations,
                            [opt.key]: checked
                        }
                    };
                    this.optimizationConfig.updateConfiguration(updates);
                }
            });
            
            const checkboxLabel = new BABYLON.GUI.TextBlock(`${opt.key}Label`, opt.label);
            checkboxLabel.color = "white";
            checkboxLabel.fontSize = 12;
            checkboxLabel.widthInPixels = 200;
            checkboxLabel.heightInPixels = 20;
            checkboxLabel.textHorizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
            
            toggleContainer.addControl(checkbox);
            toggleContainer.addControl(checkboxLabel);
            parent.addControl(toggleContainer);
            
            this.controls[`${opt.key}Checkbox`] = checkbox;
        });
    }
    
    /**
     * Add performance metrics toggle
     */
    addPerformanceMetricsToggle(parent) {
        const metricsContainer = new BABYLON.GUI.StackPanel("metricsToggleContainer");
        metricsContainer.isVertical = false;
        metricsContainer.heightInPixels = 25;
        metricsContainer.spacing = 10;
        
        const checkbox = new BABYLON.GUI.Checkbox("metricsCheckbox");
        checkbox.widthInPixels = 20;
        checkbox.heightInPixels = 20;
        checkbox.color = "white";
        checkbox.background = "rgba(255, 255, 255, 0.1)";
        
        const currentConfig = this.optimizationConfig.getConfiguration();
        checkbox.isChecked = currentConfig.userPreferences.showPerformanceMetrics;
        
        checkbox.onIsCheckedChangedObservable.add((checked) => {
            const updates = {
                userPreferences: {
                    ...currentConfig.userPreferences,
                    showPerformanceMetrics: checked
                }
            };
            this.optimizationConfig.updateConfiguration(updates);
        });
        
        const label = new BABYLON.GUI.TextBlock("metricsLabel", "Show Performance Metrics");
        label.color = "white";
        label.fontSize = 12;
        label.widthInPixels = 200;
        label.heightInPixels = 20;
        label.textHorizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
        
        metricsContainer.addControl(checkbox);
        metricsContainer.addControl(label);
        parent.addControl(metricsContainer);
        
        this.controls.metricsCheckbox = checkbox;
    }
    
    /**
     * Add action buttons
     */
    addActionButtons(parent) {
        const buttonContainer = new BABYLON.GUI.StackPanel("actionButtonContainer");
        buttonContainer.isVertical = false;
        buttonContainer.heightInPixels = 40;
        buttonContainer.spacing = 10;
        
        // Reset to defaults button
        const resetButton = BABYLON.GUI.Button.CreateSimpleButton("resetButton", "Reset to Defaults");
        resetButton.widthInPixels = 140;
        resetButton.heightInPixels = 30;
        resetButton.color = "white";
        resetButton.background = "rgba(255, 100, 100, 0.8)";
        resetButton.cornerRadius = 5;
        
        resetButton.onPointerClickObservable.add(() => {
            this.optimizationConfig.resetToDefaults();
            this.updateControlsFromConfig();
        });
        
        // Save settings button
        const saveButton = BABYLON.GUI.Button.CreateSimpleButton("saveButton", "Save Settings");
        saveButton.widthInPixels = 140;
        saveButton.heightInPixels = 30;
        saveButton.color = "white";
        saveButton.background = "rgba(100, 255, 100, 0.8)";
        saveButton.cornerRadius = 5;
        
        saveButton.onPointerClickObservable.add(() => {
            this.optimizationConfig.saveConfiguration();
        });
        
        buttonContainer.addControl(resetButton);
        buttonContainer.addControl(saveButton);
        parent.addControl(buttonContainer);
    }
    
    /**
     * Add close button
     */
    addCloseButton() {
        const closeButton = BABYLON.GUI.Button.CreateSimpleButton("closeButton", "×");
        closeButton.widthInPixels = 30;
        closeButton.heightInPixels = 30;
        closeButton.color = "white";
        closeButton.background = "rgba(255, 100, 100, 0.8)";
        closeButton.cornerRadius = 15;
        closeButton.fontSize = 20;
        closeButton.fontWeight = "bold";
        closeButton.horizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_RIGHT;
        closeButton.verticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_TOP;
        closeButton.topInPixels = 10;
        closeButton.rightInPixels = 10;
        
        closeButton.onPointerClickObservable.add(() => {
            this.hide();
        });
        
        this.settingsPanel.addControl(closeButton);
    }
    
    /**
     * Create a label with consistent styling
     */
    createLabel(text) {
        const label = new BABYLON.GUI.TextBlock("label", text);
        label.color = "white";
        label.fontSize = 14;
        label.fontWeight = "bold";
        label.heightInPixels = 25;
        label.textHorizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
        return label;
    }
    
    /**
     * Set up event handlers
     */
    setupEventHandlers() {
        // Listen for configuration changes
        this.optimizationConfig.onChange((event, data) => {
            if (event === 'configurationUpdated' || event === 'presetApplied') {
                this.updateControlsFromConfig();
            }
        });
        
        // Listen for keyboard shortcuts
        this.scene.actionManager = this.scene.actionManager || new BABYLON.ActionManager(this.scene);
        
        // Toggle settings with F1 key
        this.scene.actionManager.registerAction(new BABYLON.ExecuteCodeAction(
            BABYLON.ActionManager.OnKeyDownTrigger,
            (evt) => {
                if (evt.sourceEvent.key === 'F1') {
                    this.toggle();
                }
            }
        ));
    }
    
    /**
     * Update controls from current configuration
     */
    updateControlsFromConfig() {
        const config = this.optimizationConfig.getConfiguration();
        
        // Update preset dropdown
        if (this.controls.presetDropdown) {
            const presets = this.optimizationConfig.getPresets();
            const presetIndex = Object.keys(presets).indexOf(config.qualitySettings.preset);
            if (presetIndex >= 0) {
                this.controls.presetDropdown.selectedIndex = presetIndex;
            }
        }
        
        // Update optimization level radio buttons
        ['conservative', 'balanced', 'aggressive'].forEach(level => {
            if (this.controls[`level_${level}`]) {
                this.controls[`level_${level}`].isChecked = config.optimizationLevel === level;
            }
        });
        
        // Update target FPS slider
        if (this.controls.targetFPSSlider) {
            this.controls.targetFPSSlider.value = config.targetFPS;
            this.controls.fpsValueLabel.text = config.targetFPS.toString();
        }
        
        // Update quality sliders
        const qualityMappings = {
            shadowQuality: config.qualitySettings.rendering.shadowQuality,
            textureQuality: config.qualitySettings.rendering.textureQuality,
            lodDistance: config.qualitySettings.rendering.lodDistance,
            particleCount: config.qualitySettings.effects.particleCount
        };
        
        for (const [key, value] of Object.entries(qualityMappings)) {
            if (this.controls[`${key}Slider`]) {
                this.controls[`${key}Slider`].value = value;
                this.controls[`${key}ValueLabel`].text = value.toString();
            }
        }
        
        // Update optimization toggles
        if (this.controls.adaptiveQualityCheckbox) {
            this.controls.adaptiveQualityCheckbox.isChecked = config.adaptiveQualityEnabled;
        }
        
        ['rendering', 'aiProcessing', 'physics', 'memory'].forEach(opt => {
            if (this.controls[`${opt}Checkbox`]) {
                this.controls[`${opt}Checkbox`].isChecked = config.enabledOptimizations[opt];
            }
        });
        
        // Update metrics toggle
        if (this.controls.metricsCheckbox) {
            this.controls.metricsCheckbox.isChecked = config.userPreferences.showPerformanceMetrics;
        }
    }
    
    /**
     * Show the settings panel
     */
    show() {
        if (this.settingsPanel) {
            this.settingsPanel.isVisible = true;
            this.isVisible = true;
            this.updateControlsFromConfig();
            console.log('Optimization settings panel shown');
        }
    }
    
    /**
     * Hide the settings panel
     */
    hide() {
        if (this.settingsPanel) {
            this.settingsPanel.isVisible = false;
            this.isVisible = false;
            console.log('Optimization settings panel hidden');
        }
    }
    
    /**
     * Toggle the settings panel visibility
     */
    toggle() {
        if (this.isVisible) {
            this.hide();
        } else {
            this.show();
        }
    }
    
    /**
     * Dispose of the settings UI
     */
    dispose() {
        console.log('Disposing OptimizationSettingsUI...');
        
        if (this.advancedTexture) {
            this.advancedTexture.dispose();
            this.advancedTexture = null;
        }
        
        this.settingsPanel = null;
        this.controls = {};
        this.isVisible = false;
        
        console.log('OptimizationSettingsUI disposed');
    }
}