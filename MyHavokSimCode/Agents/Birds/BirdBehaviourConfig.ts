/**
 * Configuration constants for bird flocking behavior
 * Extracted to eliminate magic numbers and improve maintainability
 */
export const BirdBehaviourConfig = {
    // Flock boundaries
    FLOCK_RADIUS: 40,
    MIN_HEIGHT: 20,
    MAX_HEIGHT: 40,
    FLOCK_CENTER_HEIGHT: 30,
    FLOCK_CENTER_HEIGHT_VARIATION: 10,
    FLOCK_CENTER_RADIUS: 20,
    
    // Neighbor detection
    NEIGHBORHOOD_RADIUS: 15,
    SEPARATION_DISTANCE_MULTIPLIER: 0.5,
    
    // Movement
    BASE_SPEED: 0.2,
    SPEED_VARIATION: 0.1,
    VERTICAL_VARIATION_MULTIPLIER: 0.5,
    MIN_VELOCITY_FOR_ROTATION: 0.01,
    
    // Force weights
    SEPARATION_WEIGHT: 0.4,
    ALIGNMENT_WEIGHT: 0.3,
    COHESION_WEIGHT: 0.2,
    BOUNDARY_WEIGHT: 0.5,
    
    // Banking
    BANK_MULTIPLIER: 2,
    BANK_AMOUNT: 0.3,
    
    // Spawn
    SPAWN_HEIGHT_ABOVE_TERRAIN: 20,
    SPAWN_HEIGHT_VARIATION: 20,
    
    // Update frequency
    FLOCK_CENTER_UPDATE_CHANCE: 0.001,
    
    // Safety
    MIN_DISTANCE_DIVISOR: 0.1,
} as const;
