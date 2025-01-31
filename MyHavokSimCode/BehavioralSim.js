export class BehavioralSim {
    constructor(scene) {
        this.scene = scene;
        this.agents = [];
        this.targetPoints = [];
        this.pathNodes = [];
        this.init();
    }

    init() {
        // Create navigation mesh for pathfinding
        this.createNavigationMesh();
        // Create AI agents
        this.createAgents(10);
        // Create target points for agents to seek
        this.createTargetPoints();
        // Start behavior update loop
        this.scene.registerBeforeRender(() => this.updateBehaviors());
    }

    createNavigationMesh() {
        // Create path nodes across the landscape
        const gridSize = 20;
        const spacing = 10;
        
        for (let x = -gridSize; x <= gridSize; x += spacing) {
            for (let z = -gridSize; z <= gridSize; z += spacing) {
                const node = new BABYLON.TransformNode(`pathNode_${x}_${z}`, this.scene);
                node.position = new BABYLON.Vector3(x * 5, this.getHeightAtPoint(x, z), z * 5);
                this.pathNodes.push(node);
                
                // Visualize nodes in debug mode
                if (this.scene.debugLayer.isVisible()) {
                    const sphere = BABYLON.MeshBuilder.CreateSphere(`nodeVis_${x}_${z}`, {
                        diameter: 1
                    }, this.scene);
                    sphere.position = node.position;
                    sphere.visibility = 0.3;
                }
            }
        }
    }

    createAgent(name) {
        // Create root mesh for the agent
        const root = new BABYLON.TransformNode(name, this.scene);
        
        // Create body parts with better proportions
        const torso = BABYLON.MeshBuilder.CreateCapsule(
            `${name}_torso`,
            { radius: 0.4, height: 1.2, tessellation: 16 },
            this.scene
        );
        torso.parent = root;
        torso.position.y = 1.6;

        // Create head
        const head = BABYLON.MeshBuilder.CreateSphere(
            `${name}_head`,
            { diameter: 0.5, segments: 16 },
            this.scene
        );
        head.parent = torso;
        head.position.y = 0.8;

        // Create limbs
        const limbs = {
            leftArm: this.createLimb(name, "leftArm", { radius: 0.15, height: 0.8 }),
            rightArm: this.createLimb(name, "rightArm", { radius: 0.15, height: 0.8 }),
            leftLeg: this.createLimb(name, "leftLeg", { radius: 0.2, height: 1 }),
            rightLeg: this.createLimb(name, "rightLeg", { radius: 0.2, height: 1 })
        };

        // Position limbs
        limbs.leftArm.parent = torso;
        limbs.rightArm.parent = torso;
        limbs.leftLeg.parent = torso;
        limbs.rightLeg.parent = torso;

        limbs.leftArm.position = new BABYLON.Vector3(-0.5, 0.3, 0);
        limbs.rightArm.position = new BABYLON.Vector3(0.5, 0.3, 0);
        limbs.leftLeg.position = new BABYLON.Vector3(-0.3, -0.8, 0);
        limbs.rightLeg.position = new BABYLON.Vector3(0.3, -0.8, 0);

        // Create materials with better colors
        const bodyMaterial = new BABYLON.StandardMaterial(`${name}_material`, this.scene);
        const skinTone = new BABYLON.Color3(
            0.8 + Math.random() * 0.2,
            0.6 + Math.random() * 0.2,
            0.4 + Math.random() * 0.2
        );
        
        const clothingColor = new BABYLON.Color3(
            Math.random(),
            Math.random(),
            Math.random()
        );

        bodyMaterial.diffuseColor = skinTone;
        bodyMaterial.specularColor = new BABYLON.Color3(0.3, 0.3, 0.3);

        const clothingMaterial = new BABYLON.StandardMaterial(`${name}_clothing`, this.scene);
        clothingMaterial.diffuseColor = clothingColor;

        // Apply materials
        head.material = bodyMaterial;
        torso.material = clothingMaterial;
        Object.values(limbs).forEach(limb => limb.material = clothingMaterial);

        // Add physics
        const aggregate = new BABYLON.PhysicsAggregate(
            root,
            BABYLON.PhysicsShapeType.CAPSULE,
            { mass: 1, friction: 0.5, restitution: 0.3 },
            this.scene
        );

        // Random starting position
        const startPos = this.getRandomStartPosition();
        root.position = startPos;

        return {
            mesh: root,
            parts: {
                torso,
                head,
                ...limbs
            },
            physics: aggregate,
            currentTarget: null,
            speed: 0.5 + Math.random() * 0.5,
            state: 'seeking',
            waitTime: 0,
            flockingParams: {
                separationWeight: 1.0,
                alignmentWeight: 0.7,
                cohesionWeight: 0.5,
                separationRadius: 5,
                alignmentRadius: 10,
                cohesionRadius: 15
            }
        };
    }

    createLimb(name, limbName, dimensions) {
        return BABYLON.MeshBuilder.CreateCapsule(
            `${name}_${limbName}`,
            { radius: dimensions.radius, height: dimensions.height, tessellation: 16 },
            this.scene
        );
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