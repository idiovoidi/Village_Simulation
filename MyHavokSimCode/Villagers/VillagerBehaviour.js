import { BowlCreator } from '../BowlCreator.js';
import { WorldClock } from '../UI/WorldClock.js';
import { DayNightCycle } from '../Environment/DayNightCycle.js';
import { VillagerGoals } from './VillagerGoals.js';

export class VillagerBehaviour {
    constructor(scene) {
        this.scene = scene;
        this.villagers = [];
        this.timeScale = 1200; // 1 real second = 20 game minutes
        this.gameTime = 8 * 60; // Start at 8:00 AM
        this.locations = new Map();
        this.relationships = new Map();
        this.currentConversations = new Set();
        
        // Initialize time-related systems
        this.worldClock = new WorldClock(this.scene);
        this.dayNightCycle = new DayNightCycle(this.scene);
        
        // Initialize time system
        this.scene.onBeforeRenderObservable.add(() => {
            const deltaTime = this.scene.getEngine().getDeltaTime() * 0.001;
            this.updateTime(deltaTime);
        });

        // Force initial update
        this.updateTime(0);

        // Add goals system
        this.villagerGoals = new Map();
    }

    updateTime(deltaTime) {
        // Update game time (in minutes)
        this.gameTime += deltaTime * this.timeScale / 60;
        if (this.gameTime >= 24 * 60) {
            this.gameTime = 0;
            this.onDayEnd();
        }

        // Update UI and environment
        this.worldClock.updateTime(this.gameTime);
        this.dayNightCycle.update(this.gameTime);

        // Get current hour
        const currentHour = Math.floor(this.gameTime / 60);
        
        // Update villager schedules
        this.villagers.forEach(villager => {
            if (!villager.isInfected) {
                this.updateVillagerSchedule(villager, currentHour);
            }
        });
    }

    onDayEnd() {
        // Handle end of day events
        this.villagers.forEach(villager => {
            // Reset daily stats
            villager.dailyWorkDone = 0;
            villager.socialInteractions = 0;
            
            // Update relationships based on daily interactions
            if (villager.dailyInteractions) {
                villager.dailyInteractions.forEach((count, otherId) => {
                    this.updateRelationship(
                        villager,
                        this.villagers.find(v => v.id === otherId),
                        count * 0.02
                    );
                });
                villager.dailyInteractions.clear();
            }
        });

        // Update seasonal effects
        const day = Math.floor(this.gameTime / (24 * 60));
        if (day % 30 === 0) {
            this.onSeasonChange();
        }
    }

    onSeasonChange() {
        // Update environment based on season
        const season = Math.floor((this.gameTime / (30 * 24 * 60)) % 4);
        
        switch(season) {
            case 0: // Spring
                this.dayNightCycle.updateSeasonalEffects({
                    fogColor: new BABYLON.Color3(0.8, 0.9, 1.0),
                    skyTint: new BABYLON.Color3(0.85, 0.9, 1.0),
                    sunIntensity: 1.0
                });
                break;
            case 1: // Summer
                this.dayNightCycle.updateSeasonalEffects({
                    fogColor: new BABYLON.Color3(0.9, 0.9, 0.8),
                    skyTint: new BABYLON.Color3(1.0, 0.95, 0.8),
                    sunIntensity: 1.2
                });
                break;
            case 2: // Autumn
                this.dayNightCycle.updateSeasonalEffects({
                    fogColor: new BABYLON.Color3(0.8, 0.7, 0.6),
                    skyTint: new BABYLON.Color3(0.9, 0.8, 0.7),
                    sunIntensity: 0.9
                });
                break;
            case 3: // Winter
                this.dayNightCycle.updateSeasonalEffects({
                    fogColor: new BABYLON.Color3(0.7, 0.7, 0.8),
                    skyTint: new BABYLON.Color3(0.8, 0.8, 0.9),
                    sunIntensity: 0.7
                });
                break;
        }
    }

    updateVillagerSchedule(villager, currentHour) {
        // Check if villager should change activity
        if (currentHour !== villager.lastScheduleHour) {
            villager.lastScheduleHour = currentHour;
            
            // Determine new activity based on time
            const newActivity = this.getScheduledActivity(villager, currentHour);
            if (newActivity !== villager.currentActivity) {
                this.transitionToActivity(villager, newActivity);
            }
        }

        // Update current activity and goals
        this.updateActivity(villager);
        this.updateVillagerNeeds(villager);
    }

    getScheduledActivity(villager, hour) {
        // Basic schedule template
        const schedule = {
            0: 'sleep',    // 12 AM - 6 AM: Sleep
            6: 'wakeup',   // 6 AM: Wake up routine
            7: 'breakfast', // 7 AM: Have breakfast
            8: 'work',     // 8 AM - 12 PM: Work
            12: 'lunch',   // 12 PM: Lunch
            13: 'work',    // 1 PM - 5 PM: Work
            17: 'leisure', // 5 PM - 8 PM: Free time
            20: 'dinner',  // 8 PM: Dinner
            21: 'socialize', // 9 PM - 10 PM: Socialize
            22: 'prepare_sleep', // 10 PM: Prepare for bed
            23: 'sleep'    // 11 PM: Sleep
        };

        // Personality variations
        if (villager.personality === 'social') {
            schedule[17] = 'socialize'; // Prefer socializing in free time
        } else if (villager.personality === 'industrious') {
            schedule[17] = 'work'; // Work overtime
        }

        // Return activity for current hour
        for (let scheduleHour = hour; scheduleHour >= 0; scheduleHour--) {
            if (schedule[scheduleHour]) {
                return schedule[scheduleHour];
            }
        }
        return 'sleep'; // Default activity
    }

    transitionToActivity(villager, activity) {
        villager.currentActivity = activity;
        villager.activityStartTime = this.gameTime;
        
        // Update goals and moods based on activity
        const goals = this.villagerGoals.get(villager.id);
        if (goals) {
            switch (activity) {
                case 'sleep':
                    goals.setGoal('REST');
                    goals.setMood('TIRED');
                    break;
                case 'work':
                    goals.setGoal('WORK');
                    if (goals.getNeed('energy') < 30) {
                        goals.setMood('EXHAUSTED');
                    } else {
                        goals.setMood('FOCUSED');
                    }
                    break;
                case 'eat':
                    goals.setGoal('EAT');
                    if (goals.getNeed('hunger') > 70) {
                        goals.setMood('HUNGRY');
                    } else {
                        goals.setMood('SATISFIED');
                    }
                    break;
                case 'socialize':
                    goals.setGoal('SOCIALIZE');
                    goals.setMood('HAPPY');
                    break;
                case 'wander':
                    goals.setGoal('EXPLORE');
                    if (goals.getNeed('safety') < 50) {
                        goals.setMood('WORRIED');
                    } else {
                        goals.setMood('CONTENT');
                    }
                    break;
                case 'rest':
                    goals.setGoal('REST');
                    goals.setMood('RELAXED');
                    break;
                case 'flee':
                    goals.setGoal('FLEE');
                    goals.setMood('SCARED');
                    break;
            }
        }
        
        // Get destination for activity
        const destination = this.getActivityLocation(villager, activity);
        if (destination) {
            villager.destination = destination;
            villager.state = 'moving';
        }
    }

    updateActivity(villager) {
        switch (villager.state) {
            case 'moving':
                this.updateMovement(villager);
                break;
            case 'working':
                this.updateWork(villager);
                break;
            case 'socializing':
                this.updateSocializing(villager);
                break;
            case 'resting':
                this.updateResting(villager);
                break;
        }
    }

    updateMovement(villager) {
        if (!villager.destination) return;

        const direction = villager.destination.subtract(villager.mesh.position);
        const distance = direction.length();

        if (distance < 0.1) {
            // Arrived at destination
            villager.state = this.getStateForActivity(villager.currentActivity);
            return;
        }

        // Get current physics aggregate
        const physicsAggregate = villager.mesh.getPhysicsBody();
        if (!physicsAggregate) return;

        // Calculate movement direction and speed
        direction.normalize();
        const moveSpeed = villager.speed;
        const currentVelocity = physicsAggregate.getLinearVelocity();
        
        // Calculate target velocity
        const targetVelocity = new BABYLON.Vector3(
            direction.x * moveSpeed,
            currentVelocity.y, // Preserve vertical velocity
            direction.z * moveSpeed
        );

        // Smoothly interpolate to target velocity
        const smoothFactor = 0.1;
        const newVelocity = new BABYLON.Vector3(
            currentVelocity.x + (targetVelocity.x - currentVelocity.x) * smoothFactor,
            targetVelocity.y,
            currentVelocity.z + (targetVelocity.z - currentVelocity.z) * smoothFactor
        );

        // Apply the new velocity
        physicsAggregate.setLinearVelocity(newVelocity);

        // Update rotation to face movement direction (only Y axis)
        const targetRotation = Math.atan2(direction.x, direction.z);
        const currentRotation = villager.mesh.rotation.y;
        
        // Smoothly interpolate rotation
        const rotationDiff = BABYLON.Scalar.WrapAngle(targetRotation - currentRotation);
        villager.mesh.rotation.y += rotationDiff * 0.1;
    }

    initiateSocialActivity(villager) {
        // Find nearby villagers to socialize with
        const nearbyVillagers = this.findNearbyVillagers(villager, 5);
        const availableVillagers = nearbyVillagers.filter(v => 
            v.currentActivity === 'socialize' && 
            !this.currentConversations.has(v.id)
        );

        if (availableVillagers.length > 0) {
            // Start conversation with random available villager
            const partner = availableVillagers[Math.floor(Math.random() * availableVillagers.length)];
            this.startConversation(villager, partner);
        } else {
            // No one available, wait or wander
            villager.state = 'wandering';
        }
    }

    startConversation(villager1, villager2) {
        const conversationId = `conv_${villager1.id}_${villager2.id}`;
        this.currentConversations.add(conversationId);

        // Set both villagers to conversing state
        villager1.state = 'socializing';
        villager2.state = 'socializing';
        villager1.conversationPartner = villager2;
        villager2.conversationPartner = villager1;

        // Update relationship
        this.updateRelationship(villager1, villager2, 0.1);

        // Set conversation duration
        const duration = 2 + Math.random() * 3; // 2-5 minutes
        setTimeout(() => {
            this.endConversation(conversationId, villager1, villager2);
        }, duration * 60000 / this.timeScale);
    }

    updateRelationship(villager1, villager2, change) {
        const relationshipKey = `${Math.min(villager1.id, villager2.id)}_${Math.max(villager1.id, villager2.id)}`;
        let relationship = this.relationships.get(relationshipKey) || 0;
        relationship = Math.max(-1, Math.min(1, relationship + change));
        this.relationships.set(relationshipKey, relationship);
    }

    endConversation(conversationId, villager1, villager2) {
        this.currentConversations.delete(conversationId);
        
        // Reset villagers' states if they're still socializing
        if (villager1.state === 'socializing') {
            villager1.state = 'wandering';
            villager1.conversationPartner = null;
        }
        if (villager2.state === 'socializing') {
            villager2.state = 'wandering';
            villager2.conversationPartner = null;
        }
    }

    assignWork(villager) {
        // Assign work based on villager's role
        switch (villager.role) {
            case 'farmer':
                this.assignFarmWork(villager);
                break;
            case 'merchant':
                this.assignMerchantWork(villager);
                break;
            case 'guard':
                this.assignGuardWork(villager);
                break;
            default:
                this.assignGeneralWork(villager);
        }
    }

    updateWork(villager) {
        if (!villager.workTask) return;

        switch (villager.workTask.type) {
            case 'farm':
                this.updateFarmWork(villager);
                break;
            case 'patrol':
                this.updatePatrol(villager);
                break;
            case 'trade':
                this.updateTrading(villager);
                break;
        }
    }

    getActivityLocation(villager, activity) {
        const locations = this.locations.get(activity) || [];
        if (locations.length === 0) return null;

        // Find nearest location
        let nearest = null;
        let minDistance = Infinity;

        locations.forEach(location => {
            const distance = BABYLON.Vector3.Distance(
                villager.mesh.position,
                location
            );
            if (distance < minDistance) {
                minDistance = distance;
                nearest = location;
            }
        });

        return nearest;
    }

    findNearbyVillagers(villager, radius) {
        return this.villagers.filter(v => 
            v !== villager &&
            !v.isInfected &&
            BABYLON.Vector3.Distance(villager.mesh.position, v.mesh.position) <= radius
        );
    }

    getStateForActivity(activity) {
        switch (activity) {
            case 'work': return 'working';
            case 'socialize': return 'wandering';
            case 'sleep': return 'resting';
            default: return 'idle';
        }
    }

    registerLocation(type, position) {
        if (!this.locations.has(type)) {
            this.locations.set(type, []);
        }
        this.locations.get(type).push(position);
    }

    addVillager(villager) {
        villager.id = this.villagers.length;
        villager.personality = this.generatePersonality();
        villager.role = this.assignRole();
        villager.currentActivity = 'idle';
        villager.state = 'wandering';
        villager.speed = 0.05;
        
        // Initialize goals system for this villager
        const goals = new VillagerGoals(this.scene, villager);
        this.villagerGoals.set(villager.id, goals);
        
        this.villagers.push(villager);
        return villager;
    }

    generatePersonality() {
        const personalities = ['social', 'industrious', 'relaxed', 'anxious'];
        return personalities[Math.floor(Math.random() * personalities.length)];
    }

    assignRole() {
        const roles = ['farmer', 'merchant', 'guard', 'general'];
        return roles[Math.floor(Math.random() * roles.length)];
    }

    updateVillagerNeeds(villager) {
        const goals = this.villagerGoals.get(villager.id);
        if (!goals) return;

        // Decay needs over time
        goals.satisfyNeed('energy', -0.1);
        goals.satisfyNeed('hunger', -0.15);
        goals.satisfyNeed('social', -0.05);
        
        // Update safety based on nearby threats
        const threats = this.checkForThreats(villager);
        if (threats.length > 0) {
            goals.satisfyNeed('safety', -0.3);
        } else {
            goals.satisfyNeed('safety', 0.05);
        }

        // Emergency mood updates based on critical needs
        if (goals.getNeed('energy') < 10) {
            goals.setMood('EXHAUSTED');
        }
        if (goals.getNeed('hunger') < 10) {
            goals.setMood('STARVING');
        }
        if (goals.getNeed('social') < 10) {
            goals.setMood('LONELY');
        }
        if (goals.getNeed('safety') < 20) {
            goals.setMood('TERRIFIED');
        }
    }

    respondToThreat(guard, threat) {
        const goals = this.villagerGoals.get(guard.id);
        if (goals) {
            goals.setMood('ANGRY');
            goals.setGoal('GUARD');
        }

        guard.workTask.state = 'responding';
        guard.destination = threat.position;
        guard.state = 'moving';
    }

    fleeFromThreat(villager, threat) {
        const goals = this.villagerGoals.get(villager.id);
        if (goals) {
            goals.setMood('SCARED');
            goals.setGoal('FLEE');
        }

        // Calculate flee direction (opposite of threat)
        const fleeDirection = villager.mesh.position.subtract(threat.position).normalize();
        const fleeDistance = 20;
        villager.destination = villager.mesh.position.add(fleeDirection.scale(fleeDistance));
        villager.state = 'fleeing';
    }

    dispose() {
        // Dispose all villager goals
        for (const goals of this.villagerGoals.values()) {
            goals.dispose();
        }
        this.villagerGoals.clear();

        this.worldClock.dispose();
        this.dayNightCycle.dispose();
        this.villagers.forEach(villager => {
            if (villager.dispose) {
                villager.dispose();
            }
        });
        this.villagers = [];
        this.locations.clear();
        this.relationships.clear();
        this.currentConversations.clear();
    }
} 