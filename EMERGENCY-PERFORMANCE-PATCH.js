/**
 * EMERGENCY PERFORMANCE PATCH
 * 
 * This file contains immediate fixes for the critical performance issue
 * causing 20 FPS on high-end hardware (RTX 5070 Ti + Ryzen 9950X3D)
 * 
 * ROOT CAUSE: 30+ separate render loop callbacks executing every frame
 * 
 * APPLY THIS PATCH IMMEDIATELY
 */

// ============================================================================
// PATCH 1: Fix VillagerBehaviour - Remove Per-Agent Observers
// ============================================================================

/**
 * Replace the addMovementObserver method in VillagerBehaviour.js
 * 
 * OLD CODE (lines 190-218):
 * addMovementObserver(villager) {
 *     let walkTime = 0;
 *     villager.updateObserver = this.scene.onBeforeRenderObservable.add(() => {
 *         // ... per-villager update code
 *     });
 * }
 * 
 * NEW CODE:
 */
function addMovementObserver_FIXED(villager) {
    // Initialize walk time on the villager object instead of closure
    villager.walkTime = 0;
    // DO NOT add observer - movement will be handled in updateVillagers()
}

/**
 * Add this new method to handle movement updates in the main loop
 */
function updateVillagerMovement(villager, deltaTime) {
    if (!villager.mesh || !villager.physics) return;
    
    // Force upright orientation
    villager.mesh.rotation.x = 0;
    villager.mesh.rotation.z = 0;
    
    // Ensure proper ground contact
    const groundHeight = BowlCreator.getTerrainHeight(villager.mesh.position.x, villager.mesh.position.z);
    if (groundHeight !== null) {
        const targetHeight = groundHeight + 0.9;
        
        // Add walking bounce when moving
        if (villager.state === this.STATES.MOVING_TO_TARGET || villager.state === this.STATES.WANDERING) {
            villager.walkTime += deltaTime;
            const bounce = Math.sin(villager.walkTime * 10) * 0.1;
            villager.mesh.position.y = targetHeight + bounce;
        } else {
            villager.mesh.position.y = targetHeight;
        }
    }
}

/**
 * Update the updateVillagers method to include movement updates
 * 
 * ADD THIS at the end of the villager update loop:
 */
function updateVillagers_ADDITION(deltaTime) {
    for (const villager of this.villagers) {
        // ... existing update code ...
        
        // ADD THIS LINE:
        this.updateVillagerMovement(villager, deltaTime);
    }
}

// ============================================================================
// PATCH 2: Create UpdateManager for Havokimport.js
// ============================================================================

/**
 * Add this class to Havokimport.js BEFORE the LeoScene class
 */
class UpdateManager {
    constructor(scene) {
        this.scene = scene;
        this.systems = [];
        this.isRunning = false;
        
        console.log('UpdateManager: Initialized');
    }
    
    /**
     * Register a system for updates
     * @param {Object} system - System with update() method
     * @param {number} priority - Lower numbers update first (default: 100)
     * @param {string} name - System name for debugging
     */
    registerSystem(system, priority = 100, name = 'Unknown') {
        if (!system || typeof system.update !== 'function') {
            console.warn(`UpdateManager: Cannot register system ${name} - no update() method`);
            return;
        }
        
        this.systems.push({ system, priority, name });
        this.systems.sort((a, b) => a.priority - b.priority);
        
        console.log(`UpdateManager: Registered ${name} (priority: ${priority})`);
    }
    
    /**
     * Start the update loop
     */
    start() {
        if (this.isRunning) {
            console.warn('UpdateManager: Already running');
            return;
        }
        
        this.isRunning = true;
        
        // Single render loop for ALL systems
        this.scene.onBeforeRenderObservable.add(() => {
            if (!this.isRunning) return;
            
            const deltaTime = this.scene.getEngine().getDeltaTime() * 0.001;
            this.updateAll(deltaTime);
        });
        
        console.log(`UpdateManager: Started with ${this.systems.length} systems`);
    }
    
    /**
     * Update all registered systems
     */
    updateAll(deltaTime) {
        for (const { system, name } of this.systems) {
            try {
                system.update(deltaTime);
            } catch (error) {
                console.error(`UpdateManager: Error updating ${name}:`, error);
            }
        }
    }
    
    /**
     * Stop the update loop
     */
    stop() {
        this.isRunning = false;
        console.log('UpdateManager: Stopped');
    }
    
    /**
     * Remove all systems
     */
    clear() {
        this.systems = [];
        console.log('UpdateManager: Cleared all systems');
    }
}

// ============================================================================
// PATCH 3: System Priority Guidelines
// ============================================================================

/**
 * Use these priorities when registering systems:
 * 
 * Priority 10: Input handling
 * Priority 20: Physics pre-update
 * Priority 30: Agent AI/behavior
 * Priority 40: Environmental systems
 * Priority 50: Animation updates
 * Priority 60: Physics post-update
 * Priority 70: Rendering/LOD
 * Priority 80: UI updates
 * Priority 90: Performance monitoring
 */

const SYSTEM_PRIORITIES = {
    INPUT: 10,
    PHYSICS_PRE: 20,
    AGENTS: 30,
    ENVIRONMENT: 40,
    ANIMATION: 50,
    PHYSICS_POST: 60,
    RENDERING: 70,
    UI: 80,
    MONITORING: 90
};

// ============================================================================
// PATCH 4: Modified LeoScene.init() - Use UpdateManager
// ============================================================================

/**
 * Replace the render loop in LeoScene.init() with this:
 */
async function init_PATCHED() {
    // ... existing initialization code ...
    
    // CREATE UPDATE MANAGER
    this.updateManager = new UpdateManager(this.scene);
    
    // Register systems with priorities
    if (this.villagerSystem) {
        this.updateManager.registerSystem(this.villagerSystem, SYSTEM_PRIORITIES.AGENTS, 'VillagerSystem');
    }
    if (this.zombieSystem) {
        this.updateManager.registerSystem(this.zombieSystem, SYSTEM_PRIORITIES.AGENTS, 'ZombieSystem');
    }
    if (this.fishSystem) {
        this.updateManager.registerSystem(this.fishSystem, SYSTEM_PRIORITIES.AGENTS, 'FishSystem');
    }
    if (this.birdSystem) {
        this.updateManager.registerSystem(this.birdSystem, SYSTEM_PRIORITIES.AGENTS, 'BirdSystem');
    }
    if (this.dogSystem) {
        this.updateManager.registerSystem(this.dogSystem, SYSTEM_PRIORITIES.AGENTS, 'DogSystem');
    }
    if (this.waterSim) {
        this.updateManager.registerSystem(this.waterSim, SYSTEM_PRIORITIES.ENVIRONMENT, 'WaterSimulation');
    }
    if (this.cloudSystem) {
        this.updateManager.registerSystem(this.cloudSystem, SYSTEM_PRIORITIES.ENVIRONMENT, 'CloudSystem');
    }
    if (this.dayNightCycle) {
        this.updateManager.registerSystem(this.dayNightCycle, SYSTEM_PRIORITIES.ENVIRONMENT, 'DayNightCycle');
    }
    if (this.worldClock) {
        this.updateManager.registerSystem(this.worldClock, SYSTEM_PRIORITIES.UI, 'WorldClock');
    }
    if (this.rtsUI) {
        this.updateManager.registerSystem(this.rtsUI, SYSTEM_PRIORITIES.UI, 'RTSUI');
    }
    
    // Start the update manager
    this.updateManager.start();
    
    // REMOVE THE OLD RENDER LOOP:
    // this.engine.runRenderLoop(() => { ... });
    
    // REPLACE WITH SIMPLE RENDER CALL:
    this.engine.runRenderLoop(() => {
        this.scene.render();
    });
}

// ============================================================================
// PATCH 5: System Update Method Template
// ============================================================================

/**
 * All systems should follow this pattern:
 */
class SystemTemplate {
    constructor(scene) {
        this.scene = scene;
        // DO NOT register render loop here!
    }
    
    initialize() {
        // Setup code
        // DO NOT register render loop here!
    }
    
    /**
     * Called by UpdateManager every frame
     * @param {number} deltaTime - Time since last frame in seconds
     */
    update(deltaTime) {
        // Update logic here
    }
}

// ============================================================================
// IMPLEMENTATION CHECKLIST
// ============================================================================

/**
 * To apply this patch:
 * 
 * 1. ✅ Read PERFORMANCE-CRISIS-FIX.md for full analysis
 * 
 * 2. ⚠️ VillagerBehaviour.js:
 *    - Replace addMovementObserver() with addMovementObserver_FIXED()
 *    - Add updateVillagerMovement() method
 *    - Update updateVillagers() to call updateVillagerMovement()
 *    - REMOVE the onBeforeRenderObservable.add() at line 55
 * 
 * 3. ⚠️ Havokimport.js:
 *    - Add UpdateManager class
 *    - Add SYSTEM_PRIORITIES constant
 *    - Modify init() to use UpdateManager
 *    - Remove old render loop with time updates
 * 
 * 4. ⚠️ All Agent Systems:
 *    - Remove registerBeforeRender() calls
 *    - Remove onBeforeRenderObservable.add() calls
 *    - Ensure update(deltaTime) method exists
 * 
 * 5. ⚠️ All Environment Systems:
 *    - Remove registerBeforeRender() calls
 *    - Remove onBeforeRenderObservable.add() calls
 *    - Ensure update(deltaTime) method exists
 * 
 * 6. ✅ Test performance
 * 
 * EXPECTED RESULT: 60+ FPS (from 20 FPS)
 */

export { UpdateManager, SYSTEM_PRIORITIES };
