/**
 * Zombie Group Manager Component
 * Handles group formation, role assignment, and coordinated behaviors
 */

export class ZombieGroupManager {
    constructor(scene, options = {}) {
        this.scene = scene;

        // Configuration
        this.config = {
            maxGroupSize: options.maxGroupSize || 6,
            minGroupSize: options.minGroupSize || 2,
            formationRadius: options.formationRadius || 8,
            leadershipDuration: options.leadershipDuration || 30000, // 30 seconds
            coordinationRange: options.coordinationRange || 25,
            roleRotationInterval: options.roleRotationInterval || 15000, // 15 seconds
            formationTightness: options.formationTightness || 0.7, // 0-1
            aggressionBonus: options.aggressionBonus || 0.3 // Group aggression bonus
        };

        // Group management
        this.groups = new Map(); // groupId -> group data
        this.zombieGroups = new Map(); // zombieId -> groupId
        this.groupIdCounter = 0;

        // Formation patterns
        this.formationPatterns = {
            line: this.createLineFormation.bind(this),
            wedge: this.createWedgeFormation.bind(this),
            circle: this.createCircleFormation.bind(this),
            swarm: this.createSwarmFormation.bind(this),
            pincer: this.createPincerFormation.bind(this)
        };

        // Role definitions
        this.roleDefinitions = {
            leader: {
                priority: 1,
                maxCount: 1,
                responsibilities: ['navigation', 'decision_making', 'coordination'],
                bonuses: { aggression: 0.2, detection: 0.3 }
            },
            scout: {
                priority: 2,
                maxCount: 2,
                responsibilities: ['reconnaissance', 'target_spotting', 'flanking'],
                bonuses: { speed: 0.3, detection: 0.5 }
            },
            flanker: {
                priority: 3,
                maxCount: 2,
                responsibilities: ['flanking', 'ambush', 'cutting_off_escape'],
                bonuses: { speed: 0.2, stealth: 0.3 }
            },
            bruiser: {
                priority: 4,
                maxCount: 2,
                responsibilities: ['direct_assault', 'breaking_defenses', 'intimidation'],
                bonuses: { aggression: 0.4, persistence: 0.3 }
            },
            follower: {
                priority: 5,
                maxCount: Infinity,
                responsibilities: ['support', 'following_orders', 'backup'],
                bonuses: { coordination: 0.2 }
            }
        };

        // Communication and external systems
        this.communicationSystem = null;
        this.environmentalAwareness = null;

        // Performance tracking
        this.stats = {
            groupsFormed: 0,
            groupsDisbanded: 0,
            successfulCoordinations: 0,
            failedCoordinations: 0,
            averageGroupSize: 0,
            roleAssignments: 0
        };

        // Update timing
        this.lastUpdate = 0;
        this.updateInterval = 200; // Update every 200ms
    }

    /**
     * Initialize the group manager
     * @param {Object} systems - External systems
     */
    initialize(systems = {}) {
        this.communicationSystem = systems.communication;
        this.environmentalAwareness = systems.environmental;

        // Set up update loop
        if (this.scene) {
            this.scene.onBeforeRenderObservable.add(() => {
                const deltaTime = this.scene.getEngine().getDeltaTime() * 0.001;
                this.update(deltaTime);
            });
        }

        console.log('Zombie Group Manager initialized');
    }

    /**
     * Update the group manager
     * @param {number} deltaTime - Time since last update
     */
    update(deltaTime) {
        const now = performance.now();

        // Throttle updates for performance
        if (now - this.lastUpdate < this.updateInterval) {
            return;
        }

        this.lastUpdate = now;

        // Update all groups
        for (const [groupId, group] of this.groups) {
            this.updateGroup(group, deltaTime);
        }

        // Check for group formation opportunities
        this.checkGroupFormationOpportunities();

        // Handle role rotations
        this.handleRoleRotations();

        // Clean up disbanded groups
        this.cleanupDisbandedGroups();
    }

    /**
     * Add a zombie to group management
     * @param {Object} zombie - Zombie to add
     */
    addZombie(zombie) {
        if (!zombie.groupManager) {
            zombie.groupManager = this;
        }

        // Try to add to existing group or create new one
        const nearbyGroups = this.findNearbyGroups(zombie.mesh.position);

        if (nearbyGroups.length > 0) {
            // Try to join the best nearby group
            const bestGroup = this.selectBestGroupForZombie(zombie, nearbyGroups);
            if (bestGroup && this.canJoinGroup(zombie, bestGroup)) {
                this.addZombieToGroup(zombie, bestGroup.id);
            }
        } else {
            // Look for other zombies to form a new group with
            this.checkForGroupFormation(zombie);
        }
    }

    /**
     * Remove a zombie from group management
     * @param {Object} zombie - Zombie to remove
     */
    removeZombie(zombie) {
        const groupId = this.zombieGroups.get(zombie.id);
        if (groupId) {
            this.removeZombieFromGroup(zombie, groupId);
        }
    }

    /**
     * Create a new group with initial zombies
     * @param {Array} zombies - Initial zombies for the group
     * @param {Object} options - Group options
     * @returns {string} - Group ID
     */
    createGroup(zombies, options = {}) {
        const groupId = `group_${++this.groupIdCounter}`;

        const group = {
            id: groupId,
            members: new Set(),
            leader: null,
            roles: new Map(), // zombieId -> role
            formation: options.formation || 'swarm',
            target: null,
            objective: options.objective || 'hunt',
            createdAt: performance.now(),
            lastRoleRotation: performance.now(),
            cohesion: 1.0,
            morale: 1.0,
            effectiveness: 0.5,

            // Group state
            state: 'forming',
            lastStateChange: performance.now(),

            // Coordination data
            rallyPoint: null,
            formationPositions: new Map(),
            groupStrategy: 'aggressive',

            // Performance tracking
            successfulActions: 0,
            failedActions: 0,
            targetsEliminated: 0
        };

        this.groups.set(groupId, group);

        // Add initial zombies
        for (const zombie of zombies) {
            this.addZombieToGroup(zombie, groupId);
        }

        // Assign initial roles
        this.assignRoles(group);

        // Set initial formation
        this.updateFormation(group);

        // Broadcast group formation
        this.broadcastGroupFormation(group);

        this.stats.groupsFormed++;

        console.log(`Created zombie group ${groupId} with ${zombies.length} members`);

        return groupId;
    }

    /**
     * Add a zombie to an existing group
     * @param {Object} zombie - Zombie to add
     * @param {string} groupId - Group ID
     */
    addZombieToGroup(zombie, groupId) {
        const group = this.groups.get(groupId);
        if (!group) return false;

        // Check group size limits
        if (group.members.size >= this.config.maxGroupSize) {
            return false;
        }

        // Remove from previous group if any
        const previousGroupId = this.zombieGroups.get(zombie.id);
        if (previousGroupId) {
            this.removeZombieFromGroup(zombie, previousGroupId);
        }

        // Add to new group
        group.members.add(zombie);
        this.zombieGroups.set(zombie.id, groupId);

        // Assign role
        const role = this.assignRoleToZombie(zombie, group);
        group.roles.set(zombie.id, role);

        // Update zombie's group reference
        zombie.currentGroup = group;
        zombie.groupRole = role;

        // Apply role bonuses
        this.applyRoleBonuses(zombie, role);

        // Update formation
        this.updateFormation(group);

        // Broadcast group change
        this.broadcastGroupChange(group, 'member_joined', { zombie, role });

        console.log(`Zombie ${zombie.id} joined group ${groupId} as ${role}`);

        return true;
    }

    /**
     * Remove a zombie from a group
     * @param {Object} zombie - Zombie to remove
     * @param {string} groupId - Group ID
     */
    removeZombieFromGroup(zombie, groupId) {
        const group = this.groups.get(groupId);
        if (!group) return;

        // Remove from group
        group.members.delete(zombie);
        group.roles.delete(zombie.id);
        this.zombieGroups.delete(zombie.id);

        // Clear zombie's group reference
        zombie.currentGroup = null;
        zombie.groupRole = null;

        // Remove role bonuses
        this.removeRoleBonuses(zombie);

        // Check if group should be disbanded
        if (group.members.size < this.config.minGroupSize) {
            this.disbandGroup(groupId);
        } else {
            // Reassign roles if leader left
            if (group.leader === zombie) {
                this.assignRoles(group);
            }

            // Update formation
            this.updateFormation(group);

            // Broadcast group change
            this.broadcastGroupChange(group, 'member_left', { zombie });
        }

        console.log(`Zombie ${zombie.id} left group ${groupId}`);
    }

    /**
     * Disband a group
     * @param {string} groupId - Group ID to disband
     */
    disbandGroup(groupId) {
        const group = this.groups.get(groupId);
        if (!group) return;

        // Remove all zombies from group
        for (const zombie of group.members) {
            this.zombieGroups.delete(zombie.id);
            zombie.currentGroup = null;
            zombie.groupRole = null;
            this.removeRoleBonuses(zombie);
        }

        // Broadcast group disbandment
        this.broadcastGroupChange(group, 'disbanded');

        // Remove group
        this.groups.delete(groupId);
        this.stats.groupsDisbanded++;

        console.log(`Disbanded zombie group ${groupId}`);
    }

    /**
     * Assign roles to all zombies in a group
     * @param {Object} group - Group to assign roles for
     */
    assignRoles(group) {
        const zombies = Array.from(group.members);
        const roleAssignments = new Map();

        // Clear existing roles
        group.roles.clear();
        group.leader = null;

        // Sort zombies by suitability for leadership
        zombies.sort((a, b) => this.calculateLeadershipScore(b) - this.calculateLeadershipScore(a));

        // Assign roles based on priority and availability
        const roleCounts = new Map();

        for (const zombie of zombies) {
            const bestRole = this.selectBestRoleForZombie(zombie, group, roleCounts);

            group.roles.set(zombie.id, bestRole);
            roleAssignments.set(zombie.id, bestRole);

            // Update role count
            roleCounts.set(bestRole, (roleCounts.get(bestRole) || 0) + 1);

            // Set leader
            if (bestRole === 'leader') {
                group.leader = zombie;
            }

            // Apply role to zombie
            zombie.groupRole = bestRole;
            this.applyRoleBonuses(zombie, bestRole);

            this.stats.roleAssignments++;
        }

        // Broadcast role assignments
        this.broadcastGroupChange(group, 'roles_assigned', { assignments: roleAssignments });

        console.log(`Assigned roles for group ${group.id}:`, Object.fromEntries(roleAssignments));
    }

    /**
     * Select the best role for a zombie
     * @param {Object} zombie - Zombie to assign role to
     * @param {Object} group - Group context
     * @param {Map} roleCounts - Current role counts
     * @returns {string} - Best role for the zombie
     */
    selectBestRoleForZombie(zombie, group, roleCounts) {
        const roleScores = new Map();

        // Calculate suitability score for each role
        for (const [roleName, roleDefinition] of Object.entries(this.roleDefinitions)) {
            const currentCount = roleCounts.get(roleName) || 0;

            // Skip if role is at max capacity
            if (currentCount >= roleDefinition.maxCount) {
                continue;
            }

            let score = this.calculateRoleSuitability(zombie, roleName);

            // Boost score for high-priority roles that are needed
            if (currentCount === 0) {
                score += (6 - roleDefinition.priority) * 0.2;
            }

            roleScores.set(roleName, score);
        }

        // Select role with highest score
        let bestRole = 'follower';
        let bestScore = 0;

        for (const [role, score] of roleScores) {
            if (score > bestScore) {
                bestRole = role;
                bestScore = score;
            }
        }

        return bestRole;
    }

    /**
     * Calculate how suitable a zombie is for a specific role
     * @param {Object} zombie - Zombie to evaluate
     * @param {string} role - Role to evaluate for
     * @returns {number} - Suitability score (0-1)
     */
    calculateRoleSuitability(zombie, role) {
        let score = 0.5; // Base score

        // Get zombie's intelligence if available
        const { intelligence } = zombie;

        switch (role) {
            case 'leader':
                score += this.calculateLeadershipScore(zombie) * 0.5;
                if (intelligence) {
                    score += intelligence.adaptation.successRate * 0.3;
                    score += intelligence.config.aggressionLevel * 0.2;
                }
                break;

            case 'scout':
                if (intelligence) {
                    score += intelligence.config.curiosityLevel * 0.4;
                    score += (1 - intelligence.config.aggressionLevel) * 0.2; // Less aggressive scouts
                }
                // Prefer zombies with good detection history
                if (zombie.detectionSuccesses) {
                    score += Math.min(zombie.detectionSuccesses / 10, 0.3);
                }
                break;

            case 'flanker':
                if (intelligence) {
                    score += intelligence.config.aggressionLevel * 0.3;
                    score += intelligence.config.curiosityLevel * 0.2;
                }
                // Prefer faster zombies
                if (zombie.speed) {
                    score += Math.min(zombie.speed / 0.1, 0.3);
                }
                break;

            case 'bruiser':
                if (intelligence) {
                    score += intelligence.config.aggressionLevel * 0.5;
                    score += intelligence.config.persistenceLevel * 0.3;
                }
                // Prefer zombies with combat success
                if (zombie.combatSuccesses) {
                    score += Math.min(zombie.combatSuccesses / 5, 0.2);
                }
                break;

            case 'follower':
                // Followers are good for zombies that don't excel in other roles
                score = 0.4; // Lower base score, but always available
                break;
        }

        return Math.min(1.0, Math.max(0.0, score));
    }

    /**
     * Calculate leadership score for a zombie
     * @param {Object} zombie - Zombie to evaluate
     * @returns {number} - Leadership score (0-1)
     */
    calculateLeadershipScore(zombie) {
        let score = 0.5;

        const { intelligence } = zombie;
        if (intelligence) {
            // Success rate is important for leadership
            score += intelligence.adaptation.successRate * 0.3;

            // Balanced aggression is good for leaders
            const aggressionBalance = 1 - Math.abs(intelligence.config.aggressionLevel - 0.6);
            score += aggressionBalance * 0.2;

            // Memory and experience matter
            score += Math.min(intelligence.memory.targets.size / 10, 0.2);

            // Persistence is valuable
            score += intelligence.config.persistenceLevel * 0.2;
        }

        // Experience bonus
        if (zombie.groupLeadershipTime) {
            score += Math.min(zombie.groupLeadershipTime / 60000, 0.1); // Up to 1 minute experience
        }

        return Math.min(1.0, Math.max(0.0, score));
    }

    /**
     * Apply role bonuses to a zombie
     * @param {Object} zombie - Zombie to apply bonuses to
     * @param {string} role - Role to apply bonuses for
     */
    applyRoleBonuses(zombie, role) {
        const roleDefinition = this.roleDefinitions[role];
        if (!roleDefinition || !roleDefinition.bonuses) return;

        // Store original values if not already stored
        if (!zombie.originalStats) {
            zombie.originalStats = {
                aggression: zombie.aggressionLevel || 0.5,
                speed: zombie.speed || 0.03,
                detection: zombie.detectionRange || 40,
                stealth: zombie.stealthLevel || 0,
                persistence: zombie.persistenceLevel || 0.7,
                coordination: zombie.coordinationBonus || 0
            };
        }

        // Apply bonuses
        for (const [stat, bonus] of Object.entries(roleDefinition.bonuses)) {
            switch (stat) {
                case 'aggression':
                    zombie.aggressionLevel = (zombie.originalStats.aggression || 0.5) + bonus;
                    break;
                case 'speed':
                    zombie.speed = (zombie.originalStats.speed || 0.03) * (1 + bonus);
                    break;
                case 'detection':
                    zombie.detectionRange = (zombie.originalStats.detection || 40) * (1 + bonus);
                    break;
                case 'stealth':
                    zombie.stealthLevel = (zombie.originalStats.stealth || 0) + bonus;
                    break;
                case 'persistence':
                    zombie.persistenceLevel = (zombie.originalStats.persistence || 0.7) + bonus;
                    break;
                case 'coordination':
                    zombie.coordinationBonus = (zombie.originalStats.coordination || 0) + bonus;
                    break;
            }
        }

        // Apply group aggression bonus
        if (zombie.aggressionLevel) {
            zombie.aggressionLevel += this.config.aggressionBonus;
        }
    }

    /**
     * Remove role bonuses from a zombie
     * @param {Object} zombie - Zombie to remove bonuses from
     */
    removeRoleBonuses(zombie) {
        if (!zombie.originalStats) return;

        // Restore original values
        zombie.aggressionLevel = zombie.originalStats.aggression;
        zombie.speed = zombie.originalStats.speed;
        zombie.detectionRange = zombie.originalStats.detection;
        zombie.stealthLevel = zombie.originalStats.stealth;
        zombie.persistenceLevel = zombie.originalStats.persistence;
        zombie.coordinationBonus = zombie.originalStats.coordination;

        delete zombie.originalStats;
    }

    /**
     * Update group formation
     * @param {Object} group - Group to update formation for
     */
    updateFormation(group) {
        if (group.members.size < 2) return;

        const formationFunction = this.formationPatterns[group.formation];
        if (!formationFunction) return;

        // Calculate formation positions
        const positions = formationFunction(group);

        // Assign positions to zombies
        let index = 0;
        for (const zombie of group.members) {
            if (index < positions.length) {
                group.formationPositions.set(zombie.id, positions[index]);
                zombie.formationPosition = positions[index];
            }
            index++;
        }
    }

    /**
     * Create line formation positions
     * @param {Object} group - Group to create formation for
     * @returns {Array} - Array of formation positions
     */
    createLineFormation(group) {
        const positions = [];
        const memberCount = group.members.size;
        const spacing = this.config.formationRadius / Math.max(1, memberCount - 1);

        // Center the line
        const startOffset = -(memberCount - 1) * spacing / 2;

        for (let i = 0; i < memberCount; i++) {
            positions.push({
                x: startOffset + i * spacing,
                z: 0,
                role: i === 0 ? 'leader' : 'follower'
            });
        }

        return positions;
    }

    /**
     * Create wedge formation positions
     * @param {Object} group - Group to create formation for
     * @returns {Array} - Array of formation positions
     */
    createWedgeFormation(group) {
        const positions = [];
        const memberCount = group.members.size;

        // Leader at the front
        positions.push({ x: 0, z: 0, role: 'leader' });

        // Arrange others in wedge pattern
        for (let i = 1; i < memberCount; i++) {
            const side = i % 2 === 1 ? -1 : 1;
            const row = Math.floor((i - 1) / 2) + 1;

            positions.push({
                x: side * row * 3,
                z: -row * 4,
                role: 'follower'
            });
        }

        return positions;
    }

    /**
     * Create circle formation positions
     * @param {Object} group - Group to create formation for
     * @returns {Array} - Array of formation positions
     */
    createCircleFormation(group) {
        const positions = [];
        const memberCount = group.members.size;
        const radius = this.config.formationRadius;

        for (let i = 0; i < memberCount; i++) {
            const angle = (i / memberCount) * Math.PI * 2;
            positions.push({
                x: Math.cos(angle) * radius,
                z: Math.sin(angle) * radius,
                role: i === 0 ? 'leader' : 'follower'
            });
        }

        return positions;
    }

    /**
     * Create swarm formation positions
     * @param {Object} group - Group to create formation for
     * @returns {Array} - Array of formation positions
     */
    createSwarmFormation(group) {
        const positions = [];
        const memberCount = group.members.size;
        const radius = this.config.formationRadius;

        for (let i = 0; i < memberCount; i++) {
            const angle = Math.random() * Math.PI * 2;
            const distance = Math.random() * radius;

            positions.push({
                x: Math.cos(angle) * distance,
                z: Math.sin(angle) * distance,
                role: i === 0 ? 'leader' : 'follower'
            });
        }

        return positions;
    }

    /**
     * Create pincer formation positions
     * @param {Object} group - Group to create formation for
     * @returns {Array} - Array of formation positions
     */
    createPincerFormation(group) {
        const positions = [];
        const memberCount = group.members.size;

        // Leader in center
        positions.push({ x: 0, z: 0, role: 'leader' });

        // Split remaining members into two flanking groups
        const flankSize = Math.floor((memberCount - 1) / 2);

        for (let i = 0; i < flankSize; i++) {
            // Left flank
            positions.push({
                x: -8 - i * 2,
                z: -5 - i * 3,
                role: 'flanker'
            });

            // Right flank
            if (i < memberCount - 1 - flankSize) {
                positions.push({
                    x: 8 + i * 2,
                    z: -5 - i * 3,
                    role: 'flanker'
                });
            }
        }

        return positions;
    }

    /**
     * Update a specific group
     * @param {Object} group - Group to update
     * @param {number} deltaTime - Time since last update
     */
    updateGroup(group, deltaTime) {
        // Update group cohesion
        this.updateGroupCohesion(group);

        // Update group morale
        this.updateGroupMorale(group, deltaTime);

        // Handle group coordination
        this.handleGroupCoordination(group);

        // Update group effectiveness
        this.updateGroupEffectiveness(group);

        // Check for group state changes
        this.checkGroupStateChanges(group);
    }

    /**
     * Update group cohesion based on member positions
     * @param {Object} group - Group to update
     */
    updateGroupCohesion(group) {
        if (group.members.size < 2) {
            group.cohesion = 1.0;
            return;
        }

        // Calculate average distance between members
        let totalDistance = 0;
        let pairCount = 0;

        const members = Array.from(group.members);
        for (let i = 0; i < members.length; i++) {
            for (let j = i + 1; j < members.length; j++) {
                const distance = BABYLON.Vector3.Distance(
                    members[i].mesh.position,
                    members[j].mesh.position
                );
                totalDistance += distance;
                pairCount++;
            }
        }

        const averageDistance = totalDistance / pairCount;
        const idealDistance = this.config.formationRadius;

        // Cohesion decreases as average distance exceeds ideal
        group.cohesion = Math.max(0.1, 1.0 - Math.max(0, averageDistance - idealDistance) / idealDistance);
    }

    /**
     * Update group morale based on recent performance
     * @param {Object} group - Group to update
     * @param {number} deltaTime - Time since last update
     */
    updateGroupMorale(group, deltaTime) {
        const successRate = group.successfulActions / Math.max(1, group.successfulActions + group.failedActions);

        // Morale trends toward success rate
        const targetMorale = 0.3 + successRate * 0.7; // Range: 0.3 to 1.0
        const moraleChange = (targetMorale - group.morale) * deltaTime * 0.5;

        group.morale = Math.max(0.1, Math.min(1.0, group.morale + moraleChange));
    }

    /**
     * Handle group coordination behaviors
     * @param {Object} group - Group to coordinate
     */
    handleGroupCoordination(group) {
        if (!group.leader || !group.target) return;

        // Leader makes coordination decisions
        const strategy = this.determineGroupStrategy(group);

        if (strategy !== group.groupStrategy) {
            group.groupStrategy = strategy;
            this.broadcastGroupChange(group, 'strategy_changed', { strategy });
        }

        // Update formation based on strategy
        const newFormation = this.selectFormationForStrategy(strategy);
        if (newFormation !== group.formation) {
            group.formation = newFormation;
            this.updateFormation(group);
        }
    }

    /**
     * Determine the best strategy for a group
     * @param {Object} group - Group to determine strategy for
     * @returns {string} - Strategy name
     */
    determineGroupStrategy(group) {
        // Consider group composition, target, and environment
        const scoutCount = Array.from(group.roles.values()).filter(role => role === 'scout').length;
        const flankerCount = Array.from(group.roles.values()).filter(role => role === 'flanker').length;
        const bruiserCount = Array.from(group.roles.values()).filter(role => role === 'bruiser').length;

        // Strategy selection based on composition
        if (flankerCount >= 2) {
            return 'flanking';
        } else if (scoutCount >= 1 && group.members.size >= 4) {
            return 'coordinated_assault';
        } else if (bruiserCount >= 2) {
            return 'direct_assault';
        } else if (group.cohesion > 0.8) {
            return 'pack_hunting';
        } else {
            return 'aggressive';
        }
    }

    /**
     * Select formation based on strategy
     * @param {string} strategy - Strategy name
     * @returns {string} - Formation name
     */
    selectFormationForStrategy(strategy) {
        switch (strategy) {
            case 'flanking':
                return 'pincer';
            case 'coordinated_assault':
                return 'wedge';
            case 'direct_assault':
                return 'line';
            case 'pack_hunting':
                return 'circle';
            default:
                return 'swarm';
        }
    }

    /**
     * Update group effectiveness based on various factors
     * @param {Object} group - Group to update
     */
    updateGroupEffectiveness(group) {
        let effectiveness = 0.5; // Base effectiveness

        // Cohesion factor
        effectiveness += group.cohesion * 0.2;

        // Morale factor
        effectiveness += group.morale * 0.2;

        // Size factor (optimal around 4-5 members)
        const sizeOptimal = Math.min(1.0, group.members.size / 4);
        const sizePenalty = group.members.size > 6 ? (group.members.size - 6) * 0.05 : 0;
        effectiveness += sizeOptimal * 0.1 - sizePenalty;

        // Role diversity factor
        const uniqueRoles = new Set(group.roles.values()).size;
        effectiveness += Math.min(uniqueRoles / 4, 0.1);

        // Leadership factor
        if (group.leader && group.leader.intelligence) {
            effectiveness += group.leader.intelligence.adaptation.successRate * 0.1;
        }

        group.effectiveness = Math.max(0.1, Math.min(1.0, effectiveness));
    }

    /**
     * Check for group state changes
     * @param {Object} group - Group to check
     */
    checkGroupStateChanges(group) {
        const now = performance.now();
        const timeSinceStateChange = now - group.lastStateChange;

        switch (group.state) {
            case 'forming':
                if (timeSinceStateChange > 2000) { // 2 seconds
                    this.changeGroupState(group, 'active');
                }
                break;

            case 'active':
                if (group.cohesion < 0.3) {
                    this.changeGroupState(group, 'scattered');
                } else if (group.morale < 0.2) {
                    this.changeGroupState(group, 'demoralized');
                }
                break;

            case 'scattered':
                if (group.cohesion > 0.6) {
                    this.changeGroupState(group, 'active');
                } else if (timeSinceStateChange > 10000) { // 10 seconds
                    this.disbandGroup(group.id);
                }
                break;

            case 'demoralized':
                if (group.morale > 0.5) {
                    this.changeGroupState(group, 'active');
                } else if (timeSinceStateChange > 15000) { // 15 seconds
                    this.disbandGroup(group.id);
                }
                break;
        }
    }

    /**
     * Change group state
     * @param {Object} group - Group to change state for
     * @param {string} newState - New state
     */
    changeGroupState(group, newState) {
        const oldState = group.state;
        group.state = newState;
        group.lastStateChange = performance.now();

        this.broadcastGroupChange(group, 'state_changed', { oldState, newState });

        console.log(`Group ${group.id} changed state from ${oldState} to ${newState}`);
    }

    /**
     * Check for group formation opportunities
     */
    checkGroupFormationOpportunities() {
        // Find ungrouped zombies
        const ungroupedZombies = this.findUngroupedZombies();

        if (ungroupedZombies.length < this.config.minGroupSize) return;

        // Group nearby zombies
        const clusters = this.clusterZombiesByProximity(ungroupedZombies);

        for (const cluster of clusters) {
            if (cluster.length >= this.config.minGroupSize) {
                this.createGroup(cluster);
            }
        }
    }

    /**
     * Find zombies that are not in any group
     * @returns {Array} - Array of ungrouped zombies
     */
    findUngroupedZombies() {
        const ungrouped = [];

        // This would need to be implemented based on how zombies are tracked
        // For now, return empty array

        return ungrouped;
    }

    /**
     * Cluster zombies by proximity
     * @param {Array} zombies - Zombies to cluster
     * @returns {Array} - Array of zombie clusters
     */
    clusterZombiesByProximity(zombies) {
        const clusters = [];
        const processed = new Set();

        for (const zombie of zombies) {
            if (processed.has(zombie)) continue;

            const cluster = [zombie];
            processed.add(zombie);

            // Find nearby zombies
            for (const otherZombie of zombies) {
                if (processed.has(otherZombie)) continue;

                const distance = BABYLON.Vector3.Distance(
                    zombie.mesh.position,
                    otherZombie.mesh.position
                );

                if (distance <= this.config.coordinationRange) {
                    cluster.push(otherZombie);
                    processed.add(otherZombie);
                }
            }

            clusters.push(cluster);
        }

        return clusters;
    }

    /**
     * Handle role rotations
     */
    handleRoleRotations() {
        const now = performance.now();

        for (const [groupId, group] of this.groups) {
            if (now - group.lastRoleRotation > this.config.roleRotationInterval) {
                // Consider role rotation based on performance
                if (group.effectiveness < 0.4) {
                    this.considerRoleRotation(group);
                }

                group.lastRoleRotation = now;
            }
        }
    }

    /**
     * Consider rotating roles in a group
     * @param {Object} group - Group to consider rotation for
     */
    considerRoleRotation(group) {
        // Find underperforming roles
        const rolePerformance = this.analyzeRolePerformance(group);

        // Rotate if significant improvement is possible
        for (const [role, performance] of rolePerformance) {
            if (performance < 0.3) {
                this.rotateRole(group, role);
            }
        }
    }

    /**
     * Analyze role performance in a group
     * @param {Object} group - Group to analyze
     * @returns {Map} - Role performance map
     */
    analyzeRolePerformance(group) {
        const performance = new Map();

        // This would analyze actual performance metrics
        // For now, return dummy data
        for (const role of group.roles.values()) {
            performance.set(role, Math.random());
        }

        return performance;
    }

    /**
     * Rotate a specific role in a group
     * @param {Object} group - Group to rotate role in
     * @param {string} role - Role to rotate
     */
    rotateRole(group, role) {
        // Find current role holder
        const currentHolder = Array.from(group.members).find(
            zombie => group.roles.get(zombie.id) === role
        );

        if (!currentHolder) return;

        // Find best replacement
        const candidates = Array.from(group.members).filter(
            zombie => zombie !== currentHolder
        );

        let bestCandidate = null;
        let bestScore = 0;

        for (const candidate of candidates) {
            const score = this.calculateRoleSuitability(candidate, role);
            if (score > bestScore) {
                bestCandidate = candidate;
                bestScore = score;
            }
        }

        if (bestCandidate && bestScore > 0.6) {
            // Swap roles
            const oldRole = group.roles.get(bestCandidate.id);

            group.roles.set(currentHolder.id, oldRole);
            group.roles.set(bestCandidate.id, role);

            // Update zombie references
            currentHolder.groupRole = oldRole;
            bestCandidate.groupRole = role;

            // Update leader if necessary
            if (role === 'leader') {
                group.leader = bestCandidate;
            }

            // Apply new bonuses
            this.removeRoleBonuses(currentHolder);
            this.removeRoleBonuses(bestCandidate);
            this.applyRoleBonuses(currentHolder, oldRole);
            this.applyRoleBonuses(bestCandidate, role);

            this.broadcastGroupChange(group, 'role_rotated', {
                zombie1: currentHolder,
                zombie2: bestCandidate,
                role1: oldRole,
                role2: role
            });

            console.log(`Rotated roles in group ${group.id}: ${currentHolder.id} -> ${oldRole}, ${bestCandidate.id} -> ${role}`);
        }
    }

    /**
     * Find nearby groups to a position
     * @param {BABYLON.Vector3} position - Position to search from
     * @returns {Array} - Array of nearby groups
     */
    findNearbyGroups(position) {
        const nearbyGroups = [];

        for (const group of this.groups.values()) {
            if (group.members.size === 0) continue;

            // Calculate group center
            const groupCenter = this.calculateGroupCenter(group);
            const distance = BABYLON.Vector3.Distance(position, groupCenter);

            if (distance <= this.config.coordinationRange) {
                nearbyGroups.push(group);
            }
        }

        return nearbyGroups;
    }

    /**
     * Calculate the center position of a group
     * @param {Object} group - Group to calculate center for
     * @returns {BABYLON.Vector3} - Group center position
     */
    calculateGroupCenter(group) {
        if (group.members.size === 0) {
            return new BABYLON.Vector3(0, 0, 0);
        }

        let totalX = 0; let totalY = 0; let totalZ = 0;

        for (const zombie of group.members) {
            totalX += zombie.mesh.position.x;
            totalY += zombie.mesh.position.y;
            totalZ += zombie.mesh.position.z;
        }

        return new BABYLON.Vector3(
            totalX / group.members.size,
            totalY / group.members.size,
            totalZ / group.members.size
        );
    }

    /**
     * Select the best group for a zombie to join
     * @param {Object} zombie - Zombie looking to join
     * @param {Array} groups - Available groups
     * @returns {Object} - Best group or null
     */
    selectBestGroupForZombie(zombie, groups) {
        let bestGroup = null;
        let bestScore = 0;

        for (const group of groups) {
            if (!this.canJoinGroup(zombie, group)) continue;

            const score = this.calculateGroupJoinScore(zombie, group);
            if (score > bestScore) {
                bestGroup = group;
                bestScore = score;
            }
        }

        return bestGroup;
    }

    /**
     * Check if a zombie can join a group
     * @param {Object} zombie - Zombie to check
     * @param {Object} group - Group to check
     * @returns {boolean} - Whether zombie can join
     */
    canJoinGroup(zombie, group) {
        // Check size limits
        if (group.members.size >= this.config.maxGroupSize) {
            return false;
        }

        // Check if zombie is already in a group
        if (this.zombieGroups.has(zombie.id)) {
            return false;
        }

        // Check group state
        if (group.state === 'disbanded') {
            return false;
        }

        return true;
    }

    /**
     * Calculate score for zombie joining a group
     * @param {Object} zombie - Zombie to evaluate
     * @param {Object} group - Group to evaluate
     * @returns {number} - Join score (0-1)
     */
    calculateGroupJoinScore(zombie, group) {
        let score = 0.5;

        // Distance factor (closer = better)
        const groupCenter = this.calculateGroupCenter(group);
        const distance = BABYLON.Vector3.Distance(zombie.mesh.position, groupCenter);
        score += Math.max(0, 1 - distance / this.config.coordinationRange) * 0.3;

        // Group effectiveness factor
        score += group.effectiveness * 0.2;

        // Role availability factor
        const availableRoles = this.getAvailableRoles(group);
        if (availableRoles.length > 0) {
            score += 0.2;
        }

        // Compatibility factor (similar aggression levels)
        if (group.leader && group.leader.intelligence && zombie.intelligence) {
            const aggressionDiff = Math.abs(
                group.leader.intelligence.config.aggressionLevel
                - zombie.intelligence.config.aggressionLevel
            );
            score += Math.max(0, 1 - aggressionDiff) * 0.1;
        }

        return Math.min(1.0, Math.max(0.0, score));
    }

    /**
     * Get available roles in a group
     * @param {Object} group - Group to check
     * @returns {Array} - Array of available role names
     */
    getAvailableRoles(group) {
        const roleCounts = new Map();

        // Count current roles
        for (const role of group.roles.values()) {
            roleCounts.set(role, (roleCounts.get(role) || 0) + 1);
        }

        // Find available roles
        const availableRoles = [];
        for (const [roleName, roleDefinition] of Object.entries(this.roleDefinitions)) {
            const currentCount = roleCounts.get(roleName) || 0;
            if (currentCount < roleDefinition.maxCount) {
                availableRoles.push(roleName);
            }
        }

        return availableRoles;
    }

    /**
     * Broadcast group formation to communication system
     * @param {Object} group - Group that was formed
     */
    broadcastGroupFormation(group) {
        if (!this.communicationSystem) return;

        // Broadcast to all group members
        for (const zombie of group.members) {
            this.communicationSystem.sendMessage(
                zombie,
                'group_formation',
                {
                    action: 'formed',
                    groupId: group.id,
                    memberCount: group.members.size,
                    role: group.roles.get(zombie.id)
                }
            );
        }
    }

    /**
     * Broadcast group changes to communication system
     * @param {Object} group - Group that changed
     * @param {string} changeType - Type of change
     * @param {Object} data - Additional change data
     */
    broadcastGroupChange(group, changeType, data = {}) {
        if (!this.communicationSystem) return;

        // Broadcast to all group members
        for (const zombie of group.members) {
            this.communicationSystem.sendMessage(
                zombie,
                'group_formation',
                {
                    action: changeType,
                    groupId: group.id,
                    memberCount: group.members.size,
                    ...data
                }
            );
        }
    }

    /**
     * Clean up disbanded groups
     */
    cleanupDisbandedGroups() {
        const disbandedGroups = [];

        for (const [groupId, group] of this.groups) {
            if (group.state === 'disbanded' || group.members.size === 0) {
                disbandedGroups.push(groupId);
            }
        }

        for (const groupId of disbandedGroups) {
            this.groups.delete(groupId);
        }
    }

    /**
     * Get group manager statistics
     * @returns {Object} - Statistics object
     */
    getStatistics() {
        const activeGroups = Array.from(this.groups.values()).filter(g => g.state !== 'disbanded');
        const totalMembers = activeGroups.reduce((sum, group) => sum + group.members.size, 0);

        return {
            ...this.stats,
            activeGroups: activeGroups.length,
            totalMembers,
            averageGroupSize: activeGroups.length > 0 ? totalMembers / activeGroups.length : 0,
            averageEffectiveness: activeGroups.length > 0
                ? activeGroups.reduce((sum, group) => sum + group.effectiveness, 0) / activeGroups.length : 0,
            averageCohesion: activeGroups.length > 0
                ? activeGroups.reduce((sum, group) => sum + group.cohesion, 0) / activeGroups.length : 0,
            averageMorale: activeGroups.length > 0
                ? activeGroups.reduce((sum, group) => sum + group.morale, 0) / activeGroups.length : 0
        };
    }

    /**
     * Get group information
     * @param {string} groupId - Group ID
     * @returns {Object} - Group information
     */
    getGroupInfo(groupId) {
        const group = this.groups.get(groupId);
        if (!group) return null;

        return {
            id: group.id,
            memberCount: group.members.size,
            leader: group.leader ? group.leader.id : null,
            formation: group.formation,
            state: group.state,
            cohesion: group.cohesion,
            morale: group.morale,
            effectiveness: group.effectiveness,
            strategy: group.groupStrategy,
            roles: Object.fromEntries(group.roles),
            createdAt: group.createdAt,
            successfulActions: group.successfulActions,
            failedActions: group.failedActions
        };
    }

    /**
     * Dispose of the group manager
     */
    dispose() {
        // Disband all groups
        for (const groupId of this.groups.keys()) {
            this.disbandGroup(groupId);
        }

        this.groups.clear();
        this.zombieGroups.clear();

        if (this.scene) {
            this.scene.onBeforeRenderObservable.clear();
        }

        console.log('Zombie Group Manager disposed');
    }
}
