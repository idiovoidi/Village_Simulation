// Remove the @babylonjs imports and use the global BABYLON object
// since it's already loaded in the main HTML file

export class WorldClock {
    constructor(scene) {
        this.scene = scene;
        this.advancedTexture = BABYLON.GUI.AdvancedDynamicTexture.CreateFullscreenUI("clockUI");
        
        // Only create UI if scene is valid
        if (this.scene) {
            this.createClockUI();
        } else {
            console.warn("WorldClock: Scene is undefined, clock UI will not be created");
        }
    }

    createClockUI() {
        // Create main container
        const container = new BABYLON.GUI.Rectangle("clockContainer");
        container.width = "120px";
        container.height = "120px";
        container.cornerRadius = 60;
        container.thickness = 2;
        container.background = "rgba(0, 0, 0, 0.7)";
        container.horizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
        container.verticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_TOP;
        container.top = "20px";
        container.left = "20px";
        container.zIndex = 1000; // Ensure it's on top
        this.advancedTexture.addControl(container);

        // Create outer progress ring (24-hour indicator)
        this.progressRing = new BABYLON.GUI.Ellipse("progressRing");
        this.progressRing.width = "110px";
        this.progressRing.height = "110px";
        this.progressRing.color = "#4CAF50";
        this.progressRing.thickness = 3;
        container.addControl(this.progressRing);

        // Create inner circle
        const innerCircle = new BABYLON.GUI.Ellipse("innerCircle");
        innerCircle.width = "100px";
        innerCircle.height = "100px";
        innerCircle.color = "white";
        innerCircle.thickness = 2;
        innerCircle.background = "rgba(0, 0, 0, 0.5)";
        container.addControl(innerCircle);

        // Create time text
        this.timeText = new BABYLON.GUI.TextBlock("timeText");
        this.timeText.text = "12:00";
        this.timeText.color = "white";
        this.timeText.fontSize = 32;
        this.timeText.fontFamily = "Arial";
        this.timeText.outlineWidth = 2;
        this.timeText.outlineColor = "black";
        container.addControl(this.timeText);

        // Create period text (DAY/NIGHT)
        this.periodText = new BABYLON.GUI.TextBlock("periodText");
        this.periodText.text = "DAY";
        this.periodText.color = "#FFD700";
        this.periodText.fontSize = 14;
        this.periodText.fontFamily = "Arial";
        this.periodText.outlineWidth = 1;
        this.periodText.outlineColor = "black";
        this.periodText.top = "25px";
        container.addControl(this.periodText);

        // Create progress segments for each 6-hour period
        this.segments = [];
        const segmentColors = ["#FF9800", "#4CAF50", "#2196F3", "#9C27B0"]; // Dawn, Day, Dusk, Night
        for (let i = 0; i < 4; i++) {
            const segment = new BABYLON.GUI.Ellipse(`segment${i}`);
            segment.width = "110px";
            segment.height = "110px";
            segment.color = segmentColors[i];
            segment.thickness = 3;
            segment.arc = 0.5;  // Start with 0, will be updated
            segment.rotation = Math.PI * (i / 2);
            container.addControl(segment);
            this.segments.push(segment);
        }

        // Create small indicators for each hour
        for (let i = 0; i < 24; i++) {
            const isMainHour = i % 6 === 0;
            const marker = new BABYLON.GUI.Rectangle(`hourMarker${i}`);
            marker.width = isMainHour ? "4px" : "2px";
            marker.height = isMainHour ? "12px" : "8px";
            marker.thickness = 0;
            marker.background = "white";
            
            // Position markers around the circle
            const angle = (i / 24) * 2 * Math.PI - Math.PI / 2;
            const radius = 48; // Slightly smaller than the progress ring
            marker.left = (radius * Math.cos(angle)) + "px";
            marker.top = (radius * Math.sin(angle)) + "px";
            marker.rotation = angle + Math.PI / 2;
            
            container.addControl(marker);
        }

        // Add glow effect
        const glowRect = new BABYLON.GUI.Rectangle("glowRect");
        glowRect.width = "120px";
        glowRect.height = "120px";
        glowRect.cornerRadius = 60;
        glowRect.alpha = 0.3;
        glowRect.thickness = 0;
        glowRect.background = "rgba(255, 255, 255, 0.1)";
        container.addControl(glowRect);

        // Add subtle animation - ensure scene exists and has onBeforeRenderObservable
        if (this.scene && this.scene.onBeforeRenderObservable) {
            this.scene.onBeforeRenderObservable.add(() => {
                const time = performance.now() * 0.001;
                glowRect.alpha = 0.2 + Math.sin(time * 2) * 0.1;
            });
        } else {
            console.warn("WorldClock: Scene onBeforeRenderObservable is not available, animation disabled");
        }
    }

    updateTime(gameTime) {
        // Make sure all UI elements are initialized
        if (!this.timeText || !this.progressRing || !this.periodText || !this.segments) {
            return;
        }
        
        // Convert game time (minutes) to hours and minutes
        const hours = Math.floor(gameTime / 60);
        const minutes = Math.floor(gameTime % 60);
        
        // Format time with leading zeros
        const timeString = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
        this.timeText.text = timeString;

        // Calculate day progress (0 to 1)
        const dayProgress = ((hours * 60 + minutes) / (24 * 60));

        // Update progress ring
        this.progressRing.arc = dayProgress;

        // Update period and colors
        const isNight = hours >= 18 || hours < 6;
        this.periodText.text = isNight ? "NIGHT" : "DAY";
        this.periodText.color = isNight ? "#7EB2DD" : "#FFD700";

        // Update segment visibility based on time
        const quarterDay = 6 * 60; // 6 hours in minutes
        for (let i = 0; i < 4; i++) {
            const segmentStart = i * quarterDay;
            const segmentEnd = (i + 1) * quarterDay;
            const currentMinutes = hours * 60 + minutes;
            
            if (currentMinutes >= segmentStart && currentMinutes < segmentEnd) {
                const segmentProgress = (currentMinutes - segmentStart) / quarterDay;
                this.segments[i].arc = segmentProgress * 0.5;
            } else if (currentMinutes < segmentStart) {
                this.segments[i].arc = 0;
            } else {
                this.segments[i].arc = 0.5;
            }
        }
    }

    dispose() {
        if (this.advancedTexture) {
            this.advancedTexture.dispose();
        }
    }
} 