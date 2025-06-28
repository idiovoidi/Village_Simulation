export class LevelConfig {
    static Levels = {
        VILLAGE: {
            name: "Village",
            description: "A peaceful village with houses, dogs, and a central plaza",
            config: {
                bowlRadius: 100,
                bowlDepth: 25,
                villageRadius: 60,
                houseCount: 15,
                dogCount: 3,
                birdCount: 15,
                waterLevel: -2,
                fishCount: 20,
                zombieCount: 5,
                hasVillage: true,
                hasWater: true,
                hasBirds: true,
                hasFish: true,
                hasZombies: true,
                hasDogs: true,
                hasClouds: true,
                hasMoon: true
            }
        },
        ZOMBIE_APOCALYPSE: {
            name: "Zombie Apocalypse",
            description: "A dark version of the village overrun by zombies",
            config: {
                bowlRadius: 100,
                bowlDepth: 30,
                villageRadius: 60,
                houseCount: 10,
                dogCount: 0,
                birdCount: 5,
                waterLevel: -5,
                fishCount: 0,
                zombieCount: 20,
                hasVillage: true,
                hasWater: true,
                hasBirds: true,
                hasFish: false,
                hasZombies: true,
                hasDogs: false,
                hasClouds: false,
                hasMoon: true
            }
        },
        ZOMBIE_INVASION: {
            name: "Zombie Invasion",
            description: "A massive zombie horde invading the countryside",
            config: {
                bowlRadius: 120,
                bowlDepth: 35,
                villageRadius: 40, // Smaller village
                houseCount: 8,
                dogCount: 0,
                birdCount: 0,
                waterLevel: -10,
                fishCount: 0,
                zombieCount: 40, // Large zombie horde
                hasVillage: true,
                hasWater: true,
                hasBirds: false,
                hasFish: false,
                hasZombies: true,
                hasDogs: false,
                hasClouds: false,
                hasMoon: true,
                zombieAggressiveness: 1.5, // Zombies are more aggressive
                specialEffects: {
                    fog: true,
                    bloodParticles: true,
                    redSky: true
                }
            }
        },
        NATURE: {
            name: "Nature Reserve",
            description: "A peaceful natural environment with birds and fish",
            config: {
                bowlRadius: 120,
                bowlDepth: 20,
                villageRadius: 0,
                houseCount: 0,
                dogCount: 0,
                birdCount: 30,
                waterLevel: -1,
                fishCount: 40,
                zombieCount: 0,
                hasVillage: false,
                hasWater: true,
                hasBirds: true,
                hasFish: true,
                hasZombies: false,
                hasDogs: false,
                hasClouds: true,
                hasMoon: true
            }
        }
    };

    static getCurrentLevel() {
        const levelName = localStorage.getItem('currentLevel') || 'VILLAGE';
        return this.Levels[levelName];
    }

    static setCurrentLevel(levelName) {
        if (this.Levels[levelName]) {
            localStorage.setItem('currentLevel', levelName);
            return true;
        }
        return false;
    }

    static getAllLevels() {
        return Object.entries(this.Levels).map(([key, level]) => ({
            id: key,
            name: level.name,
            description: level.description
        }));
    }
} 