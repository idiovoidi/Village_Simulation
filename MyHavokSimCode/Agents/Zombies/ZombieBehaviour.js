import { ZombieAgent } from './ZombieAgent.js';
import { BowlCreator } from '../../BowlCreator.js';

export class ZombieBehaviour {
    constructor(scene, options = {}) {
        // Inject dependencies
        this.scene = scene;
        this.zombies = [];
        this.villagerSystem = null; // Will be set by the main scene

        // Configuration parameters with defaults
        this.config = {
            wanderRadius: options.wanderRadius || 80,
            terrainBounds: {
                minHeight: options.minHeight || -20,
                maxHeight: options.maxHeight || 0
            },
            grouping: {
                cohesionDistance: options.groupCohesion || 15,
                groupMinSize: 2,
                groupMaxSize: 4
            },
            speed: {
                min: options.minSpeed || 0.02,
                max: options.maxSpeed || 0.05,
                lurgeMultiplier: options.lurgeSpeedMultiplier || 4.0
            },
            lurge: {
                chance: options.lurgeChance || 0.02,
                duration: options.lurgeDuration || 1.0
            },
            detection: {
                playerAwarenessRadius: options.playerAwarenessRadius || 40,
                aggressiveRadius: options.aggressiveRadius || 30
            }
        };
    }

    initialize(count, options = {}) {
        // Create zombie agents
        this.createZombies(count, options);

        // PERFORMANCE FIX: Disabled duplicate render loop
        // Updates are handled by ZombieBehaviour.update() called from main loop
        // this.scene.registerBeforeRender(() => {
        //     const deltaTime = this.scene.getEngine().getDeltaTime() * 0.001;
        //     this.update(deltaTime);
        // });
    }

    createZombies(count, options = {}) {
        // Create zombies in groups
        const groupCount = Math.ceil(count / 3);

        for (let g = 0; g < groupCount; g++) {
            const groupPos = this._getRandomPosition();

            // Determine group size (2-4 zombies per group)
            const groupSize = Math.min(
                count - this.zombies.length,
                this.config.grouping.groupMinSize
                + Math.floor(Math.random() * (this.config.grouping.groupMaxSize - this.config.grouping.groupMinSize))
            );

            // Create zombies for this group
            for (let i = 0; i < groupSize; i++) {
                // Create position with slight offset from group center
                const offset = new BABYLON.Vector3(
                    (Math.random() - 0.5) * 5,
                    0,
                    (Math.random() - 0.5) * 5
                );
                const position = groupPos.add(offset);
                position.y = this._getTerrainHeight(position.x, position.z);

                // Create zombie agent with shared configuration
                const zombie = new ZombieAgent(this.scene, {
                    position,
                    initialState: 'idle',
                    groupId: g,
                    minSpeed: this.config.speed.min,
                    maxSpeed: this.config.speed.max,
                    lurgeSpeedMultiplier: this.config.speed.lurgeMultiplier,
                    lurgeChance: this.config.lurge.chance,
                    lurgeDuration: this.config.lurge.duration,
                    swayAmount: 0.2 + Math.random() * 0.2 // Vary the shamble amount
                });

                // Add to our managed zombies collection
                this.zombies.push(zombie);
            }
        }

        return this.zombies;
    }

    update(deltaTime) {
        // Update each zombie
        this.zombies.forEach(zombie => {
            // Let zombie handle its own behavior update
            zombie.update(deltaTime);

            // Add group behavior influence
            this._updateGroupBehavior(zombie, deltaTime);

            // Check for player detection
            this._checkPlayerDetection(zombie);
        });
    }

    _updateGroupBehavior(zombie, deltaTime) {
        // Find group mates
        const groupMates = this.zombies.filter(z =>
            z.groupId === zombie.groupId && z !== zombie
        );

        if (groupMates.length === 0) return;

        // Calculate group center
        const groupCenter = new BABYLON.Vector3(0, 0, 0);
        groupMates.forEach(mate => {
            groupCenter.addInPlace(mate.model.mesh.position);
        });
        groupCenter.scaleInPlace(1 / groupMates.length);

        // Determine if zombie should move toward group
        const toGroup = groupCenter.subtract(zombie.model.mesh.position);
        const groupDist = toGroup.length();

        // Only apply cohesion if zombie is too far from group
        if (groupDist > this.config.grouping.cohesionDistance) {
            // Check if zombie is pursuing player
            const isPursuing = zombie.state === 'pursuing';
            const cohesionWeight = isPursuing ? 0.3 : 0.6; // Less cohesion when pursuing

            // Calculate a new target that includes group cohesion
            const currentTarget = zombie.target.clone();
            const groupTarget = groupCenter.clone();

            // Blend current target with group cohesion
            const blendedTarget = currentTarget.scale(1 - cohesionWeight).add(
                groupTarget.scale(cohesionWeight)
            );

            // Set new target
            zombie.setTarget(blendedTarget);
        }

        // Add separation behavior to prevent clumping
        const separationDistance = 3; // Minimum distance between zombies
        groupMates.forEach(mate => {
            const distToMate = BABYLON.Vector3.Distance(zombie.model.mesh.position, mate.model.mesh.position);
            if (distToMate < separationDistance) {
                const awayFromMate = zombie.model.mesh.position.subtract(mate.model.mesh.position).normalize();
                const newPos = zombie.model.mesh.position.add(awayFromMate.scale(0.1));
                zombie.model.mesh.position = newPos;
            }
        });

        // State influence - zombies can influence each other
        // If one zombie is pursuing, others nearby might join
        if (zombie.state === 'idle') {
            const pursuingNeighbor = groupMates.find(mate =>
                mate.state === 'pursuing'
                && BABYLON.Vector3.Distance(mate.model.mesh.position, zombie.model.mesh.position) < 15
            );

            if (pursuingNeighbor && Math.random() < 0.03 * deltaTime * 60) { // 3% chance per second
                zombie.setState('pursuing');
            }
        }

        // If pursuing, check for nearby villagers to attack
        if (zombie.state === 'pursuing' && this.villagerSystem) {
            const nearbyVillagers = this.villagerSystem.villagers.filter(villager =>
                BABYLON.Vector3.Distance(zombie.model.mesh.position, villager.mesh.position) < 3
            );

            if (nearbyVillagers.length > 0) {
                // Attack the first villager in range
                this.villagerSystem.killVillager(nearbyVillagers[0]);
                zombie.setState('idle'); // Go idle after an attack
            }
        }
    }

    _checkPlayerDetection(zombie) {
        // Check if zombie should detect the player
        if (zombie.state === 'idle') {
            const playerPos = this.scene.activeCamera.position;
            const distToPlayer = BABYLON.Vector3.Distance(zombie.model.mesh.position, playerPos);

            if (distToPlayer < this.config.detection.playerAwarenessRadius) {
                // Become suspicious and investigate the player's position
                zombie.setTarget(playerPos);
                zombie.setState('suspicious');
            }
        } else if (zombie.state === 'suspicious') {
            const playerPos = this.scene.activeCamera.position;
            const distToPlayer = BABYLON.Vector3.Distance(zombie.model.mesh.position, playerPos);

            // If player is still close after investigating, become aggressive
            if (distToPlayer < this.config.detection.aggressiveRadius) {
                zombie.setState('pursuing');
            }
        }
    }

    _getRandomPosition() {
        // Generate a random position within the wander radius
        const angle = Math.random() * Math.PI * 2;
        const radius = Math.random() * this.config.wanderRadius;
        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;
        const y = this._getTerrainHeight(x, z) + 2; // Add offset to ensure above ground

        return new BABYLON.Vector3(x, y, z);
    }

    _getTerrainHeight(x, z) {
        // Use BowlCreator for terrain height if available
        if (typeof BowlCreator.getTerrainHeight === 'function') {
            return BowlCreator.getTerrainHeight(x, z);
        }

        // Fallback to simple bowl shape
        const distFromCenter = Math.sqrt(x * x + z * z);
        const bowlDepth = 25;

        // Bowl shape with some variation
        let height = -Math.pow(distFromCenter / this.config.wanderRadius, 1.2) * bowlDepth;
        height += Math.sin(x / 20) * Math.cos(z / 20) * 2;

        return Math.max(
            this.config.terrainBounds.minHeight,
            Math.min(this.config.terrainBounds.maxHeight, height)
        );
    }

    getZombieCount() {
        return this.zombies.length;
    }

    addZombie(position) {
        // Find a group with the fewest members
        let targetGroupId = 0;
        let minGroupSize = Infinity;

        // Count zombies in each group
        const groupCounts = {};
        this.zombies.forEach(zombie => {
            if (!groupCounts[zombie.groupId]) {
                groupCounts[zombie.groupId] = 0;
            }
            groupCounts[zombie.groupId]++;
        });

        // Find smallest group
        Object.entries(groupCounts).forEach(([groupId, count]) => {
            if (count < minGroupSize) {
                minGroupSize = count;
                targetGroupId = parseInt(groupId);
            }
        });

        // If all groups are large, create a new group
        if (minGroupSize >= this.config.grouping.groupMaxSize) {
            targetGroupId = Object.keys(groupCounts).length;
        }

        // Create new zombie
        const zombie = new ZombieAgent(this.scene, {
            position: position || this._getRandomPosition(),
            initialState: 'idle',
            groupId: targetGroupId,
            minSpeed: this.config.speed.min,
            maxSpeed: this.config.speed.max,
            lurgeSpeedMultiplier: this.config.speed.lurgeMultiplier,
            lurgeChance: this.config.lurge.chance,
            lurgeDuration: this.config.lurge.duration
        });

        // Add metadata for RTS UI
        if (zombie.mesh) {
            zombie.mesh.metadata = {
                entityId: this.zombies.length,
                entityType: 'Zombie',
                health: zombie.health || 80,
                maxHealth: 80,
                state: zombie.state || 'idle',
                groupId: targetGroupId
            };
        }

        this.zombies.push(zombie);
        return zombie;
    }

    removeZombie(index) {
        if (index >= 0 && index < this.zombies.length) {
            const zombie = this.zombies[index];
            zombie.dispose();
            this.zombies.splice(index, 1);
            return true;
        }
        return false;
    }

    dispose() {
        // Clean up all zombies
        this.zombies.forEach(zombie => {
            zombie.dispose();
        });
        this.zombies = [];

        // Clear scene before render observable
        this.scene.onBeforeRenderObservable.clear();
    }
}
