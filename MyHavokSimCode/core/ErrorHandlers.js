/**
 * Error handling decorators for agent behaviors
 * These decorators use a function-application pattern instead of @decorator syntax
 */

/**
 * Function for handling errors in agent behavior methods
 * @param {Function} originalMethod - The method to wrap with error handling
 * @returns {Function} - Error-handling wrapped function
 */
export function handleAgentError(originalMethod) {
    return function(...args) {
        try {
            return originalMethod.apply(this, args);
        } catch (error) {
            console.error(`Error in agent behavior '${originalMethod.name}':`, error);

            // Attempt to recover the agent by setting to idle state
            if (this.setState && typeof this.setState === 'function') {
                this.setState('idle');
            }

            // Return a safe default value
            return null;
        }
    };
}

/**
 * Function for measuring performance of agent behavior methods
 * @param {Function} originalMethod - The method to measure performance of
 * @returns {Function} - Performance-measuring wrapped function
 */
export function measurePerformance(originalMethod) {
    return function(...args) {
        const start = performance.now();
        const result = originalMethod.apply(this, args);
        const end = performance.now();

        const duration = end - start;

        // Only log if duration is above threshold (e.g., 16ms = ~60fps frame budget)
        if (duration > 16) {
            console.warn(`Performance warning: ${this.constructor.name}.${originalMethod.name} took ${duration.toFixed(2)}ms`);
        }

        return result;
    };
}

/**
 * Function for throttling method calls to improve performance
 * @param {number} interval - Minimum time between calls in milliseconds
 * @param {Function} originalMethod - The method to throttle
 * @returns {Function} - Throttled wrapped function
 */
export function throttle(interval, originalMethod) {
    if (typeof originalMethod !== 'function') {
        // If called without a method (as a configuration function)
        return function(method) {
            return throttle(interval, method);
        };
    }

    let lastExecutionTime = 0;

    return function(...args) {
        const now = Date.now();

        if (now - lastExecutionTime >= interval) {
            lastExecutionTime = now;
            return originalMethod.apply(this, args);
        }

        // Skip execution if called too frequently
        return null;
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
