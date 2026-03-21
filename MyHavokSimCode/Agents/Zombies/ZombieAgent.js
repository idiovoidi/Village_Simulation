import { ZombieModel } from './ZombieModel.js';
import { ZombieBehaviour } from './ZombieBehaviour.js';
import { handleAgentError, measurePerformance, throttle } from '../../core/ErrorHandlers.js';

export class ZombieAgent {
    constructor(scene, options = {}) {
        // Dependencies injected via composition
        this.scene = scene;
        this.model = new ZombieModel(scene);

        // State properties
        this.position = options.position || new BABYLON.Vector3(0, 0, 0);
        this.velocity = new BABYLON.Vector3(0, 0, 0);
        this.target = this.position.clone();
        this.state = options.initialState || 'idle'; // idle, pursuing, attacking, suspicious
        this.groupId = options.groupId || 0;

        // Configuration parameters
        this.config = {
            speed: {
                min: options.minSpeed || 0.02,
                max: options.maxSpeed || 0.05,
                current: 0.03,
                lurgeMultiplier: options.lurgeSpeedMultiplier || 4.0
            },
            lurge: {
                isActive: false,
                timer: 0,
                duration: options.lurgeDuration || 1.0,
                chance: options.lurgeChance || 0.02,
                direction: null
            },
            sway: {
                offset: Math.random() * Math.PI * 2,
                amount: options.swayAmount || 0.3
            }
        };

        // Initialize agent
        this.initialize();
    }

    initialize() {
        // Create 3D model
        this.model.create(this.position);

        // Set initial speed
        this.config.speed.current = this.config.speed.min
            + Math.random() * (this.config.speed.max - this.config.speed.min);

        // Set random sway phase to make movement unique
        this.config.sway.offset = Math.random() * Math.PI * 2;
    }

    update(deltaTime) {
        // Update lurge state
        if (this.config.lurge.isActive) {
            this._updateLurge(deltaTime);
        } else {
            // Randomly trigger lurge
            this._checkLurgeTrigger(deltaTime);
        }

        // State-based behavior updates
        switch (this.state) {
            case 'idle':
                this._updateIdleBehavior(deltaTime);
                break;
            case 'pursuing':
                this._updatePursuingBehavior(deltaTime);
                break;
            case 'attacking':
                this._updateAttackingBehavior(deltaTime);
                break;
            case 'suspicious':
                this._updateSuspiciousBehavior(deltaTime);
                break;
        }

        // Always animate model
        const animationSpeed = this.config.lurge.isActive ? 2 : 1;
        this.model.animate(deltaTime, animationSpeed, this.state);
    }

    setTarget(target) {
        this.target = target.clone();
    }

    setGroupId(groupId) {
        this.groupId = groupId;
    }

    setState(state) {
        // Only change if it's a valid state
        const validStates = ['idle', 'pursuing', 'attacking', 'suspicious'];
        if (validStates.includes(state)) {
            this.state = state;
        }
    }

    // Private methods for behavior implementation
    _updateLurge(deltaTime) {
        this.config.lurge.timer -= deltaTime;

        if (this.config.lurge.timer <= 0) {
            // End lurge state
            this.config.lurge.isActive = false;
            this.config.speed.current = this.config.speed.min
                + Math.random() * (this.config.speed.max - this.config.speed.min);
        } else {
            // Continue lurge movement
            const direction = this.config.lurge.direction.scale(-1); // Move towards target
            this.model.mesh.position.addInPlace(direction.scale(this.config.speed.current));
            this.model.mesh.rotation.y = Math.atan2(direction.x, direction.z);
        }
    }

    _checkLurgeTrigger(deltaTime) {
        // Throttle check - only execute every 500ms at most
        const now = Date.now();
        if (!this._lastLurgeCheck || (now - this._lastLurgeCheck >= 500)) {
            this._lastLurgeCheck = now;

            // Check if we should start a lurge (more likely when near camera)
            const distToCamera = BABYLON.Vector3.Distance(
                this.model.mesh.position,
                this.scene.activeCamera.position
            );

            const isNearCamera = distToCamera < 30;
            const chanceMultiplier = isNearCamera ? 2 : 1;

            if (Math.random() < this.config.lurge.chance * chanceMultiplier * deltaTime * 60) { // Normalize by frame rate
                this._startLurge();
            }
        }
    }

    _startLurge() {
        this.config.lurge.isActive = true;
        this.config.lurge.timer = this.config.lurge.duration;
        this.config.speed.current = this.config.speed.max * this.config.speed.lurgeMultiplier;

        // Lurge toward camera
        this.config.lurge.direction = this.model.mesh.position.subtract(
            this.scene.activeCamera.position
        ).normalize();
    }

    _updateIdleBehavior(deltaTime) {
        // Simple wandering behavior
        const distToTarget = BABYLON.Vector3.Distance(
            this.model.mesh.position,
            this.target
        );

        // Pick new random target if we've reached the current one
        if (distToTarget < 1) {
            this._selectNewRandomTarget();
        }

        // Move toward target with shambling motion
        this._moveTowardTargetWithShamble(deltaTime);
    }

    _updatePursuingBehavior(deltaTime) {
        // Track player/target
        const toCamera = this.scene.activeCamera.position.subtract(this.model.mesh.position);
        const distanceToCamera = toCamera.length();

        if (distanceToCamera < 40) {
            // Pursue camera
            this.setTarget(this.scene.activeCamera.position);

            // If very close, switch to attacking
            if (distanceToCamera < 3) {
                this.setState('attacking');
            }
        } else {
            // Lost sight, return to idle
            this.setState('idle');
        }

        // Move toward target with shambling motion
        this._moveTowardTargetWithShamble(deltaTime);
    }

    _updateAttackingBehavior(deltaTime) {
        // Check if we're still in attack range
        const toCamera = this.scene.activeCamera.position.subtract(this.model.mesh.position);
        const distanceToCamera = toCamera.length();

        if (distanceToCamera > 3) {
            // Target moved away, resume pursuit
            this.setState('pursuing');
        } else {
            // Perform attack animation/behavior
            // For now, just face the camera
            const direction = toCamera.normalize();
            this.model.mesh.rotation.y = Math.atan2(direction.x, direction.z);
        }
    }

    _updateSuspiciousBehavior(deltaTime) {
        // Move toward target, then switch to idle if nothing happens
        const distToTarget = BABYLON.Vector3.Distance(
            this.model.mesh.position,
            this.target
        );

        if (distToTarget < 1) {
            // Reached suspicious location, wait a moment then return to idle
            if (!this._suspiciousTimer) {
                this._suspiciousTimer = 2; // 2 seconds
            }
            this._suspiciousTimer -= deltaTime;
            if (this._suspiciousTimer <= 0) {
                this._suspiciousTimer = null;
                this.setState('idle');
            }
        } else {
            // Move toward target
            this._moveTowardTargetWithShamble(deltaTime);
        }
    }

    _selectNewRandomTarget() {
        // Get random position within radius
        const angle = Math.random() * Math.PI * 2;
        const radius = Math.random() * 30; // Keep within reasonable wander distance

        const x = this.model.mesh.position.x + Math.cos(angle) * radius;
        const z = this.model.mesh.position.z + Math.sin(angle) * radius;
        const y = this._getTerrainHeight(x, z);

        this.setTarget(new BABYLON.Vector3(x, y, z));
    }

    _moveTowardTargetWithShamble(deltaTime) {
        if (this.config.lurge.isActive) return; // Skip if lurging

        if (this._isPathBlocked()) {
            this._findAlternatePath();
        }

        const toTarget = this.target.subtract(this.model.mesh.position);
        const distance = toTarget.length();

        if (distance > 0.1) {
            // Get normalized direction
            const direction = toTarget.normalize();

            // Apply shambling movement (wobble side to side)
            const wobble = Math.sin(Date.now() * 0.003 + this.config.sway.offset) * this.config.sway.amount;

            // Calculate movement vector
            direction.scaleInPlace(this.config.speed.current);

            // Move zombie
            const nextPos = this.model.mesh.position.add(direction);
            nextPos.y = this._getTerrainHeight(nextPos.x, nextPos.z);

            // Smooth height transition
            const currentHeight = this.model.mesh.position.y;
            nextPos.y = currentHeight + (nextPos.y - currentHeight) * 0.1;

            // Update position
            this.model.mesh.position = nextPos;

            // Update rotation with wobble for shambling effect
            const targetRotation = Math.atan2(direction.x, direction.z) + wobble;
            const currentRotation = this.model.mesh.rotation.y;

            // Smooth rotation
            this.model.mesh.rotation.y = currentRotation
                + (targetRotation - currentRotation) * 0.1;
        }
    }

    _isPathBlocked() {
        // Only check for obstacles if close to the target, to avoid unnecessary raycasts
        if (BABYLON.Vector3.Distance(this.model.mesh.position, this.target) > 5) {
            return false;
        }

        // Throttle raycasting to once every 10 frames
        if (this.scene.getFrameId() % 10 !== 0) {
            return this._lastRaycastResult || false;
        }

        const origin = this.model.mesh.position.add(new BABYLON.Vector3(0, 0.5, 0)); // Start ray slightly above ground
        const direction = this.model.mesh.getDirection(BABYLON.Axis.Z);
        const ray = new BABYLON.Ray(origin, direction, 5); // 5 units ahead

        const hit = this.scene.pickWithRay(ray, mesh => mesh.isPickable && mesh !== this.model.mesh && !mesh.name.startsWith('zombie'));

        this._lastRaycastResult = hit.hit;
        return hit.hit;
    }

    _findAlternatePath() {
        // Simple avoidance: turn randomly left or right
        const angle = (Math.random() < 0.5 ? -1 : 1) * (Math.PI / 4); // 45 degrees
        const currentDirection = this.model.mesh.getDirection(BABYLON.Axis.Z);
        const rotationQuaternion = BABYLON.Quaternion.RotationAxis(BABYLON.Axis.Y, angle);
        const newDirection = currentDirection.rotateByQuaternionToRef(rotationQuaternion, new BABYLON.Vector3());

        const newTarget = this.model.mesh.position.add(newDirection.scale(10));
        this.setTarget(newTarget);
    }

    _getTerrainHeight(x, z) {
        // Try using provided BowlCreator if available in the global scope
        if (typeof window.BowlCreator !== 'undefined'
            && typeof window.BowlCreator.getTerrainHeight === 'function') {
            return window.BowlCreator.getTerrainHeight(x, z);
        }

        // Fallback to ZombieModel's static method
        return ZombieModel.getTerrainHeight(x, z);
    }

    detectPlayer() {
        // Throttle detection - only check once per second at most
        const now = Date.now();
        if (!this._lastDetectionTime || (now - this._lastDetectionTime >= 1000)) {
            this._lastDetectionTime = now;

            const distToCamera = BABYLON.Vector3.Distance(
                this.model.mesh.position,
                this.scene.activeCamera.position
            );

            if (distToCamera < 40) {
                this.setState('pursuing');
                return true;
            }
        }

        return false;
    }

    dispose() {
        if (this.model) {
            this.model.dispose();
        }
    }
}

// Apply error handling decorators programmatically
ZombieAgent.prototype.update = handleAgentError(
    measurePerformance(ZombieAgent.prototype.update)
);
ZombieAgent.prototype._updateLurge = handleAgentError(ZombieAgent.prototype._updateLurge);
ZombieAgent.prototype._startLurge = handleAgentError(ZombieAgent.prototype._startLurge);
ZombieAgent.prototype._updateIdleBehavior = handleAgentError(ZombieAgent.prototype._updateIdleBehavior);
ZombieAgent.prototype._updatePursuingBehavior = handleAgentError(ZombieAgent.prototype._updatePursuingBehavior);
ZombieAgent.prototype._updateAttackingBehavior = handleAgentError(ZombieAgent.prototype._updateAttackingBehavior);
ZombieAgent.prototype._updateSuspiciousBehavior = handleAgentError(ZombieAgent.prototype._updateSuspiciousBehavior);
ZombieAgent.prototype._selectNewRandomTarget = handleAgentError(ZombieAgent.prototype._selectNewRandomTarget);
ZombieAgent.prototype._moveTowardTargetWithShamble = handleAgentError(ZombieAgent.prototype._moveTowardTargetWithShamble);
