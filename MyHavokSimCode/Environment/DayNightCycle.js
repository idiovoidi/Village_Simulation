export class DayNightCycle {
    constructor(scene) {
        this.scene = scene;
        this.createLights();
        this.createSkybox();
        this.createCelestialBodies();
        this.createAtmosphericEffects();

        // Constants for celestial movement
        this.SUNRISE_HOUR = 6;     // 6 AM
        this.SUNSET_HOUR = 18;     // 6 PM
        this.NOON_HOUR = 12;       // 12 PM
        this.MIDNIGHT_HOUR = 0;    // 12 AM
        
        // Orbit parameters
        this.ORBIT_RADIUS = 800;   // Distance from center
        this.ORBIT_HEIGHT_MAX = 600; // Maximum height
        this.ORBIT_HEIGHT_MIN = -200; // Minimum height (below horizon)
    }

    createLights() {
        // Main directional light (sun)
        this.sunLight = new BABYLON.DirectionalLight("sunLight", new BABYLON.Vector3(0, -1, 0), this.scene);
        this.sunLight.intensity = 1;
        this.sunLight.shadowEnabled = true;
        this.sunLight.shadowMinZ = 1;
        this.sunLight.shadowMaxZ = 1000;

        // Ambient light for night
        this.ambientLight = new BABYLON.HemisphericLight("ambientLight", new BABYLON.Vector3(0, 1, 0), this.scene);
        this.ambientLight.intensity = 0.2;
        this.ambientLight.groundColor = new BABYLON.Color3(0.1, 0.1, 0.25);

        // Add volumetric light
        this.volumetricLight = new BABYLON.VolumetricLightScatteringPostProcess(
            'volumetric', 1.0, this.scene.activeCamera, null, 100, BABYLON.Texture.BILINEAR_SAMPLINGMODE, this.scene.getEngine(), false
        );
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

    createAtmosphericEffects() {
        // Create fog
        this.scene.fogMode = BABYLON.Scene.FOGMODE_EXP2;
        this.scene.fogDensity = 0.001;
        this.scene.fogColor = new BABYLON.Color3(0.8, 0.9, 1.0);

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

        // Create clouds
        this.clouds = [];
        for (let i = 0; i < 20; i++) {
            const cloud = BABYLON.MeshBuilder.CreatePlane("cloud", { size: 100 + Math.random() * 200 }, this.scene);
            const cloudMaterial = new BABYLON.StandardMaterial("cloudMat", this.scene);
            cloudMaterial.diffuseTexture = new BABYLON.Texture("textures/cloud.png", this.scene);
            cloudMaterial.diffuseTexture.hasAlpha = true;
            cloudMaterial.useAlphaFromDiffuseTexture = true;
            cloudMaterial.emissiveColor = new BABYLON.Color3(1, 1, 1);
            cloud.material = cloudMaterial;
            
            // Position clouds randomly in sky
            cloud.position = new BABYLON.Vector3(
                (Math.random() - 0.5) * 800,
                200 + Math.random() * 100,
                (Math.random() - 0.5) * 800
            );
            cloud.rotation.x = Math.PI / 2;
            
            this.clouds.push({
                mesh: cloud,
                speed: 0.1 + Math.random() * 0.2,
                direction: new BABYLON.Vector3(Math.random() - 0.5, 0, Math.random() - 0.5).normalize()
            });
        }
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
        const transitHour = (riseHour + ((setHour - riseHour) / 2)) % 24;
        
        // Normalize hours to handle day/night cycle
        if (hour < riseHour) hour += 24;
        if (transitHour < riseHour) transitHour += 24;
        if (setHour < riseHour) setHour += 24;

        // Calculate progress through celestial arc
        if (hour >= riseHour && hour <= setHour) {
            const progress = (hour - riseHour) / (setHour - riseHour);
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
        
        // Update sun light intensity
        this.sunLight.intensity = Math.max(0, normalizedHeight) * 1.5;

        // Update ambient light for night
        const isNight = sunHeight < 0;
        const twilightZone = Math.abs(sunHeight) < 100;
        
        if (isNight) {
            this.ambientLight.intensity = twilightZone ? 0.3 : 0.2;
            this.moonGlow.intensity = 0.3;
            this.sunGlow.intensity = 0;
        } else {
            this.ambientLight.intensity = twilightZone ? 0.4 : 0.2;
            this.moonGlow.intensity = 0;
            this.sunGlow.intensity = 0.5;
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
                // Dawn/Dusk colors
                grd.addColorStop(0, "#FF7F50"); // Coral
                grd.addColorStop(0.2, "#FFB6C1"); // Pink
                grd.addColorStop(0.4, "#87CEEB"); // Sky blue
                grd.addColorStop(1, "#4B0082"); // Indigo
            } else {
                // Daytime colors
                grd.addColorStop(0, "#87CEEB"); // Sky blue
                grd.addColorStop(1, "#B0E2FF"); // Lighter blue
            }
        } else {
            // Nighttime colors
            grd.addColorStop(0, "#000033"); // Dark blue
            grd.addColorStop(1, "#191970"); // Midnight blue
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
            this.scene.fogDensity = 0.003;
            this.scene.fogColor = new BABYLON.Color3(0.8, 0.6, 0.5);
        } else if (isNight) {
            // Darker, thicker fog at night
            this.scene.fogDensity = 0.002;
            this.scene.fogColor = new BABYLON.Color3(0.1, 0.1, 0.2);
        } else {
            // Clear fog during day
            this.scene.fogDensity = 0.001;
            this.scene.fogColor = new BABYLON.Color3(0.8, 0.9, 1.0);
        }

        // Update stars with twinkling effect
        const starVisibility = Math.max(0, Math.min(1, (100 - sunHeight) / 200));
        this.stars.forEach(star => {
            if (star.material) {
                const time = performance.now() * 0.001;
                const twinkle = Math.sin(time * star.twinkleSpeed) * star.twinkleAmount;
                star.material.alpha = starVisibility * (0.8 + twinkle * 0.2);
            }
        });

        // Update volumetric light
        if (this.volumetricLight) {
            this.volumetricLight.exposure = isNight ? 0.2 : 0.7;
            this.volumetricLight.decay = isNight ? 0.8 : 0.95;
        }

        // Update clouds
        this.clouds.forEach(cloud => {
            // Move clouds
            cloud.mesh.position.addInPlace(cloud.direction.scale(cloud.speed));
            
            // Wrap clouds around when they go too far
            if (cloud.mesh.position.x > 800) cloud.mesh.position.x = -800;
            if (cloud.mesh.position.x < -800) cloud.mesh.position.x = 800;
            if (cloud.mesh.position.z > 800) cloud.mesh.position.z = -800;
            if (cloud.mesh.position.z < -800) cloud.mesh.position.z = 800;

            // Adjust cloud visibility based on time
            const material = cloud.mesh.material;
            if (isNight) {
                material.alpha = 0.3;
                material.emissiveColor = new BABYLON.Color3(0.1, 0.1, 0.15);
            } else if (isSunrise || isSunset) {
                material.alpha = 0.6;
                material.emissiveColor = new BABYLON.Color3(0.8, 0.6, 0.5);
            } else {
                material.alpha = 0.8;
                material.emissiveColor = new BABYLON.Color3(1, 1, 1);
            }
        });
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
        this.clouds.forEach(cloud => {
            cloud.mesh.dispose();
            cloud.mesh.material.dispose();
        });
    }
} 