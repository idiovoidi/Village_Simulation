# Design Document: Performance UI Testing Foundation

## Overview

This design document outlines the architecture for enhancing the village simulation with performance optimization features, UI/UX improvements, and comprehensive testing infrastructure. The system builds upon existing performance monitoring components (PerformanceMonitor, FrameRateTracker, MemoryMonitor, PerformanceDashboard) while adding new capabilities for camera control, agent inspection, settings management, minimap visualization, and property-based testing.

The design follows a modular architecture that integrates seamlessly with the existing Babylon.js-based simulation, maintaining the 60 FPS target on mid-range hardware while providing developers and users with powerful tools for monitoring, optimization, and testing.

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Village Simulation                        │
│                    (Babylon.js + Havok)                      │
└────────────┬────────────────────────────────┬───────────────┘
             │                                │
    ┌────────▼────────┐              ┌───────▼────────┐
    │  Performance    │              │   UI/UX Layer  │
    │  Monitoring     │              │                │
    │  Layer          │              │                │
    └────────┬────────┘              └───────┬────────┘
             │                                │
    ┌────────▼────────────────────────────────▼────────┐
    │         Enhanced Performance Monitor             │
    │  - Frame Rate Tracking (existing)                │
    │  - Memory Monitoring (existing)                  │
    │  - CPU Profiling (existing)                      │
    │  - Performance Dashboard (existing)              │
    │  + Performance Profiler (new)                    │
    │  + Render Pipeline Optimizer (new)               │
    └──────────────────────────────────────────────────┘
             │
    ┌────────▼────────────────────────────────────────┐
    │         UI Component Layer                      │
    │  - WorldClock (existing)                        │
    │  - OptimizationSettingsUI (existing)            │
    │  + EnhancedCameraController (new)               │
    │  + PerformanceHUD (new)                         │
    │  + AgentInspector (new)                         │
    │  + SettingsPanel (enhanced)                     │
    │  + MinimapRenderer (new)                        │
    └──────────────────────────────────────────────────┘
             │
    ┌────────▼────────────────────────────────────────┐
    │         Testing Infrastructure                   │
    │  + Unit Test Framework (new)                    │
    │  + Integration Test Suite (new)                 │
    │  + Property-Based Testing (new)                 │
    │  + Performance Benchmarks (new)                 │
    │  + Visual Regression Tests (new)                │
    └──────────────────────────────────────────────────┘
```

### Component Interaction Flow

```
User Input → Camera Controller → Scene Update
                ↓
          Agent Inspector → Agent Selection
                ↓
          Performance HUD ← Performance Monitor
                ↓
          Settings Panel → Quality Adjustments
                ↓
          Minimap Renderer ← Scene State
```

## Components and Interfaces

### 1. Performance Profiler

**Purpose**: Extends existing CPU profiling with detailed system-level performance analysis.

**Interface**:
```typescript
interface PerformanceProfiler {
  // Profiling control
  startProfiling(): void;
  stopProfiling(): void;
  isProfilingActive(): boolean;
  
  // System timing
  recordSystemUpdate(systemName: string, duration: number): void;
  getSystemTimings(): Map<string, SystemTiming>;
  
  // Bottleneck detection
  identifyBottlenecks(threshold: number): Bottleneck[];
  
  // Export
  exportProfilingData(format: 'json' | 'csv'): string;
  
  // Metrics
  getDrawCallCount(): number;
  getShaderCompilationTime(): number;
}

interface SystemTiming {
  systemName: string;
  averageDuration: number;
  maxDuration: number;
  minDuration: number;
  callCount: number;
  percentOfFrame: number;
}

interface Bottleneck {
  systemName: string;
  averageDuration: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  recommendation: string;
}
```

**Implementation Strategy**:
- Wraps existing CPUProfiler from MyHavokSimCode/Performance/
- Adds system-level timing aggregation
- Integrates with Babylon.js instrumentation API
- Provides threshold-based bottleneck detection

### 2. Enhanced Camera Controller

**Purpose**: Provides intuitive camera controls with multiple view modes.

**Interface**:
```typescript
interface EnhancedCameraController {
  // Camera modes
  setMode(mode: CameraMode): void;
  getMode(): CameraMode;
  
  // Pan controls
  pan(deltaX: number, deltaY: number): void;
  
  // Zoom controls
  zoom(delta: number): void;
  setZoomLimits(min: number, max: number): void;
  
  // Rotation controls
  rotate(deltaAlpha: number, deltaBeta: number): void;
  setRotationLimits(minBeta: number, maxBeta: number): void;
  
  // Follow mode
  followAgent(agentId: string): void;
  unfollowAgent(): void;
  isFollowingAgent(): boolean;
  
  // Smooth transitions
  transitionToPosition(target: Vector3, duration: number): Promise<void>;
  
  // State
  getCameraState(): CameraState;
  restoreCameraState(state: CameraState): void;
}

type CameraMode = 'free' | 'follow' | 'orbit' | 'overview';

interface CameraState {
  position: Vector3;
  target: Vector3;
  alpha: number;
  beta: number;
  radius: number;
  mode: CameraMode;
  followingAgentId: string | null;
}
```

**Implementation Strategy**:
- Extends Babylon.js ArcRotateCamera
- Uses smooth interpolation for all movements (BABYLON.Animation)
- Implements input handling via scene.onPointerObservable
- Stores camera state for restoration

### 3. Performance HUD

**Purpose**: Real-time performance metrics overlay with color-coded indicators.

**Interface**:
```typescript
interface PerformanceHUD {
  // Visibility
  show(): void;
  hide(): void;
  toggle(): void;
  isVisible(): boolean;
  
  // Metrics display
  updateMetrics(metrics: PerformanceMetrics): void;
  setUpdateFrequency(hz: number): void;
  
  // Configuration
  setPosition(position: HUDPosition): void;
  setMetricsToDisplay(metrics: MetricType[]): void;
  
  // Color thresholds
  setThresholds(metric: MetricType, thresholds: Thresholds): void;
}

interface PerformanceMetrics {
  fps: number;
  memoryUsageMB: number;
  agentCount: AgentCountByType;
  drawCalls: number;
  timestamp: number;
}

interface AgentCountByType {
  villagers: number;
  zombies: number;
  fish: number;
  birds: number;
  dogs: number;
  boats: number;
  total: number;
}

type HUDPosition = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
type MetricType = 'fps' | 'memory' | 'agents' | 'drawCalls';

interface Thresholds {
  good: number;
  warning: number;
  critical: number;
}
```

**Implementation Strategy**:
- Uses Babylon.GUI.AdvancedDynamicTexture for rendering
- Updates via PerformanceMonitor callback registration
- Color coding: green (good), yellow (warning), red (critical)
- Minimal performance overhead (<0.5ms per update)

### 4. Agent Inspector

**Purpose**: Select and inspect individual agents with detailed state information.

**Interface**:
```typescript
interface AgentInspector {
  // Selection
  selectAgent(agentId: string): void;
  deselectAgent(): void;
  getSelectedAgent(): string | null;
  
  // Picking
  enablePicking(): void;
  disablePicking(): void;
  
  // Display
  show(): void;
  hide(): void;
  toggle(): void;
  
  // Agent information
  getAgentInfo(agentId: string): AgentInfo | null;
  
  // Highlighting
  setHighlightColor(color: Color3): void;
  setHighlightIntensity(intensity: number): void;
}

interface AgentInfo {
  id: string;
  type: AgentType;
  position: Vector3;
  velocity: Vector3;
  heading: number;
  behaviorState: string;
  health?: number;
  target?: Vector3;
  customProperties: Record<string, any>;
}

type AgentType = 'villager' | 'zombie' | 'fish' | 'bird' | 'dog' | 'boat';
```

**Implementation Strategy**:
- Uses Babylon.js picking system (scene.pick)
- Highlights selected agent with outline renderer or glow layer
- Displays info panel using Babylon.GUI
- Integrates with existing agent behavior systems

### 5. Enhanced Settings Panel

**Purpose**: Comprehensive settings UI for quality, performance, and feature toggles.

**Interface**:
```typescript
interface EnhancedSettingsPanel {
  // Visibility
  show(): void;
  hide(): void;
  toggle(): void;
  
  // Settings categories
  addCategory(category: SettingsCategory): void;
  removeCategory(categoryId: string): void;
  
  // Settings persistence
  saveSettings(): void;
  loadSettings(): void;
  resetToDefaults(): void;
  
  // Change notifications
  onSettingChanged(callback: SettingChangeCallback): void;
}

interface SettingsCategory {
  id: string;
  title: string;
  settings: Setting[];
}

interface Setting {
  id: string;
  label: string;
  type: 'slider' | 'toggle' | 'dropdown' | 'radio';
  value: any;
  options?: any[];
  min?: number;
  max?: number;
  step?: number;
  onChange: (value: any) => void;
}

type SettingChangeCallback = (settingId: string, newValue: any) => void;
```

**Implementation Strategy**:
- Extends existing OptimizationSettingsUI
- Adds new categories: Camera, UI, Testing
- Persists to localStorage with versioning
- Applies changes immediately without reload

### 6. Minimap Renderer

**Purpose**: Top-down overview of terrain and agent positions.

**Interface**:
```typescript
interface MinimapRenderer {
  // Visibility
  show(): void;
  hide(): void;
  toggle(): void;
  
  // Configuration
  setSize(width: number, height: number): void;
  setPosition(position: HUDPosition): void;
  setUpdateFrequency(hz: number): void;
  
  // Display options
  setTerrainVisible(visible: boolean): void;
  setAgentsVisible(visible: boolean): void;
  setFrustumVisible(visible: boolean): void;
  
  // Interaction
  onMinimapClick(callback: (worldPosition: Vector3) => void): void;
  
  // Rendering
  updateMinimap(): void;
  getMinimapTexture(): RenderTargetTexture;
}
```

**Implementation Strategy**:
- Uses Babylon.js RenderTargetTexture for top-down view
- Orthographic camera positioned above terrain
- Agent positions rendered as colored dots
- Camera frustum rendered as white outline
- Click-to-navigate functionality

### 7. Asset Loader Optimizer

**Purpose**: Intelligent asset loading and caching with memory management.

**Interface**:
```typescript
interface AssetLoaderOptimizer {
  // Loading
  preloadAssets(assetIds: string[]): Promise<void>;
  loadAsset(assetId: string): Promise<Asset>;
  unloadAsset(assetId: string): void;
  
  // Caching
  getCacheSize(): number;
  getCacheUtilization(): number;
  clearCache(): void;
  
  // Memory management
  setMemoryLimit(limitMB: number): void;
  enableAutomaticCleanup(enabled: boolean): void;
  
  // Instancing
  createInstance(assetId: string): Mesh;
  getInstanceCount(assetId: string): number;
  
  // Statistics
  getLoadingStats(): LoadingStats;
}

interface LoadingStats {
  totalAssetsLoaded: number;
  cacheHits: number;
  cacheMisses: number;
  memoryUsedMB: number;
  instanceCount: number;
}
```

**Implementation Strategy**:
- Wraps Babylon.js AssetManager
- Implements LRU cache for asset disposal
- Uses Babylon.js instancing for identical meshes
- Integrates with existing MemoryManager

### 8. Render Pipeline Optimizer

**Purpose**: Optimizes rendering pipeline for maximum performance.

**Interface**:
```typescript
interface RenderPipelineOptimizer {
  // LOD management
  enableLOD(enabled: boolean): void;
  setLODDistances(distances: number[]): void;
  getLODStatistics(): LODStats;
  
  // Culling
  enableFrustumCulling(enabled: boolean): void;
  enableOcclusionCulling(enabled: boolean): void;
  
  // Draw call optimization
  enableBatching(enabled: boolean): void;
  getBatchingStatistics(): BatchingStats;
  
  // Shadow optimization
  setShadowQuality(quality: ShadowQuality): void;
  limitShadowCasters(maxCount: number): void;
  
  // Performance
  getOptimizationImpact(): OptimizationImpact;
}

interface LODStats {
  totalMeshes: number;
  lod0Count: number;
  lod1Count: number;
  lod2Count: number;
  lod3Count: number;
  culledCount: number;
}

interface BatchingStats {
  drawCallsBefore: number;
  drawCallsAfter: number;
  drawCallsSaved: number;
  batchedMeshCount: number;
}

type ShadowQuality = 'off' | 'low' | 'medium' | 'high';

interface OptimizationImpact {
  fpsGain: number;
  memoryReduction: number;
  drawCallReduction: number;
}
```

**Implementation Strategy**:
- Integrates with existing LODManager
- Uses Babylon.js built-in frustum culling
- Implements mesh batching for static geometry
- Configures shadow generators dynamically

## Data Models

### Performance Metrics Model

```typescript
interface PerformanceSnapshot {
  timestamp: number;
  frameRate: FrameRateMetrics;
  memory: MemoryMetrics;
  rendering: RenderingMetrics;
  agents: AgentMetrics;
  systems: SystemMetrics[];
}

interface FrameRateMetrics {
  current: number;
  average: number;
  min: number;
  max: number;
  frameTime: number;
  isStable: boolean;
}

interface MemoryMetrics {
  heapUsedMB: number;
  heapTotalMB: number;
  usagePercent: number;
  trend: 'increasing' | 'decreasing' | 'stable';
  gpuMemoryMB?: number;
}

interface RenderingMetrics {
  drawCalls: number;
  triangles: number;
  meshCount: number;
  materialCount: number;
  textureCount: number;
  activeLights: number;
  shadowMaps: number;
}

interface AgentMetrics {
  totalCount: number;
  byType: AgentCountByType;
  activeCount: number;
  updateTimeMs: number;
}

interface SystemMetrics {
  name: string;
  updateTimeMs: number;
  percentOfFrame: number;
  callsPerFrame: number;
}
```

### Camera State Model

```typescript
interface CameraConfiguration {
  mode: CameraMode;
  position: Vector3;
  target: Vector3;
  rotation: {
    alpha: number;
    beta: number;
  };
  zoom: {
    current: number;
    min: number;
    max: number;
  };
  limits: {
    minBeta: number;
    maxBeta: number;
  };
  smoothing: {
    enabled: boolean;
    factor: number;
  };
  followTarget: {
    agentId: string | null;
    offset: Vector3;
    smoothFollow: boolean;
  };
}
```

### Settings Model

```typescript
interface ApplicationSettings {
  version: string;
  performance: PerformanceSettings;
  ui: UISettings;
  camera: CameraSettings;
  testing: TestingSettings;
}

interface PerformanceSettings {
  targetFPS: number;
  shadowQuality: ShadowQuality;
  lodEnabled: boolean;
  lodDistances: number[];
  particlesEnabled: boolean;
  maxParticles: number;
  batchingEnabled: boolean;
  frustumCullingEnabled: boolean;
}

interface UISettings {
  performanceHUDVisible: boolean;
  performanceHUDPosition: HUDPosition;
  minimapVisible: boolean;
  minimapSize: { width: number; height: number };
  agentInspectorEnabled: boolean;
  worldClockVisible: boolean;
}

interface CameraSettings {
  defaultMode: CameraMode;
  panSpeed: number;
  zoomSpeed: number;
  rotationSpeed: number;
  smoothingEnabled: boolean;
  invertY: boolean;
}

interface TestingSettings {
  enablePropertyTests: boolean;
  propertyTestIterations: number;
  enableVisualRegression: boolean;
  benchmarkingEnabled: boolean;
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

Before defining the correctness properties, I need to analyze the acceptance criteria from the requirements document to determine which are testable as properties, examples, or edge cases.



### Property 1: Performance Monitoring Accuracy
*For any* simulation state, when performance monitoring is active, all tracked metrics (frame rate, memory usage, entity count) should be accurate within their specified precision and match the actual system state.
**Validates: Requirements 1.1, 1.2, 1.3**

### Property 2: Monitoring Overhead Minimal
*For any* simulation configuration, enabling performance monitoring should not reduce frame rate by more than 1 FPS compared to monitoring disabled.
**Validates: Requirements 1.6, 15.1**

### Property 3: UI Toggle Idempotence
*For any* UI component with toggle functionality (HUD, Settings Panel, Minimap), toggling twice should return the component to its original visibility state.
**Validates: Requirements 6.1, 8.1, 9.1**

### Property 4: System Profiling Completeness
*For any* registered system in the simulation, when profiling is enabled, that system should have timing data recorded and available in the profiling results.
**Validates: Requirements 2.1**

### Property 5: Profiling Export Round-Trip
*For any* collected profiling data, exporting to JSON and parsing back should produce a structurally equivalent dataset with all required fields present.
**Validates: Requirements 2.3**

### Property 6: Profiling Disabled Has Zero Overhead
*For any* simulation state, when profiling is disabled, frame rate should be identical to when profiling code is not present in the system.
**Validates: Requirements 2.6**

### Property 7: Asset Caching Consistency
*For any* asset, loading it multiple times should result in cache hits after the first load, and the returned asset should be identical.
**Validates: Requirements 3.1**

### Property 8: LRU Eviction Correctness
*For any* sequence of asset accesses, when memory limit is exceeded, the least-recently-used assets should be evicted first.
**Validates: Requirements 3.2**

### Property 9: Agent Removal Cleanup
*For any* agent, removing it from the simulation should reduce the mesh count and material count by the amounts associated with that agent.
**Validates: Requirements 3.3**

### Property 10: Instancing Efficiency
*For any* set of agents using identical models, the geometry should be shared via instancing, resulting in instance count equal to agent count but only one geometry buffer.
**Validates: Requirements 3.4**

### Property 11: LOD Activation
*For any* simulation with more than 100 agents, the LOD system should be active and meshes should use lower detail levels based on distance from camera.
**Validates: Requirements 4.1**

### Property 12: Draw Call Batching
*For any* set of N agents using the same material, the number of draw calls should be significantly less than N (ideally 1 batched call).
**Validates: Requirements 4.4**

### Property 13: Shadow Light Limiting
*For any* scene configuration, even with many lights present, the number of shadow-casting lights should never exceed 3.
**Validates: Requirements 4.5**

### Property 14: Frustum Culling Effectiveness
*For any* agent positioned outside the camera frustum, that agent's mesh should not be rendered (not included in draw calls).
**Validates: Requirements 4.6**

### Property 15: Camera Input Responsiveness
*For any* camera input (pan, zoom, rotate), the camera state should change in the expected direction and magnitude based on the input delta.
**Validates: Requirements 5.1, 5.2, 5.3**

### Property 16: Camera Follow Mode Consistency
*For any* selected agent in follow mode, the camera target should remain aligned with the agent's position as the agent moves.
**Validates: Requirements 5.5**

### Property 17: Camera Constraints Enforcement
*For any* camera operation, the zoom distance should remain between 5 and 200 units, and the vertical rotation (beta) should remain between 10 and 89 degrees.
**Validates: Requirements 5.6, 5.7**

### Property 18: HUD Metrics Display Completeness
*For any* performance snapshot, when the HUD is visible, it should display all required metrics (FPS, memory, agent count, draw calls) with correct values and appropriate color coding.
**Validates: Requirements 6.2, 6.3, 6.4, 6.5**

### Property 19: HUD Update Frequency
*For any* time window, the HUD should update performance metrics at intervals of approximately 500ms (±50ms tolerance).
**Validates: Requirements 6.6**

### Property 20: Agent Selection State Consistency
*For any* agent click event, the Agent Inspector should select that agent, highlight it, and display its information; clicking terrain should deselect.
**Validates: Requirements 7.1, 7.4**

### Property 21: Agent Info Display Completeness
*For any* selected agent, the Agent Inspector should display all required fields (type, position, velocity, heading, behavior state) with current values.
**Validates: Requirements 7.2, 7.3**

### Property 22: Settings Immediate Application
*For any* setting change, the new value should take effect immediately without requiring a level reload, and the simulation should continue running.
**Validates: Requirements 8.6**

### Property 23: Settings Persistence Round-Trip
*For any* settings configuration, saving to localStorage and then loading should restore the exact same settings values.
**Validates: Requirements 8.7**

### Property 24: Minimap Agent Rendering
*For any* agent in the simulation, when the minimap is visible, that agent should appear as a colored dot with color corresponding to its type.
**Validates: Requirements 9.3**

### Property 25: Minimap Click Navigation
*For any* click position on the minimap, the camera should move to the corresponding world position.
**Validates: Requirements 9.5**

### Property 26: Minimap Update Frequency
*For any* time window, the minimap should update agent positions at intervals of approximately 200ms (±20ms tolerance).
**Validates: Requirements 9.6**

### Property 27: Simulation Invariant - Agent Positions Within Bounds
*For any* agent at any time, the agent's position should be within the terrain bounds.
**Validates: Requirements 12.4**

### Property 28: Simulation Invariant - Unique Entity IDs
*For any* two entities in the simulation, their IDs should be unique (no duplicates).
**Validates: Requirements 12.5**

### Property 29: UI Non-Obstruction
*For any* UI component, when visible, it should not overlap with the center 50% of the screen (critical gameplay area).
**Validates: Requirements 15.2**

### Property 30: Feature Toggle Isolation
*For any* optional feature, when toggled off, the simulation behavior should be identical to a version without that feature.
**Validates: Requirements 15.5**

## Error Handling

### Error Categories

1. **Performance Degradation**
   - Frame rate drops below critical threshold (15 FPS)
   - Memory usage exceeds 90% of available heap
   - System update time exceeds frame budget

2. **Asset Loading Failures**
   - Asset file not found
   - Asset parsing errors
   - Memory allocation failures during loading

3. **UI Interaction Errors**
   - Invalid camera state transitions
   - Agent selection on disposed agents
   - Settings validation failures

4. **Rendering Errors**
   - Shader compilation failures
   - WebGL context loss
   - Texture allocation failures

### Error Handling Strategies

**Performance Degradation**:
```typescript
// Automatic quality reduction
if (fps < 15 && !emergencyModeActive) {
  enableEmergencyMode();
  reduceQualityToMinimum();
  disableNonEssentialSystems();
  logPerformanceReport();
}

// Memory pressure response
if (memoryUsage > 0.9) {
  triggerAggressiveCleanup();
  unloadNonCriticalAssets();
  reduceParticleEffects();
  notifyUser("Low memory - reducing quality");
}
```

**Asset Loading Failures**:
```typescript
// Graceful fallback
async function loadAssetWithFallback(assetId: string): Promise<Asset> {
  try {
    return await assetLoader.loadAsset(assetId);
  } catch (error) {
    console.warn(`Failed to load asset ${assetId}, using fallback`);
    return getFallbackAsset(assetId);
  }
}

// Retry with exponential backoff
async function loadAssetWithRetry(assetId: string, maxRetries = 3): Promise<Asset> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await assetLoader.loadAsset(assetId);
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await delay(Math.pow(2, i) * 1000);
    }
  }
}
```

**UI Interaction Errors**:
```typescript
// Safe agent selection
function selectAgent(agentId: string): void {
  const agent = agentManager.getAgent(agentId);
  if (!agent || agent.isDisposed) {
    console.warn(`Cannot select disposed agent ${agentId}`);
    deselectCurrentAgent();
    return;
  }
  
  currentSelection = agentId;
  highlightAgent(agent);
  updateInspectorPanel(agent);
}

// Settings validation
function applySetting(key: string, value: any): void {
  const validator = settingValidators[key];
  if (!validator || !validator(value)) {
    console.error(`Invalid value for setting ${key}: ${value}`);
    notifyUser(`Invalid setting value, reverting to default`);
    value = getDefaultValue(key);
  }
  
  settings[key] = value;
  applySettingToSystem(key, value);
}
```

**Rendering Errors**:
```typescript
// WebGL context loss recovery
engine.onContextLostObservable.add(() => {
  console.error("WebGL context lost");
  pauseSimulation();
  showContextLostMessage();
});

engine.onContextRestoredObservable.add(() => {
  console.log("WebGL context restored");
  reloadAssets();
  resumeSimulation();
  hideContextLostMessage();
});

// Shader compilation fallback
function createMaterialWithFallback(config: MaterialConfig): Material {
  try {
    return new CustomMaterial(config);
  } catch (error) {
    console.warn("Custom material failed, using standard material");
    return new StandardMaterial(config.name);
  }
}
```

### Error Recovery Procedures

1. **Automatic Recovery**
   - Quality reduction on performance degradation
   - Asset fallbacks on loading failures
   - Context restoration on WebGL loss

2. **User Notification**
   - Toast messages for non-critical errors
   - Modal dialogs for critical errors requiring user action
   - Performance warnings in HUD

3. **Logging and Telemetry**
   - All errors logged to console with context
   - Performance degradation events tracked
   - Error frequency monitoring for pattern detection

## Testing Strategy

### Dual Testing Approach

The testing strategy employs both unit tests and property-based tests as complementary approaches:

- **Unit Tests**: Verify specific examples, edge cases, and error conditions
- **Property Tests**: Verify universal properties across all inputs

Together, these provide comprehensive coverage where unit tests catch concrete bugs and property tests verify general correctness.

### Unit Testing

**Focus Areas**:
- Specific examples demonstrating correct behavior
- Integration points between components
- Edge cases and error conditions
- UI interaction sequences

**Example Unit Tests**:
```typescript
// Example: Camera zoom limits
test('camera zoom respects minimum limit', () => {
  const camera = new EnhancedCameraController(scene);
  camera.setZoomLimits(5, 200);
  camera.zoom(-1000); // Try to zoom way past minimum
  assert.equal(camera.getCameraState().zoom.current, 5);
});

// Example: Agent selection
test('clicking agent selects it', () => {
  const inspector = new AgentInspector(scene);
  const agentId = 'test-agent-1';
  inspector.selectAgent(agentId);
  assert.equal(inspector.getSelectedAgent(), agentId);
});

// Example: Settings persistence
test('settings persist to localStorage', () => {
  const settings = new SettingsManager();
  settings.set('targetFPS', 120);
  settings.saveSettings();
  
  const newSettings = new SettingsManager();
  newSettings.loadSettings();
  assert.equal(newSettings.get('targetFPS'), 120);
});
```

**Unit Test Balance**:
- Avoid writing too many unit tests for cases covered by properties
- Focus unit tests on specific examples and integration points
- Use unit tests for edge cases that are hard to generate randomly

### Property-Based Testing

**Library Selection**: fast-check (JavaScript/TypeScript property-based testing library)

**Configuration**:
- Minimum 100 iterations per property test
- Each test tagged with feature name and property number
- Tag format: `Feature: performance-ui-testing-foundation, Property N: [property text]`

**Example Property Tests**:
```typescript
import fc from 'fast-check';

// Property 1: Performance Monitoring Accuracy
test('Feature: performance-ui-testing-foundation, Property 1: Performance monitoring tracks metrics accurately', () => {
  fc.assert(
    fc.property(
      fc.record({
        agentCount: fc.integer({ min: 0, max: 500 }),
        memoryUsageMB: fc.integer({ min: 100, max: 2000 }),
      }),
      (simState) => {
        const monitor = new PerformanceMonitor(engine, scene);
        monitor.startMonitoring();
        
        // Simulate state
        setupSimulationState(simState);
        
        const metrics = monitor.getCurrentMetrics();
        
        // Verify accuracy
        assert.approximately(metrics.agents.count, simState.agentCount, 0);
        assert.isAtLeast(metrics.memory.used, 0);
        assert.isAtMost(metrics.memory.used, metrics.memory.total);
        
        monitor.stopMonitoring();
      }
    ),
    { numRuns: 100 }
  );
});

// Property 17: Camera Constraints Enforcement
test('Feature: performance-ui-testing-foundation, Property 17: Camera constraints always enforced', () => {
  fc.assert(
    fc.property(
      fc.record({
        zoomDelta: fc.float({ min: -1000, max: 1000 }),
        betaDelta: fc.float({ min: -Math.PI, max: Math.PI }),
      }),
      (input) => {
        const camera = new EnhancedCameraController(scene);
        camera.setZoomLimits(5, 200);
        camera.setRotationLimits(10 * Math.PI / 180, 89 * Math.PI / 180);
        
        camera.zoom(input.zoomDelta);
        camera.rotate(0, input.betaDelta);
        
        const state = camera.getCameraState();
        
        // Verify constraints
        assert.isAtLeast(state.zoom.current, 5);
        assert.isAtMost(state.zoom.current, 200);
        assert.isAtLeast(state.rotation.beta, 10 * Math.PI / 180);
        assert.isAtMost(state.rotation.beta, 89 * Math.PI / 180);
      }
    ),
    { numRuns: 100 }
  );
});

// Property 23: Settings Persistence Round-Trip
test('Feature: performance-ui-testing-foundation, Property 23: Settings round-trip preserves values', () => {
  fc.assert(
    fc.property(
      fc.record({
        targetFPS: fc.integer({ min: 30, max: 120 }),
        shadowQuality: fc.constantFrom('off', 'low', 'medium', 'high'),
        lodEnabled: fc.boolean(),
        particlesEnabled: fc.boolean(),
      }),
      (settings) => {
        const manager = new SettingsManager();
        
        // Apply settings
        Object.entries(settings).forEach(([key, value]) => {
          manager.set(key, value);
        });
        
        // Save and reload
        manager.saveSettings();
        const newManager = new SettingsManager();
        newManager.loadSettings();
        
        // Verify round-trip
        Object.entries(settings).forEach(([key, value]) => {
          assert.deepEqual(newManager.get(key), value);
        });
      }
    ),
    { numRuns: 100 }
  );
});

// Property 28: Simulation Invariant - Unique Entity IDs
test('Feature: performance-ui-testing-foundation, Property 28: All entity IDs are unique', () => {
  fc.assert(
    fc.property(
      fc.array(fc.constantFrom('villager', 'zombie', 'fish', 'bird'), { minLength: 10, maxLength: 100 }),
      (agentTypes) => {
        const world = new World();
        const entityIds = new Set<string>();
        
        // Create agents
        agentTypes.forEach(type => {
          const id = world.createAgent(type);
          assert.isFalse(entityIds.has(id), `Duplicate entity ID: ${id}`);
          entityIds.add(id);
        });
        
        // Verify uniqueness
        assert.equal(entityIds.size, agentTypes.length);
      }
    ),
    { numRuns: 100 }
  );
});
```

### Integration Testing

**Test Scenarios**:
1. **Agent Spawning and Initialization**
   - Spawn agents of each type
   - Verify meshes created
   - Verify behavior systems initialized

2. **Agent Movement and Pathfinding**
   - Create agents with target positions
   - Verify pathfinding calculates routes
   - Verify agents move along paths

3. **Physics Interactions**
   - Create agents with physics bodies
   - Apply forces
   - Verify collision detection

4. **Level Loading**
   - Load each level configuration
   - Verify all systems initialized
   - Verify agents spawned correctly

5. **Camera and Agent Selection**
   - Select agents via clicking
   - Verify camera follow mode
   - Verify inspector displays info

### Performance Benchmarking

**Benchmark Suite**:
```typescript
// Benchmark 1: FPS with 50 agents
benchmark('50 agents average FPS', async () => {
  const world = setupWorld({ agentCount: 50 });
  const fps = await measureAverageFPS(10000); // 10 seconds
  assert.isAtLeast(fps, 60, 'Should maintain 60 FPS with 50 agents');
});

// Benchmark 2: FPS with 200 agents
benchmark('200 agents average FPS', async () => {
  const world = setupWorld({ agentCount: 200 });
  const fps = await measureAverageFPS(10000);
  assert.isAtLeast(fps, 45, 'Should maintain 45+ FPS with 200 agents');
});

// Benchmark 3: Level loading time
benchmark('level loading time', async () => {
  const startTime = performance.now();
  await loadLevel('village');
  const loadTime = performance.now() - startTime;
  assert.isAtMost(loadTime, 5000, 'Level should load in under 5 seconds');
});

// Benchmark 4: Memory usage after 60 seconds
benchmark('memory usage stability', async () => {
  const world = setupWorld({ agentCount: 100 });
  await runSimulation(60000); // 60 seconds
  const memoryUsage = getMemoryUsage();
  assert.isAtMost(memoryUsage, 1024, 'Memory should stay under 1GB');
});
```

**Regression Detection**:
- Store baseline results with timestamps
- Compare new results against baseline
- Report regression if deviation > 10%

### Visual Regression Testing

**Tool**: Playwright with screenshot comparison

**Test Cases**:
1. **Agent Rendering**
   - Capture each agent type from fixed camera position
   - Compare against baseline images
   - Threshold: 2% pixel difference

2. **Environmental Systems**
   - Capture water simulation
   - Capture cloud system
   - Capture terrain rendering
   - Capture building rendering

3. **UI Components**
   - Capture performance HUD
   - Capture agent inspector
   - Capture settings panel
   - Capture minimap

**Implementation**:
```typescript
test('visual regression: villager rendering', async ({ page }) => {
  await page.goto('http://localhost:3000');
  await page.evaluate(() => {
    // Setup scene with single villager
    setupTestScene({ agents: [{ type: 'villager', position: [0, 0, 0] }] });
    // Position camera
    setCameraPosition({ x: 10, y: 5, z: 10 });
  });
  
  await page.waitForTimeout(1000); // Wait for rendering
  
  const screenshot = await page.screenshot();
  expect(screenshot).toMatchSnapshot('villager-render.png', {
    threshold: 0.02
  });
});
```

### Test Organization

**Directory Structure**:
```
MyHavokSimCode/
├── Performance/
│   ├── tests/
│   │   ├── PerformanceMonitor.test.ts
│   │   ├── PerformanceProfiler.test.ts
│   │   └── PerformanceMonitor.property.test.ts
├── UI/
│   ├── tests/
│   │   ├── CameraController.test.ts
│   │   ├── PerformanceHUD.test.ts
│   │   ├── AgentInspector.test.ts
│   │   └── UI.property.test.ts
├── core/
│   ├── tests/
│   │   ├── AssetLoader.test.ts
│   │   ├── RenderPipeline.test.ts
│   │   └── Simulation.property.test.ts
└── tests/
    ├── integration/
    │   ├── agent-spawning.test.ts
    │   ├── level-loading.test.ts
    │   └── camera-selection.test.ts
    ├── benchmarks/
    │   ├── fps-benchmarks.test.ts
    │   └── memory-benchmarks.test.ts
    └── visual/
        ├── agent-rendering.test.ts
        └── ui-components.test.ts
```

### Test Execution

**Commands**:
```bash
# Run all tests
pnpm test

# Run unit tests only
pnpm test:unit

# Run property tests only
pnpm test:property

# Run integration tests
pnpm test:integration

# Run benchmarks
pnpm test:benchmarks

# Run visual regression tests
pnpm test:visual

# Generate coverage report
pnpm test:coverage
```

### Coverage Goals

- **Core Systems**: >80% code coverage
- **UI Components**: >70% code coverage
- **Performance Systems**: >85% code coverage
- **Overall Project**: >75% code coverage

## Implementation Notes

### Integration with Existing Systems

**Performance Monitoring**:
- Extend existing PerformanceMonitor class
- Reuse FrameRateTracker, MemoryMonitor, CPUProfiler
- Add new PerformanceProfiler as sibling component

**UI Components**:
- Follow pattern from WorldClock and OptimizationSettingsUI
- Use Babylon.GUI.AdvancedDynamicTexture for all UI
- Maintain consistent styling and positioning

**Asset Management**:
- Integrate with existing AssetManager
- Coordinate with MemoryManager for cleanup
- Use existing instancing systems

### Technology Stack

- **3D Engine**: Babylon.js v7.47.2
- **Physics**: Havok Physics v1.3.10
- **UI**: Babylon.GUI
- **Testing**: Node.js built-in test runner
- **Property Testing**: fast-check
- **Coverage**: c8
- **Visual Testing**: Playwright
- **Language**: TypeScript (migrating from JavaScript)

### Performance Considerations

**Optimization Targets**:
- Performance monitoring overhead: <1 FPS impact
- HUD update cost: <0.5ms per frame
- Minimap rendering: <2ms per update
- Agent selection picking: <1ms per click

**Memory Targets**:
- UI components: <50MB total
- Performance history: <10MB
- Asset cache: Configurable, default 500MB

### Browser Compatibility

- **Required**: WebGL 2.0 or WebGPU support
- **Tested**: Chrome 90+, Firefox 88+, Safari 14+, Edge 90+
- **Fallbacks**: Graceful degradation for missing features

## Conclusion

This design provides a comprehensive enhancement to the village simulation with performance optimization, UI/UX improvements, and testing infrastructure. The modular architecture integrates seamlessly with existing systems while maintaining the 60 FPS performance target. The dual testing approach (unit + property tests) ensures both specific correctness and general invariants are validated.
