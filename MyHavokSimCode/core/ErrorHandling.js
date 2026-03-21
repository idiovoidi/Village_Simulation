/**
 * Error handling system with decorators and a hierarchy of custom exceptions
 */

// Base simulation error
export class SimulationError extends Error {
    constructor(message) {
        super(message);
        this.name = 'SimulationError';
    }
}

// System category errors
export class SystemError extends SimulationError {
    constructor(message) {
        super(message);
        this.name = 'SystemError';
    }
}

export class FatalSystemError extends SystemError {
    constructor(message) {
        super(message);
        this.name = 'FatalSystemError';
    }
}

export class DependencyError extends SystemError {
    constructor(message) {
        super(message);
        this.name = 'DependencyError';
    }
}

export class ServiceError extends SystemError {
    constructor(message) {
        super(message);
        this.name = 'ServiceError';
    }
}

// Entity category errors
export class EntityError extends SimulationError {
    constructor(message) {
        super(message);
        this.name = 'EntityError';
    }
}

export class ComponentError extends EntityError {
    constructor(message) {
        super(message);
        this.name = 'ComponentError';
    }
}

// Physics category errors
export class PhysicsError extends SimulationError {
    constructor(message) {
        super(message);
        this.name = 'PhysicsError';
    }
}

export class CollisionError extends PhysicsError {
    constructor(message) {
        super(message);
        this.name = 'CollisionError';
    }
}

// AI category errors
export class AIError extends SimulationError {
    constructor(message) {
        super(message);
        this.name = 'AIError';
    }
}

export class PathfindingError extends AIError {
    constructor(message) {
        super(message);
        this.name = 'PathfindingError';
    }
}

export class BehaviorError extends AIError {
    constructor(message) {
        super(message);
        this.name = 'BehaviorError';
    }
}

// Environment category errors
export class EnvironmentError extends SimulationError {
    constructor(message) {
        super(message);
        this.name = 'EnvironmentError';
    }
}

export class WeatherError extends EnvironmentError {
    constructor(message) {
        super(message);
        this.name = 'WeatherError';
    }
}

export class TerrainError extends EnvironmentError {
    constructor(message) {
        super(message);
        this.name = 'TerrainError';
    }
}

export class WaterError extends EnvironmentError {
    constructor(message) {
        super(message);
        this.name = 'WaterError';
    }
}

/**
 * Error handling decorators
 */

/**
 * Decorator that catches errors and wraps them in a simulation error
 * @param {Function} targetClass - The class containing the method
 * @param {string} methodName - The method name
 * @param {PropertyDescriptor} descriptor - The method descriptor
 */
export function catchErrors(errorType = SimulationError) {
    return function (targetClass, methodName, descriptor) {
        const originalMethod = descriptor.value;

        descriptor.value = function (...args) {
            try {
                return originalMethod.apply(this, args);
            } catch (error) {
                if (error instanceof SimulationError) {
                    // Already a simulation error, just rethrow
                    throw error;
                } else {
                    // Wrap in specified error type
                    throw new errorType(`Error in ${methodName}: ${error.message}`);
                }
            }
        };

        return descriptor;
    };
}

/**
 * Decorator that logs method entry and exit
 * @param {Function} targetClass - The class containing the method
 * @param {string} methodName - The method name
 * @param {PropertyDescriptor} descriptor - The method descriptor
 */
export function logMethod(level = 'debug') {
    return function (targetClass, methodName, descriptor) {
        const originalMethod = descriptor.value;

        descriptor.value = function (...args) {
            const className = this.constructor.name;
            console[level](`${className}.${methodName} called with:`, args);

            const result = originalMethod.apply(this, args);

            // Handle promises
            if (result instanceof Promise) {
                return result.then(value => {
                    console[level](`${className}.${methodName} completed`);
                    return value;
                }).catch(error => {
                    console.error(`${className}.${methodName} failed:`, error);
                    throw error;
                });
            } else {
                console[level](`${className}.${methodName} completed`);
                return result;
            }
        };

        return descriptor;
    };
}

/**
 * Decorator that validates method arguments
 * @param {Array<Function>} validators - Array of validator functions
 */
export function validateArgs(...validators) {
    return function (targetClass, methodName, descriptor) {
        const originalMethod = descriptor.value;

        descriptor.value = function (...args) {
            // Apply validators
            validators.forEach((validator, index) => {
                if (index < args.length && validator) {
                    const valid = validator(args[index]);
                    if (!valid) {
                        throw new SimulationError(`Invalid argument ${index} for ${methodName}: ${args[index]}`);
                    }
                }
            });

            return originalMethod.apply(this, args);
        };

        return descriptor;
    };
}

/**
 * Decorator that handles async errors
 * @param {Function} targetClass - The class containing the method
 * @param {string} methodName - The method name
 * @param {PropertyDescriptor} descriptor - The method descriptor
 */
export function handleAsyncErrors(errorType = SimulationError) {
    return function (targetClass, methodName, descriptor) {
        const originalMethod = descriptor.value;

        descriptor.value = async function (...args) {
            try {
                return await originalMethod.apply(this, args);
            } catch (error) {
                if (error instanceof SimulationError) {
                    // Already a simulation error, just rethrow
                    throw error;
                } else {
                    // Wrap in specified error type
                    throw new errorType(`Error in async ${methodName}: ${error.message}`);
                }
            }
        };

        return descriptor;
    };
}

/**
 * Decorator that retries a method on failure
 * @param {number} maxRetries - Maximum number of retries
 * @param {number} delayMs - Delay between retries in milliseconds
 */
export function retry(maxRetries = 3, delayMs = 100) {
    return function (targetClass, methodName, descriptor) {
        const originalMethod = descriptor.value;

        descriptor.value = async function (...args) {
            let lastError;
            for (let i = 0; i < maxRetries; i++) {
                try {
                    return await originalMethod.apply(this, args);
                } catch (error) {
                    lastError = error;
                    if (i < maxRetries - 1) {
                        await new Promise(resolve => setTimeout(resolve, delayMs));
                    }
                }
            }
            throw lastError;
        };

        return descriptor;
    };
}

/**
 * Decorator that throttles method calls to improve performance
 * @param {number} interval - Minimum time between calls in milliseconds
 */
export function throttle(interval) {
    return function (targetClass, methodName, descriptor) {
        const originalMethod = descriptor.value;
        let lastExecutionTime = 0;

        descriptor.value = function (...args) {
            const now = Date.now();

            if (now - lastExecutionTime >= interval) {
                lastExecutionTime = now;
                return originalMethod.apply(this, args);
            }

            return null;
        };

        return descriptor;
    };
}

/**
 * Decorator that measures method performance
 * @param {Function} targetClass - The class containing the method
 * @param {string} methodName - The method name
 * @param {PropertyDescriptor} descriptor - The method descriptor
 */
export function measurePerformance(targetClass, methodName, descriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = function (...args) {
        const start = performance.now();

        const result = originalMethod.apply(this, args);

        // Handle promises
        if (result instanceof Promise) {
            return result.then(value => {
                const duration = performance.now() - start;
                console.debug(`${methodName} took ${duration.toFixed(2)}ms`);
                return value;
            });
        } else {
            const duration = performance.now() - start;
            console.debug(`${methodName} took ${duration.toFixed(2)}ms`);
            return result;
        }
    };

    return descriptor;
}
