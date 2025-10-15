/**
 * QualityTransitionSystem - Advanced quality transition system with visual feedback
 * 
 * This class provides:
 * - Smooth quality level transitions with advanced easing
 * - Visual feedback for quality changes
 * - Transition timing and scheduling
 * - Multiple concurrent transitions for different systems
 * - Transition interruption and blending
 */

export class QualityTransitionSystem {
    constructor(scene = null) {
        this.scene = scene;
        
        // Active transitions
        this.activeTransitions = new Map();
        this.transitionId = 0;
        
        // Visual feedback elements
        this.visualFeedback = {
            enabled: true,
            showNotifications: true,
            showProgressBar: false,
            fadeInDuration: 300,
            fadeOutDuration: 500,
            displayDuration: 2000
        };
        
        // Transition presets
        this.transitionPresets = this.initializeTransitionPresets();
        
        // Callbacks
        this.transitionCallbacks = [];
        this.systemCallbacks = new Map(); // Per-system callbacks
        
        // Performance tracking
        this.transitionMetrics = {
            totalTransitions: 0,
            averageDuration: 0,
            successfulTransitions: 0,
            cancelledTransitions: 0
        };
        
        console.log('QualityTransitionSystem initialized');
    }
    
    /**
     * Initialize transition presets with different timing and easing options
     */
    initializeTransitionPresets() {
        return {
            instant: {
                duration: 0,
                easing: 'linear',
                steps: 1,
                description: 'Immediate transition'
            },
            
            fast: {
                duration: 500,
                easing: 'easeOutQuad',
                steps: 10,
                description: 'Quick transition for responsive changes'
            },
            
            smooth: {
                duration: 1000,
                easing: 'easeInOutQuad',
                steps: 20,
                description: 'Smooth transition for general use'
            },
            
            gentle: {
                duration: 2000,
                easing: 'easeInOutSine',
                steps: 30,
                description: 'Gentle transition to minimize visual disruption'
            },
            
            dramatic: {
                duration: 1500,
                easing: 'easeInOutCubic',
                steps: 25,
                description: 'Dramatic transition for significant quality changes'
            },
            
            adaptive: {
                duration: 'auto', // Calculated based on change magnitude
                easing: 'easeInOutQuad',
                steps: 'auto',
                description: 'Adaptive timing based on quality change'
            }
        };
    }
    
    /**
     * Start a quality transition for a specific system
     */
    startTransition(systemName, fromValue, toValue, options = {}) {
        const transitionId = ++this.transitionId;
        
        // Resolve options with defaults
        const resolvedOptions = this.resolveTransitionOptions(options, fromValue, toValue);
        
        // Cancel existing transition for this system if any
        if (this.activeTransitions.has(systemName)) {
            this.cancelTransition(systemName);
        }
        
        // Create transition object
        const transition = {
            id: transitionId,
            systemName,
            fromValue,
            toValue,
            currentValue: fromValue,
            startTime: performance.now(),
            ...resolvedOptions,
            
            // State tracking
            progress: 0,
            easedProgress: 0,
            completed: false,
            cancelled: false,
            
            // Step tracking for discrete transitions
            currentStep: 0,
            stepValues: this.calculateStepValues(fromValue, toValue, resolvedOptions.steps)
        };
        
        // Store active transition
        this.activeTransitions.set(systemName, transition);
        
        // Show visual feedback
        if (this.visualFeedback.enabled) {
            this.showTransitionFeedback(transition);
        }
        
        // Notify callbacks
        this.notifyTransitionCallbacks('start', transition);
        this.notifySystemCallbacks(systemName, 'start', transition);
        
        console.log(`Started transition for ${systemName}: ${fromValue} → ${toValue} (${resolvedOptions.duration}ms)`);
        
        // Start the transition update loop
        this.updateTransition(systemName);
        
        return transitionId;
    }
    
    /**
     * Resolve transition options with defaults and auto-calculations
     */
    resolveTransitionOptions(options, fromValue, toValue) {
        // Start with preset if specified
        let resolved = {};
        if (options.preset && this.transitionPresets[options.preset]) {
            resolved = { ...this.transitionPresets[options.preset] };
        } else {
            resolved = { ...this.transitionPresets.smooth }; // Default preset
        }
        
        // Override with explicit options
        resolved = { ...resolved, ...options };
        
        // Calculate adaptive values
        if (resolved.duration === 'auto') {
            const changeMagnitude = Math.abs(toValue - fromValue);
            resolved.duration = Math.max(300, Math.min(3000, changeMagnitude * 20));
        }
        
        if (resolved.steps === 'auto') {
            resolved.steps = Math.max(5, Math.min(50, Math.floor(resolved.duration / 50)));
        }
        
        // Ensure minimum values
        resolved.duration = Math.max(0, resolved.duration);
        resolved.steps = Math.max(1, resolved.steps);
        
        return resolved;
    }
    
    /**
     * Calculate intermediate step values for discrete transitions
     */
    calculateStepValues(fromValue, toValue, steps) {
        const stepValues = [];
        const valueRange = toValue - fromValue;
        
        for (let i = 0; i <= steps; i++) {
            const progress = i / steps;
            const value = fromValue + (valueRange * progress);
            stepValues.push(value);
        }
        
        return stepValues;
    }
    
    /**
     * Update a specific transition (called each frame)
     */
    updateTransition(systemName) {
        const transition = this.activeTransitions.get(systemName);
        
        if (!transition || transition.completed || transition.cancelled) {
            return;
        }
        
        const currentTime = performance.now();
        const elapsed = currentTime - transition.startTime;
        
        // Calculate progress
        if (transition.duration === 0) {
            // Instant transition
            transition.progress = 1;
            transition.easedProgress = 1;
            transition.currentValue = transition.toValue;
        } else {
            // Timed transition
            transition.progress = Math.min(1, elapsed / transition.duration);
            transition.easedProgress = this.applyEasing(transition.progress, transition.easing);
            
            // Calculate current value
            const valueRange = transition.toValue - transition.fromValue;
            transition.currentValue = transition.fromValue + (valueRange * transition.easedProgress);
        }
        
        // Update step tracking for discrete transitions
        const targetStep = Math.floor(transition.easedProgress * transition.steps);
        if (targetStep !== transition.currentStep && targetStep < transition.stepValues.length) {
            transition.currentStep = targetStep;
            transition.currentValue = transition.stepValues[targetStep];
        }
        
        // Notify progress callbacks
        this.notifyTransitionCallbacks('progress', transition);
        this.notifySystemCallbacks(systemName, 'progress', transition);
        
        // Check if transition is complete
        if (transition.progress >= 1) {
            this.completeTransition(systemName);
        } else {
            // Schedule next update
            requestAnimationFrame(() => this.updateTransition(systemName));
        }
    }
    
    /**
     * Complete a transition
     */
    completeTransition(systemName) {
        const transition = this.activeTransitions.get(systemName);
        
        if (!transition || transition.completed) {
            return;
        }
        
        // Ensure final value is exact
        transition.currentValue = transition.toValue;
        transition.progress = 1;
        transition.easedProgress = 1;
        transition.completed = true;
        
        // Update metrics
        this.transitionMetrics.totalTransitions++;
        this.transitionMetrics.successfulTransitions++;
        
        const duration = performance.now() - transition.startTime;
        this.transitionMetrics.averageDuration = 
            (this.transitionMetrics.averageDuration * (this.transitionMetrics.totalTransitions - 1) + duration) / 
            this.transitionMetrics.totalTransitions;
        
        // Hide visual feedback
        if (this.visualFeedback.enabled) {
            this.hideTransitionFeedback(transition);
        }
        
        // Notify completion callbacks
        this.notifyTransitionCallbacks('complete', transition);
        this.notifySystemCallbacks(systemName, 'complete', transition);
        
        console.log(`Completed transition for ${systemName}: ${transition.fromValue} → ${transition.toValue} (${duration.toFixed(1)}ms)`);
        
        // Remove from active transitions
        this.activeTransitions.delete(systemName);
    }
    
    /**
     * Cancel a transition
     */
    cancelTransition(systemName) {
        const transition = this.activeTransitions.get(systemName);
        
        if (!transition || transition.completed || transition.cancelled) {
            return false;
        }
        
        transition.cancelled = true;
        
        // Update metrics
        this.transitionMetrics.cancelledTransitions++;
        
        // Hide visual feedback
        if (this.visualFeedback.enabled) {
            this.hideTransitionFeedback(transition);
        }
        
        // Notify cancellation callbacks
        this.notifyTransitionCallbacks('cancel', transition);
        this.notifySystemCallbacks(systemName, 'cancel', transition);
        
        console.log(`Cancelled transition for ${systemName} at progress ${(transition.progress * 100).toFixed(1)}%`);
        
        // Remove from active transitions
        this.activeTransitions.delete(systemName);
        
        return true;
    }
    
    /**
     * Cancel all active transitions
     */
    cancelAllTransitions() {
        const systemNames = Array.from(this.activeTransitions.keys());
        let cancelledCount = 0;
        
        for (const systemName of systemNames) {
            if (this.cancelTransition(systemName)) {
                cancelledCount++;
            }
        }
        
        console.log(`Cancelled ${cancelledCount} active transitions`);
        return cancelledCount;
    }
    
    /**
     * Update all active transitions (called each frame)
     */
    updateAllTransitions() {
        const systemNames = Array.from(this.activeTransitions.keys());
        
        for (const systemName of systemNames) {
            this.updateTransition(systemName);
        }
    }
    
    /**
     * Apply easing function to transition progress
     */
    applyEasing(progress, easingType) {
        switch (easingType) {
            case 'linear':
                return progress;
                
            case 'easeInQuad':
                return progress * progress;
                
            case 'easeOutQuad':
                return progress * (2 - progress);
                
            case 'easeInOutQuad':
                return progress < 0.5 
                    ? 2 * progress * progress 
                    : -1 + (4 - 2 * progress) * progress;
                    
            case 'easeInCubic':
                return progress * progress * progress;
                
            case 'easeOutCubic':
                return (--progress) * progress * progress + 1;
                
            case 'easeInOutCubic':
                return progress < 0.5 
                    ? 4 * progress * progress * progress 
                    : (progress - 1) * (2 * progress - 2) * (2 * progress - 2) + 1;
                    
            case 'easeInSine':
                return 1 - Math.cos(progress * Math.PI / 2);
                
            case 'easeOutSine':
                return Math.sin(progress * Math.PI / 2);
                
            case 'easeInOutSine':
                return -(Math.cos(Math.PI * progress) - 1) / 2;
                
            case 'easeInExpo':
                return progress === 0 ? 0 : Math.pow(2, 10 * (progress - 1));
                
            case 'easeOutExpo':
                return progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
                
            case 'easeInOutExpo':
                if (progress === 0) return 0;
                if (progress === 1) return 1;
                return progress < 0.5 
                    ? Math.pow(2, 20 * progress - 10) / 2
                    : (2 - Math.pow(2, -20 * progress + 10)) / 2;
                    
            case 'easeInBack':
                const c1 = 1.70158;
                const c3 = c1 + 1;
                return c3 * progress * progress * progress - c1 * progress * progress;
                
            case 'easeOutBack':
                const c1b = 1.70158;
                const c3b = c1b + 1;
                return 1 + c3b * Math.pow(progress - 1, 3) + c1b * Math.pow(progress - 1, 2);
                
            case 'easeInOutBack':
                const c1c = 1.70158;
                const c2 = c1c * 1.525;
                return progress < 0.5
                    ? (Math.pow(2 * progress, 2) * ((c2 + 1) * 2 * progress - c2)) / 2
                    : (Math.pow(2 * progress - 2, 2) * ((c2 + 1) * (progress * 2 - 2) + c2) + 2) / 2;
                    
            default:
                // Default to easeInOutQuad
                return progress < 0.5 
                    ? 2 * progress * progress 
                    : -1 + (4 - 2 * progress) * progress;
        }
    }
    
    /**
     * Show visual feedback for transition start
     */
    showTransitionFeedback(transition) {
        if (!this.visualFeedback.showNotifications) {
            return;
        }
        
        // Create notification element (if in browser environment)
        if (typeof document !== 'undefined') {
            const notification = this.createTransitionNotification(transition);
            if (notification) {
                document.body.appendChild(notification);
                
                // Store reference for cleanup
                transition.notificationElement = notification;
                
                // Auto-hide after display duration
                setTimeout(() => {
                    this.hideTransitionFeedback(transition);
                }, this.visualFeedback.displayDuration);
            }
        }
        
        // Console feedback
        console.log(`🔄 Quality transition started: ${transition.systemName} (${transition.fromValue} → ${transition.toValue})`);
    }
    
    /**
     * Create visual notification element for transition
     */
    createTransitionNotification(transition) {
        if (typeof document === 'undefined') {
            return null;
        }
        
        const notification = document.createElement('div');
        notification.className = 'quality-transition-notification';
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: rgba(0, 0, 0, 0.8);
            color: white;
            padding: 12px 16px;
            border-radius: 6px;
            font-family: Arial, sans-serif;
            font-size: 14px;
            z-index: 10000;
            opacity: 0;
            transform: translateX(100%);
            transition: all ${this.visualFeedback.fadeInDuration}ms ease-out;
            max-width: 300px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        `;
        
        // Create content
        const title = document.createElement('div');
        title.style.cssText = 'font-weight: bold; margin-bottom: 4px;';
        title.textContent = 'Quality Adjusting';
        
        const details = document.createElement('div');
        details.style.cssText = 'font-size: 12px; opacity: 0.9;';
        details.textContent = `${transition.systemName}: ${transition.fromValue} → ${transition.toValue}`;
        
        notification.appendChild(title);
        notification.appendChild(details);
        
        // Add progress bar if enabled
        if (this.visualFeedback.showProgressBar) {
            const progressContainer = document.createElement('div');
            progressContainer.style.cssText = `
                width: 100%;
                height: 3px;
                background: rgba(255, 255, 255, 0.3);
                border-radius: 2px;
                margin-top: 8px;
                overflow: hidden;
            `;
            
            const progressBar = document.createElement('div');
            progressBar.style.cssText = `
                width: 0%;
                height: 100%;
                background: #4CAF50;
                border-radius: 2px;
                transition: width 100ms ease-out;
            `;
            
            progressContainer.appendChild(progressBar);
            notification.appendChild(progressContainer);
            
            // Store progress bar reference
            transition.progressBarElement = progressBar;
        }
        
        // Animate in
        requestAnimationFrame(() => {
            notification.style.opacity = '1';
            notification.style.transform = 'translateX(0)';
        });
        
        return notification;
    }
    
    /**
     * Update visual feedback during transition
     */
    updateTransitionFeedback(transition) {
        if (transition.progressBarElement) {
            const progress = (transition.progress * 100).toFixed(1);
            transition.progressBarElement.style.width = `${progress}%`;
        }
    }
    
    /**
     * Hide visual feedback for transition
     */
    hideTransitionFeedback(transition) {
        if (transition.notificationElement) {
            const element = transition.notificationElement;
            
            // Animate out
            element.style.opacity = '0';
            element.style.transform = 'translateX(100%)';
            
            // Remove after animation
            setTimeout(() => {
                if (element.parentNode) {
                    element.parentNode.removeChild(element);
                }
            }, this.visualFeedback.fadeOutDuration);
            
            transition.notificationElement = null;
        }
    }
    
    /**
     * Get transition status for a system
     */
    getTransitionStatus(systemName) {
        const transition = this.activeTransitions.get(systemName);
        
        if (!transition) {
            return null;
        }
        
        return {
            id: transition.id,
            systemName: transition.systemName,
            fromValue: transition.fromValue,
            toValue: transition.toValue,
            currentValue: transition.currentValue,
            progress: transition.progress,
            easedProgress: transition.easedProgress,
            duration: transition.duration,
            elapsed: performance.now() - transition.startTime,
            remaining: Math.max(0, transition.duration - (performance.now() - transition.startTime)),
            easing: transition.easing,
            completed: transition.completed,
            cancelled: transition.cancelled
        };
    }
    
    /**
     * Get all active transitions
     */
    getAllActiveTransitions() {
        const statuses = {};
        
        for (const systemName of this.activeTransitions.keys()) {
            statuses[systemName] = this.getTransitionStatus(systemName);
        }
        
        return statuses;
    }
    
    /**
     * Check if any transitions are active
     */
    hasActiveTransitions() {
        return this.activeTransitions.size > 0;
    }
    
    /**
     * Get transition metrics
     */
    getTransitionMetrics() {
        return { ...this.transitionMetrics };
    }
    
    /**
     * Configure visual feedback settings
     */
    configureVisualFeedback(settings) {
        this.visualFeedback = { ...this.visualFeedback, ...settings };
        console.log('Visual feedback settings updated:', this.visualFeedback);
    }
    
    /**
     * Add transition preset
     */
    addTransitionPreset(name, preset) {
        this.transitionPresets[name] = { ...preset };
        console.log(`Transition preset '${name}' added`);
    }
    
    /**
     * Remove transition preset
     */
    removeTransitionPreset(name) {
        if (this.transitionPresets[name]) {
            delete this.transitionPresets[name];
            console.log(`Transition preset '${name}' removed`);
            return true;
        }
        return false;
    }
    
    /**
     * Get available transition presets
     */
    getTransitionPresets() {
        return { ...this.transitionPresets };
    }
    
    /**
     * Register transition callback
     */
    onTransition(callback) {
        if (typeof callback === 'function') {
            this.transitionCallbacks.push(callback);
        }
    }
    
    /**
     * Register system-specific callback
     */
    onSystemTransition(systemName, callback) {
        if (typeof callback === 'function') {
            if (!this.systemCallbacks.has(systemName)) {
                this.systemCallbacks.set(systemName, []);
            }
            this.systemCallbacks.get(systemName).push(callback);
        }
    }
    
    /**
     * Remove transition callback
     */
    removeTransitionCallback(callback) {
        const index = this.transitionCallbacks.indexOf(callback);
        if (index > -1) {
            this.transitionCallbacks.splice(index, 1);
        }
    }
    
    /**
     * Remove system-specific callback
     */
    removeSystemCallback(systemName, callback) {
        if (this.systemCallbacks.has(systemName)) {
            const callbacks = this.systemCallbacks.get(systemName);
            const index = callbacks.indexOf(callback);
            if (index > -1) {
                callbacks.splice(index, 1);
                if (callbacks.length === 0) {
                    this.systemCallbacks.delete(systemName);
                }
            }
        }
    }
    
    /**
     * Notify transition callbacks
     */
    notifyTransitionCallbacks(event, transition) {
        // Update visual feedback for progress events
        if (event === 'progress') {
            this.updateTransitionFeedback(transition);
        }
        
        this.transitionCallbacks.forEach(callback => {
            try {
                callback(event, transition);
            } catch (error) {
                console.error('Error in transition callback:', error);
            }
        });
    }
    
    /**
     * Notify system-specific callbacks
     */
    notifySystemCallbacks(systemName, event, transition) {
        if (this.systemCallbacks.has(systemName)) {
            this.systemCallbacks.get(systemName).forEach(callback => {
                try {
                    callback(event, transition);
                } catch (error) {
                    console.error(`Error in ${systemName} transition callback:`, error);
                }
            });
        }
    }
    
    /**
     * Dispose of the transition system
     */
    dispose() {
        console.log('Disposing QualityTransitionSystem...');
        
        // Cancel all active transitions
        this.cancelAllTransitions();
        
        // Clear callbacks
        this.transitionCallbacks = [];
        this.systemCallbacks.clear();
        
        // Reset metrics
        this.transitionMetrics = {
            totalTransitions: 0,
            averageDuration: 0,
            successfulTransitions: 0,
            cancelledTransitions: 0
        };
        
        console.log('QualityTransitionSystem disposed');
    }
}