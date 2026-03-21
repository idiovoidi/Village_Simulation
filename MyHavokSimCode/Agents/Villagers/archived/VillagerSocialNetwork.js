/**
 * Villager Social Network Component
 * Handles relationship tracking, information propagation, and group decision making
 */

export class VillagerSocialNetwork {
    constructor(villager, options = {}) {
        this.villager = villager;
        this.scene = villager.scene;

        // Configuration
        this.config = {
            maxRelationships: options.maxRelationships || 12,
            socialRange: options.socialRange || 20,
            relationshipDecayRate: options.relationshipDecayRate || 0.1, // per day
            trustBuildRate: options.trustBuildRate || 0.05,
            trustDecayRate: options.trustDecayRate || 0.02,
            informationSpreadRate: options.informationSpreadRate || 0.8,
            leadershipThreshold: options.leadershipThreshold || 0.7,
            groupDecisionThreshold: options.groupDecisionThreshold || 0.6,
            socialUpdateInterval: options.socialUpdateInterval || 1000, // ms
            memoryDuration: options.memoryDuration || 300000, // 5 minutes
            personalityInfluence: options.personalityInfluence || 0.3
        };

        // Relationship system
        this.relationships = new Map(); // villagerId -> relationship data
        this.relationshipHistory = new Map(); // villagerId -> interaction history

        // Information network
        this.knownInformation = new Map(); // infoId -> information data
        this.informationSources = new Map(); // infoId -> source villager
        this.rumorNetwork = new Map(); // rumorId -> rumor data

        // Social status and influence
        this.socialStatus = {
            reputation: 0.5, // 0-1 scale
            trustworthiness: 0.5,
            leadership: 0.3,
            influence: 0.2,
            popularity: 0.4,
            authority: 0.1
        };

        // Group dynamics
        this.groupMembership = new Set(); // Group IDs this villager belongs to
        this.socialGroups = new Map(); // groupId -> group data for groups this villager leads
        this.pendingDecisions = new Map(); // decisionId -> decision data

        // Personality traits (affect social behavior)
        this.personality = {
            extroversion: options.extroversion || (0.3 + Math.random() * 0.4), // 0.3-0.7
            agreeableness: options.agreeableness || (0.4 + Math.random() * 0.4), // 0.4-0.8
            conscientiousness: options.conscientiousness || (0.3 + Math.random() * 0.5), // 0.3-0.8
            neuroticism: options.neuroticism || (0.2 + Math.random() * 0.4), // 0.2-0.6
            openness: options.openness || (0.3 + Math.random() * 0.4), // 0.3-0.7
            empathy: options.empathy || (0.4 + Math.random() * 0.4), // 0.4-0.8
            assertiveness: options.assertiveness || (0.2 + Math.random() * 0.6) // 0.2-0.8
        };

        // Communication and external systems
        this.communicationSystem = null;
        this.environmentalAwareness = null;

        // Performance optimization
        this.lastSocialUpdate = 0;
        this.lastRelationshipUpdate = 0;

        // Statistics
        this.stats = {
            relationshipsFormed: 0,
            relationshipsLost: 0,
            informationShared: 0,
            informationReceived: 0,
            groupDecisionsMade: 0,
            leadershipActions: 0,
            socialInteractions: 0,
            trustGained: 0,
            trustLost: 0
        };
    }

    /**
     * Initialize the social network system
     * @param {Object} systems - External systems
     */
    initialize(systems = {}) {
        this.communicationSystem = systems.communication;
        this.environmentalAwareness = systems.environmental;

        // Register with communication system
        if (this.communicationSystem) {
            this.communicationSystem.registerAgent(this.villager);
            this.communicationSystem.subscribe(this.villager, 'social_interaction');
            this.communicationSystem.subscribe(this.villager, 'information_share');
            this.communicationSystem.subscribe(this.villager, 'group_decision');
            this.communicationSystem.subscribe(this.villager, 'reputation_update');
        }

        // Initialize social status based on personality
        this.initializeSocialStatus();

        console.log(`Villager Social Network initialized for ${this.villager.id || 'unknown'}`);
    }

    /**
     * Initialize social status based on personality traits
     */
    initializeSocialStatus() {
        // Leadership influenced by assertiveness and extroversion
        this.socialStatus.leadership = (this.personality.assertiveness * 0.6
                                      + this.personality.extroversion * 0.4) * 0.8;

        // Influence based on leadership and conscientiousness
        this.socialStatus.influence = (this.socialStatus.leadership * 0.7
                                     + this.personality.conscientiousness * 0.3) * 0.6;

        // Popularity based on extroversion and agreeableness
        this.socialStatus.popularity = (this.personality.extroversion * 0.5
                                       + this.personality.agreeableness * 0.5) * 0.8;

        // Trustworthiness based on conscientiousness and low neuroticism
        this.socialStatus.trustworthiness = (this.personality.conscientiousness * 0.6
                                           + (1 - this.personality.neuroticism) * 0.4) * 0.7;

        // Authority starts low but can be earned
        this.socialStatus.authority = this.socialStatus.leadership * 0.3;

        // Reputation starts neutral
        this.socialStatus.reputation = 0.5;
    }

    /**
     * Update the social network system
     * @param {number} deltaTime - Time since last update
     */
    update(deltaTime) {
        const now = performance.now();

        // Throttle social updates for performance
        if (now - this.lastSocialUpdate < this.config.socialUpdateInterval) {
            return;
        }

        this.lastSocialUpdate = now;

        // Find nearby villagers for social interaction
        this.updateNearbyVillagers();

        // Update existing relationships
        this.updateRelationships(deltaTime);

        // Process social interactions
        this.processSocialInteractions(deltaTime);

        // Propagate information through network
        this.propagateInformation(deltaTime);

        // Handle group decisions
        this.processGroupDecisions(deltaTime);

        // Update social status
        this.updateSocialStatus(deltaTime);

        // Clean up old information
        this.cleanupOldInformation();
    }

    /**
     * Find and update nearby villagers for potential social interaction
     */
    updateNearbyVillagers() {
        if (!this.environmentalAwareness) return;

        const nearbyVillagers = this.environmentalAwareness.getAgentsInRange(
            this.villager.mesh.position,
            this.config.socialRange,
            { agentType: 'villager', excludeAgent: this.villager }
        );

        // Initiate or strengthen relationships with nearby villagers
        for (const otherVillager of nearbyVillagers) {
            this.processProximityInteraction(otherVillager);
        }
    }

    /**
     * Process proximity-based social interaction
     * @param {Object} otherVillager - Nearby villager
     */
    processProximityInteraction(otherVillager) {
        const villagerId = otherVillager.id;

        // Check if relationship exists
        if (!this.relationships.has(villagerId)) {
            // Create new relationship if we have capacity
            if (this.relationships.size < this.config.maxRelationships) {
                this.createRelationship(otherVillager);
            }
        } else {
            // Strengthen existing relationship
            this.strengthenRelationship(villagerId);
        }

        // Chance for social interaction based on personality
        const interactionChance = this.personality.extroversion * 0.1; // 10% max per update

        if (Math.random() < interactionChance) {
            this.initiateSocialInteraction(otherVillager);
        }
    }

    /**
     * Create a new relationship with another villager
     * @param {Object} otherVillager - Villager to form relationship with
     */
    createRelationship(otherVillager) {
        const villagerId = otherVillager.id;

        // Calculate initial relationship strength based on personality compatibility
        const compatibility = this.calculatePersonalityCompatibility(otherVillager);

        const relationship = {
            villager: otherVillager,
            strength: Math.max(0.1, compatibility * 0.5), // Start with low but positive relationship
            trust: 0.3 + compatibility * 0.2,
            respect: 0.4,
            affection: compatibility * 0.3,
            cooperation: 0.5,
            lastInteraction: performance.now(),
            interactionCount: 1,
            sharedExperiences: [],
            conflictHistory: [],
            favorsDone: 0,
            favorsReceived: 0,
            informationShared: 0,
            relationshipType: this.determineRelationshipType(compatibility)
        };

        this.relationships.set(villagerId, relationship);
        this.relationshipHistory.set(villagerId, []);

        this.stats.relationshipsFormed++;

        // Notify the other villager (if they have social network)
        if (otherVillager.socialNetwork) {
            otherVillager.socialNetwork.receiveRelationshipRequest(this.villager, relationship);
        }

        console.log(`${this.villager.id} formed relationship with ${villagerId}`);
    }

    /**
     * Calculate personality compatibility between villagers
     * @param {Object} otherVillager - Other villager to compare with
     * @returns {number} - Compatibility score (0-1)
     */
    calculatePersonalityCompatibility(otherVillager) {
        if (!otherVillager.socialNetwork) return 0.5; // Default compatibility

        const otherPersonality = otherVillager.socialNetwork.personality;
        let compatibility = 0;

        // Extroversion compatibility (similar levels work well)
        const extroversionDiff = Math.abs(this.personality.extroversion - otherPersonality.extroversion);
        compatibility += (1 - extroversionDiff) * 0.2;

        // Agreeableness (higher is generally better)
        compatibility += (this.personality.agreeableness + otherPersonality.agreeableness) * 0.15;

        // Conscientiousness compatibility
        const conscientiousnessDiff = Math.abs(this.personality.conscientiousness - otherPersonality.conscientiousness);
        compatibility += (1 - conscientiousnessDiff) * 0.15;

        // Low neuroticism is generally preferred
        compatibility += (2 - this.personality.neuroticism - otherPersonality.neuroticism) * 0.1;

        // Openness compatibility
        const opennessDiff = Math.abs(this.personality.openness - otherPersonality.openness);
        compatibility += (1 - opennessDiff) * 0.1;

        // Empathy (higher is better for relationships)
        compatibility += (this.personality.empathy + otherPersonality.empathy) * 0.15;

        // Assertiveness balance (one can be more assertive, but not both extremely high)
        const assertivenessSum = this.personality.assertiveness + otherPersonality.assertiveness;
        if (assertivenessSum > 1.4) {
            compatibility -= (assertivenessSum - 1.4) * 0.2; // Penalty for both being too assertive
        } else {
            compatibility += assertivenessSum * 0.15;
        }

        return Math.max(0, Math.min(1, compatibility));
    }

    /**
     * Determine relationship type based on compatibility and context
     * @param {number} compatibility - Compatibility score
     * @returns {string} - Relationship type
     */
    determineRelationshipType(compatibility) {
        if (compatibility > 0.8) return 'close_friend';
        if (compatibility > 0.6) return 'friend';
        if (compatibility > 0.4) return 'acquaintance';
        if (compatibility > 0.2) return 'neutral';
        return 'distant';
    }

    /**
     * Strengthen an existing relationship
     * @param {string} villagerId - ID of villager to strengthen relationship with
     */
    strengthenRelationship(villagerId) {
        const relationship = this.relationships.get(villagerId);
        if (!relationship) return;

        // Small increase in relationship strength from proximity
        const strengthIncrease = 0.01 * this.personality.agreeableness;
        relationship.strength = Math.min(1.0, relationship.strength + strengthIncrease);
        relationship.lastInteraction = performance.now();
        relationship.interactionCount++;
    }

    /**
     * Initiate social interaction with another villager
     * @param {Object} otherVillager - Villager to interact with
     */
    initiateSocialInteraction(otherVillager) {
        const villagerId = otherVillager.id;
        const relationship = this.relationships.get(villagerId);

        if (!relationship) return;

        // Determine interaction type based on relationship and personality
        const interactionType = this.selectInteractionType(relationship);

        // Execute interaction
        this.executeInteraction(otherVillager, interactionType);

        // Record interaction
        this.recordInteraction(villagerId, interactionType);

        this.stats.socialInteractions++;
    }

    /**
     * Select appropriate interaction type
     * @param {Object} relationship - Relationship data
     * @returns {string} - Interaction type
     */
    selectInteractionType(relationship) {
        const types = [];

        // Basic interactions always available
        types.push('greeting', 'small_talk');

        // Relationship-dependent interactions
        if (relationship.strength > 0.3) {
            types.push('information_sharing', 'opinion_exchange');
        }

        if (relationship.strength > 0.5) {
            types.push('personal_sharing', 'favor_request');
        }

        if (relationship.strength > 0.7) {
            types.push('deep_conversation', 'emotional_support');
        }

        // Personality-influenced interactions
        if (this.personality.assertiveness > 0.6) {
            types.push('leadership_discussion', 'decision_making');
        }

        if (this.personality.empathy > 0.6) {
            types.push('emotional_support', 'conflict_resolution');
        }

        // Select random interaction type
        return types[Math.floor(Math.random() * types.length)];
    }

    /**
     * Execute social interaction
     * @param {Object} otherVillager - Other villager
     * @param {string} interactionType - Type of interaction
     */
    executeInteraction(otherVillager, interactionType) {
        const villagerId = otherVillager.id;
        const relationship = this.relationships.get(villagerId);

        switch (interactionType) {
            case 'greeting':
                this.executeGreeting(otherVillager, relationship);
                break;
            case 'small_talk':
                this.executeSmallTalk(otherVillager, relationship);
                break;
            case 'information_sharing':
                this.executeInformationSharing(otherVillager, relationship);
                break;
            case 'opinion_exchange':
                this.executeOpinionExchange(otherVillager, relationship);
                break;
            case 'personal_sharing':
                this.executePersonalSharing(otherVillager, relationship);
                break;
            case 'favor_request':
                this.executeFavorRequest(otherVillager, relationship);
                break;
            case 'deep_conversation':
                this.executeDeepConversation(otherVillager, relationship);
                break;
            case 'emotional_support':
                this.executeEmotionalSupport(otherVillager, relationship);
                break;
            case 'leadership_discussion':
                this.executeLeadershipDiscussion(otherVillager, relationship);
                break;
            case 'decision_making':
                this.executeDecisionMaking(otherVillager, relationship);
                break;
            case 'conflict_resolution':
                this.executeConflictResolution(otherVillager, relationship);
                break;
        }
    }

    /**
     * Execute greeting interaction
     * @param {Object} otherVillager - Other villager
     * @param {Object} relationship - Relationship data
     */
    executeGreeting(otherVillager, relationship) {
        // Simple positive interaction
        relationship.strength += 0.005;
        relationship.affection += 0.01;

        // Send greeting message
        if (this.communicationSystem) {
            this.communicationSystem.sendMessage(
                this.villager,
                'social_interaction',
                {
                    type: 'greeting',
                    target: otherVillager,
                    sentiment: 'positive'
                },
                { targetAgent: otherVillager }
            );
        }
    }

    /**
     * Execute small talk interaction
     * @param {Object} otherVillager - Other villager
     * @param {Object} relationship - Relationship data
     */
    executeSmallTalk(otherVillager, relationship) {
        // Moderate positive interaction
        relationship.strength += 0.01;
        relationship.cooperation += 0.005;

        // Share minor information
        this.shareMinorInformation(otherVillager);
    }

    /**
     * Execute information sharing interaction
     * @param {Object} otherVillager - Other villager
     * @param {Object} relationship - Relationship data
     */
    executeInformationSharing(otherVillager, relationship) {
        // Share important information
        const sharedInfo = this.selectInformationToShare(otherVillager);

        if (sharedInfo) {
            this.shareInformation(otherVillager, sharedInfo);
            relationship.informationShared++;
            relationship.trust += 0.02;
            relationship.cooperation += 0.01;
        }
    }

    /**
     * Execute opinion exchange interaction
     * @param {Object} otherVillager - Other villager
     * @param {Object} relationship - Relationship data
     */
    executeOpinionExchange(otherVillager, relationship) {
        // Exchange opinions on current events or decisions
        const opinion = this.generateOpinion();

        // Opinion compatibility affects relationship
        if (otherVillager.socialNetwork) {
            const otherOpinion = otherVillager.socialNetwork.generateOpinion();
            const agreement = this.calculateOpinionAgreement(opinion, otherOpinion);

            if (agreement > 0.7) {
                relationship.strength += 0.02;
                relationship.respect += 0.01;
            } else if (agreement < 0.3) {
                relationship.strength -= 0.01;
                // But can increase respect if handled well
                if (this.personality.openness > 0.6) {
                    relationship.respect += 0.005;
                }
            }
        }
    }

    /**
     * Execute personal sharing interaction
     * @param {Object} otherVillager - Other villager
     * @param {Object} relationship - Relationship data
     */
    executePersonalSharing(otherVillager, relationship) {
        // Deep personal interaction
        relationship.strength += 0.03;
        relationship.trust += 0.02;
        relationship.affection += 0.02;

        // Add shared experience
        relationship.sharedExperiences.push({
            type: 'personal_sharing',
            timestamp: performance.now(),
            impact: 'positive'
        });
    }

    /**
     * Execute favor request interaction
     * @param {Object} otherVillager - Other villager
     * @param {Object} relationship - Relationship data
     */
    executeFavorRequest(otherVillager, relationship) {
        // Request a favor based on relationship strength
        const favorChance = relationship.strength * relationship.trust;

        if (Math.random() < favorChance) {
            // Favor granted
            relationship.favorsReceived++;
            relationship.trust += 0.01;
            relationship.cooperation += 0.02;

            // Other villager records favor done
            if (otherVillager.socialNetwork) {
                const otherRelationship = otherVillager.socialNetwork.relationships.get(this.villager.id);
                if (otherRelationship) {
                    otherRelationship.favorsDone++;
                }
            }
        } else {
            // Favor denied - slight negative impact
            relationship.strength -= 0.005;
        }
    }

    /**
     * Execute deep conversation interaction
     * @param {Object} otherVillager - Other villager
     * @param {Object} relationship - Relationship data
     */
    executeDeepConversation(otherVillager, relationship) {
        // Meaningful conversation that strengthens bonds
        relationship.strength += 0.04;
        relationship.trust += 0.03;
        relationship.respect += 0.02;
        relationship.affection += 0.03;

        // Significant shared experience
        relationship.sharedExperiences.push({
            type: 'deep_conversation',
            timestamp: performance.now(),
            impact: 'very_positive'
        });
    }

    /**
     * Execute emotional support interaction
     * @param {Object} otherVillager - Other villager
     * @param {Object} relationship - Relationship data
     */
    executeEmotionalSupport(otherVillager, relationship) {
        // Provide emotional support
        relationship.trust += 0.04;
        relationship.affection += 0.03;
        relationship.cooperation += 0.02;

        // Check if other villager is in distress
        if (otherVillager.survivalInstinct && otherVillager.survivalInstinct.survivalState.panicLevel > 0.5) {
            // Reduce their panic through social support
            otherVillager.survivalInstinct.survivalState.panicLevel *= 0.9;
            relationship.trust += 0.02; // Extra trust for helping in crisis
        }
    }

    /**
     * Execute leadership discussion interaction
     * @param {Object} otherVillager - Other villager
     * @param {Object} relationship - Relationship data
     */
    executeLeadershipDiscussion(otherVillager, relationship) {
        // Discuss leadership and group decisions
        if (this.socialStatus.leadership > 0.6) {
            // Attempt to influence
            const influenceSuccess = this.attemptInfluence(otherVillager, 'leadership_topic');

            if (influenceSuccess) {
                this.socialStatus.authority += 0.01;
                relationship.respect += 0.02;
            } else {
                relationship.respect -= 0.01;
            }
        }
    }

    /**
     * Execute decision making interaction
     * @param {Object} otherVillager - Other villager
     * @param {Object} relationship - Relationship data
     */
    executeDecisionMaking(otherVillager, relationship) {
        // Collaborative decision making
        const decision = this.proposeGroupDecision();

        if (decision) {
            this.inviteToDecision(otherVillager, decision);
            relationship.cooperation += 0.02;
        }
    }

    /**
     * Execute conflict resolution interaction
     * @param {Object} otherVillager - Other villager
     * @param {Object} relationship - Relationship data
     */
    executeConflictResolution(otherVillager, relationship) {
        // Attempt to resolve any existing conflicts
        if (relationship.conflictHistory.length > 0) {
            const resolutionSuccess = this.personality.empathy + this.personality.agreeableness > 1.0;

            if (resolutionSuccess) {
                // Clear recent conflicts
                relationship.conflictHistory = relationship.conflictHistory.filter(
                    conflict => performance.now() - conflict.timestamp > 60000
                );

                relationship.trust += 0.03;
                relationship.strength += 0.02;
                relationship.cooperation += 0.02;
            }
        }
    }

    /**
     * Record social interaction in history
     * @param {string} villagerId - ID of other villager
     * @param {string} interactionType - Type of interaction
     */
    recordInteraction(villagerId, interactionType) {
        const history = this.relationshipHistory.get(villagerId);
        if (history) {
            history.push({
                type: interactionType,
                timestamp: performance.now(),
                initiator: this.villager.id
            });

            // Limit history size
            if (history.length > 50) {
                history.shift();
            }
        }
    }

    /**
     * Update existing relationships over time
     * @param {number} deltaTime - Time since last update
     */
    updateRelationships(deltaTime) {
        const now = performance.now();

        for (const [villagerId, relationship] of this.relationships) {
            // Decay relationships over time if no interaction
            const timeSinceInteraction = now - relationship.lastInteraction;
            const daysSinceInteraction = timeSinceInteraction / (1000 * 60 * 60 * 24);

            if (daysSinceInteraction > 1) {
                const decayAmount = this.config.relationshipDecayRate * deltaTime * daysSinceInteraction;
                relationship.strength = Math.max(0.1, relationship.strength - decayAmount);
                relationship.trust = Math.max(0.1, relationship.trust - decayAmount * 0.5);
            }

            // Remove very weak relationships
            if (relationship.strength < 0.15 && timeSinceInteraction > 86400000) { // 1 day
                this.relationships.delete(villagerId);
                this.relationshipHistory.delete(villagerId);
                this.stats.relationshipsLost++;
            }
        }
    }

    /**
     * Share minor information during small talk
     * @param {Object} otherVillager - Villager to share with
     */
    shareMinorInformation(otherVillager) {
        // Share basic observations or status
        const minorInfo = [
            { type: 'weather_observation', content: 'weather seems nice today' },
            { type: 'health_status', content: 'feeling well' },
            { type: 'activity_update', content: 'been working on daily tasks' },
            { type: 'mood_sharing', content: 'in good spirits' }
        ];

        const infoToShare = minorInfo[Math.floor(Math.random() * minorInfo.length)];
        this.shareInformation(otherVillager, infoToShare);
    }

    /**
     * Select important information to share
     * @param {Object} otherVillager - Villager to share with
     * @returns {Object|null} - Information to share or null
     */
    selectInformationToShare(otherVillager) {
        const villagerId = otherVillager.id;
        const relationship = this.relationships.get(villagerId);

        if (!relationship) return null;

        // Select information based on relationship strength and trust
        const availableInfo = Array.from(this.knownInformation.values()).filter(info => {
            // Don't share information that came from this villager
            const source = this.informationSources.get(info.id);
            if (source === otherVillager) return false;

            // Check if information is appropriate to share
            const requiredTrust = this.getRequiredTrustLevel(info);
            return relationship.trust >= requiredTrust;
        });

        if (availableInfo.length === 0) return null;

        // Prioritize recent and important information
        availableInfo.sort((a, b) => {
            const aScore = a.importance * (1 - (performance.now() - a.timestamp) / this.config.memoryDuration);
            const bScore = b.importance * (1 - (performance.now() - b.timestamp) / this.config.memoryDuration);
            return bScore - aScore;
        });

        return availableInfo[0];
    }

    /**
     * Get required trust level for sharing information
     * @param {Object} info - Information to check
     * @returns {number} - Required trust level (0-1)
     */
    getRequiredTrustLevel(info) {
        switch (info.type) {
            case 'threat_sighting': return 0.3;
            case 'resource_location': return 0.4;
            case 'safe_zone_info': return 0.2;
            case 'personal_secret': return 0.8;
            case 'group_decision': return 0.5;
            case 'conflict_info': return 0.6;
            case 'leadership_change': return 0.4;
            default: return 0.3;
        }
    }

    /**
     * Share information with another villager
     * @param {Object} otherVillager - Villager to share with
     * @param {Object} information - Information to share
     */
    shareInformation(otherVillager, information) {
        if (!this.communicationSystem) return;

        // Send information through communication system
        this.communicationSystem.sendMessage(
            this.villager,
            'information_share',
            {
                information,
                source: this.villager,
                trustLevel: this.relationships.get(otherVillager.id)?.trust || 0.3
            },
            { targetAgent: otherVillager }
        );

        this.stats.informationShared++;

        // Record that we shared this information
        const relationship = this.relationships.get(otherVillager.id);
        if (relationship) {
            relationship.informationShared++;
        }
    }

    /**
     * Receive information from another villager
     * @param {Object} sender - Villager who sent the information
     * @param {Object} information - Information received
     * @param {number} trustLevel - Trust level of the sender
     */
    receiveInformation(sender, information, trustLevel) {
        const infoId = information.id || `info_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        // Evaluate information credibility based on sender relationship
        const senderRelationship = this.relationships.get(sender.id);
        let credibility = trustLevel;

        if (senderRelationship) {
            credibility = (credibility + senderRelationship.trust + senderRelationship.respect) / 3;
        }

        // Store information with credibility weighting
        const processedInfo = {
            ...information,
            id: infoId,
            credibility,
            timestamp: performance.now(),
            source: sender.id,
            importance: this.assessInformationImportance(information)
        };

        this.knownInformation.set(infoId, processedInfo);
        this.informationSources.set(infoId, sender);

        this.stats.informationReceived++;

        // Update relationship with sender
        if (senderRelationship) {
            senderRelationship.trust += 0.01;
            senderRelationship.cooperation += 0.01;
        }
    }

    /**
     * Assess the importance of received information
     * @param {Object} information - Information to assess
     * @returns {number} - Importance score (0-1)
     */
    assessInformationImportance(information) {
        switch (information.type) {
            case 'threat_sighting': return 0.9;
            case 'safe_zone_info': return 0.8;
            case 'resource_location': return 0.6;
            case 'group_decision': return 0.7;
            case 'leadership_change': return 0.5;
            case 'conflict_info': return 0.4;
            case 'weather_observation': return 0.2;
            case 'personal_secret': return 0.3;
            default: return 0.4;
        }
    }

    /**
     * Process social interactions with nearby villagers
     * @param {number} deltaTime - Time since last update
     */
    processSocialInteractions(deltaTime) {
        // Find nearby villagers for interaction
        const nearbyVillagers = [];

        if (this.environmentalAwareness) {
            const nearbyAgents = this.environmentalAwareness.getAgentsInRange(
                this.villager.mesh.position,
                this.config.socialRange,
                { agentType: 'villager', excludeAgent: this.villager }
            );
            nearbyVillagers.push(...nearbyAgents);
        }

        // Process interactions with nearby villagers
        for (const otherVillager of nearbyVillagers) {
            if (this.relationships.has(otherVillager.id)) {
                // Chance for spontaneous interaction
                const interactionChance = this.personality.extroversion * 0.02; // 2% max per update

                if (Math.random() < interactionChance) {
                    this.initiateSocialInteraction(otherVillager);
                }
            }
        }

        // Update social timers and cooldowns
        this.updateSocialTimers(deltaTime);
    }

    /**
     * Update social interaction timers and cooldowns
     * @param {number} deltaTime - Time since last update
     */
    updateSocialTimers(deltaTime) {
        // Update relationship interaction cooldowns
        for (const [villagerId, relationship] of this.relationships) {
            if (relationship.lastInteraction) {
                relationship.timeSinceLastInteraction = performance.now() - relationship.lastInteraction;
            }
        }
    }

    /**
     * Propagate information through the social network
     * @param {number} deltaTime - Time since last update
     */
    propagateInformation(deltaTime) {
        // Select information to propagate
        const infoToPropagateList = Array.from(this.knownInformation.values()).filter(info => {
            // Only propagate recent, credible, and important information
            const age = performance.now() - info.timestamp;
            return age < this.config.memoryDuration * 0.5
                   && info.credibility > 0.5
                   && info.importance > 0.4;
        });

        if (infoToPropagateList.length === 0) return;

        // Select relationships to share with
        const shareableRelationships = Array.from(this.relationships.values()).filter(rel =>
            rel.trust > 0.4 && rel.cooperation > 0.3
        );

        // Propagate information based on personality and relationships
        const propagationChance = this.personality.extroversion * this.config.informationSpreadRate * deltaTime;

        if (Math.random() < propagationChance && shareableRelationships.length > 0) {
            const infoToPropagate = infoToPropagateList[Math.floor(Math.random() * infoToPropagateList.length)];
            const targetRelationship = shareableRelationships[Math.floor(Math.random() * shareableRelationships.length)];

            this.shareInformation(targetRelationship.villager, infoToPropagate);
        }
    }

    /**
     * Generate opinion on current topics
     * @returns {Object} - Opinion object
     */
    generateOpinion() {
        // Generate opinion based on personality and current situation
        const topics = ['leadership', 'safety', 'resources', 'group_decisions', 'future_plans'];
        const topic = topics[Math.floor(Math.random() * topics.length)];

        let stance = 0.5; // Neutral

        // Adjust stance based on personality
        switch (topic) {
            case 'leadership':
                stance += (this.personality.assertiveness - 0.5) * 0.4;
                stance += (this.socialStatus.leadership - 0.5) * 0.3;
                break;
            case 'safety':
                stance += (this.personality.neuroticism - 0.5) * 0.3;
                stance += (this.personality.conscientiousness - 0.5) * 0.2;
                break;
            case 'resources':
                stance += (this.personality.conscientiousness - 0.5) * 0.4;
                break;
            case 'group_decisions':
                stance += (this.personality.agreeableness - 0.5) * 0.3;
                stance += (this.personality.openness - 0.5) * 0.2;
                break;
            case 'future_plans':
                stance += (this.personality.openness - 0.5) * 0.4;
                stance += (this.personality.conscientiousness - 0.5) * 0.2;
                break;
        }

        return {
            topic,
            stance: Math.max(0, Math.min(1, stance)),
            confidence: this.personality.assertiveness,
            flexibility: this.personality.openness
        };
    }

    /**
     * Calculate agreement between two opinions
     * @param {Object} opinion1 - First opinion
     * @param {Object} opinion2 - Second opinion
     * @returns {number} - Agreement level (0-1)
     */
    calculateOpinionAgreement(opinion1, opinion2) {
        if (opinion1.topic !== opinion2.topic) return 0.5; // Different topics

        const stanceDifference = Math.abs(opinion1.stance - opinion2.stance);
        return 1 - stanceDifference;
    }

    /**
     * Attempt to influence another villager
     * @param {Object} otherVillager - Villager to influence
     * @param {string} topic - Topic of influence
     * @returns {boolean} - Whether influence was successful
     */
    attemptInfluence(otherVillager, topic) {
        const relationship = this.relationships.get(otherVillager.id);
        if (!relationship) return false;

        // Calculate influence success based on multiple factors
        let influenceChance = 0;

        // Relationship factors
        influenceChance += relationship.trust * 0.3;
        influenceChance += relationship.respect * 0.3;
        influenceChance += relationship.strength * 0.2;

        // Social status factors
        influenceChance += this.socialStatus.authority * 0.4;
        influenceChance += this.socialStatus.reputation * 0.2;

        // Personality factors
        influenceChance += this.personality.assertiveness * 0.3;
        influenceChance += (1 - this.personality.neuroticism) * 0.2;

        // Other villager's resistance
        if (otherVillager.socialNetwork) {
            const otherPersonality = otherVillager.socialNetwork.personality;
            influenceChance -= otherPersonality.assertiveness * 0.2;
            influenceChance -= (1 - otherPersonality.agreeableness) * 0.2;
        }

        const success = Math.random() < Math.max(0.1, Math.min(0.9, influenceChance));

        if (success) {
            // Successful influence increases authority and respect
            this.socialStatus.authority += 0.01;
            relationship.respect += 0.02;
        } else {
            // Failed influence can damage relationship
            relationship.respect -= 0.01;
        }

        return success;
    }

    /**
     * Propose a group decision
     * @returns {Object|null} - Decision proposal or null
     */
    proposeGroupDecision() {
        // Only propose decisions if we have sufficient leadership
        if (this.socialStatus.leadership < 0.4) return null;

        const decisionTypes = [
            'resource_allocation',
            'safety_measures',
            'group_movement',
            'work_assignment',
            'conflict_resolution',
            'leadership_selection'
        ];

        const decisionType = decisionTypes[Math.floor(Math.random() * decisionTypes.length)];

        const decision = {
            id: `decision_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            type: decisionType,
            proposer: this.villager,
            timestamp: performance.now(),
            description: this.generateDecisionDescription(decisionType),
            votes: new Map(),
            status: 'proposed',
            deadline: performance.now() + 30000 // 30 seconds to decide
        };

        this.pendingDecisions.set(decision.id, decision);
        return decision;
    }

    /**
     * Generate decision description
     * @param {string} decisionType - Type of decision
     * @returns {string} - Decision description
     */
    generateDecisionDescription(decisionType) {
        switch (decisionType) {
            case 'resource_allocation': return 'How should we distribute available resources?';
            case 'safety_measures': return 'What safety measures should we implement?';
            case 'group_movement': return 'Should we move to a different location?';
            case 'work_assignment': return 'How should we assign work tasks?';
            case 'conflict_resolution': return 'How should we resolve the current conflict?';
            case 'leadership_selection': return 'Who should lead our group?';
            default: return 'What should we do about this situation?';
        }
    }

    /**
     * Invite villager to participate in decision
     * @param {Object} otherVillager - Villager to invite
     * @param {Object} decision - Decision to invite them to
     */
    inviteToDecision(otherVillager, decision) {
        if (!this.communicationSystem) return;

        this.communicationSystem.sendMessage(
            this.villager,
            'group_decision',
            {
                decision,
                action: 'invite_to_vote'
            },
            { targetAgent: otherVillager }
        );
    }

    /**
     * Process group decisions
     * @param {number} deltaTime - Time since last update
     */
    processGroupDecisions(deltaTime) {
        const now = performance.now();

        for (const [decisionId, decision] of this.pendingDecisions) {
            if (now > decision.deadline) {
                // Decision deadline reached, tally votes
                this.finalizeDecision(decision);
                this.pendingDecisions.delete(decisionId);
            }
        }
    }

    /**
     * Finalize a group decision
     * @param {Object} decision - Decision to finalize
     */
    finalizeDecision(decision) {
        const votes = Array.from(decision.votes.values());
        const totalVotes = votes.length;

        if (totalVotes === 0) {
            decision.status = 'failed';
            return;
        }

        // Count votes
        const voteCounts = {};
        votes.forEach(vote => {
            voteCounts[vote.choice] = (voteCounts[vote.choice] || 0) + 1;
        });

        // Find winning choice
        let winningChoice = null;
        let maxVotes = 0;

        for (const [choice, count] of Object.entries(voteCounts)) {
            if (count > maxVotes) {
                maxVotes = count;
                winningChoice = choice;
            }
        }

        // Check if decision passes threshold
        const supportRatio = maxVotes / totalVotes;

        if (supportRatio >= this.config.groupDecisionThreshold) {
            decision.status = 'approved';
            decision.result = winningChoice;

            // Increase authority for successful decision
            this.socialStatus.authority += 0.02;
            this.socialStatus.leadership += 0.01;

            this.stats.groupDecisionsMade++;
        } else {
            decision.status = 'rejected';
        }

        // Broadcast decision result
        this.broadcastDecisionResult(decision);
    }

    /**
     * Broadcast decision result to participants
     * @param {Object} decision - Decision with result
     */
    broadcastDecisionResult(decision) {
        if (!this.communicationSystem) return;

        // Send result to all voters
        for (const [voterId, vote] of decision.votes) {
            const { voter } = vote;

            this.communicationSystem.sendMessage(
                this.villager,
                'group_decision',
                {
                    decision,
                    action: 'result_announcement'
                },
                { targetAgent: voter }
            );
        }
    }

    /**
     * Update social status based on interactions and reputation
     * @param {number} deltaTime - Time since last update
     */
    updateSocialStatus(deltaTime) {
        // Calculate reputation based on relationships
        let totalReputation = 0;
        let relationshipCount = 0;

        for (const relationship of this.relationships.values()) {
            totalReputation += relationship.respect + relationship.trust;
            relationshipCount++;
        }

        if (relationshipCount > 0) {
            const averageReputation = totalReputation / (relationshipCount * 2); // Divided by 2 because we sum respect and trust
            this.socialStatus.reputation = (this.socialStatus.reputation * 0.9) + (averageReputation * 0.1);
        }

        // Update influence based on leadership and reputation
        this.socialStatus.influence = (this.socialStatus.leadership * 0.6 + this.socialStatus.reputation * 0.4) * 0.8;

        // Update popularity based on number and strength of relationships
        const relationshipStrengthSum = Array.from(this.relationships.values())
            .reduce((sum, rel) => sum + rel.strength, 0);

        this.socialStatus.popularity = Math.min(1.0, relationshipStrengthSum / this.config.maxRelationships);
    }

    /**
     * Clean up old information from memory
     */
    cleanupOldInformation() {
        const now = performance.now();
        const expiredInfo = [];

        for (const [infoId, info] of this.knownInformation) {
            if (now - info.timestamp > this.config.memoryDuration) {
                expiredInfo.push(infoId);
            }
        }

        for (const infoId of expiredInfo) {
            this.knownInformation.delete(infoId);
            this.informationSources.delete(infoId);
        }
    }

    /**
     * Receive relationship request from another villager
     * @param {Object} otherVillager - Villager requesting relationship
     * @param {Object} theirRelationship - Their relationship data
     */
    receiveRelationshipRequest(otherVillager, theirRelationship) {
        const villagerId = otherVillager.id;

        // Create reciprocal relationship if we don't have one
        if (!this.relationships.has(villagerId) && this.relationships.size < this.config.maxRelationships) {
            const compatibility = this.calculatePersonalityCompatibility(otherVillager);

            const relationship = {
                villager: otherVillager,
                strength: Math.max(0.1, compatibility * 0.4),
                trust: 0.3 + compatibility * 0.15,
                respect: 0.4,
                affection: compatibility * 0.25,
                cooperation: 0.5,
                lastInteraction: performance.now(),
                interactionCount: 1,
                sharedExperiences: [],
                conflictHistory: [],
                favorsDone: 0,
                favorsReceived: 0,
                informationShared: 0,
                relationshipType: this.determineRelationshipType(compatibility)
            };

            this.relationships.set(villagerId, relationship);
            this.relationshipHistory.set(villagerId, []);
            this.stats.relationshipsFormed++;
        }
    }

    /**
     * Handle received messages
     * @param {Object} message - Received message
     */
    handleMessage(message) {
        switch (message.type) {
            case 'social_interaction':
                this.handleSocialInteractionMessage(message);
                break;
            case 'information_share':
                this.handleInformationShareMessage(message);
                break;
            case 'group_decision':
                this.handleGroupDecisionMessage(message);
                break;
            case 'reputation_update':
                this.handleReputationUpdateMessage(message);
                break;
        }
    }

    /**
     * Handle social interaction message
     * @param {Object} message - Social interaction message
     */
    handleSocialInteractionMessage(message) {
        const { sender } = message;
        const interactionType = message.content.type;

        // Update relationship based on interaction
        const relationship = this.relationships.get(sender.id);
        if (relationship) {
            // Respond to the interaction
            this.respondToInteraction(sender, interactionType, message.content.sentiment);
        }
    }

    /**
     * Respond to social interaction
     * @param {Object} sender - Sender of interaction
     * @param {string} interactionType - Type of interaction
     * @param {string} sentiment - Sentiment of interaction
     */
    respondToInteraction(sender, interactionType, sentiment) {
        const relationship = this.relationships.get(sender.id);
        if (!relationship) return;

        // Update relationship based on interaction and sentiment
        if (sentiment === 'positive') {
            relationship.affection += 0.01;
            relationship.cooperation += 0.005;
        } else if (sentiment === 'negative') {
            relationship.affection -= 0.01;
            relationship.strength -= 0.005;
        }

        // Respond based on personality
        const responseChance = this.personality.agreeableness * this.personality.extroversion;

        if (Math.random() < responseChance) {
            // Send positive response
            if (this.communicationSystem) {
                this.communicationSystem.sendMessage(
                    this.villager,
                    'social_interaction',
                    {
                        type: 'response',
                        originalType: interactionType,
                        sentiment: 'positive'
                    },
                    { targetAgent: sender }
                );
            }
        }
    }

    /**
     * Handle information share message
     * @param {Object} message - Information share message
     */
    handleInformationShareMessage(message) {
        const { sender } = message;
        const { information } = message.content;
        const { trustLevel } = message.content;

        this.receiveInformation(sender, information, trustLevel);
    }

    /**
     * Handle group decision message
     * @param {Object} message - Group decision message
     */
    handleGroupDecisionMessage(message) {
        const { decision } = message.content;
        const { action } = message.content;

        switch (action) {
            case 'invite_to_vote':
                this.handleVoteInvitation(decision);
                break;
            case 'result_announcement':
                this.handleDecisionResult(decision);
                break;
        }
    }

    /**
     * Handle vote invitation
     * @param {Object} decision - Decision to vote on
     */
    handleVoteInvitation(decision) {
        // Decide whether to participate based on relationship with proposer and personality
        const proposerRelationship = this.relationships.get(decision.proposer.id);
        let participationChance = 0.5; // Base chance

        if (proposerRelationship) {
            participationChance += proposerRelationship.trust * 0.3;
            participationChance += proposerRelationship.respect * 0.2;
        }

        // Personality factors
        participationChance += this.personality.conscientiousness * 0.3;
        participationChance += this.personality.agreeableness * 0.2;

        if (Math.random() < participationChance) {
            // Participate in decision
            const vote = this.makeDecisionVote(decision);
            this.submitVote(decision, vote);
        }
    }

    /**
     * Make a vote on a decision
     * @param {Object} decision - Decision to vote on
     * @returns {Object} - Vote object
     */
    makeDecisionVote(decision) {
        // Generate vote based on personality and decision type
        let choice = 'neutral';

        switch (decision.type) {
            case 'resource_allocation':
                choice = this.personality.conscientiousness > 0.6 ? 'fair_distribution' : 'merit_based';
                break;
            case 'safety_measures':
                choice = this.personality.neuroticism > 0.5 ? 'strict_measures' : 'balanced_approach';
                break;
            case 'group_movement':
                choice = this.personality.openness > 0.6 ? 'explore_new_area' : 'stay_current_location';
                break;
            case 'work_assignment':
                choice = this.personality.conscientiousness > 0.6 ? 'skill_based' : 'rotation_based';
                break;
            case 'conflict_resolution':
                choice = this.personality.agreeableness > 0.6 ? 'mediation' : 'authority_decision';
                break;
            case 'leadership_selection':
                choice = this.socialStatus.leadership > 0.6 ? 'self_nomination' : 'support_current';
                break;
        }

        return {
            voter: this.villager,
            choice,
            confidence: this.personality.assertiveness,
            timestamp: performance.now()
        };
    }

    /**
     * Submit vote for a decision
     * @param {Object} decision - Decision to vote on
     * @param {Object} vote - Vote to submit
     */
    submitVote(decision, vote) {
        if (!this.communicationSystem) return;

        // Send vote to decision proposer
        this.communicationSystem.sendMessage(
            this.villager,
            'group_decision',
            {
                decision,
                action: 'submit_vote',
                vote
            },
            { targetAgent: decision.proposer }
        );

        // Record vote in decision (if we're the proposer)
        if (decision.proposer === this.villager) {
            decision.votes.set(vote.voter.id, vote);
        }
    }

    /**
     * Handle decision result
     * @param {Object} decision - Decision with result
     */
    handleDecisionResult(decision) {
        // Update relationship with proposer based on decision outcome
        const proposerRelationship = this.relationships.get(decision.proposer.id);

        if (proposerRelationship) {
            if (decision.status === 'approved') {
                // Successful decision increases respect for proposer
                proposerRelationship.respect += 0.02;
                proposerRelationship.trust += 0.01;
            } else if (decision.status === 'rejected') {
                // Failed decision slightly decreases respect
                proposerRelationship.respect -= 0.01;
            }
        }
    }

    /**
     * Handle reputation update message
     * @param {Object} message - Reputation update message
     */
    handleReputationUpdateMessage(message) {
        const targetId = message.content.target;
        const reputationChange = message.content.change;
        const { reason } = message.content;

        // Update our perception of the target's reputation
        const relationship = this.relationships.get(targetId);
        if (relationship) {
            if (reputationChange > 0) {
                relationship.respect += reputationChange * 0.5;
                relationship.trust += reputationChange * 0.3;
            } else {
                relationship.respect += reputationChange * 0.3;
                relationship.trust += reputationChange * 0.5;
            }

            // Clamp values
            relationship.respect = Math.max(0, Math.min(1, relationship.respect));
            relationship.trust = Math.max(0, Math.min(1, relationship.trust));
        }
    }

    /**
     * Get social network statistics
     * @returns {Object} - Statistics object
     */
    getStatistics() {
        const relationshipStats = {
            totalRelationships: this.relationships.size,
            averageRelationshipStrength: 0,
            averageTrust: 0,
            strongRelationships: 0,
            weakRelationships: 0
        };

        if (this.relationships.size > 0) {
            let totalStrength = 0;
            let totalTrust = 0;

            for (const relationship of this.relationships.values()) {
                totalStrength += relationship.strength;
                totalTrust += relationship.trust;

                if (relationship.strength > 0.7) {
                    relationshipStats.strongRelationships++;
                } else if (relationship.strength < 0.3) {
                    relationshipStats.weakRelationships++;
                }
            }

            relationshipStats.averageRelationshipStrength = totalStrength / this.relationships.size;
            relationshipStats.averageTrust = totalTrust / this.relationships.size;
        }

        return {
            ...this.stats,
            ...relationshipStats,
            socialStatus: { ...this.socialStatus },
            personality: { ...this.personality },
            knownInformation: this.knownInformation.size,
            activeDecisions: this.pendingDecisions.size,
            groupMemberships: this.groupMembership.size
        };
    }

    /**
     * Get current social state
     * @returns {Object} - Current social state
     */
    getSocialState() {
        return {
            reputation: this.socialStatus.reputation,
            leadership: this.socialStatus.leadership,
            influence: this.socialStatus.influence,
            popularity: this.socialStatus.popularity,
            authority: this.socialStatus.authority,
            trustworthiness: this.socialStatus.trustworthiness,
            relationshipCount: this.relationships.size,
            strongRelationships: Array.from(this.relationships.values()).filter(r => r.strength > 0.7).length,
            isLeader: this.socialStatus.leadership > this.config.leadershipThreshold,
            activeDecisions: this.pendingDecisions.size,
            recentInteractions: this.stats.socialInteractions
        };
    }

    /**
     * Get relationship information
     * @param {string} villagerId - ID of villager to get relationship info for
     * @returns {Object|null} - Relationship information or null
     */
    getRelationshipInfo(villagerId) {
        const relationship = this.relationships.get(villagerId);
        if (!relationship) return null;

        return {
            strength: relationship.strength,
            trust: relationship.trust,
            respect: relationship.respect,
            affection: relationship.affection,
            cooperation: relationship.cooperation,
            type: relationship.relationshipType,
            interactionCount: relationship.interactionCount,
            lastInteraction: relationship.lastInteraction,
            sharedExperiences: relationship.sharedExperiences.length,
            conflicts: relationship.conflictHistory.length,
            favorBalance: relationship.favorsDone - relationship.favorsReceived
        };
    }

    /**
     * Force relationship change (for testing or special events)
     * @param {string} villagerId - ID of villager
     * @param {Object} changes - Changes to apply to relationship
     */
    forceRelationshipChange(villagerId, changes) {
        const relationship = this.relationships.get(villagerId);
        if (!relationship) return;

        for (const [key, value] of Object.entries(changes)) {
            if (relationship.hasOwnProperty(key)) {
                relationship[key] = Math.max(0, Math.min(1, relationship[key] + value));
            }
        }
    }

    /**
     * Add information to knowledge base (for external events)
     * @param {Object} information - Information to add
     * @param {Object} source - Source of information (optional)
     */
    addInformation(information, source = null) {
        const infoId = information.id || `info_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        const processedInfo = {
            ...information,
            id: infoId,
            timestamp: performance.now(),
            credibility: source ? 0.8 : 1.0, // External info is highly credible
            importance: this.assessInformationImportance(information)
        };

        this.knownInformation.set(infoId, processedInfo);

        if (source) {
            this.informationSources.set(infoId, source);
        }
    }

    /**
     * Dispose of the social network system
     */
    dispose() {
        // Unregister from systems
        if (this.communicationSystem) {
            this.communicationSystem.unregisterAgent(this.villager);
        }

        // Clear all data structures
        this.relationships.clear();
        this.relationshipHistory.clear();
        this.knownInformation.clear();
        this.informationSources.clear();
        this.rumorNetwork.clear();
        this.groupMembership.clear();
        this.socialGroups.clear();
        this.pendingDecisions.clear();

        console.log(`Villager Social Network disposed for ${this.villager.id}`);
    }
}
