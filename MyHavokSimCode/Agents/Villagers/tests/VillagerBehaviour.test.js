/**
 * Integration tests for enhanced VillagerBehaviour class
 */

import { VillagerBehaviour } from '../VillagerBehaviour.js';

describe('Enhanced VillagerBehaviour Integration Tests', () => {
    let scene;
    let villagerBehaviour;
    let mockVillager;

    beforeEach(() => {
        // Mock Babylon.js scene
        scene = {
            onBeforeRenderObservable: {
                add: jest.fn(),
                remove: jest.fn(),
                clear: jest.fn()
            },
            getEngine: () => ({
                getDeltaTime: () => 16.67 // ~60 FPS
            }),
            meshes: []
        };

        // Mock global BABYLON
        global.BABYLON = {
            Vector3: class {
                constructor(x = 0, y = 0, z = 0) {
                    this.x = x;
                    this.y = y;
                    this.z = z;
                }

                static Zero() {
                    return new global.BABYLON.Vector3(0, 0, 0);
                }

                static Distance(v1, v2) {
                    const dx = v1.x - v2.x;
                    const dy = v1.y - v2.y;
                    const dz = v1.z - v2.z;
                    return Math.sqrt(dx * dx + dy * dy + dz * dz);
                }

                clone() {
                    return new global.BABYLON.Vector3(this.x, this.y, this.z);
                }

                subtract(other) {
                    return new global.BABYLON.Vector3(
                        this.x - other.x,
                        this.y - other.y,
                        this.z - other.z
                    );
                }

                add(other) {
                    return new global.BABYLON.Vector3(
                        this.x + other.x,
                        this.y + other.y,
                        this.z + other.z
                    );
                }

                normalize() {
                    const length = Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z);
                    if (length > 0) {
                        this.x /= length;
                        this.y /= length;
                        this.z /= length;
                    }
                    return this;
                }

                scale(factor) {
                    return new global.BABYLON.Vector3(
                        this.x * factor,
                        this.y * factor,
                        this.z * factor
                    );
                }

                length() {
                    return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z);
                }
            },
            Quaternion: {
                RotationYawPitchRoll: () => ({ x: 0, y: 0, z: 0, w: 1 })
            }
        };

        // Mock BowlCreator
        global.BowlCreator = {
            getTerrainHeight: (x, z) => 0
        };

        villagerBehaviour = new VillagerBehaviour(scene);

        // Create mock villager
        mockVillager = {
            id: 0,
            mesh: {
                position: new global.BABYLON.Vector3(0, 0, 0),
                rotation: { y: 0 },
                visibility: 1,
                animationGroups: {}
            },
            physics: {
                body: {
                    setLinearVelocity: jest.fn(),
                    setAngularVelocity: jest.fn(),
                    getLinearVelocity: () => new global.BABYLON.Vector3(0, 0, 0)
                }
            },
            parts: {
                leftArm: {},
                rightArm: {},
                leftLeg: {},
                rightLeg: {}
            }
        };
    });

    afterEach(() => {
        if (villagerBehaviour) {
            villagerBehaviour.dispose();
        }
    });

    test('should initialize enhanced systems', () => {
        expect(villagerBehaviour.communicationSystem).toBeDefined();
        expect(villagerBehaviour.environmentalAwareness).toBeDefined();
        expect(villagerBehaviour.STATES.SEEKING_SHELTER).toBeDefined();
        expect(villagerBehaviour.STATES.IN_SHELTER).toBeDefined();
        expect(villagerBehaviour.STATES.ALERT).toBeDefined();
    });

    test('should add villager with enhanced components', () => {
        const villager = villagerBehaviour.addVillager(mockVillager);

        expect(villager).toBeDefined();
        expect(villager.survivalInstinct).toBeDefined();
        expect(villager.socialNetwork).toBeDefined();
        expect(villager.shelterSystem).toBeDefined();
        expect(villager.stateMachine).toBeDefined();
    });

    test('should handle survival state transitions', () => {
        const villager = villagerBehaviour.addVillager(mockVillager);

        // Mock high threat level
        villager.survivalInstinct.getCurrentState = jest.fn().mockReturnValue('fleeing');
        villager.survivalInstinct.getCurrentThreatLevel = jest.fn().mockReturnValue(0.8);

        villagerBehaviour.checkSurvivalStateTransitions(villager);

        expect(villager.state).toBe(villagerBehaviour.STATES.FLEEING);
    });

    test('should transition to alert state on moderate threat', () => {
        const villager = villagerBehaviour.addVillager(mockVillager);

        // Mock moderate threat level
        villager.survivalInstinct.getCurrentState = jest.fn().mockReturnValue('alert');
        villager.survivalInstinct.getCurrentThreatLevel = jest.fn().mockReturnValue(0.5);

        villagerBehaviour.checkSurvivalStateTransitions(villager);

        expect(villager.state).toBe(villagerBehaviour.STATES.ALERT);
    });

    test('should seek shelter when exhausted', () => {
        const villager = villagerBehaviour.addVillager(mockVillager);

        // Mock exhausted state
        villager.survivalInstinct.getCurrentState = jest.fn().mockReturnValue('exhausted');
        villager.survivalInstinct.getCurrentThreatLevel = jest.fn().mockReturnValue(0.3);

        villagerBehaviour.checkSurvivalStateTransitions(villager);

        expect(villager.state).toBe(villagerBehaviour.STATES.SEEKING_SHELTER);
    });

    test('should enter fleeing state correctly', () => {
        const villager = villagerBehaviour.addVillager(mockVillager);

        // Mock flee direction calculation
        villager.survivalInstinct.calculateFleeDirection = jest.fn().mockReturnValue({
            x: 1, y: 0
        });

        villagerBehaviour.enterFleeingState(villager);

        expect(villager.speed).toBe(0.08); // Increased speed for fleeing
        expect(villager.destination).toBeDefined();
    });

    test('should handle shelter seeking', () => {
        const villager = villagerBehaviour.addVillager(mockVillager);

        // Mock shelter system
        const mockShelter = {
            position: new global.BABYLON.Vector3(10, 0, 10),
            id: 'test_shelter'
        };
        villager.shelterSystem.findBestAvailableShelter = jest.fn().mockReturnValue(mockShelter);

        villagerBehaviour.enterSeekingShelterState(villager);

        expect(villager.destination).toEqual(mockShelter.position);
        expect(villager.targetShelter).toBe(mockShelter);
    });

    test('should update enhanced villager systems', () => {
        const villager = villagerBehaviour.addVillager(mockVillager);

        // Mock system updates
        villager.survivalInstinct.update = jest.fn();
        villager.socialNetwork.update = jest.fn();
        villager.shelterSystem.update = jest.fn();
        villager.stateMachine.update = jest.fn();

        villagerBehaviour.updateEnhancedVillager(villager, 0.016);

        expect(villager.survivalInstinct.update).toHaveBeenCalledWith(0.016);
        expect(villager.socialNetwork.update).toHaveBeenCalledWith(0.016);
        expect(villager.shelterSystem.update).toHaveBeenCalledWith(0.016);
        expect(villager.stateMachine.update).toHaveBeenCalledWith(0.016);
    });

    test('should properly dispose enhanced systems', () => {
        const villager = villagerBehaviour.addVillager(mockVillager);

        // Mock dispose methods
        villager.survivalInstinct.dispose = jest.fn();
        villager.socialNetwork.dispose = jest.fn();
        villager.shelterSystem.dispose = jest.fn();
        villager.stateMachine.dispose = jest.fn();

        villagerBehaviour.communicationSystem.dispose = jest.fn();
        villagerBehaviour.environmentalAwareness.dispose = jest.fn();

        villagerBehaviour.dispose();

        expect(villager.survivalInstinct.dispose).toHaveBeenCalled();
        expect(villager.socialNetwork.dispose).toHaveBeenCalled();
        expect(villager.shelterSystem.dispose).toHaveBeenCalled();
        expect(villager.stateMachine.dispose).toHaveBeenCalled();
        expect(villagerBehaviour.communicationSystem.dispose).toHaveBeenCalled();
        expect(villagerBehaviour.environmentalAwareness.dispose).toHaveBeenCalled();
    });

    test('should handle social network integration', () => {
        const villager = villagerBehaviour.addVillager(mockVillager);

        // Mock social network methods
        villager.socialNetwork.broadcastPanic = jest.fn();
        villager.socialNetwork.shareAlertInformation = jest.fn();

        // Test panic broadcast in fleeing state
        villagerBehaviour.enterFleeingState(villager);
        expect(villager.socialNetwork.broadcastPanic).toHaveBeenCalled();

        // Test alert information sharing
        villagerBehaviour.enterAlertState(villager);
        expect(villager.socialNetwork.shareAlertInformation).toHaveBeenCalled();
    });

    test('should integrate with shelter system', () => {
        const villager = villagerBehaviour.addVillager(mockVillager);

        const mockShelter = {
            position: new global.BABYLON.Vector3(5, 0, 5),
            id: 'test_shelter'
        };

        villager.shelterSystem.enterShelter = jest.fn();
        villager.shelterSystem.exitShelter = jest.fn();
        villager.targetShelter = mockShelter;

        // Test entering shelter
        villagerBehaviour.enterInShelterState(villager);
        expect(villager.shelterSystem.enterShelter).toHaveBeenCalledWith(mockShelter);

        // Test exiting shelter
        villagerBehaviour.exitInShelterState(villager);
        expect(villager.shelterSystem.exitShelter).toHaveBeenCalled();
    });
});
