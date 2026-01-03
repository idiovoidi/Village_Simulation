# Render System

## Purpose

The Render System provides visual output for the simulation by managing 3D rendering through an abstracted backend interface. It handles mesh rendering, Level of Detail (LOD) management, instancing for performance, shadow mapping, and material systems.

## Boundaries

**In Scope:**
- Rendering backend initialization and lifecycle
- LOD management and distance-based switching
- Mesh instancing and buffer management
- Shadow mapping configuration
- Material system and PBR support
- Camera management

**Out of Scope:**
- Physics simulation (see #[[file:docs/Code_Tech_Docs/subsystems/physics-system.md]])
- Agent behavior logic (see #[[file:docs/Code_Tech_Docs/subsystems/agent-system.md]])
- UI rendering (handled by UI System)

## Responsibilities

- Initialize and manage rendering backend (Babylon.js adapter)
- Create and dispose meshes, materials, and textures
- Manage LOD levels and automatic switching
- Handle mesh instancing for repeated geometry
- Configure shadow mapping quality and cascades
- Provide material creation and management
- Manage render loop integration with game loop

## Lifecycle

1. **Initialization**
   - Create rendering backend adapter
   - Initialize WebGL/WebGPU context
   - Set up default materials and shaders
   - Configure shadow generators

2. **Active Operation**
   - Process render queue each frame
   - Update LOD levels based on camera distance
   - Manage instance buffers
   - Apply frustum culling
   - Execute draw calls

3. **Cleanup/Disposal**
   - Dispose all meshes and materials
   - Release texture memory
   - Destroy rendering context
   - Clean up GPU resources

## Semantics (Normative Guarantees)

### Backend Initialization

- The Render System MUST initialize the rendering backend before any mesh creation
- The Render System MUST verify WebGL/WebGPU support and report capability errors
- The Render System MUST provide fallback behavior when advanced features are unavailable
- Backend initialization failure MUST be reported as a critical error

### Level of Detail (LOD) Management

- LOD switching MUST occur based on configurable distance thresholds
- LOD levels MUST be defined in ascending order of detail (LOD0 = highest detail)
- LOD transitions MUST NOT cause visual popping; implementations SHOULD use smooth transitions
- The Render System MUST support at least 3 LOD levels per mesh type

**LOD Distance Thresholds (Default):**

| LOD Level | Distance Range | Description |
|-----------|---------------|-------------|
| LOD0 | 0 - 20 units | Full detail |
| LOD1 | 20 - 50 units | Medium detail |
| LOD2 | 50 - 100 units | Low detail |
| LOD3 | 100+ units | Billboard/impostor |

### Mesh Instancing

- Instanced meshes MUST share geometry buffers
- Instance transforms MUST be updated via instance buffer, not individual mesh transforms
- The Render System MUST support at least 1000 instances per instanced mesh type
- Instance buffer updates MUST occur before render, not during
- Instancing MUST be used for repeated geometry (trees, rocks, buildings)

### Shadow Mapping

- Shadow mapping MUST support configurable quality levels
- Shadow cascades MUST be supported for directional lights (sun)
- Shadow map resolution MUST be configurable per quality level

**Shadow Quality Levels:**

| Quality | Resolution | Cascades | PCF Samples |
|---------|------------|----------|-------------|
| Low | 512x512 | 1 | 1 |
| Medium | 1024x1024 | 2 | 4 |
| High | 2048x2048 | 3 | 9 |
| Ultra | 4096x4096 | 4 | 16 |

### Material System

- The Render System MUST support PBR (Physically Based Rendering) materials
- Materials MUST support albedo, normal, metallic, roughness, and ambient occlusion maps
- Material instances MUST be shareable across multiple meshes
- The Render System MUST provide default materials for missing textures

**Required Material Properties:**

| Property | Type | Default |
|----------|------|---------|
| albedoColor | Color3 | (1, 1, 1) |
| albedoTexture | Texture | null |
| normalTexture | Texture | null |
| metallicTexture | Texture | null |
| roughness | float | 0.5 |
| metallic | float | 0.0 |

## Configuration Parameters

```
renderConfig:
  backend: "babylon"           # Rendering backend identifier
  antialias: true              # Enable antialiasing
  preserveDrawingBuffer: false # Preserve buffer for screenshots
  
  lod:
    enabled: true
    thresholds: [20, 50, 100]  # Distance thresholds for LOD0→1, 1→2, 2→3
    transitionTime: 0.2        # Seconds for smooth LOD transition
    
  shadows:
    enabled: true
    quality: "medium"          # low, medium, high, ultra
    cascadeCount: 2
    mapSize: 1024
    
  instancing:
    enabled: true
    maxInstances: 1000
    bufferUpdateMode: "batch"  # batch or immediate
```

## Correctness Properties

- **Property 18: Frustum Culling** - For any object outside the view frustum, that object MUST NOT be submitted for rendering.
  → #[[file:docs/Code_Tech_Docs/correctness-properties.md#property-18]]

## Observability

### Metrics to Track

- Draw calls per frame
- Triangles rendered per frame
- Instance count per mesh type
- LOD distribution (count per level)
- Shadow map render time
- GPU memory usage

### Events to Log

- Backend initialization success/failure
- LOD level changes (debug level)
- Shadow quality changes
- Material creation/disposal
- Texture loading errors

## Cross-References

- #[[file:docs/Code_Tech_Docs/architecture-overview.md]] - Overall architecture
- #[[file:docs/Code_Tech_Docs/core-systems/game-loop.md]] - Render integration with game loop
- #[[file:docs/Code_Tech_Docs/subsystems/performance-system.md]] - Quality scaling integration
- #[[file:docs/Art_Docs/visual-style-guide.md]] - Visual style requirements
