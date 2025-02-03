import { WorldClock } from '../UI/WorldClock.js';

export class VillagerGoals {
    static GOALS = {
        IDLE: { emoji: '💭', priority: 0 },
        SLEEP: { emoji: '💤', priority: 5 },
        WORK: { emoji: '⚒️', priority: 4 },
        EAT: { emoji: '🍽️', priority: 4 },
        SOCIALIZE: { emoji: '💬', priority: 2 },
        FLEE: { emoji: '😱', priority: 10 },
        GUARD: { emoji: '⚔️', priority: 6 },
        FARM: { emoji: '🌾', priority: 4 },
        TRADE: { emoji: '💰', priority: 4 },
        REST: { emoji: '😴', priority: 3 },
        WANDER: { emoji: '🚶', priority: 1 }
    };

    static MOODS = {
        HAPPY: { emoji: '😊', duration: 300 },
        SAD: { emoji: '😢', duration: 180 },
        ANGRY: { emoji: '😠', duration: 120 },
        SCARED: { emoji: '😨', duration: 60 },
        TIRED: { emoji: '😫', duration: 240 },
        EXCITED: { emoji: '😃', duration: 120 },
        SICK: { emoji: '🤒', duration: 600 }
    };

    constructor(scene, villager) {
        this.scene = scene;
        this.villager = villager;
        this.currentGoal = null;
        this.currentMood = null;
        this.moodTimeout = null;
        this.needsUpdate = new Map();
        
        // Initialize needs
        this.needs = {
            energy: 100,
            hunger: 100,
            social: 100,
            safety: 100
        };

        // Create emoji display
        this.createEmojiDisplay();
        
        // Start needs decay
        this.startNeedsDecay();
    }

    createEmojiDisplay() {
        // Create a dynamic texture for the emoji
        const emojiSize = 256;
        this.emojiTexture = new BABYLON.DynamicTexture("villagerEmoji", emojiSize, this.scene, true);
        this.emojiTexture.hasAlpha = true;

        // Create a plane to display the emoji
        this.emojiPlane = BABYLON.MeshBuilder.CreatePlane("emojiPlane", {
            width: 1,
            height: 1
        }, this.scene);

        // Position above villager's head
        this.emojiPlane.parent = this.villager.mesh;
        this.emojiPlane.position.y = 3.0; // Higher position
        this.emojiPlane.billboardMode = BABYLON.Mesh.BILLBOARDMODE_ALL; // Always face camera

        // Create material for the emoji
        const emojiMaterial = new BABYLON.StandardMaterial("emojiMaterial", this.scene);
        emojiMaterial.emissiveTexture = this.emojiTexture;
        emojiMaterial.opacityTexture = this.emojiTexture;
        emojiMaterial.diffuseTexture = this.emojiTexture;
        emojiMaterial.specularColor = new BABYLON.Color3(0, 0, 0);
        emojiMaterial.disableLighting = true;
        emojiMaterial.useAlphaFromDiffuseTexture = true;
        emojiMaterial.backFaceCulling = false; // Visible from both sides

        this.emojiPlane.material = emojiMaterial;

        // Add subtle floating animation
        const initialY = this.emojiPlane.position.y;
        this.scene.onBeforeRenderObservable.add(() => {
            const time = performance.now() * 0.001;
            this.emojiPlane.position.y = initialY + Math.sin(time * 2) * 0.1;
        });
    }

    updateEmojiDisplay() {
        // Clear the texture
        const context = this.emojiTexture.getContext();
        context.clearRect(0, 0, 256, 256);

        // Set background to transparent
        context.fillStyle = 'rgba(0, 0, 0, 0)';
        context.fillRect(0, 0, 256, 256);

        // Draw the current emoji with a slight glow effect
        context.textAlign = "center";
        context.textBaseline = "middle";

        // If there's both a goal and mood, show both
        if (this.currentGoal && this.currentMood) {
            // Draw goal emoji on top
            context.font = "120px Arial";
            // Add glow effect
            context.shadowColor = 'rgba(255, 255, 255, 0.5)';
            context.shadowBlur = 15;
            context.fillStyle = 'white';
            context.fillText(
                VillagerGoals.GOALS[this.currentGoal].emoji,
                128,
                80
            );

            // Draw mood emoji below
            context.fillText(
                VillagerGoals.MOODS[this.currentMood].emoji,
                128,
                176
            );
        } else {
            // Show single emoji
            context.font = "180px Arial";
            // Add glow effect
            context.shadowColor = 'rgba(255, 255, 255, 0.5)';
            context.shadowBlur = 15;
            context.fillStyle = 'white';
            const emoji = this.currentGoal ? 
                VillagerGoals.GOALS[this.currentGoal].emoji :
                (this.currentMood ? VillagerGoals.MOODS[this.currentMood].emoji : '💭');
            context.fillText(emoji, 128, 128);
        }

        this.emojiTexture.update();
    }

    setGoal(goal) {
        if (!VillagerGoals.GOALS[goal]) {
            console.warn(`Invalid goal: ${goal}`);
            return;
        }

        this.currentGoal = goal;
        this.updateEmojiDisplay();
    }

    setMood(mood, duration = null) {
        if (!VillagerGoals.MOODS[mood]) {
            console.warn(`Invalid mood: ${mood}`);
            return;
        }

        // Clear existing mood timeout
        if (this.moodTimeout) {
            clearTimeout(this.moodTimeout);
        }

        this.currentMood = mood;
        this.updateEmojiDisplay();

        // Set mood duration
        const moodDuration = duration || VillagerGoals.MOODS[mood].duration;
        this.moodTimeout = setTimeout(() => {
            this.currentMood = null;
            this.updateEmojiDisplay();
        }, moodDuration * 1000);
    }

    startNeedsDecay() {
        this.scene.onBeforeRenderObservable.add(() => {
            const deltaTime = this.scene.getEngine().getDeltaTime() * 0.001;
            this.updateNeeds(deltaTime);
        });
    }

    updateNeeds(deltaTime) {
        // Decay rates per second
        const decayRates = {
            energy: 0.05,
            hunger: 0.03,
            social: 0.02,
            safety: 0.01
        };

        // Update each need
        for (const [need, value] of Object.entries(this.needs)) {
            const newValue = Math.max(0, value - decayRates[need] * deltaTime);
            if (newValue !== this.needs[need]) {
                this.needs[need] = newValue;
                this.needsUpdate.set(need, true);
            }
        }

        // Check needs and update goals/moods accordingly
        this.checkNeeds();
    }

    checkNeeds() {
        // Energy need
        if (this.needsUpdate.get('energy')) {
            if (this.needs.energy < 20) {
                this.setMood('TIRED');
                this.setGoal('SLEEP');
            }
            this.needsUpdate.delete('energy');
        }

        // Hunger need
        if (this.needsUpdate.get('hunger')) {
            if (this.needs.hunger < 30) {
                this.setGoal('EAT');
            }
            this.needsUpdate.delete('hunger');
        }

        // Social need
        if (this.needsUpdate.get('social')) {
            if (this.needs.social < 40) {
                this.setGoal('SOCIALIZE');
            }
            this.needsUpdate.delete('social');
        }

        // Safety need
        if (this.needsUpdate.get('safety')) {
            if (this.needs.safety < 50) {
                this.setMood('SCARED');
                this.setGoal('FLEE');
            }
            this.needsUpdate.delete('safety');
        }
    }

    satisfyNeed(need, amount) {
        if (this.needs.hasOwnProperty(need)) {
            this.needs[need] = Math.min(100, this.needs[need] + amount);
            this.needsUpdate.set(need, true);
            
            // Show happy mood briefly when a need is significantly satisfied
            if (amount > 30) {
                this.setMood('HAPPY', 5);
            }
        }
    }

    dispose() {
        if (this.moodTimeout) {
            clearTimeout(this.moodTimeout);
        }
        if (this.emojiTexture) {
            this.emojiTexture.dispose();
        }
        if (this.emojiPlane) {
            this.emojiPlane.dispose();
        }
    }
} 