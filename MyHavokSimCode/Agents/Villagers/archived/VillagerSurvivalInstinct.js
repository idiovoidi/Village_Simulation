/**
 * Villager Survival Instinct Component
 * Handles threat detection, escape behaviors, and defensive coordination
 */

export class VillagerSurvivalInstinct {
    constructor(villager, options = {}) {
        this.villager = villager;
        this.scene = villager.scene;
        
        // Configuration
        this.config = {
            threatDetectionRange: options.threatDetectionRange || 25,
            panicThreshold: options.panicThreshold || 0.7,
            escapeSpeed: options.escapeSpeed || 0.08,
            groupWarningRange: options.groupWarningRange || 15,
            memoryDuration: options.memoryDuration || 20000, // 20 seconds
            courageLevel: options.courageLevel || 0.3, // 0-1, affects panic threshold
            staminaMax: options.staminaMax || 100,
            staminaRegenRate: options.staminaRegenRate || 5, // per second
            staminaDrainRate: options.staminaDrainRate || 15, // per second when fleeing
            hideTimeout: options.hideTimeout || 10000, // 10 seconds
            groupCohesion: options.groupCohesion || 0.6
        };
        
        // Survival state
        this.survivalState = {
            currentThreat: null,
            threatLevel: 0,
            panicLevel: 0,
            stamina: this.config.staminaMax,
            isHiding: false,
            hideStartTime: 0,
            lastThreatTime: 0,
            escapeRoute: null,
            safeZone: null
        };
        
        // Threat memory system
        this.threatMemory = {
            knownThreats: new Map(), // threatId -> threat info
            dangerousAreas: new Set(), // positions to avoid
            safePaths: new Map(), // cached safe escape routes
            lastUpdate: 0
        };
        
        // Group coordination
        this.groupCoordination = {
            nearbyVillagers: [],
            isGroupLeader: false,
            followTarget: null,
            groupFormationPosition: null,
            lastGroupUpdate: 0
        };
        
        // External systems
        this.communicationSystem = null;
        this.environmentalAwareness = null;
        this.pathfinding = null;
        
        // Performance optimization
        this.lastThreatScan = 0;
        this.threatScanInterval = 200; // ms
        
        // Statistics
        this.stats = {
            threatsDetected: 0,
            escapeAttempts: 0,
            successfulEscapes: 0,
            timeInDanger: 0,
            warningsIssued: 0,
            groupRescues: 0
        };
    }    
 
   /**
     * Initialize the survival instinct system
     * @param {Object} systems - External systems
     */
    initialize(systems = {}) {
        this.communicationSystem = systems.communication;
        this.environmentalAwareness = systems.environmental;
        this.pathfinding = systems.pathfinding;
        
        // Register with communication system
        if (this.communicationSystem) {
            this.communicationSystem.registerAgent(this.villager);
            this.communicationSystem.subscribe(this.villager, 'danger_warning');
            this.communicationSystem.subscribe(this.villager, 'all_clear');
            this.communicationSystem.subscribe(this.villager, 'group_formation');
            this.communicationSystem.subscribe(this.villager, 'help_needed');
        }
        
        // Register with environmental awareness
        if (this.environmentalAwareness) {
            this.environmentalAwareness.registerAgent(this.villager);
        }
        
        console.log(`Villager Survival Instinct initialized for ${this.villager.id || 'unknown'}`);
    }
    
    /**
     * Update the survival instinct system
     * @param {number} deltaTime - Time since last update
     */
    update(deltaTime) {
        // Update stamina
        this.updateStamina(deltaTime);
        
        // Scan for threats
        this.scanForThreats(deltaTime);
        
        // Update threat assessment
        this.updateThreatAssessment(deltaTime);
        
        // Update group coordination
        this.updateGroupCoordination(deltaTime);
        
        // Process survival behavior
        this.processSurvivalBehavior(deltaTime);
        
        // Update memory
        this.updateThreatMemory(deltaTime);
        
        // Handle hiding behavior
        this.updateHidingBehavior(deltaTime);
    }
    
    /**
     * Update stamina system
     * @param {number} deltaTime - Time since last update
     */
    updateStamina(deltaTime) {
        if (this.villager.state === 'fleeing') {
            // Drain stamina when fleeing
            this.survivalState.stamina = Math.max(0, 
                this.survivalState.stamina - this.config.staminaDrainRate * deltaTime
            );
        } else if (!this.survivalState.isHiding) {
            // Regenerate stamina when safe
            this.survivalState.stamina = Math.min(this.config.staminaMax,
                this.survivalState.stamina + this.config.staminaRegenRate * deltaTime
            );
        }
    }
    
    /**
     * Scan for threats in the environment
     * @param {number} deltaTime - Time since last update
     */
    scanForThreats(deltaTime) {
        const now = performance.now();
        
        // Throttle threat scanning for performance
        if (now - this.lastThreatScan < this.threatScanInterval) {
            return;
        }
        
        this.lastThreatScan = now;
        
        let highestThreat = null;
        let highestThreatLevel = 0;
        
        // Use environmental awareness if available
        if (this.environmentalAwareness) {
            const nearbyAgents = this.environmentalAwareness.getAgentsInRange(
                this.villager.mesh.position,
                this.config.threatDetectionRange,
                { excludeAgent: this.villager }
            );
            
            for (const agent of nearbyAgents) {
                const threatLevel = this.assessAgentThreat(agent);
                
                if (threatLevel > highestThreatLevel) {
                    highestThreat = agent;
                    highestThreatLevel = threatLevel;
                }
            }
        } else {
            // Fallback: scan manually (less efficient)
            highestThreat = this.scanForThreatsManual();
            highestThreatLevel = highestThreat ? this.assessAgentThreat(highestThreat) : 0;
        }
        
        // Update current threat
        if (highestThreat && highestThreatLevel > 0.1) {
            this.setCurrentThreat(highestThreat, highestThreatLevel);
        } else if (this.survivalState.currentThreat) {
            // Check if current threat is still valid
            const currentThreatLevel = this.assessAgentThreat(this.survivalState.currentThreat);
            if (currentThreatLevel < 0.1) {
                this.clearCurrentThreat();
            }
        }
    }
    
    /**
     * Assess threat level of an agent
     * @param {Object} agent - Agent to assess
     * @returns {number} - Threat level (0-1)
     */
    assessAgentThreat(agent) {
        if (!agent || !agent.mesh) return 0;
        
        // Check agent type
        let baseThreat = 0;
        if (agent.agentType === 'zombie') {
            baseThreat = 0.8;
        } else if (agent.agentType === 'villager') {
            return 0; // Villagers are not threats to each other
        } else {
            baseThreat = 0.1; // Unknown agents are slightly threatening
        }
        
        // Distance factor (closer = more threatening)
        const distance = BABYLON.Vector3.Distance(this.villager.mesh.position, agent.mesh.position);
        const distanceFactor = Math.max(0, 1 - distance / this.config.threatDetectionRange);
        
        // Line of sight factor
        let losFactor = 1.0;
        if (this.environmentalAwareness) {
            const losResult = this.environmentalAwareness.checkLineOfSight(
                this.villager.mesh.position,
                agent.mesh.position
            );
            losFactor = losResult.hasLineOfSight ? 1.0 : 0.3;
        }
        
        // Agent state factor (pursuing agents are more threatening)
        let stateFactor = 1.0;
        if (agent.state === 'pursuing' || agent.state === 'attacking') {
            stateFactor = 1.5;
        } else if (agent.state === 'idle') {
            stateFactor = 0.7;
        }
        
        // Agent group factor (groups are more threatening)
        let groupFactor = 1.0;
        if (agent.currentGroup && agent.currentGroup.members.size > 1) {
            groupFactor = 1.0 + (agent.currentGroup.members.size - 1) * 0.2;
        }
        
        return Math.min(1.0, baseThreat * distanceFactor * losFactor * stateFactor * groupFactor);
    }
    
    /**
     * Manual threat scanning fallback
     * @returns {Object|null} - Most threatening agent or null
     */
    scanForThreatsManual() {
        // This would need access to all agents in the scene
        // For now, return null as a placeholder
        return null;
    }
    
    /**
     * Set current threat
     * @param {Object} threat - Threat agent
     * @param {number} threatLevel - Threat level
     */
    setCurrentThreat(threat, threatLevel) {
        const wasNewThreat = this.survivalState.currentThreat !== threat;
        
        this.survivalState.currentThreat = threat;
        this.survivalState.threatLevel = threatLevel;
        this.survivalState.lastThreatTime = performance.now();
        
        if (wasNewThreat) {
            this.stats.threatsDetected++;
            
            // Add to threat memory
            this.addToThreatMemory(threat);
            
            // Issue warning to nearby villagers
            this.issueWarning(threat, threatLevel);
            
            // Trigger fear response
            this.triggerFearResponse(threatLevel);
        }
    }
    
    /**
     * Clear current threat
     */
    clearCurrentThreat() {
        this.survivalState.currentThreat = null;
        this.survivalState.threatLevel = 0;
        this.survivalState.panicLevel = Math.max(0, this.survivalState.panicLevel - 0.1);
        
        // Broadcast all clear if appropriate
        if (this.communicationSystem && this.survivalState.panicLevel < 0.3) {
            this.communicationSystem.sendMessage(
                this.villager,
                'all_clear',
                { position: this.villager.mesh.position }
            );
        }
    }
    
    /**
     * Add threat to memory
     * @param {Object} threat - Threat to remember
     */
    addToThreatMemory(threat) {
        const threatId = threat.id || threat.environmentalId || `threat_${Date.now()}`;
        
        this.threatMemory.knownThreats.set(threatId, {
            agent: threat,
            firstSeen: performance.now(),
            lastSeen: performance.now(),
            encounters: 1,
            maxThreatLevel: this.survivalState.threatLevel,
            lastKnownPosition: threat.mesh.position.clone(),
            behaviorPattern: 'unknown'
        });
        
        // Mark area as dangerous
        this.threatMemory.dangerousAreas.add(this.getAreaKey(threat.mesh.position));
    }
    
    /**
     * Issue warning to nearby villagers
     * @param {Object} threat - Threat to warn about
     * @param {number} threatLevel - Threat level
     */
    issueWarning(threat, threatLevel) {
        if (!this.communicationSystem) return;
        
        this.communicationSystem.sendMessage(
            this.villager,
            'danger_warning',
            {
                threat: threat,
                threatLevel: threatLevel,
                position: threat.mesh.position,
                warningPosition: this.villager.mesh.position
            },
            { range: this.config.groupWarningRange }
        );
        
        this.stats.warningsIssued++;
    }
    
    /**
     * Trigger fear response based on threat level
     * @param {number} threatLevel - Current threat level
     */
    triggerFearResponse(threatLevel) {
        // Calculate panic level based on threat and courage
        const panicIncrease = (threatLevel - this.config.courageLevel) * 0.5;
        this.survivalState.panicLevel = Math.min(1.0, 
            this.survivalState.panicLevel + Math.max(0, panicIncrease)
        );
        
        // Trigger appropriate response
        if (this.survivalState.panicLevel > this.config.panicThreshold) {
            this.initiateEscape();
        } else if (this.survivalState.panicLevel > 0.4) {
            this.initiateAlert();
        }
    }
    
    /**
     * Initiate escape behavior
     */
    initiateEscape() {
        if (this.villager.state === 'fleeing') return; // Already fleeing
        
        this.villager.changeState('fleeing');
        this.stats.escapeAttempts++;
        
        // Calculate escape route
        this.calculateEscapeRoute();
        
        // Request help from nearby villagers
        this.requestHelp();
        
        console.log(`Villager ${this.villager.id} initiating escape from threat`);
    }
    
    /**
     * Initiate alert behavior
     */
    initiateAlert() {
        if (this.villager.state === 'fleeing' || this.villager.state === 'alert') return;
        
        this.villager.changeState('alert');
        
        // Look for escape routes but don't flee yet
        this.calculateEscapeRoute();
        
        // Increase vigilance
        this.config.threatDetectionRange *= 1.2;
    }
    
    /**
     * Calculate escape route
     */
    calculateEscapeRoute() {
        if (!this.survivalState.currentThreat) return;
        
        const threatPos = this.survivalState.currentThreat.mesh.position;
        const villagerPos = this.villager.mesh.position;
        
        // Find safe zone if available
        if (this.environmentalAwareness) {
            const nearestSafeZone = this.environmentalAwareness.findNearestSafeZone(villagerPos);
            if (nearestSafeZone) {
                this.survivalState.safeZone = nearestSafeZone;
                this.survivalState.escapeRoute = this.calculatePathToSafeZone(nearestSafeZone);
                return;
            }
        }
        
        // Calculate escape direction (away from threat)
        const escapeDirection = villagerPos.subtract(threatPos).normalize();
        
        // Find escape destination
        const escapeDistance = 30 + Math.random() * 20; // 30-50 units away
        const escapeDestination = villagerPos.add(escapeDirection.scale(escapeDistance));
        
        // Adjust for terrain
        if (this.environmentalAwareness) {
            const assessment = this.environmentalAwareness.assessThreat(escapeDestination);
            if (assessment.safetyScore > 0.7) {
                this.survivalState.escapeRoute = [escapeDestination];
            } else {
                // Find alternative escape routes
                this.survivalState.escapeRoute = this.findAlternativeEscapeRoute(escapeDirection);
            }
        } else {
            this.survivalState.escapeRoute = [escapeDestination];
        }
    }
    
    /**
     * Calculate path to safe zone
     * @param {Object} safeZone - Safe zone to path to
     * @returns {Array} - Path to safe zone
     */
    calculatePathToSafeZone(safeZone) {
        if (this.pathfinding) {
            // Use pathfinding system if available
            this.pathfinding.findPath(safeZone.position).catch(error => {
                console.warn(`Pathfinding to safe zone failed:`, error);
            });
        }
        
        // Simple direct path as fallback
        return [safeZone.position];
    }
    
    /**
     * Find alternative escape route
     * @param {BABYLON.Vector3} preferredDirection - Preferred escape direction
     * @returns {Array} - Alternative escape route
     */
    findAlternativeEscapeRoute(preferredDirection) {
        const routes = [];
        const villagerPos = this.villager.mesh.position;
        
        // Try multiple directions
        for (let i = 0; i < 4; i++) {
            const angle = (i / 4) * Math.PI * 2;
            const direction = new BABYLON.Vector3(
                Math.cos(angle),
                0,
                Math.sin(angle)
            );
            
            // Bias towards preferred direction
            const biasedDirection = preferredDirection.scale(0.7).add(direction.scale(0.3)).normalize();
            const destination = villagerPos.add(biasedDirection.scale(25));
            
            // Assess route safety
            if (this.environmentalAwareness) {
                const assessment = this.environmentalAwareness.assessThreat(destination);
                routes.push({
                    destination: destination,
                    safetyScore: assessment.safetyScore
                });
            } else {
                routes.push({
                    destination: destination,
                    safetyScore: 0.5
                });
            }
        }
        
        // Select safest route
        routes.sort((a, b) => b.safetyScore - a.safetyScore);
        return routes.length > 0 ? [routes[0].destination] : [];
    }
    
    /**
     * Request help from nearby villagers
     */
    requestHelp() {
        if (!this.communicationSystem) return;
        
        this.communicationSystem.sendMessage(
            this.villager,
            'help_needed',
            {
                threat: this.survivalState.currentThreat,
                position: this.villager.mesh.position,
                urgency: this.survivalState.panicLevel
            },
            { range: this.config.groupWarningRange }
        );
    }
    
    /**
     * Update threat assessment
     * @param {number} deltaTime - Time since last update
     */
    updateThreatAssessment(deltaTime) {
        if (this.survivalState.currentThreat) {
            // Update threat level
            const newThreatLevel = this.assessAgentThreat(this.survivalState.currentThreat);
            this.survivalState.threatLevel = newThreatLevel;
            
            // Decay panic over time if threat is reducing
            if (newThreatLevel < this.survivalState.threatLevel) {
                this.survivalState.panicLevel = Math.max(0, 
                    this.survivalState.panicLevel - deltaTime * 0.5
                );
            }
            
            // Track time in danger
            this.stats.timeInDanger += deltaTime;
        } else {
            // Gradually reduce panic when no threat
            this.survivalState.panicLevel = Math.max(0, 
                this.survivalState.panicLevel - deltaTime * 0.3
            );
        }
    }
    
    /**
     * Update group coordination
     * @param {number} deltaTime - Time since last update
     */
    updateGroupCoordination(deltaTime) {
        const now = performance.now();
        
        // Throttle group updates
        if (now - this.groupCoordination.lastGroupUpdate < 500) return;
        this.groupCoordination.lastGroupUpdate = now;
        
        // Find nearby villagers
        if (this.environmentalAwareness) {
            this.groupCoordination.nearbyVillagers = this.environmentalAwareness.getAgentsInRange(
                this.villager.mesh.position,
                this.config.groupWarningRange,
                { agentType: 'villager', excludeAgent: this.villager }
            );
        }
        
        // Determine group leadership
        this.updateGroupLeadership();
        
        // Coordinate group movement if fleeing
        if (this.villager.state === 'fleeing') {
            this.coordinateGroupEscape();
        }
    }
    
    /**
     * Update group leadership
     */
    updateGroupLeadership() {
        const nearbyVillagers = this.groupCoordination.nearbyVillagers;
        
        if (nearbyVillagers.length === 0) {
            this.groupCoordination.isGroupLeader = false;
            return;
        }
        
        // Determine if this villager should be the leader
        let shouldLead = true;
        
        for (const other of nearbyVillagers) {
            // Leaders should have higher courage and lower panic
            const otherSurvival = other.survivalInstinct;
            if (otherSurvival) {
                const otherCourage = otherSurvival.config.courageLevel;
                const otherPanic = otherSurvival.survivalState.panicLevel;
                
                if (otherCourage > this.config.courageLevel || 
                    (otherCourage === this.config.courageLevel && otherPanic < this.survivalState.panicLevel)) {
                    shouldLead = false;
                    this.groupCoordination.followTarget = other;
                    break;
                }
            }
        }
        
        this.groupCoordination.isGroupLeader = shouldLead;
    }
    
    /**
     * Coordinate group escape
     */
    coordinateGroupEscape() {
        if (!this.groupCoordination.isGroupLeader) return;
        
        // Lead group to safety
        if (this.communicationSystem && this.survivalState.escapeRoute) {
            this.communicationSystem.sendMessage(
                this.villager,
                'group_formation',
                {
                    action: 'follow_leader',
                    leader: this.villager,
                    destination: this.survivalState.escapeRoute[0],
                    formation: 'escape_column'
                },
                { range: this.config.groupWarningRange }
            );
        }
    }
    
    /**
     * Process survival behavior
     * @param {number} deltaTime - Time since last update
     */
    processSurvivalBehavior(deltaTime) {
        switch (this.villager.state) {
            case 'fleeing':
                this.processFleeing(deltaTime);
                break;
            case 'alert':
                this.processAlert(deltaTime);
                break;
            case 'hiding':
                this.processHiding(deltaTime);
                break;
        }
    }
    
    /**
     * Process fleeing behavior
     * @param {number} deltaTime - Time since last update
     */
    processFleeing(deltaTime) {
        if (!this.survivalState.escapeRoute || this.survivalState.escapeRoute.length === 0) {
            this.calculateEscapeRoute();
            return;
        }
        
        // Check stamina
        if (this.survivalState.stamina <= 0) {
            // Too tired to run, try to hide
            this.initiateHiding();
            return;
        }
        
        // Move towards escape destination
        const destination = this.survivalState.escapeRoute[0];
        const distance = BABYLON.Vector3.Distance(this.villager.mesh.position, destination);
        
        if (distance < 2) {
            // Reached escape destination
            this.survivalState.escapeRoute.shift();
            
            if (this.survivalState.escapeRoute.length === 0) {
                // Escape complete
                this.completeEscape();
            }
        } else {
            // Continue fleeing
            this.moveTowardsDestination(destination, this.config.escapeSpeed, deltaTime);
        }
    }
    
    /**
     * Process alert behavior
     * @param {number} deltaTime - Time since last update
     */
    processAlert(deltaTime) {
        // Stay alert and ready to flee
        if (this.survivalState.panicLevel > this.config.panicThreshold) {
            this.initiateEscape();
        } else if (this.survivalState.panicLevel < 0.2) {
            // Calm down, return to normal behavior
            this.villager.changeState('idle');
            this.config.threatDetectionRange /= 1.2; // Reset detection range
        }
    }
    
    /**
     * Process hiding behavior
     * @param {number} deltaTime - Time since last update
     */
    processHiding(deltaTime) {
        // Stay hidden and regenerate stamina
        if (this.survivalState.stamina > this.config.staminaMax * 0.5 && 
            this.survivalState.panicLevel < 0.3) {
            // Recovered enough to move
            this.endHiding();
        }
    }
    
    /**
     * Initiate hiding behavior
     */
    initiateHiding() {
        this.villager.changeState('hiding');
        this.survivalState.isHiding = true;
        this.survivalState.hideStartTime = performance.now();
        
        // Find hiding spot if possible
        if (this.environmentalAwareness) {
            const nearestSafeZone = this.environmentalAwareness.findNearestSafeZone(
                this.villager.mesh.position
            );
            
            if (nearestSafeZone && nearestSafeZone.distance < 10) {
                // Move to safe zone
                this.moveTowardsDestination(nearestSafeZone.position, this.config.escapeSpeed * 0.5, 0.016);
            }
        }
    }
    
    /**
     * End hiding behavior
     */
    endHiding() {
        this.survivalState.isHiding = false;
        this.villager.changeState('alert');
    }
    
    /**
     * Complete escape sequence
     */
    completeEscape() {
        this.villager.changeState('alert');
        this.stats.successfulEscapes++;
        
        // Broadcast success to nearby villagers
        if (this.communicationSystem) {
            this.communicationSystem.sendMessage(
                this.villager,
                'all_clear',
                { 
                    position: this.villager.mesh.position,
                    message: 'escape_successful'
                }
            );
        }
        
        console.log(`Villager ${this.villager.id} successfully escaped threat`);
    }
    
    /**
     * Move towards a destination
     * @param {BABYLON.Vector3} destination - Target destination
     * @param {number} speed - Movement speed
     * @param {number} deltaTime - Time since last update
     */
    moveTowardsDestination(destination, speed, deltaTime) {
        const direction = destination.subtract(this.villager.mesh.position).normalize();
        const movement = direction.scale(speed * deltaTime * 60);
        
        this.villager.mesh.position.addInPlace(movement);
        
        // Update rotation to face movement direction
        this.villager.mesh.rotation.y = Math.atan2(direction.x, direction.z);
    }    

    /**
     * Update threat memory
     * @param {number} deltaTime - Time since last update
     */
    updateThreatMemory(deltaTime) {
        const now = performance.now();
        
        // Clean up old memories
        for (const [threatId, memory] of this.threatMemory.knownThreats) {
            if (now - memory.lastSeen > this.config.memoryDuration) {
                this.threatMemory.knownThreats.delete(threatId);
            }
        }
        
        // Update current threat memory
        if (this.survivalState.currentThreat) {
            const threatId = this.survivalState.currentThreat.id || 
                           this.survivalState.currentThreat.environmentalId;
            
            if (threatId && this.threatMemory.knownThreats.has(threatId)) {
                const memory = this.threatMemory.knownThreats.get(threatId);
                memory.lastSeen = now;
                memory.encounters++;
                memory.maxThreatLevel = Math.max(memory.maxThreatLevel, this.survivalState.threatLevel);
                memory.lastKnownPosition = this.survivalState.currentThreat.mesh.position.clone();
            }
        }
    }
    
    /**
     * Update hiding behavior
     * @param {number} deltaTime - Time since last update
     */
    updateHidingBehavior(deltaTime) {
        if (!this.survivalState.isHiding) return;
        
        const now = performance.now();
        const hideTime = now - this.survivalState.hideStartTime;
        
        // Force end hiding after timeout
        if (hideTime > this.config.hideTimeout) {
            this.endHiding();
        }
    }
    
    /**
     * Handle received messages
     * @param {Object} message - Received message
     */
    handleMessage(message) {
        switch (message.type) {
            case 'danger_warning':
                this.handleDangerWarning(message);
                break;
            case 'all_clear':
                this.handleAllClear(message);
                break;
            case 'help_needed':
                this.handleHelpRequest(message);
                break;
            case 'group_formation':
                this.handleGroupFormation(message);
                break;
        }
    }
    
    /**
     * Handle danger warning message
     * @param {Object} message - Warning message
     */
    handleDangerWarning(message) {
        const warningPos = message.content.warningPosition;
        const distance = BABYLON.Vector3.Distance(this.villager.mesh.position, warningPos);
        
        // Only react to nearby warnings
        if (distance > this.config.groupWarningRange) return;
        
        // Increase panic level based on warning
        const panicIncrease = message.content.threatLevel * 0.3;
        this.survivalState.panicLevel = Math.min(1.0, 
            this.survivalState.panicLevel + panicIncrease
        );
        
        // Add threat to memory even if not directly seen
        if (message.content.threat) {
            this.addToThreatMemory(message.content.threat);
        }
        
        // Trigger appropriate response
        if (this.survivalState.panicLevel > this.config.panicThreshold) {
            this.initiateEscape();
        } else if (this.survivalState.panicLevel > 0.3) {
            this.initiateAlert();
        }
    }
    
    /**
     * Handle all clear message
     * @param {Object} message - All clear message
     */
    handleAllClear(message) {
        // Reduce panic level
        this.survivalState.panicLevel = Math.max(0, this.survivalState.panicLevel - 0.2);
        
        // If panic is low enough, return to normal behavior
        if (this.survivalState.panicLevel < 0.2 && this.villager.state !== 'fleeing') {
            this.villager.changeState('idle');
        }
    }
    
    /**
     * Handle help request message
     * @param {Object} message - Help request message
     */
    handleHelpRequest(message) {
        const requestPos = message.content.position;
        const distance = BABYLON.Vector3.Distance(this.villager.mesh.position, requestPos);
        
        // Only help if nearby and not in immediate danger
        if (distance > this.config.groupWarningRange || 
            this.survivalState.panicLevel > 0.5) {
            return;
        }
        
        // Move towards the villager in need
        if (this.villager.state === 'idle' || this.villager.state === 'alert') {
            this.villager.destination = requestPos;
            this.villager.changeState('moving_to_target');
            this.stats.groupRescues++;
        }
    }
    
    /**
     * Handle group formation message
     * @param {Object} message - Group formation message
     */
    handleGroupFormation(message) {
        const action = message.content.action;
        
        switch (action) {
            case 'follow_leader':
                if (message.content.leader !== this.villager) {
                    this.groupCoordination.followTarget = message.content.leader;
                    this.groupCoordination.isGroupLeader = false;
                    
                    // Follow the leader
                    if (this.villager.state === 'fleeing' || this.villager.state === 'alert') {
                        this.villager.destination = message.content.destination;
                    }
                }
                break;
                
            case 'form_defensive_circle':
                this.formDefensivePosition(message.content);
                break;
        }
    }
    
    /**
     * Form defensive position
     * @param {Object} formationData - Formation data
     */
    formDefensivePosition(formationData) {
        // Calculate position in defensive formation
        const centerPos = formationData.center || this.villager.mesh.position;
        const radius = formationData.radius || 8;
        const memberIndex = formationData.memberIndex || 0;
        const totalMembers = formationData.totalMembers || 4;
        
        const angle = (memberIndex / totalMembers) * Math.PI * 2;
        const formationPos = new BABYLON.Vector3(
            centerPos.x + Math.cos(angle) * radius,
            centerPos.y,
            centerPos.z + Math.sin(angle) * radius
        );
        
        this.groupCoordination.groupFormationPosition = formationPos;
        this.villager.destination = formationPos;
        this.villager.changeState('moving_to_target');
    }
    
    /**
     * Get area key for position (for dangerous area tracking)
     * @param {BABYLON.Vector3} position - Position to get key for
     * @returns {string} - Area key
     */
    getAreaKey(position) {
        const gridSize = 10; // 10 unit grid
        const x = Math.floor(position.x / gridSize);
        const z = Math.floor(position.z / gridSize);
        return `${x},${z}`;
    }
    
    /**
     * Check if position is in a dangerous area
     * @param {BABYLON.Vector3} position - Position to check
     * @returns {boolean} - Whether position is dangerous
     */
    isPositionDangerous(position) {
        const areaKey = this.getAreaKey(position);
        return this.threatMemory.dangerousAreas.has(areaKey);
    }
    
    /**
     * Get survival statistics
     * @returns {Object} - Statistics object
     */
    getStatistics() {
        return {
            ...this.stats,
            currentThreatLevel: this.survivalState.threatLevel,
            panicLevel: this.survivalState.panicLevel,
            stamina: this.survivalState.stamina,
            isHiding: this.survivalState.isHiding,
            knownThreats: this.threatMemory.knownThreats.size,
            dangerousAreas: this.threatMemory.dangerousAreas.size,
            nearbyVillagers: this.groupCoordination.nearbyVillagers.length,
            isGroupLeader: this.groupCoordination.isGroupLeader,
            successRate: this.stats.escapeAttempts > 0 ? 
                this.stats.successfulEscapes / this.stats.escapeAttempts : 0
        };
    }
    
    /**
     * Get current survival state
     * @returns {Object} - Current survival state
     */
    getSurvivalState() {
        return {
            state: this.villager.state,
            threatLevel: this.survivalState.threatLevel,
            panicLevel: this.survivalState.panicLevel,
            stamina: this.survivalState.stamina,
            hasEscapeRoute: this.survivalState.escapeRoute && this.survivalState.escapeRoute.length > 0,
            isInGroup: this.groupCoordination.nearbyVillagers.length > 0,
            isGroupLeader: this.groupCoordination.isGroupLeader,
            currentThreat: this.survivalState.currentThreat ? {
                id: this.survivalState.currentThreat.id,
                type: this.survivalState.currentThreat.agentType,
                distance: this.survivalState.currentThreat.mesh ? 
                    BABYLON.Vector3.Distance(
                        this.villager.mesh.position, 
                        this.survivalState.currentThreat.mesh.position
                    ) : 0
            } : null
        };
    }
    
    /**
     * Force panic state (for testing or special events)
     * @param {number} panicLevel - Panic level to set (0-1)
     */
    forcePanic(panicLevel) {
        this.survivalState.panicLevel = Math.max(0, Math.min(1, panicLevel));
        
        if (this.survivalState.panicLevel > this.config.panicThreshold) {
            this.initiateEscape();
        }
    }
    
    /**
     * Add safe path to memory
     * @param {BABYLON.Vector3} from - Start position
     * @param {BABYLON.Vector3} to - End position
     * @param {Array} path - Safe path
     */
    addSafePath(from, to, path) {
        const pathKey = `${this.getAreaKey(from)}-${this.getAreaKey(to)}`;
        this.threatMemory.safePaths.set(pathKey, {
            path: path,
            lastUsed: performance.now(),
            successCount: 1
        });
    }
    
    /**
     * Get safe path from memory
     * @param {BABYLON.Vector3} from - Start position
     * @param {BABYLON.Vector3} to - End position
     * @returns {Array|null} - Safe path or null
     */
    getSafePath(from, to) {
        const pathKey = `${this.getAreaKey(from)}-${this.getAreaKey(to)}`;
        const pathData = this.threatMemory.safePaths.get(pathKey);
        
        if (pathData && performance.now() - pathData.lastUsed < this.config.memoryDuration) {
            return pathData.path;
        }
        
        return null;
    }
    
    /**
     * Dispose of the survival instinct system
     */
    dispose() {
        // Unregister from systems
        if (this.communicationSystem) {
            this.communicationSystem.unregisterAgent(this.villager);
        }
        
        if (this.environmentalAwareness) {
            this.environmentalAwareness.unregisterAgent(this.villager);
        }
        
        // Clear memory
        this.threatMemory.knownThreats.clear();
        this.threatMemory.dangerousAreas.clear();
        this.threatMemory.safePaths.clear();
        
        // Clear group coordination
        this.groupCoordination.nearbyVillagers = [];
        this.groupCoordination.followTarget = null;
        
        console.log(`Villager Survival Instinct disposed for ${this.villager.id}`);
    }
}