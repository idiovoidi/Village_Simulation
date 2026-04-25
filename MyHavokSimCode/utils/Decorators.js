/**
 * Decorator Utilities
 * Shared decorators for error handling, performance monitoring, etc.
 */

/**
 * Error handling decorator
 * Wraps method to catch and log errors, returning null on failure
 * @param {Object} target - Class prototype
 * @param {string} propertyKey - Method name
 * @param {PropertyDescriptor} descriptor - Method descriptor
 * @returns {PropertyDescriptor} - Modified descriptor
 */
export function ErrorDecorator(target, propertyKey, descriptor) {
    const originalMethod = descriptor.value;
    descriptor.value = function (...args) {
        try {
            return originalMethod.apply(this, args);
        } catch (error) {
            console.error(`Error in ${propertyKey}:`, error);
            // Return a fallback or default value if appropriate
            return null;
        }
    };
    return descriptor;
}

/**
 * Performance measurement decorator
 * Logs execution time of decorated methods
 * @param {Object} target - Class prototype
 * @param {string} propertyKey - Method name
 * @param {PropertyDescriptor} descriptor - Method descriptor
 * @returns {PropertyDescriptor} - Modified descriptor
 */
export function MeasurePerformance(target, propertyKey, descriptor) {
    const originalMethod = descriptor.value;
    descriptor.value = function (...args) {
        const start = performance.now();
        const result = originalMethod.apply(this, args);
        const duration = performance.now() - start;
        console.log(`${propertyKey} took ${duration.toFixed(2)}ms`);
        return result;
    };
    return descriptor;
}

/**
 * Throttle decorator
 * Limits method execution to once per specified interval
 * @param {number} intervalMs - Minimum interval between executions
 * @returns {Function} - Decorator function
 */
export function Throttle(intervalMs) {
    return function (target, propertyKey, descriptor) {
        const originalMethod = descriptor.value;
        let lastExecution = 0;

        descriptor.value = function (...args) {
            const now = Date.now();
            if (now - lastExecution >= intervalMs) {
                lastExecution = now;
                return originalMethod.apply(this, args);
            }
            // Return undefined if throttled
            return undefined;
        };
        return descriptor;
    };
}
