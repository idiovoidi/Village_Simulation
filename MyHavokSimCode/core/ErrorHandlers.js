/**
 * Error handling decorators for agent behaviors
 * These decorators can be applied to methods to add standardized error handling
 */

/**
 * Decorator for handling errors in agent behavior methods
 * @param {Object} target - The class prototype
 * @param {string} propertyKey - The method name
 * @param {PropertyDescriptor} descriptor - The method descriptor
 */
export function handleAgentError(target, propertyKey, descriptor) {
    const originalMethod = descriptor.value;
    
    descriptor.value = function(...args) {
        try {
            return originalMethod.apply(this, args);
        } catch (error) {
            console.error(`Error in agent behavior '${propertyKey}':`, error);
            
            // Attempt to recover the agent by setting to idle state
            if (this.setState && typeof this.setState === 'function') {
                this.setState('idle');
            }
            
            // Return a safe default value
            return null;
        }
    };
    
    return descriptor;
}

/**
 * Decorator for measuring performance of agent behavior methods
 * @param {Object} target - The class prototype
 * @param {string} propertyKey - The method name
 * @param {PropertyDescriptor} descriptor - The method descriptor
 */
export function measurePerformance(target, propertyKey, descriptor) {
    const originalMethod = descriptor.value;
    
    descriptor.value = function(...args) {
        const start = performance.now();
        const result = originalMethod.apply(this, args);
        const end = performance.now();
        
        const duration = end - start;
        
        // Only log if duration is above threshold (e.g., 16ms = ~60fps frame budget)
        if (duration > 16) {
            console.warn(`Performance warning: ${target.constructor.name}.${propertyKey} took ${duration.toFixed(2)}ms`);
        }
        
        return result;
    };
    
    return descriptor;
}

/**
 * Decorator for throttling method calls to improve performance
 * @param {number} interval - Minimum time between calls in milliseconds
 */
export function throttle(interval) {
    return function(target, propertyKey, descriptor) {
        const originalMethod = descriptor.value;
        let lastExecutionTime = 0;
        
        descriptor.value = function(...args) {
            const now = Date.now();
            
            if (now - lastExecutionTime >= interval) {
                lastExecutionTime = now;
                return originalMethod.apply(this, args);
            }
            
            // Skip execution if called too frequently
            return null;
        };
        
        return descriptor;
    };
}

/**
 * Class for defining custom exception types
 */
export class AgentError extends Error {
    constructor(message) {
        super(message);
        this.name = 'AgentError';
    }
}

/**
 * Navigation error - thrown when agent cannot navigate to target
 */
export class NavigationError extends AgentError {
    constructor(message) {
        super(message);
        this.name = 'NavigationError';
    }
}

/**
 * Collision error - thrown when agent collides with an obstacle
 */
export class CollisionError extends AgentError {
    constructor(message) {
        super(message);
        this.name = 'CollisionError';
    }
}

/**
 * Animation error - thrown when agent animation fails
 */
export class AnimationError extends AgentError {
    constructor(message) {
        super(message);
        this.name = 'AnimationError';
    }
}

/**
 * Resource error - thrown when agent resources (e.g., models, textures) fail to load
 */
export class ResourceError extends AgentError {
    constructor(message) {
        super(message);
        this.name = 'ResourceError';
    }
} 