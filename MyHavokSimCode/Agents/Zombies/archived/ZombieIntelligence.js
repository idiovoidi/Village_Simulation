/**
 * Zombie Intelligence Component
 * Handles advanced decision-making, multi-target tracking, and adaptive behavior
 */

import { EnhancedStateMachine, StateDefinitionBuilder } from '../../core/EnhancedStateMachine.js';

export class ZombieIntelligence {
    constructor(zombie, options = {}) {
        this.zombie = zombie;
        this.scene = zombie.scene;

        // Intelligence configuration
        this.config = {
            memoryDuration: options.memoryDuration || 30000, // 30 seconds
            maxMemoryEntries: options.maxMemoryEntries || 10,
            targetSwitchCooldown: options.targetSwitchCooldown || 2000, // 2 seconds
            adaptationRate: options.adaptationRate || 0.1,
            learningEnabled: options.learningEnabled !== false,
            aggressionLevel: options.aggressionLevel || 0.5, // 0-1
            curiosityLevel: options.curiosityLevel || 0.3, // 0-1
            persistenceLevel: options.persistenceLevel || 0.7 // 0-1
        };

        // Memory system
        this.memory = {
            targets: new Map(), // targetId -> memory entry
            locations: new Map(), // location key -> memory entry
            events: [], // Recent events
            patterns: new Map(), // Learned patterns
            successes: 0,
            failures: 0
        };

        // Target tracking system
        this.targetTracker = {
            currentTarget: null,
            targetHistory: [],
            targetPriorities: new Map(),
            lastTargetSwitch: 0,
            trackingConfidence: 0
        };

        // Behavioral adaptation
        this.adaptation = {
            successRate: 0.5,
            preferredStrategies: new Map(),
            avoidedAreas: new Set(),
            learnedBehaviors: new Map()
        };

        // Decision-making state machine
        this.stateMachine = this.createIntelligenceStateMachine();

        // Performance tracking
        this.performance = {
            decisionsPerSecond: 0,
            memoryUsage: 0,
            adaptationScore: 0,
            lastDecisionTime: 0
        };

        // Communication integration
        this.communicationSystem = null;
        this.environmentalAwareness = null;
    }

    /**
     * Initialize the zombie intelligence
     * @param {Object} systems - External systems (communication, environmental)
     */
    initialize(systems = {}) {
        this.communicationSystem = systems.communication;
        this.environmentalAwareness = systems.environmental;

        // Register with communication system if available
        if (this.communicationSystem) {
            this.communicationSystem.registerAgent(this.zombie);
            this.communicationSystem.subscribe(this.zombie, 'target_spotted');
            this.communicationSystem.subscribe(this.zombie, 'target_lost');
            this.communicationSystem.subscribe(this.zombie, 'group_formation');
            this.communicationSystem.subscribe(this.zombie, 'retreat_order');
        }

        // Register with environmental awareness if available
        if (this.environmentalAwareness) {
            this.environmentalAwareness.registerAgent(this.zombie);
        }

        // Initialize state machine
        this.stateMachine.initialize('analyzing');

        console.log(`Zombie Intelligence initialized for ${this.zombie.id || 'unknown'}`);
    }

    /**
     * Update the intelligence system
     * @param {number} deltaTime - Time since last update
     */
    update(deltaTime) {
        const startTime = performance.now();

        // Update state machine
        this.stateMachine.update(deltaTime);

        // Process memory decay
        this.processMemoryDecay(deltaTime);

        // Update target tracking
        this.updateTargetTracking(deltaTime);

        // Process adaptation
        this.processAdaptation(deltaTime);

        // Handle communication messages
        this.processMessages();

        // Update performance metrics
        this.updatePerformanceMetrics(startTime);
    }

    /**
     * Create the intelligence state machine
     * @returns {EnhancedStateMachine} - Configured state machine
     */
    createIntelligenceStateMachine() {
        const stateDefinitions = {
            // Analyzing state - gathering information and making decisions
            analyzing: new StateDefinitionBuilder('analyzing')
                .onEnter((zombie, context) => {
                    context.analysisStartTime = performance.now();
                    context.targetsAnalyzed = 0;
                })
                .onUpdate((zombie, context, globalContext) => {
                    this.performAnalysis(context, globalContext);
                })
                .autoTransition(
                    (zombie, context) => context.bestTarget !== null,
                    'targeting'
                )
                .autoTransition(
                    (zombie, context) => context.timeInState > 2.0 && !context.bestTarget,
                    'exploring'
                )
                .build().analyzing,

            // Targeting state - actively pursuing a target
            targeting: new StateDefinitionBuilder('targeting')
                .onEnter((zombie, context) => {
                    if (context.bestTarget) {
                        this.setTarget(context.bestTarget);
                        this.broadcastTargetAcquisition(context.bestTarget);
                    }
                })
                .onUpdate((zombie, context, globalContext) => {
                    this.updateTargetPursuit(context, globalContext);
                })
                .autoTransition(
                    (zombie, context) => !this.isTargetValid(context.currentTarget),
                    'analyzing'
                )
                .autoTransition(
                    (zombie, context) => context.targetLost === true,
                    'searching'
                )
                .build().targeting,

            // Searching state - looking for lost targets
            searching: new StateDefinitionBuilder('searching')
                .onEnter((zombie, context) => {
                    context.searchStartTime = performance.now();
                    context.searchLocations = this.generateSearchLocations();
                    context.currentSearchIndex = 0;
                })
                .onUpdate((zombie, context, globalContext) => {
                    this.performSearch(context, globalContext);
                })
                .autoTransition(
                    (zombie, context) => context.targetFound === true,
                    'targeting'
                )
                .autoTransition(
                    (zombie, context) => context.timeInState > 10.0,
                    'exploring'
                )
                .build().searching,

            // Exploring state - wandering and investigating
            exploring: new StateDefinitionBuilder('exploring')
                .onEnter((zombie, context) => {
                    context.explorationTarget = this.selectExplorationTarget();
                })
                .onUpdate((zombie, context, globalContext) => {
                    this.performExploration(context, globalContext);
                })
                .autoTransition(
                    (zombie, context) => context.interestingTarget !== null,
                    'analyzing'
                )
                .build().exploring,

            // Coordinating state - working with other zombies
            coordinating: new StateDefinitionBuilder('coordinating')
                .onEnter((zombie, context) => {
                    context.coordinationRole = this.determineCoordinationRole();
                })
                .onUpdate((zombie, context, globalContext) => {
                    this.performCoordination(context, globalContext);
                })
                .autoTransition(
                    (zombie, context) => context.coordinationComplete === true,
                    'analyzing'
                )
                .build().coordinating
        };

        return new EnhancedStateMachine(this.zombie, stateDefinitions);
    }

    /**
     * Perform analysis to find and prioritize targets
     * @param {Object} context - State context
     * @param {Object} globalContext - Global context
     */
    performAnalysis(context, globalContext) {
        const potentialTargets = this.findPotentialTargets();
        const prioritizedTargets = this.prioritizeTargets(potentialTargets);

        context.targetsAnalyzed = potentialTargets.length;
        context.bestTarget = prioritizedTargets.length > 0 ? prioritizedTargets[0] : null;

        // Learn from analysis
        if (this.config.learningEnabled) {
            this.learnFromAnalysis(potentialTargets, prioritizedTargets);
        }
    }

    /**
     * Update target pursuit behavior
     * @param {Object} context - State context
     * @param {Object} globalContext - Global context
     */
    updateTargetPursuit(context, globalContext) {
        const target = context.currentTarget || this.targetTracker.currentTarget;

        if (!target) {
            context.targetLost = true;
            return;
        }

        // Update target memory
        this.updateTargetMemory(target);

        // Check if target is still valid and reachable
        if (!this.isTargetValid(target)) {
            context.targetLost = true;
            this.recordFailure('target_invalid');
            return;
        }

        // Calculate pursuit strategy
        const strategy = this.calculatePursuitStrategy(target);
        context.pursuitStrategy = strategy;

        // Update zombie's movement and behavior based on strategy
        this.applyPursuitStrategy(strategy);

        // Check for success conditions
        if (this.isTargetReached(target)) {
            this.recordSuccess('target_reached');
            context.targetReached = true;
        }
    }

    /**
     * Perform search for lost targets
     * @param {Object} context - State context
     * @param {Object} globalContext - Global context
     */
    performSearch(context, globalContext) {
        if (!context.searchLocations || context.currentSearchIndex >= context.searchLocations.length) {
            return;
        }

        const searchLocation = context.searchLocations[context.currentSearchIndex];

        // Move towards search location
        this.moveToLocation(searchLocation);

        // Check if we've reached the search location
        if (this.isLocationReached(searchLocation)) {
            // Look for targets at this location
            const foundTargets = this.scanForTargets(searchLocation);

            if (foundTargets.length > 0) {
                context.targetFound = true;
                context.bestTarget = foundTargets[0];
                this.recordSuccess('target_found_during_search');
            } else {
                // Move to next search location
                context.currentSearchIndex++;
            }
        }
    }

    /**
     * Perform exploration behavior
     * @param {Object} context - State context
     * @param {Object} globalContext - Global context
     */
    performExploration(context, globalContext) {
        if (!context.explorationTarget) {
            context.explorationTarget = this.selectExplorationTarget();
        }

        // Move towards exploration target
        this.moveToLocation(context.explorationTarget);

        // Scan for interesting things while exploring
        const interestingTargets = this.scanForTargets(this.zombie.mesh.position, 30);

        if (interestingTargets.length > 0) {
            context.interestingTarget = interestingTargets[0];
        }

        // Check if exploration target is reached
        if (this.isLocationReached(context.explorationTarget)) {
            context.explorationTarget = this.selectExplorationTarget();
        }
    }

    /**
     * Perform coordination with other zombies
     * @param {Object} context - State context
     * @param {Object} globalContext - Global context
     */
    performCoordination(context, globalContext) {
        const role = context.coordinationRole;

        switch (role) {
            case 'leader':
                this.performLeadershipBehavior(context);
                break;
            case 'follower':
                this.performFollowerBehavior(context);
                break;
            case 'scout':
                this.performScoutBehavior(context);
                break;
            case 'flanker':
                this.performFlankingBehavior(context);
                break;
        }

        // Check if coordination is complete
        if (this.isCoordinationComplete(context)) {
            context.coordinationComplete = true;
        }
    }

    /**
     * Find potential targets in the environment
     * @returns {Array} - Array of potential targets
     */
    findPotentialTargets() {
        const targets = [];

        // Use environmental awareness if available
        if (this.environmentalAwareness) {
            const nearbyAgents = this.environmentalAwareness.getAgentsInRange(
                this.zombie.mesh.position,
                this.zombie.detectionRange || 40,
                { excludeAgent: this.zombie }
            );

            // Filter for valid targets (e.g., villagers, players)
            for (const agent of nearbyAgents) {
                if (this.isValidTarget(agent)) {
                    targets.push(agent);
                }
            }
        }

        // Check memory for known targets
        for (const [targetId, memoryEntry] of this.memory.targets) {
            if (this.isMemoryEntryValid(memoryEntry) && !targets.find(t => t.id === targetId)) {
                targets.push(memoryEntry.target);
            }
        }

        return targets;
    }

    /**
     * Prioritize targets based on various factors
     * @param {Array} targets - Array of potential targets
     * @returns {Array} - Sorted array of prioritized targets
     */
    prioritizeTargets(targets) {
        const prioritizedTargets = targets.map(target => {
            const priority = this.calculateTargetPriority(target);
            return { target, priority };
        });

        // Sort by priority (highest first)
        prioritizedTargets.sort((a, b) => b.priority - a.priority);

        return prioritizedTargets.map(item => item.target);
    }

    /**
     * Calculate priority score for a target
     * @param {Object} target - Target to evaluate
     * @returns {number} - Priority score (0-1)
     */
    calculateTargetPriority(target) {
        let priority = 0;

        // Distance factor (closer = higher priority)
        const distance = BABYLON.Vector3.Distance(this.zombie.mesh.position, target.mesh.position);
        const distanceFactor = Math.max(0, 1 - distance / 50);
        priority += distanceFactor * 0.3;

        // Health factor (weaker targets = higher priority)
        if (target.health !== undefined) {
            const healthFactor = 1 - (target.health / 100);
            priority += healthFactor * 0.2;
        }

        // Threat level (higher threat = higher priority for aggressive zombies)
        if (target.threatLevel !== undefined) {
            const threatFactor = target.threatLevel * this.config.aggressionLevel;
            priority += threatFactor * 0.2;
        }

        // Memory factor (known targets = higher priority)
        const memoryEntry = this.memory.targets.get(target.id);
        if (memoryEntry) {
            const memoryFactor = memoryEntry.encounters / 10; // More encounters = higher priority
            priority += Math.min(memoryFactor, 0.2);
        }

        // Line of sight factor
        if (this.environmentalAwareness) {
            const losResult = this.environmentalAwareness.checkLineOfSight(
                this.zombie.mesh.position,
                target.mesh.position
            );
            if (losResult.hasLineOfSight) {
                priority += 0.1;
            }
        }

        return Math.min(1.0, priority);
    }

    /**
     * Set the current target
     * @param {Object} target - Target to pursue
     */
    setTarget(target) {
        const now = performance.now();

        // Check cooldown
        if (now - this.targetTracker.lastTargetSwitch < this.config.targetSwitchCooldown) {
            return false;
        }

        // Update target tracker
        if (this.targetTracker.currentTarget !== target) {
            this.targetTracker.targetHistory.push({
                target: this.targetTracker.currentTarget,
                timestamp: now,
                reason: 'switched'
            });

            this.targetTracker.currentTarget = target;
            this.targetTracker.lastTargetSwitch = now;
            this.targetTracker.trackingConfidence = 1.0;
        }

        // Update memory
        this.addToTargetMemory(target);

        return true;
    }

    /**
     * Check if a target is valid
     * @param {Object} target - Target to check
     * @returns {boolean} - Whether target is valid
     */
    isValidTarget(target) {
        if (!target || !target.mesh || !target.mesh.position) {
            return false;
        }

        // Check if target is alive/active
        if (target.health !== undefined && target.health <= 0) {
            return false;
        }

        // Check if target is the zombie itself
        if (target === this.zombie) {
            return false;
        }

        // Check target type (e.g., only target villagers, not other zombies)
        if (target.agentType === 'zombie') {
            return false;
        }

        return true;
    }

    /**
     * Add target to memory
     * @param {Object} target - Target to remember
     */
    addToTargetMemory(target) {
        const now = performance.now();
        const targetId = target.id || target.environmentalId || `target_${now}`;

        let memoryEntry = this.memory.targets.get(targetId);

        if (!memoryEntry) {
            memoryEntry = {
                target,
                firstSeen: now,
                lastSeen: now,
                encounters: 1,
                lastKnownPosition: target.mesh.position.clone(),
                behavior: 'unknown',
                threatLevel: target.threatLevel || 0,
                successfulPursuits: 0,
                failedPursuits: 0
            };
        } else {
            memoryEntry.lastSeen = now;
            memoryEntry.encounters++;
            memoryEntry.lastKnownPosition = target.mesh.position.clone();
        }

        this.memory.targets.set(targetId, memoryEntry);

        // Limit memory size
        if (this.memory.targets.size > this.config.maxMemoryEntries) {
            this.cleanupOldMemories();
        }
    }

    /**
     * Update target memory during pursuit
     * @param {Object} target - Target being pursued
     */
    updateTargetMemory(target) {
        const targetId = target.id || target.environmentalId;
        const memoryEntry = this.memory.targets.get(targetId);

        if (memoryEntry) {
            memoryEntry.lastSeen = performance.now();
            memoryEntry.lastKnownPosition = target.mesh.position.clone();

            // Learn about target behavior
            this.learnTargetBehavior(target, memoryEntry);
        }
    }

    /**
     * Learn about target behavior patterns
     * @param {Object} target - Target to learn about
     * @param {Object} memoryEntry - Memory entry for the target
     */
    learnTargetBehavior(target, memoryEntry) {
        if (!this.config.learningEnabled) return;

        // Analyze movement patterns
        const currentPos = target.mesh.position;
        const lastPos = memoryEntry.lastKnownPosition;

        if (lastPos) {
            const movement = currentPos.subtract(lastPos);
            const speed = movement.length();

            // Update behavior classification
            if (speed > 0.1) {
                memoryEntry.behavior = 'mobile';
            } else {
                memoryEntry.behavior = 'stationary';
            }

            // Store movement pattern
            if (!memoryEntry.movementPattern) {
                memoryEntry.movementPattern = [];
            }

            memoryEntry.movementPattern.push({
                direction: movement.normalize(),
                speed,
                timestamp: performance.now()
            });

            // Limit pattern history
            if (memoryEntry.movementPattern.length > 10) {
                memoryEntry.movementPattern.shift();
            }
        }
    }

    /**
     * Calculate pursuit strategy for a target
     * @param {Object} target - Target to pursue
     * @returns {Object} - Pursuit strategy
     */
    calculatePursuitStrategy(target) {
        const strategy = {
            approach: 'direct',
            speed: 'normal',
            coordination: false,
            predictive: false
        };

        const memoryEntry = this.memory.targets.get(target.id || target.environmentalId);

        // Use learned behavior to inform strategy
        if (memoryEntry && memoryEntry.behavior === 'mobile') {
            strategy.predictive = true;
            strategy.approach = 'intercept';
        }

        // Consider environmental factors
        if (this.environmentalAwareness) {
            const threatAssessment = this.environmentalAwareness.assessThreat(target.mesh.position);

            if (threatAssessment.recommendedAction === 'caution') {
                strategy.approach = 'cautious';
                strategy.speed = 'slow';
            }
        }

        // Consider group coordination
        if (this.communicationSystem) {
            const nearbyZombies = this.findNearbyZombies();
            if (nearbyZombies.length > 0) {
                strategy.coordination = true;
                strategy.approach = 'coordinated';
            }
        }

        return strategy;
    }

    /**
     * Apply pursuit strategy to zombie behavior
     * @param {Object} strategy - Pursuit strategy to apply
     */
    applyPursuitStrategy(strategy) {
        // This would integrate with the zombie's movement and behavior systems
        // For now, we'll store the strategy for the zombie's main behavior to use
        this.zombie.currentStrategy = strategy;

        // Send coordination messages if needed
        if (strategy.coordination && this.communicationSystem) {
            this.communicationSystem.sendMessage(
                this.zombie,
                'attack_coordinate',
                {
                    target: this.targetTracker.currentTarget,
                    strategy: strategy.approach,
                    position: this.zombie.mesh.position
                }
            );
        }
    }

    /**
     * Process memory decay over time
     * @param {number} deltaTime - Time since last update
     */
    processMemoryDecay(deltaTime) {
        const now = performance.now();
        const expiredEntries = [];

        // Check target memories
        for (const [targetId, memoryEntry] of this.memory.targets) {
            if (now - memoryEntry.lastSeen > this.config.memoryDuration) {
                expiredEntries.push(targetId);
            }
        }

        // Remove expired memories
        for (const targetId of expiredEntries) {
            this.memory.targets.delete(targetId);
        }

        // Decay event memories
        this.memory.events = this.memory.events.filter(
            event => now - event.timestamp < this.config.memoryDuration
        );
    }

    /**
     * Update target tracking
     * @param {number} deltaTime - Time since last update
     */
    updateTargetTracking(deltaTime) {
        if (!this.targetTracker.currentTarget) return;

        // Decay tracking confidence over time
        this.targetTracker.trackingConfidence = Math.max(
            0,
            this.targetTracker.trackingConfidence - deltaTime * 0.1
        );

        // Check if target is still valid
        if (!this.isTargetValid(this.targetTracker.currentTarget)) {
            this.loseTarget('target_invalid');
        }

        // Check if target is out of range
        const distance = BABYLON.Vector3.Distance(
            this.zombie.mesh.position,
            this.targetTracker.currentTarget.mesh.position
        );

        if (distance > (this.zombie.detectionRange || 40) * 1.5) {
            this.loseTarget('out_of_range');
        }
    }

    /**
     * Lose current target
     * @param {string} reason - Reason for losing target
     */
    loseTarget(reason) {
        if (this.targetTracker.currentTarget) {
            this.targetTracker.targetHistory.push({
                target: this.targetTracker.currentTarget,
                timestamp: performance.now(),
                reason
            });

            // Broadcast target loss
            if (this.communicationSystem) {
                this.communicationSystem.sendMessage(
                    this.zombie,
                    'target_lost',
                    {
                        target: this.targetTracker.currentTarget,
                        reason,
                        lastKnownPosition: this.targetTracker.currentTarget.mesh.position
                    }
                );
            }

            this.targetTracker.currentTarget = null;
            this.targetTracker.trackingConfidence = 0;
        }
    }

    /**
     * Record a successful action for learning
     * @param {string} action - Action that succeeded
     */
    recordSuccess(action) {
        this.memory.successes++;
        this.memory.events.push({
            type: 'success',
            action,
            timestamp: performance.now(),
            context: this.getCurrentContext()
        });

        // Update adaptation
        this.adaptation.successRate = this.memory.successes / (this.memory.successes + this.memory.failures);

        // Learn from success
        if (this.config.learningEnabled) {
            this.learnFromSuccess(action);
        }
    }

    /**
     * Record a failed action for learning
     * @param {string} action - Action that failed
     */
    recordFailure(action) {
        this.memory.failures++;
        this.memory.events.push({
            type: 'failure',
            action,
            timestamp: performance.now(),
            context: this.getCurrentContext()
        });

        // Update adaptation
        this.adaptation.successRate = this.memory.successes / (this.memory.successes + this.memory.failures);

        // Learn from failure
        if (this.config.learningEnabled) {
            this.learnFromFailure(action);
        }
    }

    /**
     * Get current context for learning
     * @returns {Object} - Current context
     */
    getCurrentContext() {
        return {
            position: this.zombie.mesh.position.clone(),
            state: this.stateMachine.currentState,
            target: this.targetTracker.currentTarget,
            nearbyAgents: this.findNearbyAgents().length,
            environmentalFactors: this.environmentalAwareness
                ? this.environmentalAwareness.environmentalFactors : {}
        };
    }

    /**
     * Process adaptation based on performance
     * @param {number} deltaTime - Time since last update
     */
    processAdaptation(deltaTime) {
        if (!this.config.learningEnabled) return;

        // Adapt aggression based on success rate
        if (this.adaptation.successRate > 0.7) {
            this.config.aggressionLevel = Math.min(1.0, this.config.aggressionLevel + this.config.adaptationRate * deltaTime);
        } else if (this.adaptation.successRate < 0.3) {
            this.config.aggressionLevel = Math.max(0.1, this.config.aggressionLevel - this.config.adaptationRate * deltaTime);
        }

        // Adapt persistence based on recent failures
        const recentFailures = this.memory.events.filter(
            event => event.type === 'failure'
            && performance.now() - event.timestamp < 10000
        ).length;

        if (recentFailures > 3) {
            this.config.persistenceLevel = Math.max(0.1, this.config.persistenceLevel - 0.1);
        } else {
            this.config.persistenceLevel = Math.min(1.0, this.config.persistenceLevel + 0.05);
        }
    }

    /**
     * Find nearby zombie agents
     * @returns {Array} - Array of nearby zombies
     */
    findNearbyZombies() {
        if (!this.environmentalAwareness) return [];

        return this.environmentalAwareness.getAgentsInRange(
            this.zombie.mesh.position,
            30,
            { agentType: 'zombie', excludeAgent: this.zombie }
        );
    }

    /**
     * Find nearby agents of any type
     * @returns {Array} - Array of nearby agents
     */
    findNearbyAgents() {
        if (!this.environmentalAwareness) return [];

        return this.environmentalAwareness.getAgentsInRange(
            this.zombie.mesh.position,
            40,
            { excludeAgent: this.zombie }
        );
    }

    /**
     * Update performance metrics
     * @param {number} startTime - Start time of update
     */
    updatePerformanceMetrics(startTime) {
        const endTime = performance.now();
        const executionTime = endTime - startTime;

        this.performance.lastDecisionTime = executionTime;
        this.performance.memoryUsage = this.memory.targets.size + this.memory.events.length;
        this.performance.adaptationScore = this.adaptation.successRate;

        // Calculate decisions per second (smoothed)
        const timeSinceLastDecision = (endTime - this.performance.lastUpdateTime) / 1000;
        if (timeSinceLastDecision > 0) {
            const currentDPS = 1 / timeSinceLastDecision;
            this.performance.decisionsPerSecond
                = (this.performance.decisionsPerSecond * 0.9) + (currentDPS * 0.1);
        }

        this.performance.lastUpdateTime = endTime;
    }

    /**
     * Get intelligence statistics
     * @returns {Object} - Statistics object
     */
    getStatistics() {
        return {
            memoryEntries: this.memory.targets.size,
            successRate: this.adaptation.successRate,
            aggressionLevel: this.config.aggressionLevel,
            persistenceLevel: this.config.persistenceLevel,
            currentState: this.stateMachine.currentState,
            currentTarget: this.targetTracker.currentTarget ? this.targetTracker.currentTarget.id : null,
            trackingConfidence: this.targetTracker.trackingConfidence,
            performance: { ...this.performance }
        };
    }

    /**
     * Dispose of the intelligence system
     */
    dispose() {
        if (this.stateMachine) {
            this.stateMachine.dispose();
        }

        if (this.communicationSystem) {
            this.communicationSystem.unregisterAgent(this.zombie);
        }

        if (this.environmentalAwareness) {
            this.environmentalAwareness.unregisterAgent(this.zombie);
        }

        this.memory.targets.clear();
        this.memory.events = [];
        this.memory.patterns.clear();

        this.targetTracker.currentTarget = null;
        this.targetTracker.targetHistory = [];
        this.targetTracker.targetPriorities.clear();
    }

    // Helper methods for state machine actions

    generateSearchLocations() {
        const locations = [];
        const lastKnownPos = this.targetTracker.currentTarget
            ? this.targetTracker.currentTarget.mesh.position
            : this.zombie.mesh.position;

        // Generate search pattern around last known position
        for (let i = 0; i < 4; i++) {
            const angle = (i / 4) * Math.PI * 2;
            const radius = 15 + Math.random() * 10;
            const searchPos = new BABYLON.Vector3(
                lastKnownPos.x + Math.cos(angle) * radius,
                lastKnownPos.y,
                lastKnownPos.z + Math.sin(angle) * radius
            );
            locations.push(searchPos);
        }

        return locations;
    }

    selectExplorationTarget() {
        // Select a random exploration target
        const angle = Math.random() * Math.PI * 2;
        const radius = 20 + Math.random() * 30;

        return new BABYLON.Vector3(
            this.zombie.mesh.position.x + Math.cos(angle) * radius,
            this.zombie.mesh.position.y,
            this.zombie.mesh.position.z + Math.sin(angle) * radius
        );
    }

    determineCoordinationRole() {
        const nearbyZombies = this.findNearbyZombies();

        if (nearbyZombies.length === 0) {
            return 'leader';
        }

        // Simple role assignment based on position and characteristics
        const roles = ['leader', 'follower', 'scout', 'flanker'];
        return roles[Math.floor(Math.random() * roles.length)];
    }

    // Placeholder methods for various behaviors
    performLeadershipBehavior(context) { /* Implementation */ }
    performFollowerBehavior(context) { /* Implementation */ }
    performScoutBehavior(context) { /* Implementation */ }
    performFlankingBehavior(context) { /* Implementation */ }

    isCoordinationComplete(context) { return true; }
    isTargetReached(target) { return false; }
    isLocationReached(location) { return false; }
    moveToLocation(location) { /* Implementation */ }
    scanForTargets(position, range = 20) { return []; }

    broadcastTargetAcquisition(target) {
        if (this.communicationSystem) {
            this.communicationSystem.sendMessage(
                this.zombie,
                'target_acquired',
                { target, position: target.mesh.position }
            );
        }
    }

    processMessages() {
        if (!this.zombie.receivedMessages) return;

        for (const message of this.zombie.receivedMessages) {
            this.handleMessage(message);
        }

        this.zombie.receivedMessages = [];
    }

    handleMessage(message) {
        switch (message.type) {
            case 'target_spotted':
                this.handleTargetSpottedMessage(message);
                break;
            case 'target_lost':
                this.handleTargetLostMessage(message);
                break;
            case 'group_formation':
                this.handleGroupFormationMessage(message);
                break;
            case 'retreat_order':
                this.handleRetreatOrderMessage(message);
                break;
        }
    }

    handleTargetSpottedMessage(message) {
        if (message.content.target && this.isValidTarget(message.content.target)) {
            this.addToTargetMemory(message.content.target);
        }
    }

    handleTargetLostMessage(message) {
        // Update memory with last known position
        if (message.content.target && message.content.lastKnownPosition) {
            const memoryEntry = this.memory.targets.get(message.content.target.id);
            if (memoryEntry) {
                memoryEntry.lastKnownPosition = message.content.lastKnownPosition;
            }
        }
    }

    handleGroupFormationMessage(message) {
        // Respond to group formation requests
        this.stateMachine.transitionTo('coordinating');
    }

    handleRetreatOrderMessage(message) {
        // Handle retreat orders from group leaders
        this.loseTarget('retreat_ordered');
        this.stateMachine.transitionTo('exploring');
    }

    learnFromAnalysis(potentialTargets, prioritizedTargets) { /* Implementation */ }
    learnFromSuccess(action) { /* Implementation */ }
    learnFromFailure(action) { /* Implementation */ }
    cleanupOldMemories() { /* Implementation */ }
    isMemoryEntryValid(memoryEntry) { return true; }
}
