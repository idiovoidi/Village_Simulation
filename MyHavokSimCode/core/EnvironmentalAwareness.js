/**
 * Environmental Awareness System
 * Provides spatial queries, threat assessment, and safe zone management
 */

export class EnvironmentalAwareness {
    constructor(scene) {
        this.scene = scene;
        
        // Spatial partitioning system
        this.spatialGrid = new EnvironmentalSpatialGrid(50); // 50 unit grid cells
        
        // Threat assessment system
        this.threatMap = new ThreatMap();
        this.threatSources = new Map(); // agentId -> threat info
        this.threatDecayRate = 0.1; // Threat decay per second
        
        // Safe zone management
        this.safeZoneManager = new SafeZoneManager();
        
        // Environmental factors
        this.environmentalFactors = {
            visibility: 1.0, // 0.0 to 1.0
            noiseLevel: 0.0, // 0.0 to 1.0
            timeOfDay: 12.0, // 0-24 hours
            weather: 'clear', // clear, rain, fog, etc.
            temperature: 20.0 // Celsius
        };
        
        // Pathfinding and navigation
        this.navigationMesh = null;
        this.obstacles = new Set();
        this.dynamicObstacles = new Map(); // Temporary obstacles
        
        // Performance optimization
        this.updateInterval = 100; // Update every 100ms
        this.lastUpdate = 0;
        this.queryCache = new Map();
        this.cacheTimeout = 500; // Cache results for 500ms
        
        // Event system
        this.eventCallbacks = new Map();
        
        // Statistics
        this.stats = {
            spatialQueries: 0,
            threatAssessments: 0,
            safeZoneQueries: 0,
            cacheHits: 0,
            cacheMisses: 0
        };
    }
    
    /**
     * Initialize the environmental awareness system
     */
    initialize() {
        // Set up update loop
        if (this.scene) {
            this.scene.onBeforeRenderObservable.add(() => {
                const deltaTime = this.scene.getEngine().getDeltaTime() * 0.001;
                this.update(deltaTime);
            });
        }
        
        // Initialize subsystems
        this.threatMap.initialize();
        this.safeZoneManager.initialize();
        
        // Initialize last update time
        this.lastUpdate = performance.now();
        
        console.log('Environmental Awareness System initialized');
    }
    
    /**
     * Force an update with a specific delta time (useful for testing)
     * @param {number} deltaTime - Time delta in seconds
     */
    forceUpdate(deltaTime) {
        const previousUpdateInterval = this.updateInterval;
        this.updateInterval = 0; // Disable throttling
        this.update(deltaTime);
        this.updateInterval = previousUpdateInterval; // Restore throttling
    }
    
    /**
     * Update the environmental awareness system
     * @param {number} deltaTime - Time since last update in seconds
     */
    update(deltaTime) {
        const now = performance.now();
        
        // Throttle updates for performance
        if (now - this.lastUpdate < this.updateInterval) {
            return;
        }
        
        // Calculate actual delta time since last update
        const actualDeltaTime = (now - this.lastUpdate) / 1000; // Convert to seconds
        this.lastUpdate = now;
        
        // Update subsystems
        this.spatialGrid.update();
        this.threatMap.update(actualDeltaTime);
        this.safeZoneManager.update(actualDeltaTime);
        
        // Decay threats over time
        this.decayThreats(actualDeltaTime);
        
        // Clean up expired cache entries
        this.cleanupCache();
        
        // Update dynamic obstacles
        this.updateDynamicObstacles(actualDeltaTime);
    }
    
    /**
     * Register an agent with the environmental awareness system
     * @param {Object} agent - Agent to register
     */
    registerAgent(agent) {
        if (!agent.environmentalId) {
            agent.environmentalId = `env_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        }
        
        // Add to spatial grid
        this.spatialGrid.addAgent(agent);
        
        // Initialize threat level
        if (!agent.threatLevel) {
            agent.threatLevel = 0;
        }
        
        return agent.environmentalId;
    }
    
    /**
     * Unregister an agent from the system
     * @param {Object} agent - Agent to unregister
     */
    unregisterAgent(agent) {
        if (!agent.environmentalId) return;
        
        // Remove from spatial grid
        this.spatialGrid.removeAgent(agent);
        
        // Remove from threat sources
        this.threatSources.delete(agent.environmentalId);
        
        // Remove from threat map
        this.threatMap.removeAgent(agent);
    }
    
    /**
     * Get agents within a specified range of a position
     * @param {BABYLON.Vector3} position - Center position
     * @param {number} range - Search range
     * @param {Object} options - Query options
     * @returns {Array} - Array of nearby agents
     */
    getAgentsInRange(position, range, options = {}) {
        this.stats.spatialQueries++;
        
        // Check cache first
        const cacheKey = `agents_${position.x}_${position.z}_${range}`;
        const cached = this.getCachedResult(cacheKey);
        if (cached) {
            this.stats.cacheHits++;
            return cached;
        }
        
        this.stats.cacheMisses++;
        
        // Perform spatial query
        const agents = this.spatialGrid.getAgentsInRange(position, range);
        
        // Apply filters
        let filteredAgents = Array.from(agents);
        
        if (options.agentType) {
            filteredAgents = filteredAgents.filter(agent => 
                agent.agentType === options.agentType
            );
        }
        
        if (options.excludeAgent) {
            filteredAgents = filteredAgents.filter(agent => 
                agent !== options.excludeAgent
            );
        }
        
        if (options.minThreatLevel !== undefined) {
            filteredAgents = filteredAgents.filter(agent => 
                (agent.threatLevel || 0) >= options.minThreatLevel
            );
        }
        
        if (options.maxThreatLevel !== undefined) {
            filteredAgents = filteredAgents.filter(agent => 
                (agent.threatLevel || 0) <= options.maxThreatLevel
            );
        }
        
        // Cache result
        this.cacheResult(cacheKey, filteredAgents);
        
        return filteredAgents;
    }
    
    /**
     * Assess threat level at a specific position
     * @param {BABYLON.Vector3} position - Position to assess
     * @param {Object} options - Assessment options
     * @returns {Object} - Threat assessment result
     */
    assessThreat(position, options = {}) {
        this.stats.threatAssessments++;
        
        const assessment = {
            overallThreat: 0,
            threats: [],
            safetyScore: 1.0,
            recommendedAction: 'none',
            nearestSafeZone: null,
            escapeRoutes: []
        };
        
        // Get threat level from threat map
        const mapThreat = this.threatMap.getThreatLevel(position);
        assessment.overallThreat += mapThreat;
        
        // Check for nearby threatening agents
        const nearbyAgents = this.getAgentsInRange(position, options.threatRange || 30, {
            minThreatLevel: 0.1
        });
        
        for (const agent of nearbyAgents) {
            const distance = BABYLON.Vector3.Distance(position, agent.mesh.position);
            const threatContribution = (agent.threatLevel || 0) * Math.max(0, 1 - distance / 30);
            
            assessment.overallThreat += threatContribution;
            assessment.threats.push({
                agent: agent,
                distance: distance,
                threatLevel: agent.threatLevel || 0,
                contribution: threatContribution
            });
        }
        
        // Factor in environmental conditions
        const environmentalThreat = this.calculateEnvironmentalThreat(position);
        assessment.overallThreat += environmentalThreat;
        
        // Calculate safety score (inverse of threat)
        assessment.safetyScore = Math.max(0, 1 - assessment.overallThreat);
        
        // Determine recommended action
        if (assessment.overallThreat > 0.7) {
            assessment.recommendedAction = 'flee';
        } else if (assessment.overallThreat > 0.4) {
            assessment.recommendedAction = 'caution';
        } else if (assessment.overallThreat > 0.1) {
            assessment.recommendedAction = 'alert';
        }
        
        // Find nearest safe zone
        assessment.nearestSafeZone = this.safeZoneManager.findNearestSafeZone(position);
        
        // Calculate escape routes if needed
        if (assessment.recommendedAction === 'flee' || assessment.recommendedAction === 'caution') {
            assessment.escapeRoutes = this.calculateEscapeRoutes(position, assessment.threats);
        }
        
        return assessment;
    }
    
    /**
     * Find the nearest safe zone to a position
     * @param {BABYLON.Vector3} position - Position to search from
     * @param {Object} options - Search options
     * @returns {Object} - Safe zone information
     */
    findNearestSafeZone(position, options = {}) {
        this.stats.safeZoneQueries++;
        return this.safeZoneManager.findNearestSafeZone(position, options);
    }
    
    /**
     * Check if a position is in a safe zone
     * @param {BABYLON.Vector3} position - Position to check
     * @returns {Object} - Safe zone information or null
     */
    isInSafeZone(position) {
        return this.safeZoneManager.isInSafeZone(position);
    }
    
    /**
     * Add a threat source at a position
     * @param {BABYLON.Vector3} position - Threat position
     * @param {number} intensity - Threat intensity (0-1)
     * @param {number} radius - Threat radius
     * @param {number} duration - Duration in seconds (optional)
     */
    addThreat(position, intensity, radius, duration = null) {
        const threatId = `threat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        const threat = {
            id: threatId,
            position: position.clone(),
            intensity: intensity,
            radius: radius,
            duration: duration,
            startTime: performance.now(),
            decayRate: this.threatDecayRate
        };
        
        this.threatMap.addThreat(threat);
        
        // Trigger threat event
        this.triggerEvent('threat_added', { threat });
        
        return threatId;
    }
    
    /**
     * Remove a threat source
     * @param {string} threatId - Threat identifier
     */
    removeThreat(threatId) {
        this.threatMap.removeThreat(threatId);
        this.triggerEvent('threat_removed', { threatId });
    }
    
    /**
     * Add a safe zone
     * @param {BABYLON.Vector3} position - Safe zone center
     * @param {number} radius - Safe zone radius
     * @param {Object} options - Safe zone options
     * @returns {string} - Safe zone ID
     */
    addSafeZone(position, radius, options = {}) {
        return this.safeZoneManager.addSafeZone(position, radius, options);
    }
    
    /**
     * Remove a safe zone
     * @param {string} safeZoneId - Safe zone identifier
     */
    removeSafeZone(safeZoneId) {
        this.safeZoneManager.removeSafeZone(safeZoneId);
    }
    
    /**
     * Check line of sight between two positions
     * @param {BABYLON.Vector3} from - Start position
     * @param {BABYLON.Vector3} to - End position
     * @param {Object} options - Ray casting options
     * @returns {Object} - Line of sight result
     */
    checkLineOfSight(from, to, options = {}) {
        const direction = to.subtract(from).normalize();
        const distance = BABYLON.Vector3.Distance(from, to);
        
        // Create ray for line of sight check
        const ray = new BABYLON.Ray(from, direction, distance);
        
        // Check for obstacles
        const hit = this.scene.pickWithRay(ray, (mesh) => {
            // Filter out agents and other non-blocking objects
            if (options.ignoreAgents && mesh.name && mesh.name.includes('agent')) {
                return false;
            }
            
            return mesh.isPickable && !mesh.name.startsWith('safe_zone');
        });
        
        const result = {
            hasLineOfSight: !hit.hit,
            distance: distance,
            obstacleDistance: hit.hit ? hit.distance : distance,
            obstaclePoint: hit.hit ? hit.pickedPoint : null,
            obstacle: hit.hit ? hit.pickedMesh : null
        };
        
        // Factor in environmental visibility
        if (result.hasLineOfSight) {
            const visibilityFactor = this.getVisibilityFactor(from, to);
            result.effectiveVisibility = visibilityFactor;
            result.hasLineOfSight = visibilityFactor > (options.minVisibility || 0.3);
        }
        
        return result;
    }
    
    /**
     * Get visibility factor between two positions based on environmental conditions
     * @param {BABYLON.Vector3} from - Start position
     * @param {BABYLON.Vector3} to - End position
     * @returns {number} - Visibility factor (0-1)
     */
    getVisibilityFactor(from, to) {
        let visibility = this.environmentalFactors.visibility;
        
        // Factor in distance
        const distance = BABYLON.Vector3.Distance(from, to);
        const distanceFactor = Math.max(0, 1 - distance / 100); // Visibility decreases with distance
        
        // Factor in time of day
        const hour = this.environmentalFactors.timeOfDay;
        let timeFactor = 1.0;
        if (hour < 6 || hour > 20) {
            // Reduced visibility at night
            timeFactor = 0.3;
        } else if (hour < 8 || hour > 18) {
            // Reduced visibility at dawn/dusk
            timeFactor = 0.7;
        }
        
        // Factor in weather
        let weatherFactor = 1.0;
        switch (this.environmentalFactors.weather) {
            case 'fog':
                weatherFactor = 0.2;
                break;
            case 'rain':
                weatherFactor = 0.6;
                break;
            case 'storm':
                weatherFactor = 0.3;
                break;
        }
        
        return visibility * distanceFactor * timeFactor * weatherFactor;
    }
    
    /**
     * Update environmental factors
     * @param {Object} factors - Environmental factors to update
     */
    updateEnvironmentalFactors(factors) {
        this.environmentalFactors = { ...this.environmentalFactors, ...factors };
        
        // Trigger environment change event
        this.triggerEvent('environment_changed', { factors: this.environmentalFactors });
    }
    
    /**
     * Calculate environmental threat contribution
     * @param {BABYLON.Vector3} position - Position to assess
     * @returns {number} - Environmental threat level
     */
    calculateEnvironmentalThreat(position) {
        let threat = 0;
        
        // Higher threat in low visibility
        threat += (1 - this.environmentalFactors.visibility) * 0.2;
        
        // Higher threat at night
        const hour = this.environmentalFactors.timeOfDay;
        if (hour < 6 || hour > 20) {
            threat += 0.3;
        }
        
        // Weather-based threat
        switch (this.environmentalFactors.weather) {
            case 'storm':
                threat += 0.4;
                break;
            case 'fog':
                threat += 0.2;
                break;
        }
        
        // Noise level affects detection risk
        threat += this.environmentalFactors.noiseLevel * 0.1;
        
        return Math.min(1.0, threat);
    }
    
    /**
     * Calculate escape routes from a position
     * @param {BABYLON.Vector3} position - Starting position
     * @param {Array} threats - Array of threat objects
     * @returns {Array} - Array of escape route directions
     */
    calculateEscapeRoutes(position, threats) {
        const routes = [];
        const numRoutes = 4; // Calculate 4 potential escape routes
        
        for (let i = 0; i < numRoutes; i++) {
            const angle = (i / numRoutes) * Math.PI * 2;
            const direction = new BABYLON.Vector3(Math.cos(angle), 0, Math.sin(angle));
            
            // Calculate route safety score
            let safetyScore = 1.0;
            
            // Check if route leads away from threats
            for (const threat of threats) {
                const toThreat = threat.agent.mesh.position.subtract(position).normalize();
                const dotProduct = BABYLON.Vector3.Dot(direction, toThreat);
                
                // Negative dot product means moving away from threat
                if (dotProduct > 0) {
                    safetyScore -= dotProduct * (threat.threatLevel || 0);
                }
            }
            
            // Check if route leads to safe zone
            const nearestSafeZone = this.safeZoneManager.findNearestSafeZone(position);
            if (nearestSafeZone) {
                const toSafeZone = nearestSafeZone.position.subtract(position).normalize();
                const safeZoneDot = BABYLON.Vector3.Dot(direction, toSafeZone);
                if (safeZoneDot > 0) {
                    safetyScore += safeZoneDot * 0.5;
                }
            }
            
            routes.push({
                direction: direction,
                angle: angle,
                safetyScore: Math.max(0, safetyScore)
            });
        }
        
        // Sort routes by safety score
        routes.sort((a, b) => b.safetyScore - a.safetyScore);
        
        return routes;
    }
    
    /**
     * Decay threats over time
     * @param {number} deltaTime - Time since last update
     */
    decayThreats(deltaTime) {
        this.threatMap.decayThreats(deltaTime);
    }
    
    /**
     * Update dynamic obstacles
     * @param {number} deltaTime - Time since last update
     */
    updateDynamicObstacles(deltaTime) {
        const now = performance.now();
        
        for (const [obstacleId, obstacle] of this.dynamicObstacles) {
            if (obstacle.expiryTime && now > obstacle.expiryTime) {
                this.dynamicObstacles.delete(obstacleId);
            }
        }
    }
    
    /**
     * Cache a query result
     * @param {string} key - Cache key
     * @param {*} result - Result to cache
     */
    cacheResult(key, result) {
        this.queryCache.set(key, {
            result: result,
            timestamp: performance.now()
        });
    }
    
    /**
     * Get cached result if still valid
     * @param {string} key - Cache key
     * @returns {*} - Cached result or null
     */
    getCachedResult(key) {
        const cached = this.queryCache.get(key);
        if (cached && performance.now() - cached.timestamp < this.cacheTimeout) {
            return cached.result;
        }
        return null;
    }
    
    /**
     * Clean up expired cache entries
     */
    cleanupCache() {
        const now = performance.now();
        for (const [key, cached] of this.queryCache) {
            if (now - cached.timestamp > this.cacheTimeout) {
                this.queryCache.delete(key);
            }
        }
    }
    
    /**
     * Register event callback
     * @param {string} eventType - Event type
     * @param {Function} callback - Callback function
     */
    onEvent(eventType, callback) {
        if (!this.eventCallbacks.has(eventType)) {
            this.eventCallbacks.set(eventType, []);
        }
        this.eventCallbacks.get(eventType).push(callback);
    }
    
    /**
     * Trigger event callbacks
     * @param {string} eventType - Event type
     * @param {Object} data - Event data
     */
    triggerEvent(eventType, data) {
        if (this.eventCallbacks.has(eventType)) {
            for (const callback of this.eventCallbacks.get(eventType)) {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`Error in event callback for ${eventType}:`, error);
                }
            }
        }
    }
    
    /**
     * Get system statistics
     * @returns {Object} - Statistics object
     */
    getStatistics() {
        return {
            ...this.stats,
            spatialGridCells: this.spatialGrid.getActiveCellCount(),
            threatSources: this.threatMap.getThreatCount(),
            safeZones: this.safeZoneManager.getSafeZoneCount(),
            cacheSize: this.queryCache.size,
            cacheHitRate: this.stats.cacheHits / (this.stats.cacheHits + this.stats.cacheMisses) || 0
        };
    }
    
    /**
     * Dispose of the environmental awareness system
     */
    dispose() {
        if (this.spatialGrid) {
            this.spatialGrid.dispose();
        }
        
        if (this.threatMap) {
            this.threatMap.dispose();
        }
        
        if (this.safeZoneManager) {
            this.safeZoneManager.dispose();
        }
        
        this.queryCache.clear();
        this.eventCallbacks.clear();
        this.obstacles.clear();
        this.dynamicObstacles.clear();
        
        if (this.scene) {
            this.scene.onBeforeRenderObservable.clear();
        }
    }
}

/**
 * Environmental Spatial Grid for efficient spatial queries
 */
class EnvironmentalSpatialGrid {
    constructor(cellSize = 50) {
        this.cellSize = cellSize;
        this.grid = new Map();
        this.agentCells = new Map();
    }
    
    addAgent(agent) {
        if (!agent.mesh || !agent.mesh.position) return;
        
        const cellKey = this.getCellKey(agent.mesh.position);
        
        if (!this.grid.has(cellKey)) {
            this.grid.set(cellKey, new Set());
        }
        
        this.grid.get(cellKey).add(agent);
        this.agentCells.set(agent, cellKey);
    }
    
    removeAgent(agent) {
        const cellKey = this.agentCells.get(agent);
        if (cellKey && this.grid.has(cellKey)) {
            this.grid.get(cellKey).delete(agent);
            
            if (this.grid.get(cellKey).size === 0) {
                this.grid.delete(cellKey);
            }
        }
        
        this.agentCells.delete(agent);
    }
    
    update() {
        const agents = Array.from(this.agentCells.keys());
        
        for (const agent of agents) {
            if (!agent.mesh || !agent.mesh.position) {
                // Remove agents without valid positions
                this.removeAgent(agent);
                continue;
            }
            
            const currentCellKey = this.getCellKey(agent.mesh.position);
            const storedCellKey = this.agentCells.get(agent);
            
            // Only update if agent moved to a different cell
            if (currentCellKey !== storedCellKey) {
                this.removeAgent(agent);
                this.addAgent(agent);
            }
        }
    }
    
    getAgentsInRange(position, range) {
        const nearbyAgents = new Set();
        const cellsToCheck = this.getCellsInRange(position, range);
        
        for (const cellKey of cellsToCheck) {
            if (this.grid.has(cellKey)) {
                for (const agent of this.grid.get(cellKey)) {
                    if (agent.mesh && agent.mesh.position) {
                        const distance = BABYLON.Vector3.Distance(position, agent.mesh.position);
                        if (distance <= range) {
                            nearbyAgents.add(agent);
                        }
                    }
                }
            }
        }
        
        return nearbyAgents;
    }
    
    getCellKey(position) {
        const x = Math.floor(position.x / this.cellSize);
        const z = Math.floor(position.z / this.cellSize);
        return `${x},${z}`;
    }
    
    getCellsInRange(position, range) {
        const cells = [];
        const cellRange = Math.ceil(range / this.cellSize);
        const centerX = Math.floor(position.x / this.cellSize);
        const centerZ = Math.floor(position.z / this.cellSize);
        
        for (let x = centerX - cellRange; x <= centerX + cellRange; x++) {
            for (let z = centerZ - cellRange; z <= centerZ + cellRange; z++) {
                cells.push(`${x},${z}`);
            }
        }
        
        return cells;
    }
    
    getActiveCellCount() {
        return this.grid.size;
    }
    
    dispose() {
        this.grid.clear();
        this.agentCells.clear();
    }
}

/**
 * Threat Map for tracking threat levels across the environment
 */
class ThreatMap {
    constructor() {
        this.threats = new Map();
        this.threatGrid = new Map();
        this.gridSize = 25; // 25 unit grid for threat tracking
    }
    
    initialize() {
        // Initialize threat map
    }
    
    addThreat(threat) {
        this.threats.set(threat.id, threat);
        this.updateThreatGrid(threat);
    }
    
    removeThreat(threatId) {
        const threat = this.threats.get(threatId);
        if (threat) {
            this.threats.delete(threatId);
            this.updateThreatGrid(threat, true);
        }
    }
    
    removeAgent(agent) {
        // Remove threats associated with an agent
        for (const [threatId, threat] of this.threats) {
            if (threat.agent === agent) {
                this.removeThreat(threatId);
            }
        }
    }
    
    getThreatLevel(position) {
        const cellKey = this.getCellKey(position);
        return this.threatGrid.get(cellKey) || 0;
    }
    
    update(deltaTime) {
        // Update threat levels and decay
    }
    
    decayThreats(deltaTime) {
        const threatsToRemove = [];
        
        for (const [threatId, threat] of this.threats) {
            let shouldRemove = false;
            
            if (threat.duration !== null) {
                threat.duration -= deltaTime;
                if (threat.duration <= 0) {
                    shouldRemove = true;
                }
            }
            
            if (!shouldRemove) {
                // Apply decay
                const oldIntensity = threat.intensity;
                threat.intensity = Math.max(0, threat.intensity - threat.decayRate * deltaTime);
                
                if (threat.intensity <= 0.01) {
                    shouldRemove = true;
                } else if (threat.intensity !== oldIntensity) {
                    // Update threat grid only if intensity changed
                    this.updateThreatGrid(threat);
                }
            }
            
            if (shouldRemove) {
                threatsToRemove.push(threatId);
            }
        }
        
        // Remove threats that have expired or decayed
        for (const threatId of threatsToRemove) {
            this.removeThreat(threatId);
        }
    }
    
    updateThreatGrid(threat, remove = false) {
        const cellsInRange = this.getCellsInRange(threat.position, threat.radius);
        
        for (const cellKey of cellsInRange) {
            const distance = this.getDistanceToCell(cellKey, threat.position);
            const influence = Math.max(0, 1 - distance / threat.radius);
            const threatContribution = threat.intensity * influence;
            
            if (remove) {
                const currentThreat = this.threatGrid.get(cellKey) || 0;
                this.threatGrid.set(cellKey, Math.max(0, currentThreat - threatContribution));
            } else {
                const currentThreat = this.threatGrid.get(cellKey) || 0;
                this.threatGrid.set(cellKey, currentThreat + threatContribution);
            }
        }
    }
    
    getCellKey(position) {
        const x = Math.floor(position.x / this.gridSize);
        const z = Math.floor(position.z / this.gridSize);
        return `${x},${z}`;
    }
    
    getCellsInRange(position, range) {
        const cells = [];
        const cellRange = Math.ceil(range / this.gridSize);
        const centerX = Math.floor(position.x / this.gridSize);
        const centerZ = Math.floor(position.z / this.gridSize);
        
        for (let x = centerX - cellRange; x <= centerX + cellRange; x++) {
            for (let z = centerZ - cellRange; z <= centerZ + cellRange; z++) {
                cells.push(`${x},${z}`);
            }
        }
        
        return cells;
    }
    
    getDistanceToCell(cellKey, position) {
        const [x, z] = cellKey.split(',').map(Number);
        const cellCenter = new BABYLON.Vector3(
            x * this.gridSize + this.gridSize / 2,
            0,
            z * this.gridSize + this.gridSize / 2
        );
        return BABYLON.Vector3.Distance(cellCenter, position);
    }
    
    getThreatCount() {
        return this.threats.size;
    }
    
    dispose() {
        this.threats.clear();
        this.threatGrid.clear();
    }
}

/**
 * Safe Zone Manager for managing safe areas
 */
class SafeZoneManager {
    constructor() {
        this.safeZones = new Map();
        this.safeZoneIdCounter = 0;
    }
    
    initialize() {
        // Initialize safe zone manager
    }
    
    addSafeZone(position, radius, options = {}) {
        const safeZoneId = `safe_zone_${++this.safeZoneIdCounter}`;
        
        const safeZone = {
            id: safeZoneId,
            position: position.clone(),
            radius: radius,
            capacity: options.capacity || Infinity,
            currentOccupants: 0,
            type: options.type || 'general',
            isActive: options.isActive !== false,
            requirements: options.requirements || {},
            createdAt: performance.now()
        };
        
        this.safeZones.set(safeZoneId, safeZone);
        return safeZoneId;
    }
    
    removeSafeZone(safeZoneId) {
        this.safeZones.delete(safeZoneId);
    }
    
    findNearestSafeZone(position, options = {}) {
        let nearestZone = null;
        let nearestDistance = Infinity;
        
        for (const safeZone of this.safeZones.values()) {
            if (!safeZone.isActive) continue;
            
            // Check capacity
            if (safeZone.currentOccupants >= safeZone.capacity) continue;
            
            // Check type filter
            if (options.type && safeZone.type !== options.type) continue;
            
            const distance = BABYLON.Vector3.Distance(position, safeZone.position);
            
            if (distance < nearestDistance) {
                nearestDistance = distance;
                nearestZone = safeZone;
            }
        }
        
        return nearestZone ? {
            ...nearestZone,
            distance: nearestDistance
        } : null;
    }
    
    isInSafeZone(position) {
        for (const safeZone of this.safeZones.values()) {
            if (!safeZone.isActive) continue;
            
            const distance = BABYLON.Vector3.Distance(position, safeZone.position);
            if (distance <= safeZone.radius) {
                return safeZone;
            }
        }
        
        return null;
    }
    
    update(deltaTime) {
        // Update safe zone states
    }
    
    getSafeZoneCount() {
        return this.safeZones.size;
    }
    
    dispose() {
        this.safeZones.clear();
    }
}