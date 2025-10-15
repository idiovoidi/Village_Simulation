/**
 * AgentScheduler - Distributed AI processing system
 * Manages frame-based agent update scheduling to spread CPU load
 * Implements priority-based scheduling and distance-based update frequency scaling
 */

export class AgentScheduler {
    constructor(scene, camera) {
        this.scene = scene;
        this.camera = camera;
        
        // Scheduling configuration
        this.config = {
            maxAgentsPerFrame: 10,        // Maximum agents to update per frame
            priorityUpdateRatio: 0.6,     // Ratio of updates for high priority agents
            distanceThresholds: {
                near: 25,                 // Near distance threshold
                medium: 50,               // Medium distance threshold
                far: 100                  // Far distance threshold
            },
            updateFrequencies: {
                near: 1,                  // Update every frame
                medium: 2,                // Update every 2 frames
                far: 4,                   // Update every 4 frames
                veryFar: 8                // Update every 8 frames
            },
            priorityBonus: {
                visible: 2,               // Priority multiplier for visible agents
                player_interaction: 3,    // Priority multiplier for player-interacting agents
                critical_behavior: 2      // Priority multiplier for critical behaviors
            }
        };
        
        // Agent management
        this.registeredAgents = new Map();  // agentId -> agent data
        this.updateQueues = {
            high: [],                     // High priority agents
            medium: [],                   // Medium priority agents
            low: []                       // Low priority agents
        };
        
        // Scheduling state
        this.frameCounter = 0;
        this.currentFrameUpdates = 0;
        this.schedulingEnabled = true;
        
        // Performance tracking
        this.metrics = {
            totalAgents: 0,
            updatesThisFrame: 0,
            updatesPerSecond: 0,
            averageUpdatesPerFrame: 0,
            skippedUpdates: 0,
            priorityDistribution: { high: 0, medium: 0, low: 0 }
        };
        
        // Timing for metrics
        this.lastMetricsUpdate = performance.now();
        this.frameUpdateCounts = [];
        this.maxFrameHistory = 60; // Track last 60 frames
        
        // Initialize update loop
        this.initializeScheduler();
    }

    /**
     * Initialize the scheduler and start the update loop
     */
    initializeScheduler() {
        this.scene.onBeforeRenderObservable.add(() => {
            if (this.schedulingEnabled) {
                this.processScheduledUpdates();
                this.updateMetrics();
            }
        });
        
        console.log('AgentScheduler initialized');
    }

    /**
     * Register an agent for scheduled updates
     */
    registerAgent(agentId, agentData) {
        if (this.registeredAgents.has(agentId)) {
            console.warn(`Agent ${agentId} is already registered`);
            return false;
        }

        const scheduledAgent = {
            id: agentId,
            mesh: agentData.mesh,
            updateCallback: agentData.updateCallback,
            behaviorType: agentData.behaviorType || 'default',
            priority: agentData.priority || 'medium',
            
            // Scheduling data
            lastUpdateFrame: 0,
            updateFrequency: this.config.updateFrequencies.medium,
            distanceCategory: 'medium',
            currentPriority: 'medium',
            
            // Performance data
            updateCount: 0,
            totalUpdateTime: 0,
            averageUpdateTime: 0,
            lastUpdateDuration: 0,
            
            // State tracking
            isVisible: false,
            distanceFromCamera: 0,
            isPlayerInteracting: false,
            hasCriticalBehavior: false,
            
            // Custom properties
            customPriority: agentData.customPriority || 1.0,
            forceUpdate: false
        };

        this.registeredAgents.set(agentId, scheduledAgent);
        this.addToQueue(scheduledAgent);
        this.metrics.totalAgents++;
        
        return true;
    }

    /**
     * Unregister an agent from scheduling
     */
    unregisterAgent(agentId) {
        const agent = this.registeredAgents.get(agentId);
        if (!agent) {
            return false;
        }

        // Remove from all queues
        this.removeFromAllQueues(agentId);
        this.registeredAgents.delete(agentId);
        this.metrics.totalAgents--;
        
        return true;
    }

    /**
     * Process scheduled updates for the current frame
     */
    processScheduledUpdates() {
        this.frameCounter++;
        this.currentFrameUpdates = 0;
        
        // Update agent priorities and distances
        this.updateAgentPriorities();
        
        // Calculate how many agents to update this frame
        const maxUpdates = this.calculateMaxUpdatesThisFrame();
        
        // Process high priority agents first
        this.processQueueUpdates('high', maxUpdates * this.config.priorityUpdateRatio);
        
        // Process remaining capacity with medium and low priority
        const remainingCapacity = maxUpdates - this.currentFrameUpdates;
        this.processQueueUpdates('medium', remainingCapacity * 0.7);
        this.processQueueUpdates('low', maxUpdates - this.currentFrameUpdates);
        
        // Track frame update count
        this.frameUpdateCounts.push(this.currentFrameUpdates);
        if (this.frameUpdateCounts.length > this.maxFrameHistory) {
            this.frameUpdateCounts.shift();
        }
        
        this.metrics.updatesThisFrame = this.currentFrameUpdates;
    }

    /**
     * Update agent priorities based on distance and visibility
     */
    updateAgentPriorities() {
        for (const [agentId, agent] of this.registeredAgents) {
            if (!agent.mesh || !agent.mesh.position) {
                continue;
            }

            // Calculate distance from camera
            const distance = BABYLON.Vector3.Distance(
                agent.mesh.position,
                this.camera.position
            );
            agent.distanceFromCamera = distance;
            
            // Update distance category
            const oldCategory = agent.distanceCategory;
            agent.distanceCategory = this.getDistanceCategory(distance);
            agent.updateFrequency = this.config.updateFrequencies[agent.distanceCategory] || 
                                   this.config.updateFrequencies.medium;
            
            // Check visibility (simplified frustum check)
            agent.isVisible = this.isAgentVisible(agent);
            
            // Calculate new priority
            const newPriority = this.calculateAgentPriority(agent);
            
            // Move agent to appropriate queue if priority changed
            if (newPriority !== agent.currentPriority) {
                this.removeFromAllQueues(agentId);
                agent.currentPriority = newPriority;
                this.addToQueue(agent);
            }
        }
    }

    /**
     * Get distance category based on distance from camera
     */
    getDistanceCategory(distance) {
        const thresholds = this.config.distanceThresholds;
        
        if (distance <= thresholds.near) return 'near';
        if (distance <= thresholds.medium) return 'medium';
        if (distance <= thresholds.far) return 'far';
        return 'veryFar';
    }

    /**
     * Check if agent is visible to camera (simplified)
     */
    isAgentVisible(agent) {
        if (!agent.mesh || !agent.mesh.position) {
            return false;
        }

        // Simple distance-based visibility check
        // In a real implementation, this would use frustum culling
        const distance = agent.distanceFromCamera;
        const maxVisibleDistance = this.config.distanceThresholds.far;
        
        return distance <= maxVisibleDistance;
    }

    /**
     * Calculate agent priority based on various factors
     */
    calculateAgentPriority(agent) {
        let priorityScore = agent.customPriority;
        
        // Distance-based priority
        if (agent.distanceCategory === 'near') priorityScore *= 3;
        else if (agent.distanceCategory === 'medium') priorityScore *= 2;
        else if (agent.distanceCategory === 'far') priorityScore *= 1;
        else priorityScore *= 0.5; // veryFar
        
        // Visibility bonus
        if (agent.isVisible) {
            priorityScore *= this.config.priorityBonus.visible;
        }
        
        // Player interaction bonus
        if (agent.isPlayerInteracting) {
            priorityScore *= this.config.priorityBonus.player_interaction;
        }
        
        // Critical behavior bonus
        if (agent.hasCriticalBehavior) {
            priorityScore *= this.config.priorityBonus.critical_behavior;
        }
        
        // Force update override
        if (agent.forceUpdate) {
            return 'high';
        }
        
        // Convert score to priority category
        if (priorityScore >= 4) return 'high';
        if (priorityScore >= 2) return 'medium';
        return 'low';
    }

    /**
     * Calculate maximum updates allowed this frame
     */
    calculateMaxUpdatesThisFrame() {
        // Base capacity
        let maxUpdates = this.config.maxAgentsPerFrame;
        
        // Adjust based on frame rate (if available)
        const engine = this.scene.getEngine();
        if (engine && engine.getFps) {
            const fps = engine.getFps();
            if (fps < 30) {
                maxUpdates = Math.max(1, Math.floor(maxUpdates * 0.5));
            } else if (fps > 50) {
                maxUpdates = Math.floor(maxUpdates * 1.2);
            }
        }
        
        return Math.min(maxUpdates, this.metrics.totalAgents);
    }

    /**
     * Process updates for a specific priority queue
     */
    processQueueUpdates(priority, maxUpdates) {
        const queue = this.updateQueues[priority];
        if (!queue || queue.length === 0 || maxUpdates <= 0) {
            return;
        }

        const updatesToProcess = Math.min(Math.floor(maxUpdates), queue.length);
        const agentsToUpdate = [];
        
        // Select agents that are due for update
        for (let i = 0; i < queue.length && agentsToUpdate.length < updatesToProcess; i++) {
            const agent = queue[i];
            
            if (this.shouldUpdateAgent(agent)) {
                agentsToUpdate.push(agent);
            }
        }
        
        // Process selected agents
        for (const agent of agentsToUpdate) {
            if (this.currentFrameUpdates >= this.config.maxAgentsPerFrame) {
                break;
            }
            
            this.updateAgent(agent);
        }
    }

    /**
     * Check if an agent should be updated this frame
     */
    shouldUpdateAgent(agent) {
        // Force update override
        if (agent.forceUpdate) {
            agent.forceUpdate = false;
            return true;
        }
        
        // Check update frequency
        const framesSinceLastUpdate = this.frameCounter - agent.lastUpdateFrame;
        return framesSinceLastUpdate >= agent.updateFrequency;
    }

    /**
     * Update a specific agent
     */
    updateAgent(agent) {
        if (!agent.updateCallback) {
            return;
        }

        const startTime = performance.now();
        
        try {
            // Call the agent's update function
            const deltaTime = this.scene.getEngine().getDeltaTime() * 0.001;
            agent.updateCallback(deltaTime, {
                distanceFromCamera: agent.distanceFromCamera,
                isVisible: agent.isVisible,
                priority: agent.currentPriority,
                framesSinceLastUpdate: this.frameCounter - agent.lastUpdateFrame
            });
            
            // Update tracking data
            agent.lastUpdateFrame = this.frameCounter;
            agent.updateCount++;
            this.currentFrameUpdates++;
            
            // Performance tracking
            const duration = performance.now() - startTime;
            agent.lastUpdateDuration = duration;
            agent.totalUpdateTime += duration;
            agent.averageUpdateTime = agent.totalUpdateTime / agent.updateCount;
            
        } catch (error) {
            console.error(`Error updating agent ${agent.id}:`, error);
        }
    }

    /**
     * Add agent to appropriate priority queue
     */
    addToQueue(agent) {
        const queue = this.updateQueues[agent.currentPriority];
        if (queue && !queue.includes(agent)) {
            queue.push(agent);
            this.metrics.priorityDistribution[agent.currentPriority]++;
        }
    }

    /**
     * Remove agent from all queues
     */
    removeFromAllQueues(agentId) {
        for (const [priority, queue] of Object.entries(this.updateQueues)) {
            const index = queue.findIndex(agent => agent.id === agentId);
            if (index !== -1) {
                queue.splice(index, 1);
                this.metrics.priorityDistribution[priority]--;
            }
        }
    }

    /**
     * Update performance metrics
     */
    updateMetrics() {
        const now = performance.now();
        const timeSinceLastUpdate = now - this.lastMetricsUpdate;
        
        // Update metrics every second
        if (timeSinceLastUpdate >= 1000) {
            // Calculate updates per second
            const totalUpdates = Array.from(this.registeredAgents.values())
                .reduce((sum, agent) => sum + agent.updateCount, 0);
            this.metrics.updatesPerSecond = totalUpdates / (timeSinceLastUpdate / 1000);
            
            // Calculate average updates per frame
            if (this.frameUpdateCounts.length > 0) {
                this.metrics.averageUpdatesPerFrame = 
                    this.frameUpdateCounts.reduce((a, b) => a + b, 0) / this.frameUpdateCounts.length;
            }
            
            this.lastMetricsUpdate = now;
        }
    }

    /**
     * Force update for a specific agent
     */
    forceAgentUpdate(agentId) {
        const agent = this.registeredAgents.get(agentId);
        if (agent) {
            agent.forceUpdate = true;
            return true;
        }
        return false;
    }

    /**
     * Set agent as player-interacting
     */
    setPlayerInteracting(agentId, isInteracting) {
        const agent = this.registeredAgents.get(agentId);
        if (agent) {
            agent.isPlayerInteracting = isInteracting;
            return true;
        }
        return false;
    }

    /**
     * Set agent critical behavior status
     */
    setCriticalBehavior(agentId, isCritical) {
        const agent = this.registeredAgents.get(agentId);
        if (agent) {
            agent.hasCriticalBehavior = isCritical;
            return true;
        }
        return false;
    }

    /**
     * Update scheduler configuration
     */
    updateConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
        
        // Recalculate update frequencies for all agents
        for (const agent of this.registeredAgents.values()) {
            agent.updateFrequency = this.config.updateFrequencies[agent.distanceCategory] || 
                                   this.config.updateFrequencies.medium;
        }
    }

    /**
     * Enable or disable scheduling
     */
    setSchedulingEnabled(enabled) {
        this.schedulingEnabled = enabled;
    }

    /**
     * Get current scheduler metrics
     */
    getMetrics() {
        return {
            ...this.metrics,
            frameCounter: this.frameCounter,
            schedulingEnabled: this.schedulingEnabled,
            queueSizes: {
                high: this.updateQueues.high.length,
                medium: this.updateQueues.medium.length,
                low: this.updateQueues.low.length
            },
            config: { ...this.config }
        };
    }

    /**
     * Get agent performance data
     */
    getAgentPerformance(agentId) {
        const agent = this.registeredAgents.get(agentId);
        if (!agent) {
            return null;
        }

        return {
            id: agent.id,
            behaviorType: agent.behaviorType,
            currentPriority: agent.currentPriority,
            distanceCategory: agent.distanceCategory,
            distanceFromCamera: Math.round(agent.distanceFromCamera * 100) / 100,
            isVisible: agent.isVisible,
            updateFrequency: agent.updateFrequency,
            updateCount: agent.updateCount,
            averageUpdateTime: Math.round(agent.averageUpdateTime * 100) / 100,
            lastUpdateDuration: Math.round(agent.lastUpdateDuration * 100) / 100,
            framesSinceLastUpdate: this.frameCounter - agent.lastUpdateFrame
        };
    }

    /**
     * Get all agent performance data
     */
    getAllAgentPerformance() {
        const performance = [];
        for (const agentId of this.registeredAgents.keys()) {
            performance.push(this.getAgentPerformance(agentId));
        }
        return performance.sort((a, b) => b.averageUpdateTime - a.averageUpdateTime);
    }

    /**
     * Dispose of the scheduler
     */
    dispose() {
        this.schedulingEnabled = false;
        this.registeredAgents.clear();
        this.updateQueues.high = [];
        this.updateQueues.medium = [];
        this.updateQueues.low = [];
        
        console.log('AgentScheduler disposed');
    }
}