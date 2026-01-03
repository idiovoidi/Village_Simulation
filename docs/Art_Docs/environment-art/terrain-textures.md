# Terrain Texture Specifications

## Purpose

This document defines the terrain texture specifications, including procedural terrain generation, texture mapping, and biome coloring.

## Terrain Geometry

### Bowl Shape

The terrain is a procedurally generated bowl-shaped landscape.

| Parameter | Value | Notes |
|-----------|-------|-------|
| Bowl Radius | 300 units | Total terrain extent |
| Bowl Depth | 50 units | Maximum depth at edges |
| Min Segments | 64 | Minimum mesh detail |
| Max Segments | 128 | Maximum mesh detail |
| Wall Offset | 50 units | Boundary wall distance |

### Height Function

The terrain height is calculated using a multi-zone approach:

#### Central Meadow (0-50% radius)
- Nearly flat with subtle undulation
- Base height: -3 units
- Noise: sin(x × 0.015) × cos(z × 0.015) × 1.2

#### Rolling Hills (50-80% radius)
- Gradual elevation changes
- Hill noise: sin(x × 0.02) × cos(z × 0.02) × 10

#### Mountain Edges (80-100% radius)
- Dramatic elevation increase
- Mountain height: up to 50 units
- Ridge noise for natural appearance


## Texture Assets

### Required Textures

| Texture | File Path | Usage |
|---------|-----------|-------|
| Grass | assets/textures/grass.png | Primary terrain diffuse |
| Grass Normal | assets/textures/grassn.png | Grass normal map |
| Rock | assets/textures/rock.png | Mountain/cliff diffuse |
| Rock Normal | assets/textures/rockn.png | Rock normal map |

### Texture Settings

| Property | Value | Notes |
|----------|-------|-------|
| UV Scale | 50 | Tiling frequency |
| Normal Map Invert X | true | Correct normal direction |
| Normal Map Invert Y | true | Correct normal direction |

## Material Configuration

### Terrain Material

| Property | Value |
|----------|-------|
| Type | StandardMaterial |
| Diffuse Texture | Grass texture |
| Ambient Texture | Rock texture (detail) |
| Bump Texture | Rock normal map |
| Specular Color | (0.2, 0.2, 0.2) |
| Specular Power | 64 |
| Use Vertex Colors | true |
| Diffuse Color | (1, 1, 1) |
| Ambient Color | (1, 1, 1) |

## Vertex Colors (Biome Blending)

### Biome Zones

| Zone | Distance Range | Primary Color |
|------|----------------|---------------|
| Meadow | 0-40% | Green (0.4, 0.6, 0.3) |
| Hills | 40-70% | Olive (0.45, 0.5, 0.35) |
| Mountains | 70-100% | Brown (0.5, 0.45, 0.4) |

### Color Calculation

Colors are blended based on:
- Distance from center (normalized 0-1)
- Height factor (normalized to bowl depth)
- Slope factor (steepness)

**Blend Factors:**
```
meadowFactor = max(0, min(1, (0.4 - dist) / 0.1 × (1 - slope)))
hillFactor = max(0, min(1, transition based on dist 0.4-0.7))
mountainFactor = max(0, min(1, (dist - 0.6) / 0.2 × slope))
```

### Color Clamping

All vertex colors are clamped to range (0.2, 0.8) for consistent appearance.

## Adaptive Level of Detail

### Grid Resolution

| Zone | Grid Size | Notes |
|------|-----------|-------|
| Meadow (0-40%) | Base (64) | Low detail for flat areas |
| Hills (40-70%) | Base × 1.5 | Medium detail |
| Mountains (70-100%) | Max (128) | High detail for complex geometry |

## Boundary Walls

### Wall Specifications

| Property | Value |
|----------|-------|
| Count | 4 (one per side) |
| Height | 40 units |
| Thickness | 10 units |
| Position | Bowl radius + wall offset |
| Visibility | 0.3 (semi-transparent) |

### Wall Physics

| Property | Value |
|----------|-------|
| Shape Type | BOX |
| Mass | 0 (static) |
| Restitution | 0.5 |
| Friction | 1.0 |

## Cross-References

- #[[file:docs/Art_Docs/visual-style-guide.md]]
- #[[file:docs/Design_Docs/environment-systems/procedural-generation.md]]
- #[[file:docs/Code_Tech_Docs/subsystems/environment-system.md]]
