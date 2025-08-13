export class DayNightCycle {
    constructor(scene) {
        this.scene = scene;
        this.ORBIT_RADIUS = 1000;
        this.ORBIT_HEIGHT_MAX = 800;
        this.ORBIT_HEIGHT_MIN = -200;
        this.SUNRISE_HOUR = 6;
        this.SUNSET_HOUR = 18;
        
        // Time management
        this.timeScale = 1200; // 1 real second = 20 game minutes
        this.gameTime = 8 * 60; // Start at 8:00 AM
        
        this.createSkybox();
        this.createLights();
        this.createCelestialBodies();
        this.createStars();
        this.createAtmosphericEffects();
        
        // Initialize update loop
        this.scene.onBeforeRenderObservable.add(() => {
            const deltaTime = this.scene.getEngine().getDeltaTime() * 0.001;
            this.updateTime(deltaTime);
        });
    }

    updateTime(deltaTime) {
        // Update game time
        this.gameTime += deltaTime * this.timeScale / 60;
        if (this.gameTime >= 24 * 60) {
            this.gameTime = 0;
        }
        
        // Update day/night cycle
        this.update(this.gameTime);
    }

    // Get current game time in minutes
    getGameTime() {
        return this.gameTime;
    }

    // Get current hour (0-23)
    getCurrentHour() {
        return Math.floor(this.gameTime / 60);
    }

    // Set time scale (minutes per real second)
    setTimeScale(scale) {
        this.timeScale = scale;
    }

    // Set specific time (in minutes)
    setTime(timeInMinutes) {
        this.gameTime = timeInMinutes % (24 * 60);
    }

    createLights() {
        // Main directional light (sun) - reduced intensity to prevent overblown lighting
        this.sunLight = new BABYLON.DirectionalLight("sunLight", new BABYLON.Vector3(0, -1, 0), this.scene);
        this.sunLight.intensity = 2.5; // Reduced from 5 to 2.5
        this.sunLight.shadowEnabled = true;
        this.sunLight.shadowMinZ = 1;
        this.sunLight.shadowMaxZ = 1000;
        // Reduce specular reflections to prevent intense reflections
        this.sunLight.specular = new BABYLON.Color3(0.3, 0.3, 0.3); // Reduced specular

        // Ambient light for night - increased slightly to compensate for reduced sun intensity
        this.ambientLight = new BABYLON.HemisphericLight("ambientLight", new BABYLON.Vector3(0, 1, 0), this.scene);
        this.ambientLight.intensity = 0.2; // Increased from 0.1 to 0.2
        this.ambientLight.groundColor = new BABYLON.Color3(0.05, 0.05, 0.15); // Bluer ground color for night
        this.ambientLight.specular = new BABYLON.Color3(0.05, 0.05, 0.05); // Reduced specular

        // Add volumetric light with reduced intensity
        this.volumetricLight = new BABYLON.VolumetricLightScatteringPostProcess(
            'volumetric', 1.0, this.scene.activeCamera, null, 100, BABYLON.Texture.BILINEAR_SAMPLINGMODE, this.scene.getEngine(), false
        );
        
        // Reduce overall scene reflectivity to prevent overblown reflections
        this.adjustSceneMaterials();
    }
    
    /**
     * Adjust scene materials to reduce overblown reflections
     */
    adjustSceneMaterials() {
        // Wait for scene to be ready, then adjust materials
        this.scene.onReadyObservable.addOnce(() => {
            this.scene.meshes.forEach(mesh => {
                if (mesh.material) {
                    // Reduce specular power and intensity for all materials
                    if (mesh.material.specularPower !== undefined) {
                        mesh.material.specularPower = Math.max(mesh.material.specularPower * 0.5, 16);
                    }
                    if (mesh.material.specularColor) {
                        mesh.material.specularColor = mesh.material.specularColor.scale(0.4);
                    }
                    
                    // Special handling for water/fountain materials
                    if (mesh.name && (mesh.name.toLowerCase().includes('water') || 
                                     mesh.name.toLowerCase().includes('fountain') ||
                                     mesh.name.toLowerCase().includes('pool'))) {
                        if (mesh.material.specularColor) {
                            mesh.material.specularColor = mesh.material.specularColor.scale(0.3);
                        }
                        if (mesh.material.specularPower !== undefined) {
                            mesh.material.specularPower = Math.min(mesh.material.specularPower, 32);
                        }
                    }
                    
                    // Special handling for metallic/reflective surfaces
                    if (mesh.name && (mesh.name.toLowerCase().includes('metal') || 
                                     mesh.name.toLowerCase().includes('chrome') ||
                                     mesh.name.toLowerCase().includes('mirror'))) {
                        if (mesh.material.specularColor) {
                            mesh.material.specularColor = mesh.material.specularColor.scale(0.6);
                        }
                    }
                }
            });
        });
    }

    createSkybox() {
        // Create skybox
        this.skybox = BABYLON.MeshBuilder.CreateBox("skyBox", { size: 1000.0 }, this.scene);
        this.skyboxMaterial = new BABYLON.StandardMaterial("skyBox", this.scene);
        this.skyboxMaterial.backFaceCulling = false;
        this.skyboxMaterial.disableLighting = true;
        this.skybox.material = this.skyboxMaterial;

        // Create sky gradient
        const skyTexture = new BABYLON.DynamicTexture("skyTexture", {width: 512, height: 512}, this.scene);
        this.skyboxMaterial.emissiveTexture = skyTexture;
        this.skyTexture = skyTexture;
    }

    createCelestialBodies() {
        // Create sun
        this.sun = BABYLON.MeshBuilder.CreateDisc("sun", { radius: 50 }, this.scene);
        const sunMaterial = new BABYLON.StandardMaterial("sunMaterial", this.scene);
        sunMaterial.emissiveColor = new BABYLON.Color3(1, 0.8, 0.3);
        sunMaterial.disableLighting = true;
        this.sun.material = sunMaterial;
        this.sun.billboardMode = BABYLON.Mesh.BILLBOARDMODE_ALL;

        // Create sun glow
        this.sunGlow = new BABYLON.GlowLayer("sunGlow", this.scene, {
            mainTextureFixedSize: 512,
            blurKernelSize: 64
        });
        this.sunGlow.intensity = 0.5;
        this.sunGlow.addIncludedOnlyMesh(this.sun);

        // Create moon
        this.moon = BABYLON.MeshBuilder.CreateDisc("moon", { radius: 30 }, this.scene);
        const moonMaterial = new BABYLON.StandardMaterial("moonMaterial", this.scene);
        moonMaterial.emissiveColor = new BABYLON.Color3(0.8, 0.8, 0.9);
        moonMaterial.disableLighting = true;
        this.moon.material = moonMaterial;
        this.moon.billboardMode = BABYLON.Mesh.BILLBOARDMODE_ALL;

        // Create moon glow
        this.moonGlow = new BABYLON.GlowLayer("moonGlow", this.scene, {
            mainTextureFixedSize: 512,
            blurKernelSize: 64
        });
        this.moonGlow.intensity = 0.3;
        this.moonGlow.addIncludedOnlyMesh(this.moon);
    }

    createStars() {
        // Create stars with different sizes and colors
        this.stars = [];
        const starColors = [
            new BABYLON.Color3(1, 1, 1),    // White
            new BABYLON.Color3(0.9, 0.9, 1), // Bluish white
            new BABYLON.Color3(1, 0.9, 0.7), // Yellowish
            new BABYLON.Color3(1, 0.8, 0.8)  // Reddish
        ];

        for (let i = 0; i < 1000; i++) {
            const starSize = 0.2 + Math.random() * 0.6; // Varying sizes
            const star = BABYLON.MeshBuilder.CreateBox("star", { size: starSize }, this.scene);
            
            // Create more realistic star distribution
            const phi = Math.random() * Math.PI * 2;
            const theta = Math.acos(2 * Math.random() - 1);
            const radius = 400 + Math.random() * 200;
            
            star.position = new BABYLON.Vector3(
                radius * Math.sin(theta) * Math.cos(phi),
                radius * Math.sin(theta) * Math.sin(phi),
                radius * Math.cos(theta)
            );

            const starMaterial = new BABYLON.StandardMaterial("starMat", this.scene);
            starMaterial.emissiveColor = starColors[Math.floor(Math.random() * starColors.length)];
            starMaterial.alpha = 0;
            star.material = starMaterial;
            
            // Add subtle twinkling effect
            star.twinkleSpeed = 0.5 + Math.random() * 2;
            star.twinkleAmount = 0.3 + Math.random() * 0.7;
            
            this.stars.push(star);
        }
    }

    createAtmosphericEffects() {
        // Create fog
        this.scene.fogMode = BABYLON.Scene.FOGMODE_EXP2;
        this.scene.fogDensity = 0.001;
        this.scene.fogColor = new BABYLON.Color3(0.8, 0.9, 1.0);
    }

    update(gameTime) {
        const hours = gameTime / 60;
        const dayProgress = (hours % 24) / 24;
        
        // Calculate sun and moon positions
        this.updateCelestialPositions(hours);
        
        // Update lighting based on time of day
        this.updateLighting(hours);
        
        // Update sky colors
        this.updateSkyColors(hours);
        
        // Update atmospheric effects
        this.updateAtmosphericEffects(hours);
    }

    updateCelestialPositions(hours) {
        // Calculate sun position
        const sunAngle = ((hours - this.SUNRISE_HOUR) / 24) * Math.PI * 2;
        const sunHeight = this.calculateCelestialHeight(hours, this.SUNRISE_HOUR, this.SUNSET_HOUR);
        
        this.sun.position = new BABYLON.Vector3(
            Math.cos(sunAngle) * this.ORBIT_RADIUS,
            sunHeight,
            Math.sin(sunAngle) * this.ORBIT_RADIUS
        );

        // Calculate moon position (opposite to sun)
        const moonAngle = sunAngle + Math.PI;
        const moonHeight = this.calculateCelestialHeight(hours, this.SUNSET_HOUR, this.SUNRISE_HOUR + 24);
        
        this.moon.position = new BABYLON.Vector3(
            Math.cos(moonAngle) * this.ORBIT_RADIUS,
            moonHeight,
            Math.sin(moonAngle) * this.ORBIT_RADIUS
        );

        // Update directional light to match sun position
        this.sunLight.direction = this.sun.position.scale(-1).normalize();
    }

    calculateCelestialHeight(currentHour, riseHour, setHour) {
        let hour = currentHour % 24;
        let transitHour = (riseHour + ((setHour - riseHour) / 2)) % 24;
        let adjustedSetHour = setHour;
        
        // Normalize hours to handle day/night cycle
        if (hour < riseHour) hour += 24;
        if (transitHour < riseHour) transitHour += 24;
        if (adjustedSetHour < riseHour) adjustedSetHour += 24;

        // Calculate progress through celestial arc
        if (hour >= riseHour && hour <= adjustedSetHour) {
            const progress = (hour - riseHour) / (adjustedSetHour - riseHour);
            // Use sine curve for smooth movement
            return this.ORBIT_HEIGHT_MIN + (this.ORBIT_HEIGHT_MAX - this.ORBIT_HEIGHT_MIN) * 
                   Math.sin(progress * Math.PI);
        }
        
        return this.ORBIT_HEIGHT_MIN;
    }

    updateLighting(hours) {
        const sunHeight = this.sun.position.y;
        const normalizedHeight = (sunHeight - this.ORBIT_HEIGHT_MIN) / 
                               (this.ORBIT_HEIGHT_MAX - this.ORBIT_HEIGHT_MIN);
        
        // Update sun light intensity with smoother transition and reduced maximum
        const baseSunIntensity = Math.max(0, normalizedHeight) * 1.5; // Reduced from 2 to 1.5
        const multiplier = this.sunIntensityMultiplier || 1.0;
        this.sunLight.intensity = baseSunIntensity * multiplier;

        // Update sun color based on height
        const sunsetProgress = Math.max(0, Math.min(1, 1 - Math.abs(normalizedHeight)));
        this.sunLight.diffuse = BABYLON.Color3.Lerp(
            new BABYLON.Color3(1, 1, 1),  // Midday color
            new BABYLON.Color3(1, 0.5, 0.2),  // Sunset color
            sunsetProgress
        );

        // Update ambient light for night/day cycle
        const isNight = sunHeight < 0;
        const twilightZone = Math.abs(sunHeight) < 100;
        
        if (isNight) {
            // Night settings
            this.ambientLight.intensity = twilightZone ? 0.2 : 0.1;
            this.ambientLight.diffuse = new BABYLON.Color3(0.1, 0.1, 0.3);
            this.moonGlow.intensity = 0.4;
            this.sunGlow.intensity = 0;
            
            // Add stars
            this.stars.forEach(star => {
                if (star.material) {
                    star.material.alpha = Math.min(1, Math.abs(sunHeight) / 100);
                }
            });
        } else {
            // Day settings - increased ambient light to compensate for reduced sun intensity
            this.ambientLight.intensity = twilightZone ? 0.4 : 0.3; // Increased from 0.3/0.2 to 0.4/0.3
            this.ambientLight.diffuse = new BABYLON.Color3(0.6, 0.6, 0.9); // Slightly cooler tone
            this.moonGlow.intensity = 0;
            this.sunGlow.intensity = 0.5; // Reduced from 0.7 to 0.5
            
            // Hide stars during day
            this.stars.forEach(star => {
                if (star.material) {
                    star.material.alpha = Math.max(0, 1 - (sunHeight / 50));
                }
            });
        }
    }

    updateSkyColors(hours) {
        const ctx = this.skyTexture.getContext();
        const grd = ctx.createLinearGradient(0, 0, 0, 512);

        const sunHeight = this.sun.position.y;
        const isSunrise = hours >= this.SUNRISE_HOUR - 1 && hours <= this.SUNRISE_HOUR + 1;
        const isSunset = hours >= this.SUNSET_HOUR - 1 && hours <= this.SUNSET_HOUR + 1;
        
        if (sunHeight > 0) {
            if (isSunrise || isSunset) {
                // Dawn/Dusk colors with more dramatic gradient
                grd.addColorStop(0, "#FF6B4A");    // Deep orange
                grd.addColorStop(0.2, "#FF9E8F");  // Soft pink
                grd.addColorStop(0.4, "#FFB6C1");  // Light pink
                grd.addColorStop(0.6, "#87CEEB");  // Sky blue
                grd.addColorStop(0.8, "#4169E1");  // Royal blue
                grd.addColorStop(1, "#191970");    // Midnight blue
            } else {
                // Daytime colors with more depth
                grd.addColorStop(0, "#00BFFF");    // Deep sky blue
                grd.addColorStop(0.5, "#87CEEB");  // Sky blue
                grd.addColorStop(1, "#E0FFFF");    // Light cyan
            }
        } else {
            // Nighttime colors with more stars visible
            grd.addColorStop(0, "#000033");    // Dark blue
            grd.addColorStop(0.5, "#0000FF");  // Deep blue
            grd.addColorStop(1, "#191970");    // Midnight blue
        }

        ctx.fillStyle = grd;
        ctx.fillRect(0, 0, 512, 512);
        this.skyTexture.update();
    }

    updateAtmosphericEffects(hours) {
        const sunHeight = this.sun.position.y;
        const normalizedHeight = (sunHeight - this.ORBIT_HEIGHT_MIN) / 
                               (this.ORBIT_HEIGHT_MAX - this.ORBIT_HEIGHT_MIN);
        
        // Update fog based on time of day
        const isSunrise = hours >= this.SUNRISE_HOUR - 1 && hours <= this.SUNRISE_HOUR + 1;
        const isSunset = hours >= this.SUNSET_HOUR - 1 && hours <= this.SUNSET_HOUR + 1;
        const isNight = sunHeight < 0;

        if (isSunrise || isSunset) {
            // Thicker, colored fog during sunrise/sunset
            this.scene.fogDensity = 0.005;
            this.scene.fogColor = new BABYLON.Color3(0.9, 0.6, 0.4);
        } else if (isNight) {
            // Darker, thicker fog at night
            this.scene.fogDensity = 0.003;
            this.scene.fogColor = new BABYLON.Color3(0.05, 0.05, 0.15);
        } else {
            // Clear fog during day
            this.scene.fogDensity = 0.001;
            this.scene.fogColor = new BABYLON.Color3(0.7, 0.8, 1.0);
        }

        // Update volumetric light with reduced intensity to prevent overblown effects
        if (this.volumetricLight) {
            this.volumetricLight.exposure = isNight ? 0.1 : 0.5; // Reduced from 0.8 to 0.5
            this.volumetricLight.decay = isNight ? 0.9 : 0.96; // Slightly increased decay
            this.volumetricLight.weight = isSunrise || isSunset ? 0.3 : 0.2; // Reduced weight
        }
        
        // Adjust scene exposure to prevent overblown lighting
        this.adjustSceneExposure(normalizedHeight);

        // Update star visibility and twinkling
        const starVisibility = Math.max(0, Math.min(1, (100 - sunHeight) / 200));
        this.stars.forEach(star => {
            if (star.material) {
                const time = performance.now() * 0.001;
                const twinkle = Math.sin(time * star.twinkleSpeed) * star.twinkleAmount;
                star.material.alpha = starVisibility * (0.7 + twinkle * 0.3);
                star.material.emissiveColor = star.material.diffuseColor.scale(0.8 + twinkle * 0.2);
            }
        });
    }
    
    /**
     * Adjust scene exposure to prevent overblown lighting
     * @param {number} normalizedHeight - Normalized sun height (0-1)
     */
    adjustSceneExposure(normalizedHeight) {
        // Create or update image processing if it doesn't exist
        if (!this.scene.imageProcessingConfiguration) {
            this.scene.imageProcessingConfiguration = new BABYLON.ImageProcessingConfiguration();
        }
        
        const imageProcessing = this.scene.imageProcessingConfiguration;
        
        // Adjust exposure based on sun height to prevent overblown lighting
        const maxExposure = 1.0;
        const minExposure = 0.3;
        
        // During peak sun hours, reduce exposure more
        const exposureReduction = Math.max(0, normalizedHeight - 0.3) * 0.5;
        imageProcessing.exposure = maxExposure - exposureReduction;
        
        // Adjust contrast to maintain visual quality
        imageProcessing.contrast = 1.1 + (exposureReduction * 0.2);
        
        // Enable tone mapping to handle high dynamic range
        imageProcessing.toneMappingEnabled = true;
        imageProcessing.toneMappingType = BABYLON.ImageProcessingConfiguration.TONEMAPPING_ACES;
    }
    
    /**
     * Manually adjust lighting intensity (for debugging/fine-tuning)
     * @param {number} intensity - Sun light intensity multiplier (0-2)
     */
    setSunIntensity(intensity) {
        this.sunIntensityMultiplier = Math.max(0, Math.min(2, intensity));
        console.log(`Sun intensity multiplier set to: ${this.sunIntensityMultiplier}`);
    }
    
    /**
     * Get current lighting information for debugging
     * @returns {Object} Current lighting stats
     */
    getLightingInfo() {
        return {
            gameTime: this.gameTime,
            currentHour: this.getCurrentHour(),
            sunHeight: this.sun.position.y,
            sunIntensity: this.sunLight.intensity,
            ambientIntensity: this.ambientLight.intensity,
            exposure: this.scene.imageProcessingConfiguration?.exposure || 1.0
        };
    }

    dispose() {
        this.sunLight.dispose();
        this.ambientLight.dispose();
        this.skybox.dispose();
        this.skyboxMaterial.dispose();
        this.skyTexture.dispose();
        this.sun.dispose();
        this.moon.dispose();
        this.sunGlow.dispose();
        this.moonGlow.dispose();
        this.stars.forEach(star => star.dispose());
        if (this.volumetricLight) {
            this.volumetricLight.dispose();
        }
    }
} 