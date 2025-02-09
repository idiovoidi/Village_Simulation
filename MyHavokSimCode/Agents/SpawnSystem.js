import { BowlCreator } from '../BowlCreator.js';
import { VillagerBehaviour } from '../Villagers/VillagerBehaviour.js';
import { ZombieBehaviour } from './Zombies/ZombieBehaviour.js';

export class SpawnSystem {
    constructor(scene) {
        this.scene = scene;
        this.villagerBehaviour = new VillagerBehaviour(scene);
        this.zombieBehaviour = new ZombieBehaviour(scene);
        
        // Spawn configuration
        this.spawnConfig = {
            villager: {
                safeRadius: 50,          // Initial safe spawn radius from village center
                minDistance: 3,          // Minimum distance between villagers
                maxAttempts: 10,         // Maximum spawn attempts per position
                fallbackZones: [
                    { radius: 50, attempts: 10 },
                    { radius: 75, attempts: 5 },
                    { radius: 100, attempts: 3 }
                ]
            },
            zombie: {
                minSpawnRadius: 80,      // Minimum distance from village center
                maxSpawnRadius: 150,     // Maximum distance from village center
                groupSize: { min: 2, max: 4 },
                minDistance: 5,          // Minimum distance between zombie groups
                maxAttempts: 15,         // Maximum spawn attempts per group
                fallbackZones: [
                    { radius: 100, attempts: 8 },
                    { radius: 125, attempts: 5 },
                    { radius: 150, attempts: 3 }
                ]
            }
        };

        // Track spawn points for better distribution
        this.villagerSpawnPoints = [];
        this.zombieSpawnPoints = [];
    }

    initialize(villagerCount = 20, zombieCount = 15) {
        // Initialize behavior systems first
        this.villagerBehaviour.initialize();
        this.zombieBehaviour.initialize();

        // Spawn initial population
        this.spawnVillagers(villagerCount);
        this.spawnZombies(zombieCount);

        // Set up periodic spawn checks
        this.scene.onBeforeRenderObservable.add(() => {
            this.updateSpawns();
        });
    }

    spawnVillagers(count) {
        let spawned = 0;
        let totalAttempts = 0;
        const maxTotalAttempts = count * this.spawnConfig.villager.maxAttempts;

        while (spawned < count && totalAttempts < maxTotalAttempts) {
            const position = this.findVillagerSpawnPosition();
            
            if (position) {
                const villager = this.createVillager(position);
                if (villager) {
                    this.villagerSpawnPoints.push(position);
                    spawned++;
                    
                    // Register locations for activities
                    this.registerVillagerLocations(villager);
                }
            }
            
            totalAttempts++;
        }

        if (spawned < count) {
            console.warn(`Could only spawn ${spawned}/${count} villagers safely`);
        }
    }

    spawnZombies(count) {
        let spawned = 0;
        let totalAttempts = 0;
        const maxTotalAttempts = count * this.spawnConfig.zombie.maxAttempts;

        while (spawned < count && totalAttempts < maxTotalAttempts) {
            const groupSize = Math.floor(
                this.spawnConfig.zombie.groupSize.min + 
                Math.random() * (this.spawnConfig.zombie.groupSize.max - this.spawnConfig.zombie.groupSize.min)
            );

            const groupPosition = this.findZombieGroupSpawnPosition();
            
            if (groupPosition) {
                const spawnedGroup = this.createZombieGroup(groupPosition, groupSize);
                if (spawnedGroup) {
                    this.zombieSpawnPoints.push(groupPosition);
                    spawned += spawnedGroup.length;
                }
            }
            
            totalAttempts++;
        }

        if (spawned < count) {
            console.warn(`Could only spawn ${spawned}/${count} zombies safely`);
        }
    }

    findVillagerSpawnPosition() {
        // Try primary spawn zone
        const position = this.findSafePosition(
            this.spawnConfig.villager.safeRadius,
            this.spawnConfig.villager.minDistance,
            this.villagerSpawnPoints,
            false
        );

        if (position) return position;

        // Try fallback zones
        for (const zone of this.spawnConfig.villager.fallbackZones) {
            const fallbackPosition = this.findSafePosition(
                zone.radius,
                this.spawnConfig.villager.minDistance * 0.8, // Slightly reduce minimum distance
                this.villagerSpawnPoints,
                true,
                zone.attempts
            );
            
            if (fallbackPosition) return fallbackPosition;
        }

        // Last resort: Find least crowded position
        return this.findLeastCrowdedPosition(
            this.villagerSpawnPoints,
            this.spawnConfig.villager.safeRadius,
            this.spawnConfig.villager.minDistance * 0.6
        );
    }

    findZombieGroupSpawnPosition() {
        // Calculate spawn ring (donut shape around village)
        const position = this.findSafePosition(
            this.spawnConfig.zombie.maxSpawnRadius,
            this.spawnConfig.zombie.minDistance,
            this.zombieSpawnPoints,
            false,
            undefined,
            this.spawnConfig.zombie.minSpawnRadius
        );

        if (position) return position;

        // Try fallback zones
        for (const zone of this.spawnConfig.zombie.fallbackZones) {
            const fallbackPosition = this.findSafePosition(
                zone.radius,
                this.spawnConfig.zombie.minDistance * 0.8,
                this.zombieSpawnPoints,
                true,
                zone.attempts,
                this.spawnConfig.zombie.minSpawnRadius * 0.9
            );
            
            if (fallbackPosition) return fallbackPosition;
        }

        // Last resort: Find least crowded position outside minimum radius
        return this.findLeastCrowdedPosition(
            this.zombieSpawnPoints,
            this.spawnConfig.zombie.maxSpawnRadius,
            this.spawnConfig.zombie.minDistance * 0.6,
            this.spawnConfig.zombie.minSpawnRadius * 0.8
        );
    }

    findSafePosition(radius, minDistance, existingPoints, isFallback = false, maxAttempts = 10, minRadius = 0) {
        const attempts = maxAttempts || 10;
        
        for (let i = 0; i < attempts; i++) {
            // Generate random position within radius (considering minimum radius for donut shape)
            const angle = Math.random() * Math.PI * 2;
            const distance = minRadius + Math.random() * (radius - minRadius);
            const x = Math.cos(angle) * distance;
            const z = Math.sin(angle) * distance;
            
            if (this.isPositionSafe(x, z, existingPoints, minDistance, isFallback)) {
                return new BABYLON.Vector3(x, BowlCreator.getTerrainHeight(x, z), z);
            }
        }
        
        return null;
    }

    isPositionSafe(x, z, existingPoints, minDistance, isFallback = false) {
        const y = BowlCreator.getTerrainHeight(x, z);
        if (y === undefined || y === null) return false;

        // Check slope
        const slopeThreshold = isFallback ? 0.8 : 0.5;
        if (!this.isTerrainSlopeAcceptable(x, z, slopeThreshold)) {
            return false;
        }

        // Check distance from existing points
        const position = new BABYLON.Vector3(x, y, z);
        for (const point of existingPoints) {
            const distance = BABYLON.Vector3.Distance(position, point);
            if (distance < minDistance) {
                return false;
            }
        }

        // Check for obstacles using raycast
        const rayStart = new BABYLON.Vector3(x, y + 5, z);
        const rayEnd = new BABYLON.Vector3(x, y - 1, z);
        const ray = new BABYLON.Ray(rayStart, rayEnd.subtract(rayStart).normalize(), 6);
        
        const hit = this.scene.pickWithRay(ray);
        if (hit.hit && hit.pickedMesh && hit.pickedMesh.id !== "terrain") {
            return false;
        }

        return true;
    }

    isTerrainSlopeAcceptable(x, z, threshold) {
        const sampleDistance = 0.5;
        const centerHeight = BowlCreator.getTerrainHeight(x, z);
        
        // Sample heights in a cross pattern
        const samples = [
            BowlCreator.getTerrainHeight(x + sampleDistance, z),
            BowlCreator.getTerrainHeight(x - sampleDistance, z),
            BowlCreator.getTerrainHeight(x, z + sampleDistance),
            BowlCreator.getTerrainHeight(x, z - sampleDistance)
        ];

        // Check max slope difference
        for (const height of samples) {
            if (Math.abs(height - centerHeight) > threshold) {
                return false;
            }
        }

        return true;
    }

    findLeastCrowdedPosition(existingPoints, maxRadius, minDistance, minRadius = 0) {
        let bestPosition = null;
        let maxMinDistance = 0;

        // Grid search for position with maximum minimum distance to existing points
        const gridSize = 20;
        const stepSize = maxRadius * 2 / gridSize;

        for (let i = 0; i < gridSize; i++) {
            for (let j = 0; j < gridSize; j++) {
                const x = -maxRadius + i * stepSize;
                const z = -maxRadius + j * stepSize;

                // Check if position is within allowed radius range
                const distanceFromCenter = Math.sqrt(x * x + z * z);
                if (distanceFromCenter < minRadius || distanceFromCenter > maxRadius) {
                    continue;
                }

                // Skip if terrain is not suitable
                if (!this.isTerrainSlopeAcceptable(x, z, 1.0)) {
                    continue;
                }

                let minDistanceToExisting = Infinity;
                const position = new BABYLON.Vector3(
                    x,
                    BowlCreator.getTerrainHeight(x, z),
                    z
                );

                for (const point of existingPoints) {
                    const distance = BABYLON.Vector3.Distance(position, point);
                    minDistanceToExisting = Math.min(minDistanceToExisting, distance);
                }

                if (minDistanceToExisting > maxMinDistance) {
                    maxMinDistance = minDistanceToExisting;
                    bestPosition = position;
                }
            }
        }

        return bestPosition;
    }

    createVillager(position) {
        // Create the villager mesh
        const villagerMesh = this.createVillagerMesh(position);
        
        // Create villager data object
        const villager = {
            mesh: villagerMesh,
            position: position,
            speed: 0.05,
            currentActivity: 'idle',
            state: 'wandering',
            needs: {
                energy: 100,
                hunger: 100,
                social: 100,
                safety: 100
            },
            lastScheduleHour: -1,
            dailyWorkDone: 0,
            socialInteractions: 0,
            dailyInteractions: new Map()
        };

        // Add villager to behavior system
        return this.villagerBehaviour.addVillager(villager);
    }

    createZombieGroup(position, size) {
        const group = [];
        for (let i = 0; i < size; i++) {
            const offset = new BABYLON.Vector3(
                (Math.random() - 0.5) * 5,
                0,
                (Math.random() - 0.5) * 5
            );
            const zombiePosition = position.add(offset);
            zombiePosition.y = BowlCreator.getTerrainHeight(zombiePosition.x, zombiePosition.z);
            
            const zombie = this.zombieBehaviour.createZombie(zombiePosition);
            if (zombie) {
                group.push(zombie);
            }
        }
        return group;
    }

    createVillagerMesh(position) {
        // Create basic villager mesh (can be enhanced with more detailed models)
        const villager = BABYLON.MeshBuilder.CreateCapsule("villager", {
            radius: 0.4,
            height: 1.8,
            tessellation: 16
        }, this.scene);
        villager.position = position;
        
        // Add physics with locked rotations
        const aggregate = new BABYLON.PhysicsAggregate(
            villager,
            BABYLON.PhysicsShapeType.CAPSULE,
            { 
                mass: 1, 
                restitution: 0.2, 
                friction: 0.8,
                // Lock rotations except for Y axis (turning)
                enabledRotations: {
                    x: false,
                    y: true,
                    z: false
                }
            },
            this.scene
        );

        // Add a physics behavior to keep the villager upright
        this.scene.onBeforeRenderObservable.add(() => {
            // Reset angular velocity to prevent unwanted rotation
            aggregate.body.setAngularVelocity(new BABYLON.Vector3(0, aggregate.body.getAngularVelocity().y, 0));
            
            // Keep position above ground
            const groundHeight = BowlCreator.getTerrainHeight(villager.position.x, villager.position.z);
            if (villager.position.y < groundHeight + 0.9) { // 0.9 is half height
                villager.position.y = groundHeight + 0.9;
                aggregate.body.setLinearVelocity(new BABYLON.Vector3(
                    aggregate.body.getLinearVelocity().x,
                    0,
                    aggregate.body.getLinearVelocity().z
                ));
            }
        });

        // Add villager material
        const villagerMaterial = new BABYLON.StandardMaterial("villagerMat", this.scene);
        villagerMaterial.diffuseColor = new BABYLON.Color3(0.8, 0.6, 0.5); // Skin tone
        villager.material = villagerMaterial;

        return villager;
    }

    registerVillagerLocations(villager) {
        // Register house as sleep location
        this.villagerBehaviour.registerLocation('sleep', villager.mesh.position.clone());
        
        // Register work locations based on role
        const workPos = villager.mesh.position.clone();
        workPos.x += (Math.random() - 0.5) * 10;
        workPos.z += (Math.random() - 0.5) * 10;
        this.villagerBehaviour.registerLocation('work', workPos);
        
        // Register social locations
        const socialPos = villager.mesh.position.clone();
        socialPos.x += (Math.random() - 0.5) * 15;
        socialPos.z += (Math.random() - 0.5) * 15;
        this.villagerBehaviour.registerLocation('socialize', socialPos);
    }

    updateSpawns() {
        // Implement periodic spawn checks and balancing here
        // This could include:
        // - Respawning villagers if population drops too low
        // - Spawning new zombie groups based on game progression
        // - Maintaining minimum distances between groups
        // - Adjusting spawn rates based on player performance
    }

    dispose() {
        this.villagerBehaviour.dispose();
        this.zombieBehaviour.dispose();
        this.villagerSpawnPoints = [];
        this.zombieSpawnPoints = [];
    }
} 