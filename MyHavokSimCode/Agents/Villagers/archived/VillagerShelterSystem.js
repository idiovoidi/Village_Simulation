/**
 * Villager Shelter System Component
 * Handles shelter identification, pathfinding to safe zones, capacity management, and resource sharing
 */

export class VillagerShelterSystem {
    constructor(villager, options = {}) {
        this.villager = villager;
        this.scene = villager.scene;

        // Configuration
        this.config = {
            shelterSearchRadius: options.shelterSearchRadius || 50,
            maxShelterDistance: options.maxShelterDistance || 100,
            shelterEvaluationInterval: options.shelterEvaluationInterval || 2000, // ms
            resourceSharingRange: options.resourceSharingRange || 15,
            shelterBuildingTime: options.shelterBuildingTime || 30000, // 30 seconds
            fortificationTime: options.fortificationTime || 60000, // 1 minute
            maintenanceInterval: options.maintenanceInterval || 120000, // 2 minutes
            cooperationThreshold: options.cooperationThreshold || 0.6,
            leadershipRequirement: options.leadershipRequirement || 0.5,
            resourceContribution: options.resourceContribution || 0.8,
            shelterCapacityBuffer: options.shelterCapacityBuffer || 0.2 // 20% buffer
        };

        // Shelter knowledge and preferences
        this.shelterKnowledge = {
            knownShelters: new Map(), // shelterId -> shelter info
            shelterHistory: new Map(), // shelterId -> usage history
            preferredShelters: new Set(),
            blacklistedShelters: new Set(),
            lastShelterUpdate: 0
        };

        // Current shelter state
        this.shelterState = {
            currentShelter: null,
            shelterRole: 'occupant', // occupant, organizer, builder, guard
            entryTime: 0,
            contributedResources: 0,
            sheltermates: new Set(),
            isBuilding: false,
            buildingProgress: 0,
            maintenanceDue: false
        };

        // Resource management
        this.resources = {
            materials: 0,
            food: 0,
            tools: 0,
            knowledge: 0,
            sharedResources: new Map(), // resourceType -> amount shared
            resourceNeeds: new Map(), // resourceType -> needed amount
            lastResourceUpdate: 0
        };

        // Shelter building and fortification
        this.construction = {
            plannedShelters: new Map(), // shelterId -> construction plan
            activeProjects: new Set(),
            buildingSkill: 0.3 + Math.random() * 0.4, // 0.3-0.7
            fortificationSkill: 0.2 + Math.random() * 0.5, // 0.2-0.7
            cooperationBonus: 0,
            leadershipBonus: 0
        };

        // External systems
        this.environmentalAwareness = null;
        this.communicationSystem = null;
        this.pathfinding = null;
        this.socialNetwork = null;

        // Performance optimization
        this.lastShelterScan = 0;
        this.lastResourceCheck = 0;

        // Statistics
        this.stats = {
            sheltersUsed: 0,
            sheltersBuilt: 0,
            sheltersImproved: 0,
            resourcesShared: 0,
            resourcesReceived: 0,
            timeInShelter: 0,
            successfulEvacuations: 0,
            shelterDefenses: 0,
            cooperativeActions: 0
        };
    }

    /**
     * Initialize the shelter system
     * @param {Object} systems - External systems
     */
    initialize(systems = {}) {
        this.environmentalAwareness = systems.environmental;
        this.communicationSystem = systems.communication;
        this.pathfinding = systems.pathfinding;
        this.socialNetwork = systems.socialNetwork;

        // Register with communication system
        if (this.communicationSystem) {
            this.communicationSystem.registerAgent(this.villager);
            this.communicationSystem.subscribe(this.villager, 'shelter_info');
            this.communicationSystem.subscribe(this.villager, 'resource_request');
            this.communicationSystem.subscribe(this.villager, 'shelter_construction');
            this.communicationSystem.subscribe(this.villager, 'evacuation_order');
        }

        // Initialize building skills based on personality
        if (this.socialNetwork) {
            const { personality } = this.socialNetwork;
            this.construction.buildingSkill += personality.conscientiousness * 0.2;
            this.construction.fortificationSkill += personality.assertiveness * 0.2;
            this.construction.cooperationBonus = personality.agreeableness * 0.3;
            this.construction.leadershipBonus = this.socialNetwork.socialStatus.leadership * 0.2;
        }

        console.log(`Villager Shelter System initialized for ${this.villager.id || 'unknown'}`);
    }

    /**
     * Update the shelter system
     * @param {number} deltaTime - Time since last update
     */
    update(deltaTime) {
        // Update shelter knowledge
        this.updateShelterKnowledge(deltaTime);

        // Manage current shelter
        this.manageShelterOccupancy(deltaTime);

        // Handle resource management
        this.manageResources(deltaTime);

        // Update construction projects
        this.updateConstruction(deltaTime);

        // Check for shelter maintenance needs
        this.checkMaintenanceNeeds(deltaTime);

        // Handle shelter coordination
        this.coordinateShelterActivities(deltaTime);
    }

    /**
     * Update knowledge of available shelters
     * @param {number} deltaTime - Time since last update
     */
    updateShelterKnowledge(deltaTime) {
        const now = performance.now();

        // Throttle shelter scanning for performance
        if (now - this.lastShelterScan < this.config.shelterEvaluationInterval) {
            return;
        }

        this.lastShelterScan = now;

        // Scan for shelters using environmental awareness
        if (this.environmentalAwareness) {
            this.scanForShelters();
        }

        // Update shelter information from communication
        this.processShelterInformation();

        // Evaluate shelter preferences
        this.evaluateShelterPreferences();
    }

    /**
     * Scan for available shelters in the environment
     */
    scanForShelters() {
        // Find safe zones (which can serve as shelters)
        const nearestSafeZone = this.environmentalAwareness.findNearestSafeZone(
            this.villager.mesh.position,
            { maxDistance: this.config.maxShelterDistance }
        );

        if (nearestSafeZone) {
            this.addShelterKnowledge(nearestSafeZone, 'safe_zone');
        }

        // Look for buildings or structures that could serve as shelters
        this.scanForBuildingShelters();

        // Check for natural shelters
        this.scanForNaturalShelters();
    }

    /**
     * Scan for building-based shelters
     */
    scanForBuildingShelters() {
        // This would integrate with the house system or building detection
        // For now, we'll create placeholder logic

        // Look for nearby structures
        if (this.scene && this.scene.meshes) {
            const nearbyBuildings = this.scene.meshes.filter(mesh => {
                if (!mesh.name || !mesh.position) return false;

                // Check if it's a building
                if (mesh.name.includes('house') || mesh.name.includes('building')) {
                    const distance = BABYLON.Vector3.Distance(
                        this.villager.mesh.position,
                        mesh.position
                    );
                    return distance <= this.config.shelterSearchRadius;
                }
                return false;
            });

            for (const building of nearbyBuildings) {
                this.addBuildingShelter(building);
            }
        }
    }

    /**
     * Scan for natural shelter opportunities
     */
    scanForNaturalShelters() {
        // Look for terrain features that could provide shelter
        // This is a simplified implementation

        const villagerPos = this.villager.mesh.position;

        // Check for elevated areas (hills, cliffs)
        const elevatedPositions = this.findElevatedPositions(villagerPos);

        for (const position of elevatedPositions) {
            this.addNaturalShelter(position, 'elevated');
        }

        // Check for concealed areas (dense vegetation, caves)
        const concealedPositions = this.findConcealedPositions(villagerPos);

        for (const position of concealedPositions) {
            this.addNaturalShelter(position, 'concealed');
        }
    }

    /**
     * Add shelter knowledge
     * @param {Object} shelter - Shelter information
     * @param {string} type - Type of shelter
     */
    addShelterKnowledge(shelter, type) {
        const shelterId = shelter.id || `shelter_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        const shelterInfo = {
            id: shelterId,
            type,
            position: shelter.position.clone(),
            capacity: shelter.capacity || this.estimateShelterCapacity(shelter, type),
            safety: this.evaluateShelterSafety(shelter, type),
            accessibility: this.evaluateShelterAccessibility(shelter),
            resources: shelter.resources || {},
            condition: shelter.condition || 'good',
            lastSeen: performance.now(),
            discoveredBy: this.villager.id,
            occupants: new Set(),
            fortificationLevel: 0,
            maintenanceLevel: 1.0
        };

        this.shelterKnowledge.knownShelters.set(shelterId, shelterInfo);

        // Share shelter information with others
        this.shareShelterInformation(shelterInfo);
    }

    /**
     * Add building-based shelter
     * @param {Object} building - Building mesh
     */
    addBuildingShelter(building) {
        const shelter = {
            id: `building_${building.name}`,
            position: building.position,
            capacity: this.estimateBuildingCapacity(building),
            resources: { materials: 10, tools: 5 }
        };

        this.addShelterKnowledge(shelter, 'building');
    }

    /**
     * Add natural shelter
     * @param {BABYLON.Vector3} position - Shelter position
     * @param {string} subtype - Natural shelter subtype
     */
    addNaturalShelter(position, subtype) {
        const shelter = {
            id: `natural_${subtype}_${position.x}_${position.z}`,
            position,
            capacity: subtype === 'elevated' ? 8 : 4,
            resources: { materials: 2 }
        };

        this.addShelterKnowledge(shelter, `natural_${subtype}`);
    }

    /**
     * Estimate shelter capacity based on type and size
     * @param {Object} shelter - Shelter object
     * @param {string} type - Shelter type
     * @returns {number} - Estimated capacity
     */
    estimateShelterCapacity(shelter, type) {
        switch (type) {
            case 'safe_zone':
                return shelter.capacity || 10;
            case 'building':
                return this.estimateBuildingCapacity(shelter);
            case 'natural_elevated':
                return 6;
            case 'natural_concealed':
                return 3;
            default:
                return 5;
        }
    }

    /**
     * Estimate building capacity
     * @param {Object} building - Building object
     * @returns {number} - Estimated capacity
     */
    estimateBuildingCapacity(building) {
        // Estimate based on building size (simplified)
        if (building.scaling) {
            const volume = building.scaling.x * building.scaling.y * building.scaling.z;
            return Math.max(2, Math.floor(volume / 10));
        }
        return 4; // Default capacity
    }

    /**
     * Evaluate shelter safety
     * @param {Object} shelter - Shelter to evaluate
     * @param {string} type - Shelter type
     * @returns {number} - Safety score (0-1)
     */
    evaluateShelterSafety(shelter, type) {
        let safety = 0.5; // Base safety

        // Type-based safety
        switch (type) {
            case 'safe_zone':
                safety = 0.9;
                break;
            case 'building':
                safety = 0.7;
                break;
            case 'natural_elevated':
                safety = 0.6;
                break;
            case 'natural_concealed':
                safety = 0.4;
                break;
        }

        // Environmental factors
        if (this.environmentalAwareness) {
            const threatAssessment = this.environmentalAwareness.assessThreat(shelter.position);
            safety *= threatAssessment.safetyScore;
        }

        return Math.max(0.1, Math.min(1.0, safety));
    }

    /**
     * Evaluate shelter accessibility
     * @param {Object} shelter - Shelter to evaluate
     * @returns {number} - Accessibility score (0-1)
     */
    evaluateShelterAccessibility(shelter) {
        const distance = BABYLON.Vector3.Distance(
            this.villager.mesh.position,
            shelter.position
        );

        // Closer shelters are more accessible
        let accessibility = Math.max(0.1, 1 - distance / this.config.maxShelterDistance);

        // Check if path is clear (if pathfinding is available)
        if (this.pathfinding) {
            // This would check if a path exists to the shelter
            // For now, we'll assume paths exist but may be difficult
            accessibility *= 0.9;
        }

        return accessibility;
    }

    /**
     * Find elevated positions for natural shelters
     * @param {BABYLON.Vector3} center - Center position to search from
     * @returns {Array} - Array of elevated positions
     */
    findElevatedPositions(center) {
        const positions = [];
        const searchRadius = this.config.shelterSearchRadius;

        // Sample positions in a grid pattern
        for (let x = -searchRadius; x <= searchRadius; x += 10) {
            for (let z = -searchRadius; z <= searchRadius; z += 10) {
                const testPos = new BABYLON.Vector3(center.x + x, 0, center.z + z);

                // Get terrain height
                const height = this.getTerrainHeight(testPos.x, testPos.z);
                const centerHeight = this.getTerrainHeight(center.x, center.z);

                // If significantly higher than center, it's elevated
                if (height > centerHeight + 5) {
                    testPos.y = height;
                    positions.push(testPos);
                }
            }
        }

        return positions;
    }

    /**
     * Find concealed positions for natural shelters
     * @param {BABYLON.Vector3} center - Center position to search from
     * @returns {Array} - Array of concealed positions
     */
    findConcealedPositions(center) {
        const positions = [];
        const searchRadius = this.config.shelterSearchRadius * 0.7; // Smaller search for concealed spots

        // Look for areas with natural concealment
        for (let i = 0; i < 5; i++) {
            const angle = (i / 5) * Math.PI * 2;
            const distance = searchRadius * (0.5 + Math.random() * 0.5);

            const testPos = new BABYLON.Vector3(
                center.x + Math.cos(angle) * distance,
                this.getTerrainHeight(center.x + Math.cos(angle) * distance, center.z + Math.sin(angle) * distance),
                center.z + Math.sin(angle) * distance
            );

            positions.push(testPos);
        }

        return positions;
    }

    /**
     * Get terrain height at position
     * @param {number} x - X coordinate
     * @param {number} z - Z coordinate
     * @returns {number} - Terrain height
     */
    getTerrainHeight(x, z) {
        // Use BowlCreator if available
        if (typeof window !== 'undefined' && window.BowlCreator && window.BowlCreator.getTerrainHeight) {
            return window.BowlCreator.getTerrainHeight(x, z);
        }

        // Fallback calculation
        const distFromCenter = Math.sqrt(x * x + z * z);
        return -Math.pow(distFromCenter / 80, 1.2) * 25;
    }

    /**
     * Share shelter information with other villagers
     * @param {Object} shelterInfo - Shelter information to share
     */
    shareShelterInformation(shelterInfo) {
        if (!this.communicationSystem) return;

        this.communicationSystem.sendMessage(
            this.villager,
            'shelter_info',
            {
                action: 'shelter_discovered',
                shelter: shelterInfo,
                discoverer: this.villager
            },
            { range: this.config.resourceSharingRange }
        );
    }

    /**
     * Process shelter information from communication
     */
    processShelterInformation() {
        // This would process received shelter information
        // The actual message handling is done in handleMessage()
    }

    /**
     * Evaluate and update shelter preferences
     */
    evaluateShelterPreferences() {
        // Clear old preferences
        this.shelterKnowledge.preferredShelters.clear();

        // Evaluate each known shelter
        for (const [shelterId, shelter] of this.shelterKnowledge.knownShelters) {
            const score = this.calculateShelterScore(shelter);

            if (score > 0.7) {
                this.shelterKnowledge.preferredShelters.add(shelterId);
            } else if (score < 0.3) {
                this.shelterKnowledge.blacklistedShelters.add(shelterId);
            }
        }
    }

    /**
     * Calculate overall shelter score
     * @param {Object} shelter - Shelter to score
     * @returns {number} - Overall score (0-1)
     */
    calculateShelterScore(shelter) {
        let score = 0;

        // Safety is most important
        score += shelter.safety * 0.4;

        // Accessibility matters
        score += shelter.accessibility * 0.3;

        // Capacity relative to current needs
        const capacityScore = Math.min(1.0, shelter.capacity / 5); // Assume 5 is ideal
        score += capacityScore * 0.2;

        // Condition and maintenance
        score += shelter.maintenanceLevel * 0.1;

        return Math.max(0, Math.min(1, score));
    }

    /**
     * Manage current shelter occupancy
     * @param {number} deltaTime - Time since last update
     */
    manageShelterOccupancy(deltaTime) {
        if (this.shelterState.currentShelter) {
            // Update time in shelter
            this.stats.timeInShelter += deltaTime;

            // Check if we should leave the shelter
            this.evaluateShelterExit();

            // Manage shelter activities
            this.manageShelterActivities(deltaTime);
        } else {
            // Not in shelter - check if we should seek one
            this.evaluateShelterNeed();
        }
    }

    /**
     * Evaluate whether to exit current shelter
     */
    evaluateShelterExit() {
        if (!this.shelterState.currentShelter) return;

        let shouldExit = false;

        // Check if threat has passed (if we entered due to threat)
        if (this.villager.survivalInstinct) {
            const { survivalState } = this.villager.survivalInstinct;
            if (survivalState.threatLevel < 0.2 && survivalState.panicLevel < 0.3) {
                shouldExit = true;
            }
        }

        // Check if shelter is overcrowded
        const shelter = this.shelterKnowledge.knownShelters.get(this.shelterState.currentShelter.id);
        if (shelter && shelter.occupants.size > shelter.capacity * (1 + this.config.shelterCapacityBuffer)) {
            // Leave if we're not essential to shelter operations
            if (this.shelterState.shelterRole === 'occupant') {
                shouldExit = true;
            }
        }

        // Check if we have important tasks elsewhere
        if (this.socialNetwork && this.socialNetwork.socialStatus.leadership > 0.7) {
            // Leaders may need to leave to help others
            shouldExit = true;
        }

        if (shouldExit) {
            this.exitShelter();
        }
    }

    /**
     * Evaluate need for shelter
     */
    evaluateShelterNeed() {
        let needsShelter = false;

        // Check survival instinct for threat level
        if (this.villager.survivalInstinct) {
            const { survivalState } = this.villager.survivalInstinct;
            if (survivalState.threatLevel > 0.5 || survivalState.panicLevel > 0.6) {
                needsShelter = true;
            }
        }

        // Check environmental conditions
        if (this.environmentalAwareness) {
            const threatAssessment = this.environmentalAwareness.assessThreat(this.villager.mesh.position);
            if (threatAssessment.recommendedAction === 'flee' || threatAssessment.safetyScore < 0.4) {
                needsShelter = true;
            }
        }

        // Check social network for evacuation orders
        if (this.socialNetwork) {
            // Leaders might call for evacuation
            needsShelter = this.checkForEvacuationOrders();
        }

        if (needsShelter) {
            this.seekShelter();
        }
    }

    /**
     * Check for evacuation orders from social network
     * @returns {boolean} - Whether evacuation is ordered
     */
    checkForEvacuationOrders() {
        // This would check recent messages for evacuation orders
        // For now, return false as placeholder
        return false;
    }

    /**
     * Seek appropriate shelter
     */
    seekShelter() {
        const bestShelter = this.findBestAvailableShelter();

        if (bestShelter) {
            this.moveToShelter(bestShelter);
        } else {
            // No suitable shelter found - consider building one
            this.considerBuildingShelter();
        }
    }

    /**
     * Find the best available shelter
     * @returns {Object|null} - Best shelter or null
     */
    findBestAvailableShelter() {
        let bestShelter = null;
        let bestScore = 0;

        for (const [shelterId, shelter] of this.shelterKnowledge.knownShelters) {
            // Skip blacklisted shelters
            if (this.shelterKnowledge.blacklistedShelters.has(shelterId)) {
                continue;
            }

            // Check if shelter has capacity
            if (shelter.occupants.size >= shelter.capacity) {
                continue;
            }

            // Calculate score for this shelter
            const score = this.calculateShelterScore(shelter);

            // Bonus for preferred shelters
            if (this.shelterKnowledge.preferredShelters.has(shelterId)) {
                score *= 1.2;
            }

            if (score > bestScore) {
                bestScore = score;
                bestShelter = shelter;
            }
        }

        return bestShelter;
    }

    /**
     * Move to a specific shelter
     * @param {Object} shelter - Shelter to move to
     */
    moveToShelter(shelter) {
        // Set destination
        this.villager.destination = shelter.position;
        this.villager.changeState('moving_to_target');

        // Set arrival callback
        this.villager.onArrival = () => {
            this.enterShelter(shelter);
        };

        // Use pathfinding if available
        if (this.pathfinding) {
            this.pathfinding.findPath(shelter.position).catch(error => {
                console.warn(`Pathfinding to shelter failed:`, error);
            });
        }

        // Notify others of shelter movement
        this.broadcastShelterMovement(shelter);
    }

    /**
     * Enter a shelter
     * @param {Object} shelter - Shelter to enter
     */
    enterShelter(shelter) {
        this.shelterState.currentShelter = shelter;
        this.shelterState.entryTime = performance.now();
        this.shelterState.shelterRole = this.determineShelterRole(shelter);

        // Add to shelter occupants
        shelter.occupants.add(this.villager);

        // Update villager state
        this.villager.changeState('in_shelter');

        // Share resources if appropriate
        this.contributeToShelter(shelter);

        // Update statistics
        this.stats.sheltersUsed++;

        console.log(`${this.villager.id} entered shelter ${shelter.id} as ${this.shelterState.shelterRole}`);
    }

    /**
     * Determine role in shelter
     * @param {Object} shelter - Shelter being entered
     * @returns {string} - Assigned role
     */
    determineShelterRole(shelter) {
        // Check if we should be an organizer (based on social status)
        if (this.socialNetwork && this.socialNetwork.socialStatus.leadership > this.config.leadershipRequirement) {
            if (shelter.occupants.size === 0 || !this.hasShelterOrganizer(shelter)) {
                return 'organizer';
            }
        }

        // Check if we should be a builder (based on building skills)
        if (this.construction.buildingSkill > 0.6 && shelter.condition !== 'excellent') {
            return 'builder';
        }

        // Check if we should be a guard (based on courage and assertiveness)
        if (this.socialNetwork) {
            const { personality } = this.socialNetwork;
            if (personality.assertiveness > 0.7 && this.villager.survivalInstinct.config.courageLevel > 0.6) {
                return 'guard';
            }
        }

        return 'occupant';
    }

    /**
     * Check if shelter has an organizer
     * @param {Object} shelter - Shelter to check
     * @returns {boolean} - Whether shelter has organizer
     */
    hasShelterOrganizer(shelter) {
        for (const occupant of shelter.occupants) {
            if (occupant.shelterSystem && occupant.shelterSystem.shelterState.shelterRole === 'organizer') {
                return true;
            }
        }
        return false;
    }

    /**
     * Exit current shelter
     */
    exitShelter() {
        if (!this.shelterState.currentShelter) return;

        const shelter = this.shelterState.currentShelter;

        // Remove from shelter occupants
        shelter.occupants.delete(this.villager);

        // Clear shelter state
        this.shelterState.currentShelter = null;
        this.shelterState.shelterRole = 'occupant';
        this.shelterState.entryTime = 0;
        this.shelterState.sheltermates.clear();

        // Update villager state
        this.villager.changeState('idle');

        console.log(`${this.villager.id} exited shelter ${shelter.id}`);
    }

    /**
     * Contribute resources to shelter
     * @param {Object} shelter - Shelter to contribute to
     */
    contributeToShelter(shelter) {
        if (this.socialNetwork && this.socialNetwork.personality.agreeableness < this.config.cooperationThreshold) {
            return; // Not cooperative enough to contribute
        }

        // Calculate contribution based on available resources and cooperation level
        const contributionRate = this.config.resourceContribution
                               * (this.socialNetwork ? this.socialNetwork.personality.agreeableness : 0.5);

        // Contribute materials
        const materialContribution = Math.floor(this.resources.materials * contributionRate);
        if (materialContribution > 0) {
            this.resources.materials -= materialContribution;
            shelter.resources.materials = (shelter.resources.materials || 0) + materialContribution;
            this.shelterState.contributedResources += materialContribution;
            this.stats.resourcesShared += materialContribution;
        }

        // Contribute food
        const foodContribution = Math.floor(this.resources.food * contributionRate);
        if (foodContribution > 0) {
            this.resources.food -= foodContribution;
            shelter.resources.food = (shelter.resources.food || 0) + foodContribution;
            this.stats.resourcesShared += foodContribution;
        }

        // Contribute tools
        const toolContribution = Math.floor(this.resources.tools * contributionRate);
        if (toolContribution > 0) {
            this.resources.tools -= toolContribution;
            shelter.resources.tools = (shelter.resources.tools || 0) + toolContribution;
            this.stats.resourcesShared += toolContribution;
        }
    }

    /**
     * Manage shelter activities based on role
     * @param {number} deltaTime - Time since last update
     */
    manageShelterActivities(deltaTime) {
        switch (this.shelterState.shelterRole) {
            case 'organizer':
                this.performOrganizerDuties(deltaTime);
                break;
            case 'builder':
                this.performBuilderDuties(deltaTime);
                break;
            case 'guard':
                this.performGuardDuties(deltaTime);
                break;
            case 'occupant':
                this.performOccupantDuties(deltaTime);
                break;
        }
    }

    /**
     * Perform organizer duties in shelter
     * @param {number} deltaTime - Time since last update
     */
    performOrganizerDuties(deltaTime) {
        const shelter = this.shelterState.currentShelter;

        // Coordinate resource distribution
        this.coordinateResourceDistribution(shelter);

        // Assign tasks to other occupants
        this.assignShelterTasks(shelter);

        // Make decisions about shelter improvements
        this.planShelterImprovements(shelter);

        // Communicate with other shelters
        this.coordinateWithOtherShelters(shelter);
    }

    /**
     * Perform builder duties in shelter
     * @param {number} deltaTime - Time since last update
     */
    performBuilderDuties(deltaTime) {
        const shelter = this.shelterState.currentShelter;

        // Work on shelter improvements
        this.improveShelter(shelter, deltaTime);

        // Maintain shelter condition
        this.maintainShelter(shelter, deltaTime);

        // Plan fortifications
        this.planFortifications(shelter);
    }

    /**
     * Perform guard duties in shelter
     * @param {number} deltaTime - Time since last update
     */
    performGuardDuties(deltaTime) {
        const shelter = this.shelterState.currentShelter;

        // Monitor for threats
        this.monitorForThreats(shelter);

        // Coordinate defense preparations
        this.prepareDefenses(shelter);

        // Communicate threat information
        this.reportThreats(shelter);
    }

    /**
     * Perform occupant duties in shelter
     * @param {number} deltaTime - Time since last update
     */
    performOccupantDuties(deltaTime) {
        const shelter = this.shelterState.currentShelter;

        // Help with basic maintenance
        this.assistWithMaintenance(shelter, deltaTime);

        // Share information with other occupants
        this.shareInformationWithOccupants(shelter);

        // Rest and recover
        this.restAndRecover(deltaTime);
    }

    /**
     * Coordinate resource distribution in shelter
     * @param {Object} shelter - Current shelter
     */
    coordinateResourceDistribution(shelter) {
        // Assess resource needs of all occupants
        const resourceNeeds = this.assessOccupantNeeds(shelter);

        // Distribute resources fairly
        this.distributeResources(shelter, resourceNeeds);

        // Request additional resources if needed
        this.requestAdditionalResources(shelter, resourceNeeds);
    }

    /**
     * Assess resource needs of shelter occupants
     * @param {Object} shelter - Shelter to assess
     * @returns {Object} - Resource needs summary
     */
    assessOccupantNeeds(shelter) {
        const needs = {
            materials: 0,
            food: 0,
            tools: 0,
            knowledge: 0
        };

        for (const occupant of shelter.occupants) {
            if (occupant.shelterSystem) {
                const occupantNeeds = occupant.shelterSystem.resources.resourceNeeds;
                for (const [resource, amount] of occupantNeeds) {
                    needs[resource] = (needs[resource] || 0) + amount;
                }
            }
        }

        return needs;
    }

    /**
     * Distribute resources among occupants
     * @param {Object} shelter - Shelter with resources
     * @param {Object} needs - Resource needs
     */
    distributeResources(shelter, needs) {
        const availableResources = shelter.resources;

        // Distribute proportionally based on needs
        for (const [resourceType, totalNeed] of Object.entries(needs)) {
            const available = availableResources[resourceType] || 0;

            if (available > 0 && totalNeed > 0) {
                const distributionRatio = Math.min(1, available / totalNeed);

                for (const occupant of shelter.occupants) {
                    if (occupant.shelterSystem) {
                        const occupantNeed = occupant.shelterSystem.resources.resourceNeeds.get(resourceType) || 0;
                        const allocation = Math.floor(occupantNeed * distributionRatio);

                        if (allocation > 0) {
                            occupant.shelterSystem.receiveResource(resourceType, allocation);
                            availableResources[resourceType] -= allocation;
                        }
                    }
                }
            }
        }
    }

    /**
     * Assign tasks to shelter occupants
     * @param {Object} shelter - Current shelter
     */
    assignShelterTasks(shelter) {
        const tasks = this.identifyShelterTasks(shelter);

        for (const task of tasks) {
            const bestOccupant = this.findBestOccupantForTask(shelter, task);
            if (bestOccupant) {
                this.assignTask(bestOccupant, task);
            }
        }
    }

    /**
     * Identify tasks needed in shelter
     * @param {Object} shelter - Shelter to assess
     * @returns {Array} - Array of tasks
     */
    identifyShelterTasks(shelter) {
        const tasks = [];

        // Maintenance tasks
        if (shelter.maintenanceLevel < 0.8) {
            tasks.push({
                type: 'maintenance',
                priority: 1 - shelter.maintenanceLevel,
                requiredSkill: 'building',
                duration: 300 // 5 minutes
            });
        }

        // Fortification tasks
        if (shelter.fortificationLevel < 0.5) {
            tasks.push({
                type: 'fortification',
                priority: 0.7,
                requiredSkill: 'fortification',
                duration: 600 // 10 minutes
            });
        }

        // Resource gathering tasks
        const totalResources = Object.values(shelter.resources).reduce((sum, amount) => sum + amount, 0);
        if (totalResources < shelter.occupants.size * 5) {
            tasks.push({
                type: 'resource_gathering',
                priority: 0.6,
                requiredSkill: 'gathering',
                duration: 180 // 3 minutes
            });
        }

        return tasks.sort((a, b) => b.priority - a.priority);
    }

    /**
     * Find best occupant for a task
     * @param {Object} shelter - Current shelter
     * @param {Object} task - Task to assign
     * @returns {Object|null} - Best occupant or null
     */
    findBestOccupantForTask(shelter, task) {
        let bestOccupant = null;
        let bestScore = 0;

        for (const occupant of shelter.occupants) {
            if (!occupant.shelterSystem) continue;

            // Skip if occupant is already busy
            if (occupant.shelterSystem.shelterState.isBuilding) continue;

            let score = 0;

            // Skill matching
            switch (task.requiredSkill) {
                case 'building':
                    score += occupant.shelterSystem.construction.buildingSkill;
                    break;
                case 'fortification':
                    score += occupant.shelterSystem.construction.fortificationSkill;
                    break;
                case 'gathering':
                    score += 0.5; // Base gathering ability
                    break;
            }

            // Cooperation bonus
            score += occupant.shelterSystem.construction.cooperationBonus;

            // Role bonus
            if (occupant.shelterSystem.shelterState.shelterRole === 'builder'
                && (task.type === 'maintenance' || task.type === 'fortification')) {
                score += 0.3;
            }

            if (score > bestScore) {
                bestScore = score;
                bestOccupant = occupant;
            }
        }

        return bestOccupant;
    }

    /**
     * Assign task to occupant
     * @param {Object} occupant - Occupant to assign task to
     * @param {Object} task - Task to assign
     */
    assignTask(occupant, task) {
        if (!occupant.shelterSystem) return;

        // Send task assignment message
        if (this.communicationSystem) {
            this.communicationSystem.sendMessage(
                this.villager,
                'shelter_construction',
                {
                    action: 'task_assignment',
                    task,
                    assignee: occupant
                },
                { targetAgent: occupant }
            );
        }
    }

    /**
     * Improve shelter condition and capabilities
     * @param {Object} shelter - Shelter to improve
     * @param {number} deltaTime - Time since last update
     */
    improveShelter(shelter, deltaTime) {
        if (!this.shelterState.isBuilding) return;

        const improvementRate = this.construction.buildingSkill * deltaTime * 10; // 10x multiplier for progress
        this.shelterState.buildingProgress += improvementRate;

        // Check if improvement is complete
        if (this.shelterState.buildingProgress >= 100) {
            this.completeShelterImprovement(shelter);
        }
    }

    /**
     * Complete shelter improvement
     * @param {Object} shelter - Shelter that was improved
     */
    completeShelterImprovement(shelter) {
        // Improve shelter properties
        shelter.maintenanceLevel = Math.min(1.0, shelter.maintenanceLevel + 0.2);
        shelter.capacity = Math.floor(shelter.capacity * 1.1); // 10% capacity increase

        // Reset building state
        this.shelterState.isBuilding = false;
        this.shelterState.buildingProgress = 0;

        // Update statistics
        this.stats.sheltersImproved++;

        // Broadcast improvement completion
        this.broadcastShelterImprovement(shelter);

        console.log(`${this.villager.id} completed shelter improvement for ${shelter.id}`);
    }

    /**
     * Maintain shelter condition
     * @param {Object} shelter - Shelter to maintain
     * @param {number} deltaTime - Time since last update
     */
    maintainShelter(shelter, deltaTime) {
        // Gradual maintenance work
        const maintenanceRate = this.construction.buildingSkill * deltaTime * 5;
        shelter.maintenanceLevel = Math.min(1.0, shelter.maintenanceLevel + maintenanceRate);
    }

    /**
     * Monitor for threats around shelter
     * @param {Object} shelter - Shelter to monitor
     */
    monitorForThreats(shelter) {
        if (!this.environmentalAwareness) return;

        // Assess threat level around shelter
        const threatAssessment = this.environmentalAwareness.assessThreat(shelter.position);

        if (threatAssessment.overallThreat > 0.5) {
            // Alert other occupants
            this.alertShelterOccupants(shelter, threatAssessment);

            // Prepare defenses
            this.prepareDefenses(shelter);
        }
    }

    /**
     * Alert shelter occupants of threats
     * @param {Object} shelter - Current shelter
     * @param {Object} threatAssessment - Threat assessment data
     */
    alertShelterOccupants(shelter, threatAssessment) {
        if (!this.communicationSystem) return;

        for (const occupant of shelter.occupants) {
            if (occupant !== this.villager) {
                this.communicationSystem.sendMessage(
                    this.villager,
                    'danger_warning',
                    {
                        threat: threatAssessment.threats[0], // Primary threat
                        threatLevel: threatAssessment.overallThreat,
                        position: shelter.position,
                        shelterDefense: true
                    },
                    { targetAgent: occupant }
                );
            }
        }
    }

    /**
     * Prepare shelter defenses
     * @param {Object} shelter - Shelter to defend
     */
    prepareDefenses(shelter) {
        // Increase fortification level
        shelter.fortificationLevel = Math.min(1.0, shelter.fortificationLevel + 0.1);

        // Coordinate with other guards
        this.coordinateDefense(shelter);

        this.stats.shelterDefenses++;
    }

    /**
     * Coordinate defense with other guards
     * @param {Object} shelter - Shelter to coordinate defense for
     */
    coordinateDefense(shelter) {
        const guards = Array.from(shelter.occupants).filter(occupant =>
            occupant.shelterSystem && occupant.shelterSystem.shelterState.shelterRole === 'guard'
        );

        if (guards.length > 1) {
            // Assign defensive positions
            this.assignDefensivePositions(shelter, guards);
        }
    }

    /**
     * Assign defensive positions to guards
     * @param {Object} shelter - Shelter to defend
     * @param {Array} guards - Array of guard occupants
     */
    assignDefensivePositions(shelter, guards) {
        // Simple defensive positioning
        const positions = this.calculateDefensivePositions(shelter, guards.length);

        guards.forEach((guard, index) => {
            if (positions[index] && this.communicationSystem) {
                this.communicationSystem.sendMessage(
                    this.villager,
                    'shelter_construction',
                    {
                        action: 'defensive_position',
                        position: positions[index],
                        shelter
                    },
                    { targetAgent: guard }
                );
            }
        });
    }

    /**
     * Calculate defensive positions around shelter
     * @param {Object} shelter - Shelter to defend
     * @param {number} guardCount - Number of guards
     * @returns {Array} - Array of defensive positions
     */
    calculateDefensivePositions(shelter, guardCount) {
        const positions = [];
        const radius = 8; // 8 units from shelter center

        for (let i = 0; i < guardCount; i++) {
            const angle = (i / guardCount) * Math.PI * 2;
            const position = new BABYLON.Vector3(
                shelter.position.x + Math.cos(angle) * radius,
                shelter.position.y,
                shelter.position.z + Math.sin(angle) * radius
            );
            positions.push(position);
        }

        return positions;
    }

    /**
     * Rest and recover while in shelter
     * @param {number} deltaTime - Time since last update
     */
    restAndRecover(deltaTime) {
        // Restore stamina if survival instinct is available
        if (this.villager.survivalInstinct) {
            const { survivalState } = this.villager.survivalInstinct;
            const restRate = 10; // Stamina per second
            survivalState.stamina = Math.min(
                this.villager.survivalInstinct.config.staminaMax,
                survivalState.stamina + restRate * deltaTime
            );

            // Reduce panic level while in shelter
            survivalState.panicLevel = Math.max(0, survivalState.panicLevel - deltaTime * 0.2);
        }
    }

    /**
     * Consider building a new shelter
     */
    considerBuildingShelter() {
        // Check if we have the skills and resources
        if (this.construction.buildingSkill < 0.4) {
            return; // Not skilled enough
        }

        // Check if we have sufficient resources
        const requiredMaterials = 20;
        const requiredTools = 5;

        if (this.resources.materials < requiredMaterials || this.resources.tools < requiredTools) {
            // Try to gather resources first
            this.gatherResourcesForShelter();
            return;
        }

        // Find a good location for the shelter
        const buildLocation = this.findShelterBuildLocation();

        if (buildLocation) {
            this.startShelterConstruction(buildLocation);
        }
    }

    /**
     * Find suitable location for building shelter
     * @returns {BABYLON.Vector3|null} - Build location or null
     */
    findShelterBuildLocation() {
        const villagerPos = this.villager.mesh.position;
        const searchRadius = 30;

        // Look for elevated, safe locations
        for (let attempts = 0; attempts < 10; attempts++) {
            const angle = Math.random() * Math.PI * 2;
            const distance = Math.random() * searchRadius;

            const testPos = new BABYLON.Vector3(
                villagerPos.x + Math.cos(angle) * distance,
                0,
                villagerPos.z + Math.sin(angle) * distance
            );

            testPos.y = this.getTerrainHeight(testPos.x, testPos.z);

            // Check if location is safe
            if (this.environmentalAwareness) {
                const threatAssessment = this.environmentalAwareness.assessThreat(testPos);
                if (threatAssessment.safetyScore > 0.6) {
                    return testPos;
                }
            } else {
                return testPos; // Fallback if no environmental awareness
            }
        }

        return null;
    }

    /**
     * Start shelter construction
     * @param {BABYLON.Vector3} location - Build location
     */
    startShelterConstruction(location) {
        const shelterId = `built_shelter_${Date.now()}_${this.villager.id}`;

        const newShelter = {
            id: shelterId,
            type: 'built_shelter',
            position: location,
            capacity: 4,
            safety: 0.7,
            accessibility: 1.0,
            resources: {},
            condition: 'under_construction',
            lastSeen: performance.now(),
            discoveredBy: this.villager.id,
            occupants: new Set(),
            fortificationLevel: 0,
            maintenanceLevel: 0.5,
            constructionProgress: 0,
            builder: this.villager
        };

        // Add to construction projects
        this.construction.activeProjects.add(shelterId);
        this.construction.plannedShelters.set(shelterId, {
            shelter: newShelter,
            startTime: performance.now(),
            estimatedCompletion: performance.now() + this.config.shelterBuildingTime
        });

        // Add to shelter knowledge
        this.shelterKnowledge.knownShelters.set(shelterId, newShelter);

        // Start building
        this.shelterState.isBuilding = true;
        this.shelterState.buildingProgress = 0;

        // Move to build location
        this.villager.destination = location;
        this.villager.changeState('moving_to_target');

        // Broadcast construction start
        this.broadcastShelterConstruction(newShelter);

        console.log(`${this.villager.id} started building shelter at ${location.x}, ${location.z}`);
    }

    /**
     * Broadcast shelter construction to nearby villagers
     * @param {Object} shelter - Shelter being constructed
     */
    broadcastShelterConstruction(shelter) {
        if (!this.communicationSystem) return;

        this.communicationSystem.sendMessage(
            this.villager,
            'shelter_construction',
            {
                action: 'construction_started',
                shelter,
                builder: this.villager,
                helpNeeded: true
            },
            { range: this.config.resourceSharingRange }
        );
    }

    /**
     * Manage resources for shelter system
     * @param {number} deltaTime - Time since last update
     */
    manageResources(deltaTime) {
        const now = performance.now();

        // Throttle resource updates
        if (now - this.lastResourceCheck < 1000) return;
        this.lastResourceCheck = now;

        // Update resource needs
        this.updateResourceNeeds();

        // Check for resource sharing opportunities
        this.checkResourceSharing();

        // Decay resources over time (spoilage, usage)
        this.decayResources(deltaTime);
    }

    /**
     * Update current resource needs
     */
    updateResourceNeeds() {
        this.resources.resourceNeeds.clear();

        // Basic survival needs
        this.resources.resourceNeeds.set('food', 2);

        // Building needs
        if (this.shelterState.isBuilding || this.construction.activeProjects.size > 0) {
            this.resources.resourceNeeds.set('materials', 10);
            this.resources.resourceNeeds.set('tools', 3);
        }

        // Shelter maintenance needs
        if (this.shelterState.currentShelter && this.shelterState.currentShelter.maintenanceLevel < 0.8) {
            this.resources.resourceNeeds.set('materials', 5);
        }
    }

    /**
     * Check for resource sharing opportunities
     */
    checkResourceSharing() {
        if (!this.communicationSystem) return;

        // Check if we have excess resources to share
        const excessResources = this.calculateExcessResources();

        if (Object.keys(excessResources).length > 0) {
            this.offerResourceSharing(excessResources);
        }

        // Check if we need resources
        const neededResources = this.calculateNeededResources();

        if (Object.keys(neededResources).length > 0) {
            this.requestResources(neededResources);
        }
    }

    /**
     * Calculate excess resources available for sharing
     * @returns {Object} - Excess resources
     */
    calculateExcessResources() {
        const excess = {};

        for (const [resourceType, amount] of Object.entries(this.resources)) {
            if (typeof amount === 'number' && amount > 0) {
                const needed = this.resources.resourceNeeds.get(resourceType) || 0;
                const surplus = amount - needed;

                if (surplus > 2) { // Only share if we have significant surplus
                    excess[resourceType] = Math.floor(surplus * 0.5); // Share half of surplus
                }
            }
        }

        return excess;
    }

    /**
     * Calculate needed resources
     * @returns {Object} - Needed resources
     */
    calculateNeededResources() {
        const needed = {};

        for (const [resourceType, neededAmount] of this.resources.resourceNeeds) {
            const currentAmount = this.resources[resourceType] || 0;
            const shortage = neededAmount - currentAmount;

            if (shortage > 0) {
                needed[resourceType] = shortage;
            }
        }

        return needed;
    }

    /**
     * Offer to share excess resources
     * @param {Object} excessResources - Resources available for sharing
     */
    offerResourceSharing(excessResources) {
        this.communicationSystem.sendMessage(
            this.villager,
            'resource_request',
            {
                action: 'offer_resources',
                resources: excessResources,
                provider: this.villager
            },
            { range: this.config.resourceSharingRange }
        );
    }

    /**
     * Request needed resources
     * @param {Object} neededResources - Resources needed
     */
    requestResources(neededResources) {
        this.communicationSystem.sendMessage(
            this.villager,
            'resource_request',
            {
                action: 'request_resources',
                resources: neededResources,
                requester: this.villager,
                urgency: this.calculateResourceUrgency(neededResources)
            },
            { range: this.config.resourceSharingRange }
        );
    }

    /**
     * Calculate urgency of resource request
     * @param {Object} neededResources - Resources needed
     * @returns {number} - Urgency level (0-1)
     */
    calculateResourceUrgency(neededResources) {
        let urgency = 0;

        // Food is always urgent
        if (neededResources.food) {
            urgency = Math.max(urgency, 0.8);
        }

        // Building materials are urgent if actively building
        if (neededResources.materials && this.shelterState.isBuilding) {
            urgency = Math.max(urgency, 0.6);
        }

        // Tools are moderately urgent
        if (neededResources.tools) {
            urgency = Math.max(urgency, 0.4);
        }

        return urgency;
    }

    /**
     * Receive resource from another villager
     * @param {string} resourceType - Type of resource
     * @param {number} amount - Amount received
     */
    receiveResource(resourceType, amount) {
        this.resources[resourceType] = (this.resources[resourceType] || 0) + amount;
        this.stats.resourcesReceived += amount;
    }

    /**
     * Decay resources over time
     * @param {number} deltaTime - Time since last update
     */
    decayResources(deltaTime) {
        // Food spoils over time
        if (this.resources.food > 0) {
            const spoilageRate = 0.1; // 10% per hour
            const spoilage = this.resources.food * spoilageRate * (deltaTime / 3600);
            this.resources.food = Math.max(0, this.resources.food - spoilage);
        }

        // Tools wear out slowly
        if (this.resources.tools > 0) {
            const wearRate = 0.01; // 1% per hour
            const wear = this.resources.tools * wearRate * (deltaTime / 3600);
            this.resources.tools = Math.max(0, this.resources.tools - wear);
        }
    }
    /*
*
     * Update construction projects
     * @param {number} deltaTime - Time since last update
     */
    updateConstruction(deltaTime) {
        for (const [shelterId, project] of this.construction.plannedShelters) {
            const now = performance.now();

            // Check if construction is complete
            if (now >= project.estimatedCompletion) {
                this.completeShelterConstruction(shelterId, project);
            } else {
                // Update construction progress
                const progress = (now - project.startTime) / (project.estimatedCompletion - project.startTime);
                project.shelter.constructionProgress = Math.min(100, progress * 100);
            }
        }
    }

    /**
     * Complete shelter construction
     * @param {string} shelterId - ID of completed shelter
     * @param {Object} project - Construction project data
     */
    completeShelterConstruction(shelterId, project) {
        const { shelter } = project;

        // Update shelter status
        shelter.condition = 'good';
        shelter.constructionProgress = 100;
        shelter.maintenanceLevel = 1.0;

        // Remove from active projects
        this.construction.activeProjects.delete(shelterId);
        this.construction.plannedShelters.delete(shelterId);

        // Update statistics
        this.stats.sheltersBuilt++;

        // Broadcast completion
        this.broadcastShelterCompletion(shelter);

        // Add to environmental awareness as a safe zone
        if (this.environmentalAwareness) {
            this.environmentalAwareness.addSafeZone(shelter.position, 5, {
                type: 'built_shelter',
                capacity: shelter.capacity
            });
        }

        console.log(`${this.villager.id} completed construction of shelter ${shelterId}`);
    }

    /**
     * Check for maintenance needs
     * @param {number} deltaTime - Time since last update
     */
    checkMaintenanceNeeds(deltaTime) {
        if (!this.shelterState.currentShelter) return;

        const shelter = this.shelterState.currentShelter;

        // Check if maintenance is due
        if (shelter.maintenanceLevel < 0.7) {
            this.shelterState.maintenanceDue = true;

            // If we're a builder, start maintenance
            if (this.shelterState.shelterRole === 'builder') {
                this.startMaintenance(shelter);
            }
        }
    }

    /**
     * Start maintenance on shelter
     * @param {Object} shelter - Shelter to maintain
     */
    startMaintenance(shelter) {
        this.shelterState.isBuilding = true;
        this.shelterState.buildingProgress = 0;

        console.log(`${this.villager.id} started maintenance on shelter ${shelter.id}`);
    }

    /**
     * Coordinate shelter activities with other occupants
     * @param {number} deltaTime - Time since last update
     */
    coordinateShelterActivities(deltaTime) {
        if (!this.shelterState.currentShelter) return;

        // Update list of sheltermates
        this.updateSheltermates();

        // Coordinate based on role
        if (this.shelterState.shelterRole === 'organizer') {
            this.coordinateAsOrganizer(deltaTime);
        }
    }

    /**
     * Update list of current sheltermates
     */
    updateSheltermates() {
        if (!this.shelterState.currentShelter) return;

        this.shelterState.sheltermates.clear();

        for (const occupant of this.shelterState.currentShelter.occupants) {
            if (occupant !== this.villager) {
                this.shelterState.sheltermates.add(occupant);
            }
        }
    }

    /**
     * Coordinate activities as shelter organizer
     * @param {number} deltaTime - Time since last update
     */
    coordinateAsOrganizer(deltaTime) {
        const shelter = this.shelterState.currentShelter;

        // Check shelter capacity and manage occupancy
        this.manageShelterCapacity(shelter);

        // Organize resource collection
        this.organizeResourceCollection(shelter);

        // Plan shelter improvements
        this.planShelterImprovements(shelter);

        // Coordinate with other shelters
        this.coordinateWithOtherShelters(shelter);
    }

    /**
     * Manage shelter capacity
     * @param {Object} shelter - Shelter to manage
     */
    manageShelterCapacity(shelter) {
        const occupancyRate = shelter.occupants.size / shelter.capacity;

        if (occupancyRate > 1.0 + this.config.shelterCapacityBuffer) {
            // Shelter is overcrowded, need to manage
            this.handleOvercrowding(shelter);
        } else if (occupancyRate < 0.3) {
            // Shelter is underutilized, invite more villagers
            this.inviteMoreOccupants(shelter);
        }
    }

    /**
     * Handle shelter overcrowding
     * @param {Object} shelter - Overcrowded shelter
     */
    handleOvercrowding(shelter) {
        // Find least essential occupants to relocate
        const relocateCandidates = this.findRelocationCandidates(shelter);

        for (const candidate of relocateCandidates) {
            // Find alternative shelter for them
            const alternativeShelter = this.findAlternativeShelter(candidate, shelter);

            if (alternativeShelter) {
                this.suggestRelocation(candidate, alternativeShelter);
            }
        }
    }

    /**
     * Find candidates for relocation
     * @param {Object} shelter - Current shelter
     * @returns {Array} - Array of relocation candidates
     */
    findRelocationCandidates(shelter) {
        const candidates = [];

        // Prioritize occupants over essential roles
        for (const occupant of shelter.occupants) {
            if (occupant.shelterSystem && occupant.shelterSystem.shelterState.shelterRole === 'occupant') {
                candidates.push(occupant);
            }
        }

        return candidates;
    }

    /**
     * Handle received messages
     * @param {Object} message - Received message
     */
    handleMessage(message) {
        switch (message.type) {
            case 'shelter_info':
                this.handleShelterInfoMessage(message);
                break;
            case 'resource_request':
                this.handleResourceRequestMessage(message);
                break;
            case 'shelter_construction':
                this.handleShelterConstructionMessage(message);
                break;
            case 'evacuation_order':
                this.handleEvacuationOrderMessage(message);
                break;
        }
    }

    /**
     * Handle shelter information message
     * @param {Object} message - Shelter info message
     */
    handleShelterInfoMessage(message) {
        const { action } = message.content;
        const { shelter } = message.content;

        switch (action) {
            case 'shelter_discovered':
                // Add to our knowledge if we don't know about it
                if (!this.shelterKnowledge.knownShelters.has(shelter.id)) {
                    this.shelterKnowledge.knownShelters.set(shelter.id, shelter);
                }
                break;

            case 'shelter_capacity_update':
                // Update capacity information
                const knownShelter = this.shelterKnowledge.knownShelters.get(shelter.id);
                if (knownShelter) {
                    knownShelter.occupants = shelter.occupants;
                    knownShelter.capacity = shelter.capacity;
                }
                break;
        }
    }

    /**
     * Handle resource request message
     * @param {Object} message - Resource request message
     */
    handleResourceRequestMessage(message) {
        const { action } = message.content;

        switch (action) {
            case 'offer_resources':
                this.handleResourceOffer(message);
                break;
            case 'request_resources':
                this.handleResourceRequest(message);
                break;
        }
    }

    /**
     * Handle resource offer
     * @param {Object} message - Resource offer message
     */
    handleResourceOffer(message) {
        const offeredResources = message.content.resources;
        const { provider } = message.content;

        // Check if we need any of the offered resources
        const neededResources = this.calculateNeededResources();

        for (const [resourceType, offeredAmount] of Object.entries(offeredResources)) {
            if (neededResources[resourceType]) {
                const amountToTake = Math.min(offeredAmount, neededResources[resourceType]);

                // Accept the resource offer
                this.acceptResourceOffer(provider, resourceType, amountToTake);
            }
        }
    }

    /**
     * Handle resource request
     * @param {Object} message - Resource request message
     */
    handleResourceRequest(message) {
        const requestedResources = message.content.resources;
        const { requester } = message.content;
        const { urgency } = message.content;

        // Check if we can help
        const excessResources = this.calculateExcessResources();

        for (const [resourceType, requestedAmount] of Object.entries(requestedResources)) {
            if (excessResources[resourceType]) {
                const amountToGive = Math.min(excessResources[resourceType], requestedAmount);

                // Consider helping based on relationship and urgency
                if (this.shouldHelpWithResources(requester, urgency)) {
                    this.provideResource(requester, resourceType, amountToGive);
                }
            }
        }
    }

    /**
     * Determine if we should help with resources
     * @param {Object} requester - Villager requesting help
     * @param {number} urgency - Urgency level
     * @returns {boolean} - Whether to help
     */
    shouldHelpWithResources(requester, urgency) {
        let helpChance = 0.3; // Base chance

        // Urgency factor
        helpChance += urgency * 0.4;

        // Relationship factor
        if (this.socialNetwork) {
            const relationship = this.socialNetwork.relationships.get(requester.id);
            if (relationship) {
                helpChance += relationship.cooperation * 0.3;
                helpChance += relationship.trust * 0.2;
            }

            // Personality factor
            helpChance += this.socialNetwork.personality.agreeableness * 0.3;
            helpChance += this.socialNetwork.personality.empathy * 0.2;
        }

        return Math.random() < Math.min(0.9, helpChance);
    }

    /**
     * Get shelter system statistics
     * @returns {Object} - Statistics object
     */
    getStatistics() {
        return {
            ...this.stats,
            currentShelter: this.shelterState.currentShelter ? this.shelterState.currentShelter.id : null,
            shelterRole: this.shelterState.shelterRole,
            knownShelters: this.shelterKnowledge.knownShelters.size,
            preferredShelters: this.shelterKnowledge.preferredShelters.size,
            resources: { ...this.resources },
            buildingSkill: this.construction.buildingSkill,
            fortificationSkill: this.construction.fortificationSkill,
            activeProjects: this.construction.activeProjects.size,
            isBuilding: this.shelterState.isBuilding,
            buildingProgress: this.shelterState.buildingProgress
        };
    }

    /**
     * Get current shelter state
     * @returns {Object} - Current shelter state
     */
    getShelterState() {
        return {
            inShelter: this.shelterState.currentShelter !== null,
            shelterId: this.shelterState.currentShelter ? this.shelterState.currentShelter.id : null,
            role: this.shelterState.shelterRole,
            sheltermates: this.shelterState.sheltermates.size,
            timeInShelter: this.shelterState.currentShelter
                ? (performance.now() - this.shelterState.entryTime) / 1000 : 0,
            isBuilding: this.shelterState.isBuilding,
            buildingProgress: this.shelterState.buildingProgress,
            resourceContributions: this.shelterState.contributedResources,
            maintenanceDue: this.shelterState.maintenanceDue
        };
    }

    /**
     * Force shelter entry (for testing or special events)
     * @param {string} shelterId - ID of shelter to enter
     */
    forceShelterEntry(shelterId) {
        const shelter = this.shelterKnowledge.knownShelters.get(shelterId);
        if (shelter) {
            this.enterShelter(shelter);
        }
    }

    /**
     * Force shelter construction (for testing)
     * @param {BABYLON.Vector3} location - Location to build
     */
    forceShelterConstruction(location) {
        this.startShelterConstruction(location);
    }

    /**
     * Dispose of the shelter system
     */
    dispose() {
        // Exit current shelter
        if (this.shelterState.currentShelter) {
            this.exitShelter();
        }

        // Unregister from systems
        if (this.communicationSystem) {
            this.communicationSystem.unregisterAgent(this.villager);
        }

        if (this.environmentalAwareness) {
            this.environmentalAwareness.unregisterAgent(this.villager);
        }

        // Clear all data structures
        this.shelterKnowledge.knownShelters.clear();
        this.shelterKnowledge.shelterHistory.clear();
        this.shelterKnowledge.preferredShelters.clear();
        this.shelterKnowledge.blacklistedShelters.clear();

        this.resources.sharedResources.clear();
        this.resources.resourceNeeds.clear();

        this.construction.plannedShelters.clear();
        this.construction.activeProjects.clear();

        this.shelterState.sheltermates.clear();

        console.log(`Villager Shelter System disposed for ${this.villager.id}`);
    }

    // Helper methods for message broadcasting and coordination

    broadcastShelterMovement(shelter) {
        if (!this.communicationSystem) return;

        this.communicationSystem.sendMessage(
            this.villager,
            'shelter_info',
            {
                action: 'moving_to_shelter',
                shelter,
                villager: this.villager
            }
        );
    }

    broadcastShelterImprovement(shelter) {
        if (!this.communicationSystem) return;

        this.communicationSystem.sendMessage(
            this.villager,
            'shelter_construction',
            {
                action: 'improvement_completed',
                shelter,
                improver: this.villager
            },
            { range: this.config.resourceSharingRange }
        );
    }

    broadcastShelterCompletion(shelter) {
        if (!this.communicationSystem) return;

        this.communicationSystem.sendMessage(
            this.villager,
            'shelter_construction',
            {
                action: 'construction_completed',
                shelter,
                builder: this.villager
            },
            { range: this.config.resourceSharingRange * 2 } // Wider broadcast for completion
        );
    }

    acceptResourceOffer(provider, resourceType, amount) {
        if (!this.communicationSystem) return;

        this.communicationSystem.sendMessage(
            this.villager,
            'resource_request',
            {
                action: 'accept_offer',
                resourceType,
                amount,
                recipient: this.villager
            },
            { targetAgent: provider }
        );
    }

    provideResource(requester, resourceType, amount) {
        // Remove from our resources
        this.resources[resourceType] = (this.resources[resourceType] || 0) - amount;

        // Send to requester
        if (this.communicationSystem) {
            this.communicationSystem.sendMessage(
                this.villager,
                'resource_request',
                {
                    action: 'provide_resource',
                    resourceType,
                    amount,
                    provider: this.villager
                },
                { targetAgent: requester }
            );
        }

        this.stats.resourcesShared += amount;
        this.stats.cooperativeActions++;
    }

    // Placeholder methods for complex operations

    gatherResourcesForShelter() {
        // Would implement resource gathering behavior
        console.log(`${this.villager.id} gathering resources for shelter construction`);
    }

    planShelterImprovements(shelter) {
        // Would analyze shelter and plan improvements
    }

    coordinateWithOtherShelters(shelter) {
        // Would coordinate with other shelter organizers
    }

    organizeResourceCollection(shelter) {
        // Would organize resource gathering expeditions
    }

    inviteMoreOccupants(shelter) {
        // Would invite nearby villagers to underutilized shelter
    }

    findAlternativeShelter(villager, currentShelter) {
        // Would find alternative shelter for relocation
        return null;
    }

    suggestRelocation(villager, alternativeShelter) {
        // Would suggest relocation to another villager
    }

    reportThreats(shelter) {
        // Would report detected threats to other occupants
    }

    assistWithMaintenance(shelter, deltaTime) {
        // Would help with shelter maintenance
    }

    shareInformationWithOccupants(shelter) {
        // Would share information with other shelter occupants
    }

    handleShelterConstructionMessage(message) {
        // Would handle construction-related messages
    }

    handleEvacuationOrderMessage(message) {
        // Would handle evacuation orders
        this.exitShelter();
        this.seekShelter();
    }
}
