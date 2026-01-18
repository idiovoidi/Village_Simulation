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
 */

// Type definitions for decorator parameters
type ErrorConstructor = new (message: string) => SimulationError;
type LogLevel = 'debug' | 'info' | 'warn' | 'error';
type ValidatorFunction = (value: any) => boolean;

/**
 * Decorator that catches errors and wraps them in a simulation error
 * @param errorType - The error class to wrap exceptions in
 */
export function catchErrors(errorType: ErrorConstructor = SimulationError) {
  return function(target: any, methodName: string, descriptor: PropertyDescriptor): PropertyDescriptor {
    const originalMethod = descriptor.value;
    
    descriptor.value = function(...args: any[]): any {
      try {
        return originalMethod.apply(this, args);
      } catch (error) {
        if (error instanceof SimulationError) {
          // Already a simulation error, just rethrow
          throw error;
        } else {
          // Wrap in specified error type
          const errorMessage = error instanceof Error ? error.message : String(error);
          throw new errorType(`Error in ${methodName}: ${errorMessage}`);
        }
      }
    };
    
    return descriptor;
  };
}

/**
 * Decorator that logs method entry and exit
 * @param level - The log level to use
 */
export function logMethod(level: LogLevel = 'debug') {
  return function(target: any, methodName: string, descriptor: PropertyDescriptor): PropertyDescriptor {
    const originalMethod = descriptor.value;
    
    descriptor.value = function(...args: any[]): any {
      const className = this.constructor.name;
      console[level](`${className}.${methodName} called with:`, args);
      
      const result = originalMethod.apply(this, args);
      
      // Handle promises
      if (result instanceof Promise) {
        return result.then((value: any) => {
          console[level](`${className}.${methodName} completed`);
          return value;
        }).catch((error: any) => {
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
 * @param validators - Array of validator functions
 */
export function validateArgs(...validators: (ValidatorFunction | null)[]): MethodDecorator {
  return function(target: any, methodName: string | symbol, descriptor: PropertyDescriptor): PropertyDescriptor {
    const originalMethod = descriptor.value;
    
    descriptor.value = function(...args: any[]): any {
      // Apply validators
      validators.forEach((validator, index) => {
        if (index < args.length && validator) {
          const valid = validator(args[index]);
          if (!valid) {
            throw new SimulationError(`Invalid argument ${index} for ${String(methodName)}: ${args[index]}`);
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
 * @param errorType - The error class to wrap exceptions in
 */
export function handleAsyncErrors(errorType: ErrorConstructor = SimulationError) {
  return function(target: any, methodName: string, descriptor: PropertyDescriptor): PropertyDescriptor {
    const originalMethod = descriptor.value;
    
    descriptor.value = async function(...args: any[]): Promise<any> {
      try {
        return await originalMethod.apply(this, args);
      } catch (error) {
        if (error instanceof SimulationError) {
          // Already a simulation error, just rethrow
          throw error;
        } else {
          // Wrap in specified error type
          const errorMessage = error instanceof Error ? error.message : String(error);
          throw new errorType(`Error in async ${methodName}: ${errorMessage}`);
        }
      }
    };
    
    return descriptor;
  };
}

/**
 * Decorator that retries a method on failure
 * @param maxRetries - Maximum number of retries
 * @param delayMs - Delay between retries in milliseconds
 */
export function retry(maxRetries: number = 3, delayMs: number = 100): MethodDecorator {
  return function(target: any, methodName: string | symbol, descriptor: PropertyDescriptor): PropertyDescriptor {
    const originalMethod = descriptor.value;
    
    descriptor.value = async function(...args: any[]): Promise<any> {
      let lastError: any;
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
 * @param interval - Minimum time between calls in milliseconds
 */
export function throttle(interval: number): MethodDecorator {
  return function(target: any, methodName: string | symbol, descriptor: PropertyDescriptor): PropertyDescriptor {
    const originalMethod = descriptor.value;
    let lastExecutionTime = 0;

    descriptor.value = function(...args: any[]): any {
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
export function measurePerformance(target: any, methodName: string, descriptor: PropertyDescriptor): PropertyDescriptor {
  const originalMethod = descriptor.value;
  
  descriptor.value = function(...args: any[]): any {
    const start = performance.now();
    
    const result = originalMethod.apply(this, args);
    
    // Handle promises
    if (result instanceof Promise) {
      return result.then((value: any) => {
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