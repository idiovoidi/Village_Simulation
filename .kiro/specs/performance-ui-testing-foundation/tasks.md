# Implementation Plan: Performance UI Testing Foundation

## Overview

This implementation plan breaks down the performance-ui-testing-foundation feature into discrete, incremental coding tasks. Each task builds on previous work and includes testing as sub-tasks. The plan focuses on extending existing performance monitoring systems, adding new UI components for camera control and agent inspection, and establishing comprehensive testing infrastructure.

## Tasks

- [-] 1. Set up testing infrastructure and framework configuration
  - Install fast-check for property-based testing
  - Configure test scripts in package.json
  - Create test directory structure
  - Set up test utilities and mocks for Babylon.js
  - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6_

- [ ] 1.1 Write unit tests for test framework setup
  - Test that fast-check is properly installed
  - Test that test directory structure exists
  - _Requirements: 10.1, 10.2_

- [~] 2. Implement Performance Profiler
  - [ ] 2.1 Create PerformanceProfiler class extending CPUProfiler
    - Implement system timing recording
    - Implement timing aggregation (average, min, max)
    - Implement bottleneck detection with configurable thresholds
    - Integrate with Babylon.js instrumentation API
    - _Requirements: 2.1, 2.2, 2.4, 2.5_
  
  - [ ] 2.2 Write property test for system profiling completeness
    - **Property 4: System Profiling Completeness**
    - **Validates: Requirements 2.1**
  
  - [ ] 2.3 Write property test for profiling export round-trip
    - **Property 5: Profiling Export Round-Trip**
    - **Validates: Requirements 2.3**
  
  - [ ] 2.4 Write property test for profiling overhead
    - **Property 6: Profiling Disabled Has Zero Overhead**
    - **Validates: Requirements 2.6**
  
  - [ ] 2.5 Write unit tests for bottleneck detection
    - Test systems exceeding 5ms threshold are identified
    - Test severity levels are correctly assigned
    - _Requirements: 2.2_

- [~] 3. Implement Enhanced Camera Controller
  - [ ] 3.1 Create EnhancedCameraController class
    - Extend Babylon.js ArcRotateCamera
    - Implement pan, zoom, and rotate methods
    - Implement smooth interpolation using BABYLON.Animation
    - Implement camera mode switching (free, follow, orbit, overview)
    - _Requirements: 5.1, 5.2, 5.3, 5.4_
  
  - [ ] 3.2 Implement camera constraints
    - Implement zoom limits (5-200 units)
    - Implement rotation limits (10-89 degrees beta)
    - Clamp values in all camera operations
    - _Requirements: 5.6, 5.7_
  
  - [ ] 3.3 Implement follow mode
    - Implement agent following with smooth tracking
    - Implement follow mode toggle
    - Implement camera target alignment with agent position
    - _Requirements: 5.4, 5.5_
  
  - [ ] 3.4 Implement input handling
    - Set up scene.onPointerObservable for mouse events
    - Handle middle mouse drag for pan
    - Handle scroll wheel for zoom
    - Handle right mouse drag for rotate
    - Handle F key for follow mode toggle
    - _Requirements: 5.1, 5.2, 5.3, 5.4_
  
  - [ ] 3.5 Write property test for camera input responsiveness
    - **Property 15: Camera Input Responsiveness**
    - **Validates: Requirements 5.1, 5.2, 5.3**
  
  - [ ] 3.6 Write property test for camera constraints
    - **Property 17: Camera Constraints Enforcement**
    - **Validates: Requirements 5.6, 5.7**
  
  - [ ] 3.7 Write property test for follow mode consistency
    - **Property 16: Camera Follow Mode Consistency**
    - **Validates: Requirements 5.5**
  
  - [ ] 3.8 Write unit tests for camera edge cases
    - Test gimbal lock prevention at 89 degrees
    - Test smooth transitions complete correctly
    - Test camera state save/restore
    - _Requirements: 5.7_

- [~] 4. Checkpoint - Ensure camera and profiler tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [~] 5. Implement Performance HUD
  - [ ] 5.1 Create PerformanceHUD class
    - Use Babylon.GUI.AdvancedDynamicTexture for rendering
    - Create HUD layout with metric displays
    - Implement color-coded indicators (green/yellow/red)
    - Implement positioning (top-right by default)
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.7_
  
  - [ ] 5.2 Integrate with PerformanceMonitor
    - Register callback with PerformanceMonitor
    - Update HUD metrics on callback
    - Implement 500ms update frequency
    - _Requirements: 6.6_
  
  - [ ] 5.3 Implement HUD toggle
    - Handle P key press for toggle
    - Implement show/hide/toggle methods
    - _Requirements: 6.1_
  
  - [ ] 5.4 Write property test for UI toggle idempotence
    - **Property 3: UI Toggle Idempotence**
    - **Validates: Requirements 6.1**
  
  - [ ] 5.5 Write property test for HUD metrics display
    - **Property 18: HUD Metrics Display Completeness**
    - **Validates: Requirements 6.2, 6.3, 6.4, 6.5**
  
  - [ ] 5.6 Write property test for HUD update frequency
    - **Property 19: HUD Update Frequency**
    - **Validates: Requirements 6.6**
  
  - [ ] 5.7 Write unit tests for HUD color coding
    - Test FPS color thresholds (green >55, yellow 45-55, red <45)
    - Test HUD positioning doesn't obscure gameplay
    - _Requirements: 6.2, 6.7_

- [~] 6. Implement Agent Inspector
  - [ ] 6.1 Create AgentInspector class
    - Implement agent selection via scene.pick
    - Implement agent highlighting (outline or glow)
    - Create info panel using Babylon.GUI
    - Position panel on left side of screen
    - _Requirements: 7.1, 7.5, 7.6_
  
  - [ ] 6.2 Implement agent information display
    - Display agent type, position, velocity, heading
    - Display behavior state
    - Update info panel when agent moves
    - _Requirements: 7.2, 7.3_
  
  - [ ] 6.3 Implement selection and deselection
    - Handle click on agent to select
    - Handle click on terrain to deselect
    - Clear highlight on deselection
    - _Requirements: 7.1, 7.4_
  
  - [ ] 6.4 Write property test for agent selection state
    - **Property 20: Agent Selection State Consistency**
    - **Validates: Requirements 7.1, 7.4**
  
  - [ ] 6.5 Write property test for agent info display
    - **Property 21: Agent Info Display Completeness**
    - **Validates: Requirements 7.2, 7.3**
  
  - [ ] 6.6 Write unit tests for agent inspector edge cases
    - Test selecting disposed agent
    - Test selecting agent then removing it
    - Test highlight rendering
    - _Requirements: 7.1, 7.5_

- [~] 7. Enhance Settings Panel
  - [ ] 7.1 Extend OptimizationSettingsUI with new categories
    - Add Camera settings category
    - Add UI settings category
    - Add Testing settings category
    - _Requirements: 8.2, 8.3, 8.4, 8.5_
  
  - [ ] 7.2 Implement settings persistence
    - Save settings to localStorage with versioning
    - Load settings on initialization
    - Implement reset to defaults
    - _Requirements: 8.7_
  
  - [ ] 7.3 Implement immediate setting application
    - Apply settings without level reload
    - Update systems when settings change
    - _Requirements: 8.6_
  
  - [ ] 7.4 Implement ESC key toggle
    - Handle ESC key press
    - Implement toggle functionality
    - _Requirements: 8.1_
  
  - [ ] 7.5 Write property test for settings immediate application
    - **Property 22: Settings Immediate Application**
    - **Validates: Requirements 8.6**
  
  - [ ] 7.6 Write property test for settings persistence round-trip
    - **Property 23: Settings Persistence Round-Trip**
    - **Validates: Requirements 8.7**
  
  - [ ] 7.7 Write unit tests for settings validation
    - Test invalid setting values are rejected
    - Test settings version migration
    - _Requirements: 8.6, 8.7_

- [~] 8. Checkpoint - Ensure UI component tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [~] 9. Implement Minimap Renderer
  - [ ] 9.1 Create MinimapRenderer class
    - Create RenderTargetTexture for top-down view
    - Set up orthographic camera above terrain
    - Render terrain to minimap texture
    - Position minimap in bottom-right corner (150x150px)
    - _Requirements: 9.2, 9.7_
  
  - [ ] 9.2 Implement agent rendering on minimap
    - Render agents as colored dots by type
    - Update agent positions every 200ms
    - _Requirements: 9.3, 9.6_
  
  - [ ] 9.3 Implement camera frustum rendering
    - Calculate frustum corners in world space
    - Render frustum as white outline on minimap
    - _Requirements: 9.4_
  
  - [ ] 9.4 Implement click-to-navigate
    - Handle click events on minimap
    - Convert minimap coordinates to world position
    - Move camera to clicked position
    - _Requirements: 9.5_
  
  - [ ] 9.5 Implement minimap toggle
    - Handle M key press
    - Implement show/hide/toggle methods
    - _Requirements: 9.1_
  
  - [ ] 9.6 Write property test for minimap agent rendering
    - **Property 24: Minimap Agent Rendering**
    - **Validates: Requirements 9.3**
  
  - [ ] 9.7 Write property test for minimap click navigation
    - **Property 25: Minimap Click Navigation**
    - **Validates: Requirements 9.5**
  
  - [ ] 9.8 Write property test for minimap update frequency
    - **Property 26: Minimap Update Frequency**
    - **Validates: Requirements 9.6**
  
  - [ ] 9.9 Write unit tests for minimap rendering
    - Test minimap texture creation
    - Test agent color mapping by type
    - Test frustum outline rendering
    - _Requirements: 9.2, 9.3, 9.4_

- [~] 10. Implement Asset Loader Optimizer
  - [ ] 10.1 Create AssetLoaderOptimizer class
    - Wrap Babylon.js AssetManager
    - Implement LRU cache for assets
    - Implement memory limit enforcement
    - Implement automatic cleanup when limit exceeded
    - _Requirements: 3.1, 3.2_
  
  - [ ] 10.2 Implement asset instancing
    - Use Babylon.js instancing for identical meshes
    - Track instance counts per asset
    - Share geometry buffers across instances
    - _Requirements: 3.4_
  
  - [ ] 10.3 Implement asset disposal
    - Dispose meshes and materials when agent removed
    - Clear cache on level change
    - _Requirements: 3.3, 3.5_
  
  - [ ] 10.4 Implement asset preloading
    - Preload critical assets during level init
    - Track loading progress
    - _Requirements: 3.6_
  
  - [ ] 10.5 Write property test for asset caching
    - **Property 7: Asset Caching Consistency**
    - **Validates: Requirements 3.1**
  
  - [ ] 10.6 Write property test for LRU eviction
    - **Property 8: LRU Eviction Correctness**
    - **Validates: Requirements 3.2**
  
  - [ ] 10.7 Write property test for agent removal cleanup
    - **Property 9: Agent Removal Cleanup**
    - **Validates: Requirements 3.3**
  
  - [ ] 10.8 Write property test for instancing efficiency
    - **Property 10: Instancing Efficiency**
    - **Validates: Requirements 3.4**
  
  - [ ] 10.9 Write unit tests for asset loading
    - Test preloading completes before gameplay
    - Test cache clear on level change
    - Test loading statistics tracking
    - _Requirements: 3.5, 3.6_

- [~] 11. Implement Render Pipeline Optimizer
  - [ ] 11.1 Integrate with existing LODManager
    - Enable LOD when agent count > 100
    - Configure LOD distances (50, 100 units)
    - Track LOD statistics
    - _Requirements: 4.1, 4.2, 4.3_
  
  - [ ] 11.2 Implement draw call batching
    - Batch meshes with same material
    - Track batching statistics
    - _Requirements: 4.4_
  
  - [ ] 11.3 Implement shadow optimization
    - Limit shadow-casting lights to 3
    - Configure shadow quality dynamically
    - _Requirements: 4.5_
  
  - [ ] 11.4 Enable frustum culling
    - Use Babylon.js built-in frustum culling
    - Verify off-screen agents not rendered
    - _Requirements: 4.6_
  
  - [ ] 11.5 Write property test for LOD activation
    - **Property 11: LOD Activation**
    - **Validates: Requirements 4.1**
  
  - [ ] 11.6 Write property test for draw call batching
    - **Property 12: Draw Call Batching**
    - **Validates: Requirements 4.4**
  
  - [ ] 11.7 Write property test for shadow light limiting
    - **Property 13: Shadow Light Limiting**
    - **Validates: Requirements 4.5**
  
  - [ ] 11.8 Write property test for frustum culling
    - **Property 14: Frustum Culling Effectiveness**
    - **Validates: Requirements 4.6**
  
  - [ ] 11.9 Write unit tests for LOD distances
    - Test mesh complexity at 50 units
    - Test mesh complexity at 100 units
    - _Requirements: 4.2, 4.3_

- [~] 12. Checkpoint - Ensure optimization tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [~] 13. Implement performance monitoring enhancements
  - [ ] 13.1 Extend PerformanceMonitor with new metrics
    - Add draw call tracking
    - Add system timing aggregation
    - Integrate PerformanceProfiler
    - _Requirements: 1.1, 1.2, 1.3_
  
  - [ ] 13.2 Implement performance warning system
    - Detect FPS drops below 55 for >2 seconds
    - Log performance warnings
    - Trigger alerts via callback system
    - _Requirements: 1.4_
  
  - [ ] 13.3 Optimize monitoring overhead
    - Ensure monitoring updates every 100ms
    - Verify <1 FPS impact from monitoring
    - _Requirements: 1.6, 15.1_
  
  - [ ] 13.4 Write property test for monitoring accuracy
    - **Property 1: Performance Monitoring Accuracy**
    - **Validates: Requirements 1.1, 1.2, 1.3**
  
  - [ ] 13.5 Write property test for monitoring overhead
    - **Property 2: Monitoring Overhead Minimal**
    - **Validates: Requirements 1.6, 15.1**
  
  - [ ] 13.6 Write unit test for performance warnings
    - Test warning logged when FPS < 55 for 2+ seconds
    - Test no warning for brief FPS drops
    - _Requirements: 1.4_

- [ ] 14. Implement simulation invariant tests
  - [ ] 14.1 Write property test for agent position bounds
    - **Property 27: Simulation Invariant - Agent Positions Within Bounds**
    - **Validates: Requirements 12.4**
  
  - [ ] 14.2 Write property test for unique entity IDs
    - **Property 28: Simulation Invariant - Unique Entity IDs**
    - **Validates: Requirements 12.5**
  
  - [ ] 14.3 Write property test for UI non-obstruction
    - **Property 29: UI Non-Obstruction**
    - **Validates: Requirements 15.2**
  
  - [ ] 14.4 Write property test for feature toggle isolation
    - **Property 30: Feature Toggle Isolation**
    - **Validates: Requirements 15.5**

- [ ] 15. Implement integration tests
  - [ ] 15.1 Write integration test for agent spawning
    - Test spawning agents of each type
    - Verify meshes and behaviors initialized
    - _Requirements: 11.1_
  
  - [ ] 15.2 Write integration test for agent movement
    - Test pathfinding integration
    - Verify agents move along calculated paths
    - _Requirements: 11.2_
  
  - [ ] 15.3 Write integration test for physics interactions
    - Test collision detection
    - Verify physics bodies respond to forces
    - _Requirements: 11.3_
  
  - [ ] 15.4 Write integration test for level loading
    - Test each level configuration loads
    - Verify systems initialized correctly
    - _Requirements: 11.4_
  
  - [ ] 15.5 Write integration test for camera and selection
    - Test agent selection via clicking
    - Test camera follow mode
    - Test inspector displays info
    - _Requirements: 11.5_

- [ ] 16. Implement performance benchmarks
  - [ ] 16.1 Write benchmark for 50 agents FPS
    - Measure average FPS over 10 seconds
    - Assert FPS >= 60
    - _Requirements: 13.1_
  
  - [ ] 16.2 Write benchmark for 200 agents FPS
    - Measure average FPS over 10 seconds
    - Assert FPS >= 45
    - _Requirements: 13.2_
  
  - [ ] 16.3 Write benchmark for level loading time
    - Measure time to load village level
    - Assert load time < 5 seconds
    - _Requirements: 13.3_
  
  - [ ] 16.4 Write benchmark for memory usage
    - Run simulation for 60 seconds
    - Measure memory usage
    - Assert memory < 1GB
    - _Requirements: 13.4_
  
  - [ ] 16.5 Implement benchmark regression detection
    - Store baseline results
    - Compare new results against baseline
    - Report if deviation > 10%
    - _Requirements: 13.5_

- [ ] 17. Implement visual regression tests
  - [ ] 17.1 Set up Playwright for visual testing
    - Install Playwright
    - Configure screenshot comparison
    - Set 2% pixel difference threshold
    - _Requirements: 14.1, 14.3_
  
  - [ ] 17.2 Write visual tests for agent rendering
    - Test each agent type rendering
    - Capture from fixed camera positions
    - _Requirements: 14.4_
  
  - [ ] 17.3 Write visual tests for environmental systems
    - Test water, clouds, terrain, buildings
    - Compare against baselines
    - _Requirements: 14.5_
  
  - [ ] 17.4 Write visual tests for UI components
    - Test HUD, inspector, settings, minimap
    - Verify visual consistency
    - _Requirements: 14.5_

- [ ] 18. Wire all components together
  - [ ] 18.1 Integrate components into main simulation
    - Add PerformanceProfiler to PerformanceMonitor
    - Add EnhancedCameraController to scene setup
    - Add PerformanceHUD to UI layer
    - Add AgentInspector to UI layer
    - Add MinimapRenderer to UI layer
    - Extend SettingsPanel with new categories
    - _Requirements: All_
  
  - [ ] 18.2 Set up keyboard shortcuts
    - P key for HUD toggle
    - M key for minimap toggle
    - ESC key for settings toggle
    - F key for camera follow toggle
    - _Requirements: 5.4, 6.1, 8.1, 9.1_
  
  - [ ] 18.3 Configure default settings
    - Set default quality settings
    - Set default UI visibility
    - Set default camera configuration
    - _Requirements: 8.7_
  
  - [ ] 18.4 Add error handling and recovery
    - Implement performance degradation handling
    - Implement asset loading fallbacks
    - Implement UI interaction error handling
    - Implement rendering error recovery
    - _Requirements: 15.1, 15.2, 15.3, 15.5_

- [ ] 19. Final checkpoint - Run full test suite
  - Run all unit tests
  - Run all property tests
  - Run all integration tests
  - Run all benchmarks
  - Run visual regression tests
  - Generate coverage report
  - Verify >75% overall coverage
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties with 100+ iterations
- Unit tests validate specific examples and edge cases
- Integration tests verify system interactions
- Benchmarks detect performance regressions
- Visual tests catch unintended rendering changes
- All new code should follow TypeScript style guide (ts.dev/style)
- Use pnpm for all package management operations
- Maintain backward compatibility with existing systems
