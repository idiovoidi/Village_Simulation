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

    createAgents(count) {
        for (let i = 0; i < count; i++) {
            const agent = this.createAgent(`agent_${i}`);
            this.agents.push(agent);
        }
    }

    createAgent(name) {
        // Create root mesh for the agent
        const root = new BABYLON.TransformNode(name, this.scene);
        
        // Create body parts
        const body = BABYLON.MeshBuilder.CreateCapsule(
            `${name}_body`,
            { radius: 0.5, height: 2, tessellation: 8 },
            this.scene
        );
        body.parent = root;
        body.position.y = 1;

        // Create head
        const head = BABYLON.MeshBuilder.CreateSphere(
            `${name}_head`,
            { diameter: 0.8, segments: 8 },
            this.scene
        );
        head.parent = body;
        head.position.y = 1.2;

        // Create arms
        const createArm = (side) => {
            const arm = BABYLON.MeshBuilder.CreateCapsule(
                `${name}_arm_${side}`,
                { radius: 0.2, height: 1.2, tessellation: 8 },
                this.scene
            );
            arm.parent = body;
            arm.position.y = 0.4;
            arm.position.x = side === 'left' ? -0.6 : 0.6;
            arm.rotation.z = side === 'left' ? Math.PI/6 : -Math.PI/6;
            return arm;
        };

        const leftArm = createArm('left');
        const rightArm = createArm('right');

        // Create legs
        const createLeg = (side) => {
            const leg = BABYLON.MeshBuilder.CreateCapsule(
                `${name}_leg_${side}`,
                { radius: 0.25, height: 1.5, tessellation: 8 },
                this.scene
            );
            leg.parent = body;
            leg.position.y = -1;
            leg.position.x = side === 'left' ? -0.3 : 0.3;
            return leg;
        };

        const leftLeg = createLeg('left');
        const rightLeg = createLeg('right');

        // Create materials
        const bodyMaterial = new BABYLON.StandardMaterial(`${name}_material`, this.scene);
        const randomColor = new BABYLON.Color3(
            0.2 + Math.random() * 0.5,
            0.2 + Math.random() * 0.5,
            0.2 + Math.random() * 0.5
        );
        bodyMaterial.diffuseColor = randomColor;
        bodyMaterial.specularColor = new BABYLON.Color3(0.3, 0.3, 0.3);

        const headMaterial = new BABYLON.StandardMaterial(`${name}_head_material`, this.scene);
        headMaterial.diffuseColor = randomColor.scale(1.2);
        headMaterial.specularColor = new BABYLON.Color3(0.5, 0.5, 0.5);

        // Apply materials
        body.material = bodyMaterial;
        head.material = headMaterial;
        leftArm.material = bodyMaterial;
        rightArm.material = bodyMaterial;
        leftLeg.material = bodyMaterial;
        rightLeg.material = bodyMaterial;

        // Create physics body (using compound shapes)
        const aggregate = new BABYLON.PhysicsAggregate(
            root,
            BABYLON.PhysicsShapeType.CAPSULE,
            { mass: 1, friction: 0.5, restitution: 0.3 },
            this.scene
        );

        // Add animation for walking
        const walkAnimation = () => {
            const frameRate = 30;
            const walkSpeed = 1.5;

            const animations = [];

            // Leg animations
            const legAnimation = new BABYLON.Animation(
                "legAnimation",
                "rotation.x",
                frameRate,
                BABYLON.Animation.ANIMATIONTYPE_FLOAT,
                BABYLON.Animation.ANIMATIONLOOPMODE_CYCLE
            );

            const legKeys = [];
            legKeys.push({ frame: 0, value: Math.PI/8 });
            legKeys.push({ frame: frameRate/2, value: -Math.PI/8 });
            legKeys.push({ frame: frameRate, value: Math.PI/8 });
            legAnimation.setKeys(legKeys);

            // Arm animations (opposite to legs)
            const armAnimation = new BABYLON.Animation(
                "armAnimation",
                "rotation.x",
                frameRate,
                BABYLON.Animation.ANIMATIONTYPE_FLOAT,
                BABYLON.Animation.ANIMATIONLOOPMODE_CYCLE
            );

            const armKeys = [];
            armKeys.push({ frame: 0, value: -Math.PI/8 });
            armKeys.push({ frame: frameRate/2, value: Math.PI/8 });
            armKeys.push({ frame: frameRate, value: -Math.PI/8 });
            armAnimation.setKeys(armKeys);

            // Store animations with their targets
            animations.push({
                animation: legAnimation,
                target: leftLeg,
                animatable: null
            });
            animations.push({
                animation: legAnimation.clone(),
                target: rightLeg,
                animatable: null,
                inverse: true
            });
            animations.push({
                animation: armAnimation,
                target: leftArm,
                animatable: null
            });
            animations.push({
                animation: armAnimation.clone(),
                target: rightArm,
                animatable: null,
                inverse: true
            });

            return animations;
        };

        // Agent properties
        const agentData = {
            mesh: root,
            body: body,
            head: head,
            leftArm: leftArm,
            rightArm: rightArm,
            leftLeg: leftLeg,
            rightLeg: rightLeg,
            physics: aggregate,
            currentTarget: null,
            path: [],
            speed: 0.5 + Math.random() * 0.5,
            state: 'seeking',
            waitTime: 0,
            behaviors: {
                seeking: true,
                separation: true,
                alignment: true,
                cohesion: true
            },
            isWalking: false,
            animations: [],
            startWalking: () => {
                const frameRate = 30;
                const walkSpeed = 1.5;
                
                // Create and store animation references
                agentData.animations = walkAnimation();
                
                // Start all animations
                agentData.animations.forEach(anim => {
                    if (anim.inverse) {
                        anim.animation.setKeys(anim.animation.getKeys().map(k => ({
                            frame: k.frame,
                            value: -k.value
                        })));
                    }
                    anim.animatable = this.scene.beginAnimation(
                        anim.target,
                        0,
                        frameRate,
                        true,
                        walkSpeed
                    );
                });
            },
            stopWalking: () => {
                agentData.animations.forEach(anim => {
                    if (anim.animatable) {
                        anim.animatable.stop();
                        anim.animatable = null;
                    }
                });
                agentData.isWalking = false;
            }
        };

        return agentData;
    }

    createTargetPoints() {
        // Create interesting points for agents to visit
        const points = [
            { position: new BABYLON.Vector3(0, 0, 0), priority: 1 },  // Center
            { position: new BABYLON.Vector3(50, 0, 50), priority: 0.8 },  // Corners
            { position: new BABYLON.Vector3(-50, 0, 50), priority: 0.8 },
            { position: new BABYLON.Vector3(50, 0, -50), priority: 0.8 },
            { position: new BABYLON.Vector3(-50, 0, -50), priority: 0.8 }
        ];

        points.forEach(point => {
            point.position.y = this.getHeightAtPoint(point.position.x, point.position.z);
            this.targetPoints.push(point);
        });
    }

    updateBehaviors() {
        this.agents.forEach(agent => {
            switch (agent.state) {
                case 'seeking':
                    this.updateSeekingBehavior(agent);
                    break;
                case 'waiting':
                    this.updateWaitingBehavior(agent);
                    break;
                case 'flocking':
                    this.updateFlockingBehavior(agent);
                    break;
            }

            // Apply group behaviors directly instead of using separate methods
            let combinedForce = new BABYLON.Vector3(0, 0, 0);
            
            if (agent.behaviors.separation) {
                combinedForce.addInPlace(this.calculateSeparation(agent));
            }
            if (agent.behaviors.alignment) {
                combinedForce.addInPlace(this.calculateAlignment(agent));
            }
            if (agent.behaviors.cohesion) {
                combinedForce.addInPlace(this.calculateCohesion(agent));
            }

            // Apply combined force if any behaviors are active
            if (agent.behaviors.separation || agent.behaviors.alignment || agent.behaviors.cohesion) {
                combinedForce.normalize();
                const currentVel = agent.physics.body.getLinearVelocity();
                const newVel = currentVel.add(combinedForce.scale(agent.speed * 0.1));
                agent.physics.body.setLinearVelocity(newVel);
            }

            // Update physics velocity based on behaviors
            this.updateAgentPhysics(agent);
        });
    }

    updateSeekingBehavior(agent) {
        if (!agent.currentTarget) {
            agent.currentTarget = this.findNewTarget(agent);
        }

        const target = agent.currentTarget;
        const direction = target.subtract(agent.mesh.position);
        const distance = direction.length();
        
        // Calculate path considering terrain
        const normalizedDir = direction.normalize();
        const terrainInfo = this.getTerrainInfo(agent.mesh.position.x, agent.mesh.position.z);
        
        // Project movement direction onto terrain plane
        const up = terrainInfo.normal;
        const right = BABYLON.Vector3.Cross(normalizedDir, up).normalize();
        const forward = BABYLON.Vector3.Cross(up, right).normalize();
        
        // Calculate target velocity considering terrain
        const targetVelocity = forward.scale(agent.speed);
        
        // Add some randomness to movement
        targetVelocity.addInPlace(new BABYLON.Vector3(
            (Math.random() - 0.5) * 0.2,
            0,
            (Math.random() - 0.5) * 0.2
        ));
        
        // Smoothly blend current velocity with target velocity
        const currentVel = agent.physics.body.getLinearVelocity();
        const blendedVel = BABYLON.Vector3.Lerp(currentVel, targetVelocity, 0.1);
        
        agent.physics.body.setLinearVelocity(blendedVel);

        // Check if reached target
        if (distance < 2) {
            agent.state = 'waiting';
            agent.waitTime = 1000 + Math.random() * 2000;
            agent.isWalking = false;
        }
    }

    updateWaitingBehavior(agent) {
        agent.waitTime -= this.scene.getEngine().getDeltaTime();
        if (agent.waitTime <= 0) {
            agent.state = 'seeking';
            agent.currentTarget = null;
        }
    }

    updateFlockingBehavior(agent) {
        // Implement flocking behavior (Boids algorithm)
        const separation = this.calculateSeparation(agent);
        const alignment = this.calculateAlignment(agent);
        const cohesion = this.calculateCohesion(agent);

        const combinedForce = separation.add(alignment).add(cohesion).normalize();
        agent.physics.body.setLinearVelocity(combinedForce.scale(agent.speed));
    }

    calculateSeparation(agent) {
        // Avoid crowding neighbors
        const avoidanceRadius = 5;
        let separationForce = new BABYLON.Vector3(0, 0, 0);
        let neighborCount = 0;

        this.agents.forEach(other => {
            if (other !== agent) {
                const distance = BABYLON.Vector3.Distance(
                    agent.mesh.position,
                    other.mesh.position
                );
                if (distance < avoidanceRadius) {
                    const away = agent.mesh.position.subtract(other.mesh.position);
                    separationForce.addInPlace(away.normalize().scale(1/distance));
                    neighborCount++;
                }
            }
        });

        return neighborCount > 0 ? 
            separationForce.scale(1/neighborCount) : 
            separationForce;
    }

    calculateAlignment(agent) {
        // Steer towards average heading of neighbors
        const alignmentRadius = 10;
        let averageVelocity = new BABYLON.Vector3(0, 0, 0);
        let neighborCount = 0;

        this.agents.forEach(other => {
            if (other !== agent) {
                const distance = BABYLON.Vector3.Distance(
                    agent.mesh.position,
                    other.mesh.position
                );
                if (distance < alignmentRadius) {
                    const velocity = other.physics.body.getLinearVelocity();
                    averageVelocity.addInPlace(velocity);
                    neighborCount++;
                }
            }
        });

        return neighborCount > 0 ? 
            averageVelocity.scale(1/neighborCount) : 
            averageVelocity;
    }

    calculateCohesion(agent) {
        // Steer towards center of neighbors
        const cohesionRadius = 15;
        let centerOfMass = new BABYLON.Vector3(0, 0, 0);
        let neighborCount = 0;

        this.agents.forEach(other => {
            if (other !== agent) {
                const distance = BABYLON.Vector3.Distance(
                    agent.mesh.position,
                    other.mesh.position
                );
                if (distance < cohesionRadius) {
                    centerOfMass.addInPlace(other.mesh.position);
                    neighborCount++;
                }
            }
        });

        if (neighborCount > 0) {
            centerOfMass.scaleInPlace(1/neighborCount);
            return centerOfMass.subtract(agent.mesh.position).normalize();
        }
        return new BABYLON.Vector3(0, 0, 0);
    }

    findNewTarget(agent) {
        // Find closest path node as intermediate target
        const closestNode = this.findClosestNode(agent.mesh.position);
        return closestNode.position;
    }

    findClosestNode(position) {
        let closest = this.pathNodes[0];
        let minDistance = Number.MAX_VALUE;

        this.pathNodes.forEach(node => {
            const distance = BABYLON.Vector3.Distance(position, node.position);
            if (distance < minDistance) {
                minDistance = distance;
                closest = node;
            }
        });

        return closest;
    }

    getHeightAtPoint(x, z) {
        // Simplified height calculation - replace with actual terrain height
        return Math.sin(x/20) * Math.cos(z/20) * 5;
    }

    getRandomStartPosition() {
        const x = (Math.random() - 0.5) * 100;
        const z = (Math.random() - 0.5) * 100;
        const y = this.getHeightAtPoint(x, z) + 2;
        return new BABYLON.Vector3(x, y, z);
    }

    getTerrainInfo(x, z) {
        // Get height from bowl terrain
        const bowlRadius = 100;
        const bowlDepth = 25;
        const distFromCenter = Math.sqrt(x * x + z * z);
        
        // Base bowl shape
        let height = -Math.pow(distFromCenter / bowlRadius, 0.8) * bowlDepth;
        
        // Add terrain features
        const valleyWidth = bowlRadius * 0.6;
        const noise = Math.sin(x/20) * 5 + Math.cos(z/15) * 3;
        const modifiedX = x + noise;
        const modifiedZ = z + noise;
        const dist = Math.sqrt(modifiedX * modifiedX + modifiedZ * modifiedZ);
        height += Math.sin(dist / 15) * Math.exp(-Math.pow(dist / valleyWidth, 2)) * 8;
        
        // Calculate normal
        const gradientX = (this.getHeightAtPoint(x + 0.1, z) - this.getHeightAtPoint(x - 0.1, z)) / 0.2;
        const gradientZ = (this.getHeightAtPoint(x, z + 0.1) - this.getHeightAtPoint(x, z - 0.1)) / 0.2;
        const normal = new BABYLON.Vector3(-gradientX, 1, -gradientZ).normalize();
        
        return { height, normal };
    }

    updateAgentPhysics(agent) {
        const pos = agent.mesh.position;
        const terrainInfo = this.getTerrainInfo(pos.x, pos.z);
        const desiredHeight = terrainInfo.height + 2; // Keep agent 2 units above terrain
        
        // Get current velocity
        const velocity = agent.physics.body.getLinearVelocity();
        
        // Apply forces to stay above terrain
        if (pos.y < desiredHeight) {
            velocity.y = Math.max(5, (desiredHeight - pos.y) * 10);
            agent.physics.body.setLinearVelocity(velocity);
        }
        
        // Align agent with terrain normal
        const currentRotation = agent.body.rotationQuaternion || new BABYLON.Quaternion();
        const targetRotation = BABYLON.Quaternion.FromLookDirectionRH(
            velocity.normalize(),
            terrainInfo.normal
        );
        
        // Smoothly interpolate rotation
        BABYLON.Quaternion.SlerpToRef(
            currentRotation,
            targetRotation,
            0.1,
            currentRotation
        );
        
        agent.body.rotationQuaternion = currentRotation;
        
        // Adjust walking animation speed based on velocity
        const speed = velocity.length();
        if (speed > 0.1) {
            if (!agent.isWalking) {
                agent.startWalking();
                agent.isWalking = true;
            }
            // Adjust animation speed
            agent.animations.forEach(anim => {
                if (anim.animatable) {
                    anim.animatable.speedRatio = Math.min(2, Math.max(0.5, speed / 5));
                }
            });
        } else if (agent.isWalking) {
            // Stop animations when not moving
            agent.stopWalking();
        }
    }
} 