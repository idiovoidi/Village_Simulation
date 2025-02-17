import { DogBehaviour } from './Agents/Dogs/DogBehaviour.js';
import { NavigationMesh } from './Navigation/NavigationMesh.js';
import { BasicAgent } from './Agents/BasicAgent.js';

export class BehavioralSim {
    constructor(scene) {
        this.scene = scene;
        this.agents = [];
        this.targetPoints = [];
        this.zombies = [];
        this.zombieCount = 10;
        this.dogBehaviour = null;
        this.navigationMesh = new NavigationMesh(scene);
        this.basicAgent = new BasicAgent(scene);
        
        // Return the initialization promise
        return this.init();
    }

    async init() {
        try {
            // Initialize navigation system
            await this.navigationMesh.initialize({
                gridSize: 20,
                spacing: 10,
                debug: this.scene.debugLayer.isVisible()
            });

            // Create target points for agents to seek
            this.createTargetPoints();
            // Create some basic agents
            this.createAgents(10); // Create 10 basic agents
            // Create zombies
            this.createZombies();
            // Initialize dogs
            this.initializeDogs();

            // Start behavior update loop
            this.scene.registerBeforeRender(() => this.updateBehaviors());

            // Return this for chaining
            return this;
        } catch (error) {
            console.error('Failed to initialize BehavioralSim:', error);
            throw error;
        }
    }

    initializeDogs() {
        // Create dog behavior manager
        this.dogBehaviour = new DogBehaviour(this.scene);
        // Initialize with 5 dogs
        this.dogBehaviour.initialize(5);
    }

    createAgent(name) {
        const startPos = this.getRandomStartPosition();
        return this.basicAgent.createAgent(name, startPos);
    }

    createAgents(count) {
        for (let i = 0; i < count; i++) {
            const agent = this.createAgent(`agent_${i}`);
            this.agents.push(agent);
        }
    }

    createTargetPoints() {
        // Create points in a circle around the bowl
        const radius = 80;
        const pointCount = 8;
        
        for (let i = 0; i < pointCount; i++) {
            const angle = (i / pointCount) * Math.PI * 2;
            const x = Math.cos(angle) * radius;
            const z = Math.sin(angle) * radius;
            const y = this.getTerrainHeight(x, z);
            
            this.targetPoints.push({
                position: new BABYLON.Vector3(x, y, z),
                priority: 1
            });
        }

        // Add center point
        this.targetPoints.push({
            position: new BABYLON.Vector3(0, this.getTerrainHeight(0, 0), 0),
            priority: 1.2
        });
    }

    createZombies() {
        for (let i = 0; i < this.zombieCount; i++) {
            // Create zombie mesh
            const zombie = BABYLON.MeshBuilder.CreateBox("zombie" + i, {
                height: 2,
                width: 0.6,
                depth: 0.3
            }, this.scene);

            // Random position within bowl
            const angle = Math.random() * Math.PI * 2;
            const radius = Math.random() * 30; // Keep zombies near center initially
            zombie.position = new BABYLON.Vector3(
                Math.cos(angle) * radius,
                5, // Start above ground
                Math.sin(angle) * radius
            );

            // Add physics
            const zombieAggregate = new BABYLON.PhysicsAggregate(
                zombie,
                BABYLON.PhysicsShapeType.BOX,
                { mass: 1, restitution: 0.5, friction: 0.1 },
                this.scene
            );

            // Add material
            const zombieMaterial = new BABYLON.StandardMaterial("zombieMat" + i, this.scene);
            zombieMaterial.diffuseColor = new BABYLON.Color3(0.4, 0.8, 0.4);
            zombie.material = zombieMaterial;

            this.zombies.push({
                mesh: zombie,
                physics: zombieAggregate,
                speed: 2 + Math.random() * 2 // Random speed between 2 and 4
            });
        }

        // Start zombie behavior loop
        this.scene.onBeforeRenderObservable.add(() => {
            this.updateZombies();
        });
    }

    updateZombies() {
        for (const zombie of this.zombies) {
            // Get current position
            const pos = zombie.mesh.position;
            
            // Simple wandering behavior
            const angle = Math.random() * Math.PI * 2;
            const force = new BABYLON.Vector3(
                Math.cos(angle) * zombie.speed,
                0,
                Math.sin(angle) * zombie.speed
            );

            // Apply force for movement
            zombie.physics.body.applyForce(force, pos);

            // Keep zombies upright
            const rotation = zombie.mesh.rotationQuaternion || 
                           BABYLON.Quaternion.FromEulerAngles(zombie.mesh.rotation.x, zombie.mesh.rotation.y, zombie.mesh.rotation.z);
            const upright = BABYLON.Quaternion.Identity();
            BABYLON.Quaternion.SlerpToRef(rotation, upright, 0.1, rotation);
            zombie.mesh.rotationQuaternion = rotation;
        }
    }

    updateBehaviors() {
        this.agents.forEach(agent => {
            // Calculate flocking forces
            const flockingForce = this.calculateFlockingForce(agent);
            
            switch (agent.state) {
                case 'seeking':
                    this.updateSeekingBehavior(agent, flockingForce);
                    break;
                case 'waiting':
                    this.updateWaitingBehavior(agent);
                    break;
            }
            
            // Update physics, orientation, and animations
            this.updateAgentPhysics(agent);
            this.updateLimbAnimations(agent);
        });
    }

    calculateFlockingForce(agent) {
        const separation = this.calculateSeparation(agent);
        const alignment = this.calculateAlignment(agent);
        const cohesion = this.calculateCohesion(agent);

        return {
            separation: separation.scale(agent.flockingParams.separationWeight),
            alignment: alignment.scale(agent.flockingParams.alignmentWeight),
            cohesion: cohesion.scale(agent.flockingParams.cohesionWeight)
        };
    }

    calculateSeparation(agent) {
        let separationForce = new BABYLON.Vector3(0, 0, 0);
        let neighborCount = 0;

        this.agents.forEach(other => {
            if (other !== agent) {
                const distance = BABYLON.Vector3.Distance(
                    agent.mesh.position,
                    other.mesh.position
                );
                
                if (distance < agent.flockingParams.separationRadius) {
                    const away = agent.mesh.position.subtract(other.mesh.position);
                    away.normalize();
                    away.scaleInPlace(1 / Math.max(0.1, distance)); // Stronger force when closer
                    separationForce.addInPlace(away);
                    neighborCount++;
                }
            }
        });

        if (neighborCount > 0) {
            separationForce.scaleInPlace(1 / neighborCount);
        }
        return separationForce;
    }

    calculateAlignment(agent) {
        let averageVelocity = new BABYLON.Vector3(0, 0, 0);
        let neighborCount = 0;

        this.agents.forEach(other => {
            if (other !== agent) {
                const distance = BABYLON.Vector3.Distance(
                    agent.mesh.position,
                    other.mesh.position
                );
                
                if (distance < agent.flockingParams.alignmentRadius) {
                    const velocity = other.physics.body.getLinearVelocity();
                    averageVelocity.addInPlace(velocity);
                    neighborCount++;
                }
            }
        });

        if (neighborCount > 0) {
            averageVelocity.scaleInPlace(1 / neighborCount);
            averageVelocity.normalize();
        }
        return averageVelocity;
    }

    calculateCohesion(agent) {
        let centerOfMass = new BABYLON.Vector3(0, 0, 0);
        let neighborCount = 0;

        this.agents.forEach(other => {
            if (other !== agent) {
                const distance = BABYLON.Vector3.Distance(
                    agent.mesh.position,
                    other.mesh.position
                );
                
                if (distance < agent.flockingParams.cohesionRadius) {
                    centerOfMass.addInPlace(other.mesh.position);
                    neighborCount++;
                }
            }
        });

        if (neighborCount > 0) {
            centerOfMass.scaleInPlace(1 / neighborCount);
            const toCenter = centerOfMass.subtract(agent.mesh.position);
            toCenter.normalize();
            return toCenter;
        }
        return new BABYLON.Vector3(0, 0, 0);
    }

    updateSeekingBehavior(agent, flockingForce) {
        if (!agent.currentTarget) {
            agent.currentTarget = this.getRandomTarget().position;
        }

        const target = agent.currentTarget;
        const direction = target.subtract(agent.mesh.position);
        const distance = direction.length();

        if (distance > 0.1) {
            // Combine target seeking with flocking
            const desiredVelocity = direction.normalize().scale(agent.speed * 5);
            const flockingVelocity = flockingForce.separation
                .add(flockingForce.alignment)
                .add(flockingForce.cohesion);

            // Blend velocities
            const combinedVelocity = desiredVelocity.add(flockingVelocity).scale(0.5);
            
            // Apply movement
            const currentVel = agent.physics.body.getLinearVelocity();
            const newVel = BABYLON.Vector3.Lerp(currentVel, combinedVelocity, 0.1);
            newVel.y = currentVel.y; // Keep vertical velocity for terrain following
            
            agent.physics.body.setLinearVelocity(newVel);

            // Update orientation
            this.updateAgentOrientation(agent, newVel);
        }

        // Check if reached target
        if (distance < 5) {
            agent.state = 'waiting';
            agent.waitTime = 1000 + Math.random() * 2000;
            agent.currentTarget = null;
        }
    }

    updateWaitingBehavior(agent) {
        agent.waitTime -= this.scene.getEngine().getDeltaTime();
        if (agent.waitTime <= 0) {
            agent.state = 'seeking';
        }
    }

    updateAgentPhysics(agent) {
        const pos = agent.mesh.position;
        const desiredHeight = this.getTerrainHeight(pos.x, pos.z) + 2;
        
        // Apply upward force to stay above terrain
        const velocity = agent.physics.body.getLinearVelocity();
        if (pos.y < desiredHeight) {
            velocity.y = Math.max(5, (desiredHeight - pos.y) * 10);
            agent.physics.body.setLinearVelocity(velocity);
        }

        // Keep agent upright
        agent.physics.body.setAngularVelocity(BABYLON.Vector3.Zero());
    }

    updateLimbAnimations(agent) {
        const velocity = agent.physics.body.getLinearVelocity();
        const speed = new BABYLON.Vector3(velocity.x, 0, velocity.z).length();
        
        if (speed > 0.1) {
            // Animate legs and arms based on movement
            const cycle = (performance.now() * 0.01 * speed) % (Math.PI * 2);
            
            agent.parts.leftLeg.rotation.x = Math.sin(cycle) * 0.5;
            agent.parts.rightLeg.rotation.x = Math.sin(cycle + Math.PI) * 0.5;
            agent.parts.leftArm.rotation.x = Math.sin(cycle + Math.PI) * 0.3;
            agent.parts.rightArm.rotation.x = Math.sin(cycle) * 0.3;
        } else {
            // Reset limbs to neutral position
            Object.values(agent.parts).forEach(part => {
                if (part !== agent.parts.torso && part !== agent.parts.head) {
                    part.rotation.x = 0;
                }
            });
        }
    }

    updateAgentOrientation(agent, velocity) {
        const forward = new BABYLON.Vector3(velocity.x, 0, velocity.z).normalize();
        if (forward.length() > 0.1) {
            const targetRotation = Math.atan2(forward.x, forward.z);
            agent.parts.torso.rotation.y = targetRotation;
        }
    }

    getTerrainHeight(x, z) {
        // Get height from bowl terrain
        const bowlRadius = 100;
        const bowlDepth = 25;
        const distFromCenter = Math.sqrt(x * x + z * z);
        
        // Base bowl shape with terrain features
        let height = -Math.pow(distFromCenter / bowlRadius, 0.8) * bowlDepth;
        height += Math.sin(x/20) * Math.cos(z/20) * 3;
        
        return height;
    }

    getRandomStartPosition() {
        const angle = Math.random() * Math.PI * 2;
        const radius = Math.random() * 80;
        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;
        const y = this.getTerrainHeight(x, z) + 2;
        return new BABYLON.Vector3(x, y, z);
    }

    getRandomTarget() {
        return this.targetPoints[Math.floor(Math.random() * this.targetPoints.length)];
    }

    getHeightAtPoint(x, z) {
        // Simplified height calculation - replace with actual terrain height
        return Math.sin(x/20) * Math.cos(z/20) * 5;
    }
} 