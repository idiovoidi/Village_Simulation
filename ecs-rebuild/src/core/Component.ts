/**
 * Component Type System
 * 
 * Defines the base interface and types for all ECS components.
 * Components are pure data containers with type discriminators for type safety.
 */

/**
 * Base interface for all components.
 * All components must have a unique type identifier.
 */
export interface Component {
  readonly type: ComponentType;
}

/**
 * Unique identifier for component types.
 * Used for component discrimination and queries.
 */
export type ComponentType = string;

/**
 * Set of component types used for entity queries.
 * Represents the signature of components an entity must have.
 */
export type ComponentSignature = Set<ComponentType>;

/**
 * Type guard to check if an object is a valid component.
 */
export function isComponent(obj: unknown): obj is Component {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'type' in obj &&
    typeof (obj as Component).type === 'string'
  );
}

/**
 * Validation result for component validation.
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Validates that a component has all required fields and correct types.
 * 
 * @param component - The component to validate
 * @returns ValidationResult with validity status and any error messages
 */
export function validateComponent(component: unknown): ValidationResult {
  const errors: string[] = [];

  // Check if component is an object
  if (typeof component !== 'object' || component === null) {
    errors.push('Component must be an object');
    return { valid: false, errors };
  }

  // Check if component has type field
  if (!('type' in component)) {
    errors.push('Component must have a "type" field');
    return { valid: false, errors };
  }

  // Check if type is a string
  if (typeof (component as Component).type !== 'string') {
    errors.push('Component type must be a string');
    return { valid: false, errors };
  }

  // Check if type is not empty
  if ((component as Component).type.trim() === '') {
    errors.push('Component type cannot be empty');
    return { valid: false, errors };
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Creates a component signature from an array of component types.
 * 
 * @param types - Array of component type strings
 * @returns ComponentSignature set
 */
export function createSignature(...types: ComponentType[]): ComponentSignature {
  return new Set(types);
}

/**
 * Checks if a component signature matches another signature.
 * Returns true if the entity signature contains all components in the query signature.
 * 
 * @param entitySignature - The signature of components an entity has
 * @param querySignature - The signature of components to match
 * @returns true if entity has all queried components
 */
export function signatureMatches(
  entitySignature: ComponentSignature,
  querySignature: ComponentSignature
): boolean {
  for (const type of querySignature) {
    if (!entitySignature.has(type)) {
      return false;
    }
  }
  return true;
}
