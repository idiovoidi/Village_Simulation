import { LevelConfig } from './LevelConfig.js';
import { LevelMaps } from './LevelMaps.js';

export class LevelSelector {
    constructor(scene, onLevelSelect) {
        this.scene = scene;
        this.onLevelSelect = onLevelSelect;
        this.createUI();
    }

    createUI() {
        // Create AdvancedDynamicTexture for UI
        this.advancedTexture = BABYLON.GUI.AdvancedDynamicTexture.CreateFullscreenUI("levelUI");

        // Create the level change button in top right
        const levelButton = BABYLON.GUI.Button.CreateSimpleButton("levelButton", "Change Level");
        levelButton.width = "150px";
        levelButton.height = "40px";
        levelButton.color = "white";
        levelButton.cornerRadius = 20;
        levelButton.thickness = 2;
        levelButton.background = "rgba(45, 45, 45, 0.8)";
        levelButton.horizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_RIGHT;
        levelButton.verticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_TOP;
        levelButton.top = "20px";
        levelButton.left = "-20px";
        
        // Hover effect
        levelButton.onPointerEnterObservable.add(() => {
            levelButton.background = "rgba(65, 65, 65, 0.9)";
        });
        levelButton.onPointerOutObservable.add(() => {
            levelButton.background = "rgba(45, 45, 45, 0.8)";
        });

        levelButton.onPointerClickObservable.add(() => {
            this.showLevelMenu();
        });

        this.advancedTexture.addControl(levelButton);
    }

    showLevelMenu() {
        // Create semi-transparent fullscreen container
        const fullscreenRect = new BABYLON.GUI.Rectangle("fullscreenRect");
        fullscreenRect.width = "100%";
        fullscreenRect.height = "100%";
        fullscreenRect.background = "rgba(0, 0, 0, 0.7)";
        fullscreenRect.thickness = 0;
        this.advancedTexture.addControl(fullscreenRect);

        // Create container for level cards
        const container = new BABYLON.GUI.StackPanel("levelContainer");
        container.width = "80%";
        container.height = "80%";
        container.verticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_CENTER;
        container.horizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_CENTER;
        fullscreenRect.addControl(container);

        // Add title
        const title = new BABYLON.GUI.TextBlock("title", "Select Level");
        title.height = "60px";
        title.color = "white";
        title.fontSize = 32;
        title.textHorizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_CENTER;
        container.addControl(title);

        // Get all levels
        const levels = LevelConfig.getAllLevels();

        // Create level cards
        levels.forEach(level => {
            const levelCard = this.createLevelCard(level, () => {
                this.onLevelSelect(LevelConfig.Levels[level.id].config);
                this.advancedTexture.removeControl(fullscreenRect);
                this.showLoadingScreen();
            });
            container.addControl(levelCard);
        });

        // Add close button
        const closeButton = BABYLON.GUI.Button.CreateSimpleButton("closeButton", "✕");
        closeButton.width = "40px";
        closeButton.height = "40px";
        closeButton.color = "white";
        closeButton.cornerRadius = 20;
        closeButton.thickness = 2;
        closeButton.background = "rgba(255, 0, 0, 0.5)";
        closeButton.horizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_RIGHT;
        closeButton.verticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_TOP;
        closeButton.top = "10px";
        closeButton.left = "-10px";
        
        closeButton.onPointerClickObservable.add(() => {
            this.advancedTexture.removeControl(fullscreenRect);
        });
        
        fullscreenRect.addControl(closeButton);
    }

    createLevelCard(level, onClick) {
        const card = new BABYLON.GUI.Rectangle("levelCard_" + level.id);
        card.width = "800px";
        card.height = "220px";
        card.cornerRadius = 10;
        card.thickness = 2;
        card.background = "rgba(45, 45, 45, 0.9)";
        card.color = "white";
        card.paddingBottom = "10px";
        card.paddingTop = "10px";
        card.marginTop = "10px";

        // Create horizontal layout for map preview and text
        const cardContent = new BABYLON.GUI.StackPanel("cardContent_" + level.id);
        cardContent.isVertical = false;
        cardContent.horizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
        card.addControl(cardContent);

        // Add map preview
        let mapData;
        switch(level.id) {
            case 'VILLAGE':
                mapData = LevelMaps.VILLAGE_MAP;
                break;
            case 'ZOMBIE_APOCALYPSE':
                mapData = LevelMaps.ZOMBIE_MAP;
                break;
            case 'NATURE':
                mapData = LevelMaps.NATURE_MAP;
                break;
        }
        
        if (mapData) {
            const mapPreview = LevelMaps.createMapPreview(this.scene, mapData, 200);
            mapPreview.horizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
            mapPreview.marginLeft = "10px";
            cardContent.addControl(mapPreview);
        }

        // Create text container
        const textContainer = new BABYLON.GUI.StackPanel("textContainer_" + level.id);
        textContainer.width = "560px";
        textContainer.isVertical = true;
        textContainer.horizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
        textContainer.marginLeft = "20px";
        cardContent.addControl(textContainer);

        // Add level name
        const nameText = new BABYLON.GUI.TextBlock("levelName_" + level.id, level.name);
        nameText.height = "40px";
        nameText.color = "white";
        nameText.fontSize = 24;
        nameText.textHorizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
        textContainer.addControl(nameText);

        // Add level description
        const descText = new BABYLON.GUI.TextBlock("levelDesc_" + level.id, level.description);
        descText.height = "40px";
        descText.color = "lightgray";
        descText.fontSize = 16;
        descText.textHorizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
        textContainer.addControl(descText);

        // Add level details
        const config = LevelConfig.Levels[level.id].config;
        const details = [
            `Bowl Size: ${config.bowlRadius}m radius`,
            `Water Level: ${Math.abs(config.waterLevel)}m ${config.waterLevel < 0 ? 'deep' : 'high'}`,
            `Features: ${this.getFeaturesList(config)}`
        ];
        
        details.forEach((detail, index) => {
            const detailText = new BABYLON.GUI.TextBlock("detail_" + level.id + "_" + index, detail);
            detailText.height = "30px";
            detailText.color = "#B0B0B0";
            detailText.fontSize = 14;
            detailText.textHorizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
            textContainer.addControl(detailText);
        });

        // Hover effects
        card.onPointerEnterObservable.add(() => {
            card.background = "rgba(65, 65, 65, 0.95)";
        });
        card.onPointerOutObservable.add(() => {
            card.background = "rgba(45, 45, 45, 0.9)";
        });

        // Click handler
        card.onPointerClickObservable.add(onClick);

        return card;
    }

    getFeaturesList(config) {
        const features = [];
        if (config.hasVillage) features.push(`${config.houseCount} Houses`);
        if (config.hasBirds) features.push(`${config.birdCount} Birds`);
        if (config.hasFish) features.push(`${config.fishCount} Fish`);
        if (config.hasZombies) features.push(`${config.zombieCount} Zombies`);
        if (config.hasDogs) features.push(`${config.dogCount} Dogs`);
        if (config.hasClouds) features.push('Clouds');
        if (config.hasMoon) features.push('Moon');
        return features.join(', ');
    }

    showLoadingScreen() {
        const loadingScreen = new BABYLON.GUI.Rectangle("loadingScreen");
        loadingScreen.width = "100%";
        loadingScreen.height = "100%";
        loadingScreen.background = "black";
        loadingScreen.alpha = 0.7;
        this.advancedTexture.addControl(loadingScreen);

        const loadingText = new BABYLON.GUI.TextBlock("loadingText", "Loading Level...");
        loadingText.color = "white";
        loadingText.fontSize = 32;
        loadingScreen.addControl(loadingText);

        // Remove loading screen after 2 seconds
        setTimeout(() => {
            this.advancedTexture.removeControl(loadingScreen);
        }, 2000);
    }
} 