# Implementation Plan: TypeScript ECS Rebuild

## Overview

This implementation plan breaks down the TypeScript ECS rebuild into discrete, manageable tasks. Each task builds on previous work and includes testing to validate correctness. The plan follows the migration phases outlined in the design document.

## Tasks

- [x] 1. Project Setup and Configuration
  - Initialize new TypeScript project with Vite
  - Configure tsconfig.json with strict mode
  - Configure ESLint with TypeScript rules
  - Set up Prettier for code formatting
  - Configure c8 for coverage reporting
  - Install dependencies: Babylon.js, Havok Physics, fast-check
  - Create basic project structure (src/, public/, tests/)
  - Set up package.json scripts for dev, build, test, lint
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7_

- [x] 2. ECS Core Implementation
  - [x] 2.1 Implement Component type system
    - Create Component interface with type discriminator
    - Create ComponentType and ComponentSignature types
    - Create component validation utilities
    - _Requirements: 1.2, 1.3, 5.10, 5.11_
  
  - [x] 2.2 Implement ComponentStorage class
    - Create efficient component storage using Maps
    - Implement add, remove, get, getAll methods
    - Implement entity-to-component index mapping
    - _Requirements: 1.5_
  
  - [x] 2.3 Implement Entity and World classes
    - Create Entity interface with ID and component mask
    - Implement World.createEntity() and World.destroyEntity()
    - Implement World.addComponent() and World.removeComponent()
    - Implement World.getComponent() with type safety
    - Implement World.query() for component signature matching
    - _Requirements: 1.1, 1.2_
  
  - [x] 2.4 Write property test for entity queries
    - **Property 1: Entity Query Correctness**
    - **Validates: Requirements 1.6**
  
  - [x] 2.5 Write property test for entity destruction
    - **Property 2: Entity Destruction Cleanup**
    - **Validates: Requirements 1.7**
  
  - [x] 2.6 Implement System base class
    - Create abstract System class with componentSignature and priority
    - Implement queryEntities() helper method
    - Implement World.update() with system execution ordering
    - _Requirements: 1.4, 1.8_
  
  - [x] 2.7 Write property test for system execution order
    - **Property 3: System Execution Order**
    - **Validates: Requirements 1.8**



- [x] 3. Core Component Definitions
  - [x] 3.1 Implement core components
    - Create PositionComponent, VelocityComponent, HealthComponent
    - Create TransformComponent with matrix caching
    - Create ActiveComponent
    - _Requirements: 5.1_
  
  - [x] 3.2 Implement AI components
    - Create AIBehaviourComponent with BehaviourState enum
    - Create SteeringComponent with forces and targets
    - Create MemoryComponent, ScheduleComponent
    - Create GoalComponent, ThreatComponent
    - _Requirements: 5.2_
  
  - [x] 3.3 Implement creature components
    - Create VillagerComponent, ZombieComponent
    - Create FishComponent, BirdComponent, DogComponent, BoatComponent
    - Create FlockComponent for group behaviors
    - _Requirements: 5.3_
  
  - [x] 3.4 Implement survival components
    - Create HungerComponent, ThirstComponent, EnergyComponent
    - Create TemperatureComponent, MoodComponent
    - _Requirements: 5.4_
  
  - [x] 3.5 Implement health components
    - Create StatusEffectComponent, InjuryComponent, DiseaseComponent
    - Create ImmunityComponent, InfectedComponent with InfectionStage enum
    - _Requirements: 5.5_
  
  - [x] 3.6 Implement reproduction components
    - Create ReproductionComponent, PregnancyComponent
    - Create AgeComponent with LifeStage enum
    - Create FertilityComponent, GeneticsComponent with trait system
    - _Requirements: 5.6_
  
  - [x] 3.7 Implement world and environment components
    - Create HouseComponent, RoadComponent, NavMeshComponent
    - Create ContainerComponent, WorkStationComponent, FieldComponent, WellComponent, BedComponent
    - Create WeatherComponent, SeasonComponent, TimeOfDayComponent
    - Create CropComponent with CropStage enum, TreeComponent, ResourceComponent
    - _Requirements: 5.7, 5.8_
  
  - [x] 3.8 Implement rendering components
    - Create ModelComponent, AnimationStateComponent, VisualComponent
    - _Requirements: 5.9_

- [x] 4. Checkpoint - Core ECS validation
  - Ensure all tests pass, ask the user if questions arise.


- [-] 5. Babylon.js Rendering Integration
  - [x] 5.1 Implement BabylonRenderer class
    - Initialize Babylon.js engine and scene
    - Set up canvas and WebGL/WebGPU context
    - Implement scene.render() loop integration
    - Handle window resize events
    - _Requirements: 9.1_
  
  - [x] 5.2 Implement CameraManager
    - Create arc rotate camera with mouse controls
    - Implement WASD keyboard movement
    - Implement zoom and pan controls
    - Handle touch input for mobile
    - _Requirements: 17.1, 17.2, 17.8_
  
  - [x] 5.3 Implement LightingManager
    - Create directional light for sun
    - Create hemispheric light for ambient
    - Implement dynamic lighting for day/night cycle
    - _Requirements: 7.6_
  
  - [x] 5.4 Implement RenderSystem
    - Create meshes for entities with Model components
    - Update mesh transforms from Transform components
    - Handle mesh visibility and culling
    - Implement mesh cleanup on entity destruction
    - _Requirements: 9.2, 9.3_
  
  - [x] 5.5 Write property test for mesh creation
    - **Property 8: Mesh Creation for Visual Entities**
    - **Validates: Requirements 9.2**
  
  - [x] 5.6 Write property test for mesh transform sync
    - **Property 9: Mesh Transform Synchronization**
    - **Validates: Requirements 9.3**
  
  - [ ] 5.7 Implement MeshPool for instancing
    - Create mesh pool for reusable meshes
    - Implement instanced rendering for similar entities
    - Handle instance creation and disposal
    - _Requirements: 10.2_
  
  - [ ] 5.8 Implement AnimationSystem
    - Load and manage animation groups
    - Play animations based on AnimationState components
    - Handle animation blending and transitions
    - _Requirements: 6.8_

- [x] 6. Havok Physics Integration
  - [x] 6.1 Implement PhysicsSystem
    - Initialize Havok Physics plugin
    - Create physics bodies for entities with physics components
    - Synchronize physics body positions to Position components
    - Handle physics body cleanup on entity destruction
    - _Requirements: 8.1, 8.2, 8.3, 8.7_
  
  - [x] 6.2 Write property test for physics body creation
    - **Property 4: Physics Body Creation**
    - **Validates: Requirements 8.2**
  
  - [x] 6.3 Write property test for physics position sync
    - **Property 5: Physics Position Synchronization**
    - **Validates: Requirements 8.3**
  
  - [x] 6.4 Write property test for physics body cleanup
    - **Property 7: Physics Body Cleanup**
    - **Validates: Requirements 8.7**
  
  - [x] 6.5 Implement collision detection
    - Set up collision groups and masks
    - Handle collision callbacks
    - Implement raycasting for line-of-sight
    - _Requirements: 8.4, 8.6_
  
  - [x] 6.6 Write property test for raycast accuracy
    - **Property 6: Raycast Accuracy**
    - **Validates: Requirements 8.6**

- [x] 7. Checkpoint - Rendering and Physics validation
  - Ensure all tests pass, ask the user if questions arise.


- [x] 8. Entity Factory and Utilities
  - [x] 8.1 Implement EntityFactory class
    - Create factory methods for each agent type (villager, zombie, fish, bird, dog, boat)
    - Create factory methods for world entities (house, field, tree, etc.)
    - Implement component attachment and validation
    - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5, 13.6, 13.7_
  
  - [x] 8.2 Implement utility classes
    - Create Vector3Helpers for vector math operations
    - Create MathHelpers for common calculations
    - Create Random class with seeded random generation
    - Create Logger with log levels
    - _Requirements: 18.5_
  
  - [x] 8.3 Implement SpatialGrid for spatial partitioning
    - Create grid-based spatial partitioning
    - Implement insert, remove, query operations
    - Optimize for frequent position updates
    - _Requirements: 10.3_
  
  - [x] 8.4 Implement EventBus for system communication
    - Create event bus with subscribe/publish pattern
    - Implement typed events for type safety
    - Handle event cleanup on entity destruction
    - _Requirements: 1.7_

- [x] 9. AI Systems - Steering and Pathfinding
  - [x] 9.1 Implement SteeringSystem
    - Calculate steering forces (seek, flee, arrive, wander)
    - Apply steering forces to velocity
    - Handle obstacle avoidance
    - _Requirements: 6.7_
  
  - [x] 9.2 Implement PathfindingManager
    - Create navigation mesh from world geometry
    - Implement A* pathfinding algorithm
    - Cache paths for performance
    - Handle dynamic obstacle updates
    - _Requirements: 6.7_
  
  - [x] 9.3 Implement PathfindingSystem
    - Request paths from PathfindingManager
    - Update steering targets from path waypoints
    - Handle path completion and re-pathing
    - _Requirements: 6.7_
  
  - [x] 9.4 Implement FlockingSystem
    - Calculate separation, alignment, cohesion forces
    - Apply flocking behavior to Fish and Bird entities
    - Handle flock membership and group coordination
    - _Requirements: 6.3, 6.4_

- [x] 10. AI Systems - Agent Behaviors
  - [x] 10.1 Implement DecisionSystem
    - Evaluate current needs and goals
    - Select appropriate behavior state
    - Handle behavior transitions
    - _Requirements: 6.1, 6.2, 6.5, 6.6_
  
  - [x] 10.2 Implement VillagerScheduleSystem
    - Load schedule templates from configuration
    - Update current activity based on time of day
    - Override schedule when needs are critical
    - Handle location-based activities
    - _Requirements: 6.1_
  
  - [x] 10.3 Implement ZombieBehaviorSystem
    - Detect nearby villagers within detection radius
    - Chase and attack target villagers
    - Handle aggression and attack cooldowns
    - _Requirements: 6.2_
  
  - [x] 10.4 Implement ThreatAssessmentSystem
    - Evaluate threats in environment
    - Update Threat components with danger levels
    - Influence behavior decisions based on threats
    - _Requirements: 6.2_

- [x] 11. Checkpoint - AI Systems validation
  - Ensure all tests pass, ask the user if questions arise.


- [x] 12. Survival Systems
  - [x] 12.1 Implement HungerSystem
    - Decrease hunger over time based on depletion rate
    - Trigger critical behavior when hunger is low
    - _Requirements: 19.1, 19.6_
  
  - [x] 12.2 Implement ThirstSystem
    - Decrease thirst over time based on depletion rate
    - Trigger critical behavior when thirst is low
    - _Requirements: 19.2, 19.7_
  
  - [x] 12.3 Implement EnergySystem
    - Decrease energy based on activity level
    - Restore energy when sleeping
    - Trigger sleep behavior when energy is depleted
    - _Requirements: 19.3, 19.8_
  
  - [x] 12.4 Write property test for survival stat depletion
    - **Property 11: Survival Stat Depletion**
    - **Validates: Requirements 19.1, 19.2, 19.3**
  
  - [x] 12.5 Write property test for critical needs behavior
    - **Property 12: Critical Needs Behavior Override**
    - **Validates: Requirements 19.6, 19.7, 19.8**
  
  - [x] 12.6 Implement TemperatureSystem
    - Calculate body temperature based on environment
    - Apply temperature effects to survival stats
    - _Requirements: 19.4_
  
  - [x] 12.7 Implement MoodSystem
    - Calculate mood from survival needs and social interactions
    - Apply mood modifiers to behavior
    - _Requirements: 19.5_

- [ ] 13. Infection and Disease Systems
  - [ ] 13.1 Implement InfectionSystem
    - Transmit infection on zombie attacks
    - Progress infection through stages over time
    - Convert fully infected villagers to zombies
    - _Requirements: 20.1, 20.2, 20.3, 20.4, 20.7_
  
  - [ ] 13.2 Write property test for infection transmission
    - **Property 13: Infection Transmission on Attack**
    - **Validates: Requirements 20.2**
  
  - [ ] 13.3 Write property test for infection progression
    - **Property 14: Infection Progression**
    - **Validates: Requirements 20.3**
  
  - [ ] 13.4 Write property test for villager conversion
    - **Property 15: Infected Villager Conversion**
    - **Validates: Requirements 20.4, 20.7**
  
  - [ ] 13.5 Implement DiseaseSystem
    - Simulate disease transmission between entities
    - Handle disease symptoms and effects
    - _Requirements: 20.5_
  
  - [ ] 13.6 Implement ImmunitySystem
    - Track immunity to specific diseases
    - Prevent re-infection for immune entities
    - _Requirements: 20.6_
  
  - [ ] 13.7 Implement HealthSystem
    - Track health values and damage
    - Handle death when health reaches zero
    - Implement health regeneration
    - _Requirements: 6.1, 6.2_


- [ ] 14. Reproduction and Genetics Systems
  - [ ] 14.1 Implement ReproductionSystem
    - Enable villagers to form reproduction pairs
    - Create Pregnancy components for paired villagers
    - Handle reproduction cooldowns
    - _Requirements: 21.1, 21.8_
  
  - [ ] 14.2 Implement PregnancySystem
    - Track pregnancy duration and progress
    - Trigger birth when pregnancy completes
    - _Requirements: 21.2_
  
  - [ ] 14.3 Implement BirthSystem
    - Spawn child villager entities on birth
    - Combine parent genetics for offspring
    - _Requirements: 21.3, 21.5, 21.6_
  
  - [ ] 14.4 Write property test for birth spawning
    - **Property 16: Birth Spawns Child Entity**
    - **Validates: Requirements 21.3**
  
  - [ ] 14.5 Write property test for genetic inheritance
    - **Property 17: Genetic Inheritance**
    - **Validates: Requirements 21.5, 21.6**
  
  - [ ] 14.6 Implement AgingSystem
    - Increment villager age over time
    - Transition life stages (child → adult → elder)
    - Increase mortality chance for elders
    - _Requirements: 21.4, 21.7_
  
  - [ ] 14.7 Write property test for elder mortality
    - **Property 18: Elder Mortality Increase**
    - **Validates: Requirements 21.7**
  
  - [ ] 14.8 Implement GeneticInheritanceSystem
    - Combine parent alleles using Mendelian genetics
    - Apply mutation chance to offspring traits
    - Determine expressed traits from alleles
    - _Requirements: 21.5, 21.6_
  
  - [ ] 14.9 Implement ChildDevelopmentSystem
    - Restrict work behaviors for children
    - Modify schedules based on age
    - Handle child-specific behaviors
    - _Requirements: 21.9_
  
  - [ ] 14.10 Write property test for child work restriction
    - **Property 19: Child Work Restriction**
    - **Validates: Requirements 21.9**

- [ ] 15. Checkpoint - Survival, Infection, and Reproduction validation
  - Ensure all tests pass, ask the user if questions arise.


- [ ] 16. Environmental Systems
  - [ ] 16.1 Implement DayNightSystem
    - Track simulation time and time of day
    - Cycle through 24-hour day
    - Update lighting based on time
    - Emit time change events
    - _Requirements: 7.1, 7.6_
  
  - [ ] 16.2 Implement SeasonSystem
    - Cycle through seasons (spring, summer, autumn, winter)
    - Update temperature and growth modifiers
    - Emit season change events
    - _Requirements: 22.1, 22.4_
  
  - [ ] 16.3 Write property test for season cycling
    - **Property 20: Season Cycling**
    - **Validates: Requirements 22.1**
  
  - [ ] 16.4 Implement WeatherSystem
    - Generate weather patterns (clear, rain, snow)
    - Apply weather effects to environment
    - Influence temperature and visibility
    - _Requirements: 7.2_
  
  - [ ] 16.5 Implement CropGrowthSystem
    - Increase crop growth progress over time
    - Advance crop stages when progress reaches 1.0
    - Apply season and weather modifiers to growth rate
    - _Requirements: 22.2, 22.6_
  
  - [ ] 16.6 Write property test for crop growth
    - **Property 21: Crop Growth Progression**
    - **Validates: Requirements 22.2**
  
  - [ ] 16.7 Implement ResourceRespawnSystem
    - Track harvested resources
    - Respawn resources after timer elapses
    - _Requirements: 22.3_
  
  - [ ] 16.8 Write property test for resource respawning
    - **Property 22: Resource Respawning**
    - **Validates: Requirements 22.3**
  
  - [ ] 16.9 Implement HarvestSystem
    - Allow villagers to harvest mature crops
    - Transfer harvest yield to villager
    - Reset crop to planted stage
    - _Requirements: 22.5_
  
  - [ ] 16.10 Write property test for crop harvesting
    - **Property 23: Mature Crop Harvesting**
    - **Validates: Requirements 22.5**

- [ ] 17. World Generation Systems
  - [ ] 17.1 Implement MapGenerator
    - Generate terrain using bowl/heightmap algorithm
    - Create water bodies and rivers
    - Place natural resources (trees, rocks, plants)
    - _Requirements: 7.3, 7.4_
  
  - [ ] 17.2 Implement HouseSystem
    - Generate house placements in village area
    - Create house entities with beds and containers
    - Assign houses to villagers
    - _Requirements: 7.4_
  
  - [ ] 17.3 Implement RoadSystem
    - Generate road network connecting houses
    - Create road entities with navigation data
    - Update navigation mesh with roads
    - _Requirements: 7.4_
  
  - [ ] 17.4 Implement WaterSystem
    - Simulate water wave physics
    - Render water surface with shaders
    - Handle boat navigation on water
    - _Requirements: 7.3_
  
  - [ ] 17.5 Implement CloudSystem
    - Generate cloud entities
    - Animate cloud movement
    - Render clouds with billboards
    - _Requirements: 7.3_


- [ ] 18. Performance Optimization Systems
  - [ ] 18.1 Implement LODManager
    - Calculate distance from camera to entities
    - Assign LOD levels based on distance
    - Update mesh detail based on LOD level
    - _Requirements: 10.1_
  
  - [ ] 18.2 Implement CullingSystem
    - Perform frustum culling for off-screen entities
    - Disable rendering for culled entities
    - _Requirements: 10.7_
  
  - [ ] 18.3 Write property test for frustum culling
    - **Property 10: Frustum Culling Correctness**
    - **Validates: Requirements 9.7**
  
  - [ ] 18.4 Implement HardwareDetector
    - Detect GPU capabilities
    - Detect CPU performance
    - Recommend quality settings
    - _Requirements: 10.5_
  
  - [ ] 18.5 Implement AdaptiveQualityManager
    - Monitor frame rate
    - Adjust quality settings when FPS drops
    - Reduce entity count or LOD levels
    - _Requirements: 10.6_
  
  - [ ] 18.6 Implement Profiler
    - Track system execution times
    - Track entity counts
    - Display performance metrics
    - _Requirements: 10.7, 18.8_

- [ ] 19. Level System and Configuration
  - [ ] 19.1 Implement LevelConfig interface
    - Define level configuration structure
    - Create level templates (Village, Coastal, Wilderness)
    - Support spawn configurations
    - Support system configurations
    - _Requirements: 11.1, 11.2, 11.6_
  
  - [ ] 19.2 Implement LevelLoader
    - Load level configuration from files
    - Validate level configuration
    - Spawn entities based on spawn configs
    - Initialize systems based on system configs
    - _Requirements: 11.2, 11.3, 11.6_
  
  - [ ] 19.3 Implement level cleanup
    - Destroy all entities when switching levels
    - Clean up system state
    - Reset world state
    - _Requirements: 11.5_
  
  - [ ] 19.4 Implement SaveStateManager
    - Serialize world state to JSON
    - Deserialize world state from JSON
    - Save/load entity components
    - Save/load system state
    - _Requirements: 11.4, 15.7_

- [ ] 20. Checkpoint - Environmental and Level Systems validation
  - Ensure all tests pass, ask the user if questions arise.


- [ ] 21. Input and UI Systems
  - [ ] 21.1 Implement InputSystem
    - Handle mouse input for camera controls
    - Handle keyboard input for camera movement
    - Handle entity selection by clicking
    - Emit input events to EventBus
    - _Requirements: 17.1, 17.2, 17.3_
  
  - [ ] 21.2 Implement UI overlay
    - Display world clock showing time of day
    - Display selected entity information
    - Display performance metrics (FPS, entity count)
    - _Requirements: 7.8, 17.4_
  
  - [ ] 21.3 Implement pause/resume controls
    - Pause simulation on spacebar
    - Resume simulation on spacebar
    - Display pause indicator
    - _Requirements: 17.5_
  
  - [ ] 21.4 Implement time scale controls
    - Adjust simulation speed (0.5x, 1x, 2x, 4x)
    - Display current time scale
    - _Requirements: 17.6_
  
  - [ ] 21.5 Implement debug overlay
    - Toggle debug mode with keyboard shortcut
    - Display entity component data
    - Display navigation mesh visualization
    - Display physics collider visualization
    - _Requirements: 18.1, 18.2, 18.3, 18.6_

- [ ] 22. Asset Management
  - [ ] 22.1 Implement ResourceManager
    - Load 3D models asynchronously
    - Load textures with progressive loading
    - Cache loaded assets
    - Provide fallback assets for load failures
    - _Requirements: 16.1, 16.2, 16.3, 16.4_
  
  - [ ] 22.2 Implement loading screen
    - Display loading progress
    - Show asset loading status
    - Preload critical assets before simulation starts
    - _Requirements: 16.5, 16.6_
  
  - [ ] 22.3 Implement asset cleanup
    - Unload unused assets
    - Free memory for level-specific assets
    - _Requirements: 16.8_

- [ ] 23. Game Manager and Main Loop
  - [ ] 23.1 Implement GameManager
    - Initialize World and all systems
    - Implement main game loop
    - Coordinate system updates
    - Handle level loading and switching
    - _Requirements: 1.1_
  
  - [ ] 23.2 Implement main.ts entry point
    - Initialize Vite application
    - Create canvas element
    - Initialize GameManager
    - Start simulation
    - _Requirements: 4.7_
  
  - [ ] 23.3 Create index.html
    - Set up HTML structure
    - Load Babylon.js and Havok from CDN
    - Include main.ts script
    - _Requirements: 4.4_

- [ ] 24. Configuration Files
  - [ ] 24.1 Create creature configuration files
    - Define villager, zombie, fish, bird, dog, boat parameters
    - Define behavior parameters
    - Define spawn parameters
    - _Requirements: 15.1, 15.2_
  
  - [ ] 24.2 Create world configuration files
    - Define terrain generation parameters
    - Define environmental parameters
    - Define season and weather parameters
    - _Requirements: 15.3_
  
  - [ ] 24.3 Create schedule templates
    - Define daily schedules for villager professions
    - Define activity timings and locations
    - _Requirements: 15.1_
  
  - [ ] 24.4 Create genetics configuration
    - Define genetic traits and alleles
    - Define dominance rules
    - Define mutation rates
    - _Requirements: 15.1_

- [ ] 25. Final Integration and Testing
  - [ ] 25.1 Integration testing
    - Test complete simulation loop
    - Test level loading and switching
    - Test save/load functionality
    - _Requirements: 12.6_
  
  - [ ] 25.2 Run all property-based tests
    - Execute full property test suite
    - Verify all properties pass with 100 iterations
    - _Requirements: 12.3, 12.4, 12.5_
  
  - [ ] 25.3 Generate coverage report
    - Run tests with c8 coverage
    - Verify 80%+ overall coverage
    - Identify untested code paths
    - _Requirements: 12.4_
  
  - [ ] 25.4 Performance validation
    - Test with maximum entity counts
    - Verify frame rate meets targets
    - Validate adaptive quality system
    - _Requirements: 10.6, 10.7, 10.8_
  
  - [ ] 25.5 Behavior parity validation
    - Compare agent behaviors with original implementation
    - Validate visual output matches original
    - Document any intentional differences
    - _Requirements: 14.6_

- [ ] 26. Final checkpoint - Complete system validation
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- All tasks are required for comprehensive implementation with full test coverage
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties with 100+ iterations
- Unit tests validate specific examples and edge cases
- The implementation follows the migration phases from the design document
- Testing is integrated throughout development, not deferred to the end
