/**
 * Error handling system with decorators and a hierarchy of custom exceptions
 */

// Base simulation error
export class SimulationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SimulationError';
  }
}

// System category errors
export class SystemError extends SimulationError {
  constructor(message: string) {
    super(message);
    this.name = 'SystemError';
  }
}

export class FatalSystemError extends SystemError {
  constructor(message: string) {
    super(message);
    this.name = 'FatalSystemError';
  }
}

export class DependencyError extends SystemError {
  constructor(message: string) {
    super(message);
    this.name = 'DependencyError';
  }
}

export class ServiceError extends SystemError {
  constructor(message: string) {
    super(message);
    this.name = 'ServiceError';
  }
}

// Entity category errors
export class EntityError extends SimulationError {
  constructor(message: string) {
    super(message);
    this.name = 'EntityError';
  }
}

export class ComponentError extends EntityError {
  constructor(message: string) {
    super(message);
    this.name = 'ComponentError';
  }
}

// Physics category errors
export class PhysicsError extends SimulationError {
  constructor(message: string) {
    super(message);
    this.name = 'PhysicsError';
  }
}

export class CollisionError extends PhysicsError {
  constructor(message: string) {
    super(message);
    this.name = 'CollisionError';
  }
}

// AI category errors
export class AIError extends SimulationError {
  constructor(message: string) {
    super(message);
    this.name = 'AIError';
  }
}

export class PathfindingError extends AIError {
  constructor(message: string) {
    super(message);
    this.name = 'PathfindingError';
  }
}

export class BehaviorError extends AIError {
  constructor(message: string) {
    super(message);
    this.name = 'BehaviorError';
  }
}

// Environment category errors
export class EnvironmentError extends SimulationError {
  constructor(message: string) {
    super(message);
    this.name = 'EnvironmentError';
  }
}

export class WeatherError extends EnvironmentError {
  constructor(message: string) {
    super(message);
    this.name = 'WeatherError';
  }
}

export class TerrainError extends EnvironmentError {
  constructor(message: string) {
    super(message);
    this.name = 'TerrainError';
  }
}

export class WaterError extends EnvironmentError {
  constructor(message: string) {
    super(message);
    this.name = 'WaterError';
  }
}

/**
 * Error handling decorators

 * Decorator that catches errors and wraps them in a simulation error
 */
export function catchErrors<T extends object>(
  _target: T,
  _methodName: string,
  descriptor: PropertyDescriptor
): PropertyDescriptor {
  const originalMethod = descriptor.value as (...args: unknown[]) => unknown;

  descriptor.value = function (...args: unknown[]) {
    try {
      return originalMethod.apply(this, args);
    } catch (error) {
      if (error instanceof SimulationError) {
        throw error;
      }
      const methodName = _methodName;
      throw new SimulationError(`Error in ${methodName}: ${(error as Error).message}`);
    }
  };

  return descriptor;
}

/**
 * Decorator that logs method entry and exit
 */
export function logMethod(
  _target: object,
  _methodName: string,
  descriptor: PropertyDescriptor
): PropertyDescriptor {
  const originalMethod = descriptor.value as (...args: unknown[]) => unknown;
  const level: 'debug' | 'log' | 'warn' | 'error' = 'debug';

  descriptor.value = function (...args: unknown[]) {
    const className = this.constructor.name;
    console[level](`${className}.${_methodName} called with:`, args);

    const result = originalMethod.apply(this, args);

    // Handle promises
    if (result instanceof Promise) {
      return result.then((value: unknown) => {
        console[level](`${className}.${_methodName} completed`);
        return value;
      }).catch((error: Error) => {
        console.error(`${className}.${_methodName} failed:`, error);
        throw error;
      });
    }

    console[level](`${className}.${_methodName} completed`);
    return result;
  };

  return descriptor;
}

/**
 * Decorator that validates method arguments
 */
export function validateArgs(..._validators: ((arg: unknown) => boolean)[]) {
  return function (
    _target: object,
    _methodName: string,
    descriptor: PropertyDescriptor
  ): PropertyDescriptor {
    const originalMethod = descriptor.value as (...args: unknown[]) => unknown;

    descriptor.value = function (...args: unknown[]) {
      // Apply validators
      _validators.forEach((validator, index) => {
        if (index < args.length && validator) {
          const valid = validator(args[index]);
          if (!valid) {
            throw new SimulationError(
              `Invalid argument ${index} for ${_methodName}: ${args[index]}`
            );
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
 */
export function handleAsyncErrors<T extends object>(
  _target: T,
  _methodName: string,
  descriptor: PropertyDescriptor
): PropertyDescriptor {
  const originalMethod = descriptor.value as (...args: unknown[]) => Promise<unknown>;

  descriptor.value = async function (...args: unknown[]) {
    try {
      return await originalMethod.apply(this, args);
    } catch (error) {
      if (error instanceof SimulationError) {
        throw error;
      }
      const methodName = _methodName;
      throw new SimulationError(`Error in async ${methodName}: ${(error as Error).message}`);
    }
  };

  return descriptor;
}

/**
 * Decorator that retries a method on failure
 */
export function retry(maxRetries = 3, delayMs = 100) {
  return function (
    _target: object,
    _methodName: string,
    descriptor: PropertyDescriptor
  ): PropertyDescriptor {
    const originalMethod = descriptor.value as (...args: unknown[]) => Promise<unknown>;

    descriptor.value = async function (...args: unknown[]) {
      let lastError: Error | undefined;
      for (let i = 0; i < maxRetries; i++) {
        try {
          return await originalMethod.apply(this, args);
        } catch (error) {
          lastError = error as Error;
          if (i < maxRetries - 1) {
            await new Promise((resolve) => setTimeout(resolve, delayMs));
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
 */
export function throttle(interval: number) {
  return function (
    _target: object,
    _methodName: string,
    descriptor: PropertyDescriptor
  ): PropertyDescriptor {
    const originalMethod = descriptor.value as (...args: unknown[]) => unknown;
    let lastExecutionTime = 0;

    descriptor.value = function (...args: unknown[]) {
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
 */
export function measurePerformance(
  _target: object,
  _methodName: string,
  descriptor: PropertyDescriptor
): PropertyDescriptor {
  const originalMethod = descriptor.value as (...args: unknown[]) => unknown;

  descriptor.value = function (...args: unknown[]) {
    const start = performance.now();

    const result = originalMethod.apply(this, args);

    // Handle promises
    if (result instanceof Promise) {
      return result.then((value: unknown) => {
        const duration = performance.now() - start;
        console.debug(`${_methodName} took ${duration.toFixed(2)}ms`);
        return value;
      });
    }

    const duration = performance.now() - start;
    console.debug(`${_methodName} took ${duration.toFixed(2)}ms`);
    return result;
  };

  return descriptor;
}