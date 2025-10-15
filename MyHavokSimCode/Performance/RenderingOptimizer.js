/**
 * RenderingOptimizer - Main rendering optimization controller
 * 
 * This class integrates and coordinates all rendering optimization systems:
 * - LODManager for level-of-detail optimization
 * - CullingSystem for frustum and occlusion culling
 * - InstanceManager for mesh instancing optimization
 * - TextureOptimizer for texture optimization
 */

import { LODManager } from './LODManager.js';
import { CullingSystem } from './CullingSystem.js';
import { InstanceManager } from './InstanceManager.js';
import { TextureOptimizer } from './TextureOptimizer.js';

export class RenderingOptimizer {
    constructor(scene, camera, qualitySettings = null) {
        this.scene = scene;
        this.camera = camera;
        this.qualitySettings = qualitySettings;
        
        // Core state
        this.initialized = false;
        this.enabled = true;
        
        // Optimization subsystems
        this.lodManager = null;
        this.cullingSystem = null;
        this.instanceManager = null;
        this.textureOptimizer = null;
        
        // Configuration
        this.config = {
            enableLOD: true,
            enableCulling: true,
            enableInstancing: true,
            enableTextureOptimization: true,
            
            // Update coordination
            updateFrequency: 1, // Update every frame
            staggerUpdates: true, // Stagger subsystem updates across frames
            maxSubsystemUpdatesPerFrame: 2
        };
        
        // Performance tracking
        this.statistics = {
            totalMeshes: 0,
            optimizedMeshes: 0,
            drawCallsSaved: 0,
            memoryOptimized: 0,
            lastUpdateTime: 0,
            updateDuration: 0,
            subsystemStats: {}
        };
        
        // Update coordination
        this.frameCounter = 0;
        this.updateSchedule = [];
        this.lastSubsystemUpdate = new Map();
        
        console.log('RenderingOptimizer initialized');
    }
    
    /**
     * Initialize the rendering optimizer
     */
    async initialize() {
        if (this.initialized) {
            console.warn('RenderingOptimizer already initialized');
            return;
        }
        
        try {
            console.log('Initializing RenderingOptimizer...');
            
            // Initialize subsystems
            await this.initializeSubsystems();
            
            // Set up update coordination
            this.setupUpdateCoordination();
            
            this.initialized = true;
            console.log('RenderingOptimizer initialization complete');
            
        } catch (error) {
            console.error('Failed to initialize RenderingOptimizer:', error);
            throw error;
        }
    }
    
    /**
     * Initialize optimization subsystems
     */
    async initializeSubsystems() {
        console.log('Initializing rendering optimization subsystems...');
        
        // Initialize LOD Manager
        if (this.config.enableLOD) {
            try {
                this.lodManager = new LODManager(this.scene, this.camera, this.qualitySettings);
                await this.lodManager.initialize();
                console.log('LODManager initialized successfully');
            } catch (error) {
                console.error('Failed to initialize LODManager:', error);
                this.lodManager = null;
            }
        }
        
        // Initialize Culling System
        if (this.config.enableCulling) {
            try {
                this.cullingSystem = new CullingSystem(this.scene, this.camera, this.qualitySettings);
                await this.cullingSystem.initialize();
                console.log('CullingSystem initialized successfully');
            } catch (error) {
                console.error('Failed to initialize CullingSystem:', error);
                this.cullingSystem = null;
            }
        }
        
        // Initialize Instance Manager
        if (this.config.enableInstancing) {
            try {
                this.instanceManager = new InstanceManager(this.scene, this.qualitySettings);
                await this.instanceManager.initialize();
                console.log('InstanceManager initialized successfully');
            } catch (error) {
                console.error('Failed to initialize InstanceManager:', error);
                this.instanceManager = null;
            }
        }
        
        // Initialize Texture Optimizer
        if (this.config.enableTextureOptimization) {
            try {
                this.textureOptimizer = new TextureOptimizer(this.scene, this.qualitySettings);
                await this.textureOptimizer.initialize();
                console.log('TextureOptimizer initialized successfully');
            } catch (error) {
                console.error('Failed to initialize TextureOptimizer:', error);
                this.textureOptimizer = null;
            }
        }
        
        console.log('Rendering optimization subsystems initialized');
    }
    
    /**
     * Set up update coordination between subsystems
     */
    setupUpdateCoordination() {
        // Create staggered update schedule if enabled
        if (this.config.staggerUpdates) {
            this.updateSchedule = [
                { system: 'culling', frequency: 1 }, // Update every frame
                { system: 'lod', frequency: 2 }, // Update every 2 frames
                { system: 'instancing', frequency: 5 }, // Update every 5 frames
                { system: 'texture', frequency: 10 } // Update every 10 frames
            ];
        } else {
            // Update all systems every frame
            this.updateSchedule = [
                { system: 'culling', frequency: 1 },
                { system: 'lod', frequency: 1 },
                { system: 'instancing', frequency: 1 },
                { system: 'texture', frequency: 1 }
            ];
        }
        
        // Initialize last update tracking
        for (const schedule of this.updateSchedule) {
            this.lastSubsystemUpdate.set(schedule.system, 0);
        }
    }
    
    /**
     * Update rendering optimizations
     */
    updateOptimizations(deltaTime) {
        if (!this.initialized || !this.enabled) return;
        
        const startTime = performance.now();
        this.frameCounter++;
        
        // Determine which subsystems to update this frame
        const subsystemsToUpdate = this.getSubsystemsToUpdate();
        
        // Update selected subsystems
        let updatesPerformed = 0;
        for (const systemName of subsystemsToUpdate) {
            if (updatesPerformed >= this.config.maxSubsystemUpdatesPerFrame) {
                break;
            }
            
            this.updateSubsystem(systemName, deltaTime);
            updatesPerformed++;
        }
        
        // Update statistics
        this.updateStatistics();
        
        // Track performance
        this.statistics.lastUpdateTime = performance.now();
        this.statistics.updateDuration = this.statistics.lastUpdateTime - startTime;
    }
    
    /**
     * Determine which subsystems should update this frame
     */
    getSubsystemsToUpdate() {
        const toUpdate = [];
        
        for (const schedule of this.updateSchedule) {
            const lastUpdate = this.lastSubsystemUpdate.get(schedule.system);
            const framesSinceUpdate = this.frameCounter - lastUpdate;
            
            if (framesSinceUpdate >= schedule.frequency) {
                toUpdate.push(schedule.system);
            }
        }
        
        return toUpdate;
    }
    
    /**
     * Update a specific subsystem
     */
    updateSubsystem(systemName, deltaTime) {
        try {
            switch (systemName) {
                case 'culling':
                    if (this.cullingSystem) {
                        this.cullingSystem.updateCulling(deltaTime);
                        this.lastSubsystemUpdate.set('culling', this.frameCounter);
                    }
                    break;
                    
                case 'lod':
                    if (this.lodManager) {
                        this.lodManager.updateLOD(deltaTime);
                        this.lastSubsystemUpdate.set('lod', this.frameCounter);
                    }
                    break;
                    
                case 'instancing':
                    if (this.instanceManager) {
                        this.instanceManager.updateInstances(deltaTime);
                        this.lastSubsystemUpdate.set('instancing', this.frameCounter);
                    }
                    break;
                    
                case 'texture':
                    if (this.textureOptimizer) {
                        this.textureOptimizer.updateOptimization(deltaTime, this.camera);
                        this.lastSubsystemUpdate.set('texture', this.frameCounter);
                    }
                    break;
                    
                default:
                    console.warn(`Unknown subsystem: ${systemName}`);
            }
        } catch (error) {
            console.error(`Error updating ${systemName} subsystem:`, error);
        }
    }
    
    /**
     * Update combined statistics from all subsystems
     */
    updateStatistics() {
        // Reset statistics
        this.statistics.totalMeshes = 0;
        this.statistics.optimizedMeshes = 0;
        this.statistics.drawCallsSaved = 0;
        this.statistics.memoryOptimized = 0;
        this.statistics.subsystemStats = {};
        
        // Collect statistics from LOD Manager
        if (this.lodManager) {
            const lodStats = this.lodManager.getStatistics();
            this.statistics.subsystemStats.lod = lodStats;
            this.statistics.totalMeshes += lodStats.managedMeshes || 0;
            this.statistics.optimizedMeshes += lodStats.meshesProcessed || 0;
        }
        
        // Collect statistics from Culling System
        if (this.cullingSystem) {
            const cullingStats = this.cullingSystem.getStatistics();
            this.statistics.subsystemStats.culling = cullingStats;
            this.statistics.totalMeshes += cullingStats.cullingObjects || 0;
            this.statistics.optimizedMeshes += cullingStats.frustumCulled + cullingStats.occlusionCulled || 0;
        }
        
        // Collect statistics from Instance Manager
        if (this.instanceManager) {
            const instanceStats = this.instanceManager.getStatistics();
            this.statistics.subsystemStats.instancing = instanceStats;
            this.statistics.drawCallsSaved += instanceStats.drawCallsSaved || 0;
        }
        
        // Collect statistics from Texture Optimizer
        if (this.textureOptimizer) {
            const textureStats = this.textureOptimizer.getStatistics();
            this.statistics.subsystemStats.texture = textureStats;
            this.statistics.memoryOptimized += textureStats.memorySaved || 0;
        }
    }
    
    /**
     * Apply quality settings to all subsystems
     */
    applyQualitySettings() {
        if (!this.qualitySettings) return;
        
        console.log('Applying quality settings to rendering optimization subsystems...');
        
        // Apply to LOD Manager
        if (this.lodManager) {
            this.lodManager.applyQualitySettings();
        }
        
        // Apply to Culling System
        if (this.cullingSystem) {
            this.cullingSystem.applyQualitySettings();
        }
        
        // Apply to Instance Manager
        if (this.instanceManager) {
            this.instanceManager.applyQualitySettings();
        }
        
        // Apply to Texture Optimizer
        if (this.textureOptimizer) {
            this.textureOptimizer.applyQualitySettings();
        }
        
        console.log('Quality settings applied to all rendering optimization subsystems');
    }
    
    /**
     * Enable or disable specific optimization types
     */
    setOptimizationEnabled(optimizationType, enabled) {
        switch (optimizationType) {
            case 'lod':
                if (this.lodManager) {
                    this.lodManager.setEnabled(enabled);
                }
                this.config.enableLOD = enabled;
                break;
                
            case 'culling':
                if (this.cullingSystem) {
                    this.cullingSystem.setEnabled(enabled);
                }
                this.config.enableCulling = enabled;
                break;
                
            case 'instancing':
                if (this.instanceManager) {
                    this.instanceManager.setEnabled(enabled);
                }
                this.config.enableInstancing = enabled;
                break;
                
            case 'texture':
                if (this.textureOptimizer) {
                    this.textureOptimizer.setEnabled(enabled);
                }
                this.config.enableTextureOptimization = enabled;
                break;
                
            default:
                console.warn(`Unknown optimization type: ${optimizationType}`);
        }
        
        console.log(`${optimizationType} optimization ${enabled ? 'enabled' : 'disabled'}`);
    }
    
    /**
     * Enable or disable the entire rendering optimizer
     */
    setEnabled(enabled) {
        this.enabled = enabled;
        
        // Enable/disable all subsystems
        if (this.lodManager) {
            this.lodManager.setEnabled(enabled);
        }
        
        if (this.cullingSystem) {
            this.cullingSystem.setEnabled(enabled);
        }
        
        if (this.instanceManager) {
            this.instanceManager.setEnabled(enabled);
        }
        
        if (this.textureOptimizer) {
            this.textureOptimizer.setEnabled(enabled);
        }
        
        console.log(`Rendering optimizer ${enabled ? 'enabled' : 'disabled'}`);
    }
    
    /**
     * Force update for all subsystems
     */
    forceUpdate() {
        console.log('Forcing update for all rendering optimization subsystems...');
        
        if (this.lodManager) {
            this.lodManager.forceUpdate();
        }
        
        if (this.cullingSystem) {
            this.cullingSystem.forceUpdate();
        }
        
        if (this.instanceManager) {
            this.instanceManager.forceReanalysis();
        }
        
        if (this.textureOptimizer) {
            this.textureOptimizer.forceUpdate();
        }
        
        console.log('Forced update completed for all subsystems');
    }
    
    /**
     * Get comprehensive rendering optimization statistics
     */
    getStatistics() {
        this.updateStatistics(); // Ensure stats are current
        
        return {
            ...this.statistics,
            enabled: this.enabled,
            frameCounter: this.frameCounter,
            subsystemsEnabled: {
                lod: this.config.enableLOD && this.lodManager !== null,
                culling: this.config.enableCulling && this.cullingSystem !== null,
                instancing: this.config.enableInstancing && this.instanceManager !== null,
                texture: this.config.enableTextureOptimization && this.textureOptimizer !== null
            },
            subsystemsInitialized: {
                lod: this.lodManager?.initialized || false,
                culling: this.cullingSystem?.initialized || false,
                instancing: this.instanceManager?.initialized || false,
                texture: this.textureOptimizer?.initialized || false
            }
        };
    }
    
    /**
     * Get specific subsystem instance
     */
    getSubsystem(systemName) {
        switch (systemName) {
            case 'lod': return this.lodManager;
            case 'culling': return this.cullingSystem;
            case 'instancing': return this.instanceManager;
            case 'texture': return this.textureOptimizer;
            default: return null;
        }
    }
    
    /**
     * Register a mesh with appropriate subsystems
     */
    registerMesh(mesh, options = {}) {
        console.log(`Registering mesh with rendering optimizer: ${mesh.name}`);
        
        // Register with LOD Manager
        if (this.lodManager && options.enableLOD !== false) {
            this.lodManager.registerMesh(mesh, options.meshType, options.lodGroup);
        }
        
        // Register with Culling System
        if (this.cullingSystem && options.enableCulling !== false) {
            this.cullingSystem.registerMesh(mesh, options.isOccluder);
        }
        
        // Register with Instance Manager
        if (this.instanceManager && options.enableInstancing !== false) {
            this.instanceManager.registerMeshCandidate(mesh);
        }
    }
    
    /**
     * Unregister a mesh from all subsystems
     */
    unregisterMesh(mesh) {
        console.log(`Unregistering mesh from rendering optimizer: ${mesh.name}`);
        
        if (this.lodManager) {
            this.lodManager.unregisterMesh(mesh);
        }
        
        if (this.cullingSystem) {
            this.cullingSystem.unregisterMesh(mesh);
        }
        
        if (this.instanceManager) {
            this.instanceManager.unregisterMeshCandidate(mesh);
        }
    }
    
    /**
     * Register a texture with texture optimizer
     */
    registerTexture(texture, group = null) {
        if (this.textureOptimizer) {
            return this.textureOptimizer.registerTexture(texture, group);
        }
        return false;
    }
    
    /**
     * Unregister a texture from texture optimizer
     */
    unregisterTexture(texture) {
        if (this.textureOptimizer) {
            return this.textureOptimizer.unregisterTexture(texture);
        }
        return false;
    }
    
    /**
     * Get optimization recommendations based on current performance
     */
    getOptimizationRecommendations(performanceMetrics) {
        const recommendations = [];
        
        if (!performanceMetrics) return recommendations;
        
        const fps = performanceMetrics.frameRate?.current || 60;
        const memoryUsage = performanceMetrics.memory?.percentage || 0;
        
        // FPS-based recommendations
        if (fps < 30) {
            recommendations.push({
                type: 'critical',
                system: 'culling',
                action: 'Enable aggressive culling',
                description: 'Low FPS detected. Enable more aggressive frustum and occlusion culling.'
            });
            
            recommendations.push({
                type: 'critical',
                system: 'lod',
                action: 'Reduce LOD distances',
                description: 'Reduce LOD switching distances to use lower detail models sooner.'
            });
        } else if (fps < 45) {
            recommendations.push({
                type: 'warning',
                system: 'instancing',
                action: 'Increase instancing',
                description: 'Moderate FPS issues. Consider more aggressive mesh instancing.'
            });
        }
        
        // Memory-based recommendations
        if (memoryUsage > 80) {
            recommendations.push({
                type: 'critical',
                system: 'texture',
                action: 'Reduce texture quality',
                description: 'High memory usage. Reduce texture quality and enable compression.'
            });
            
            recommendations.push({
                type: 'warning',
                system: 'instancing',
                action: 'Enable instancing',
                description: 'High memory usage. Enable mesh instancing to reduce memory footprint.'
            });
        }
        
        return recommendations;
    }
    
    /**
     * Apply optimization recommendations automatically
     */
    applyOptimizationRecommendations(recommendations) {
        for (const recommendation of recommendations) {
            console.log(`Applying optimization recommendation: ${recommendation.action}`);
            
            try {
                switch (recommendation.system) {
                    case 'culling':
                        if (this.cullingSystem) {
                            this.cullingSystem.setFrustumCullingEnabled(true);
                            this.cullingSystem.setOcclusionCullingEnabled(true);
                        }
                        break;
                        
                    case 'lod':
                        if (this.lodManager) {
                            // Reduce LOD distances by 25%
                            for (const [type, config] of this.lodManager.lodConfigs) {
                                config.distances = config.distances.map(d => d * 0.75);
                            }
                        }
                        break;
                        
                    case 'instancing':
                        if (this.instanceManager) {
                            this.instanceManager.setEnabled(true);
                            this.instanceManager.forceReanalysis();
                        }
                        break;
                        
                    case 'texture':
                        if (this.textureOptimizer) {
                            this.textureOptimizer.config.qualityScaling.baseQuality *= 0.8;
                            this.textureOptimizer.forceUpdate();
                        }
                        break;
                }
            } catch (error) {
                console.error(`Failed to apply recommendation for ${recommendation.system}:`, error);
            }
        }
    }
    
    /**
     * Dispose of the rendering optimizer
     */
    dispose() {
        console.log('Disposing RenderingOptimizer...');
        
        // Dispose all subsystems
        if (this.lodManager) {
            this.lodManager.dispose();
            this.lodManager = null;
        }
        
        if (this.cullingSystem) {
            this.cullingSystem.dispose();
            this.cullingSystem = null;
        }
        
        if (this.instanceManager) {
            this.instanceManager.dispose();
            this.instanceManager = null;
        }
        
        if (this.textureOptimizer) {
            this.textureOptimizer.dispose();
            this.textureOptimizer = null;
        }
        
        // Clear data
        this.updateSchedule = [];
        this.lastSubsystemUpdate.clear();
        
        this.initialized = false;
        
        console.log('RenderingOptimizer disposed');
    }
}