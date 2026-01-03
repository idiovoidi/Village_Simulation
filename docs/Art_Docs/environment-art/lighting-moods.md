# Lighting Mood Specifications

## Purpose

This document defines the lighting configurations for different times of day and atmospheric conditions, creating distinct visual moods throughout the day/night cycle.

## Light Sources

### Sun Light (Directional)

| Property | Value | Notes |
|----------|-------|-------|
| Type | DirectionalLight | Primary light source |
| Shadow Enabled | true | Casts shadows |
| Shadow Min Z | 1 | Near shadow plane |
| Shadow Max Z | 1000 | Far shadow plane |
| Base Specular | (0.3, 0.3, 0.3) | Reduced to prevent overblown reflections |

### Ambient Light (Hemispheric)

| Property | Value | Notes |
|----------|-------|-------|
| Type | HemisphericLight | Fill lighting |
| Direction | (0, 1, 0) | Upward |
| Ground Color | (0.05, 0.05, 0.15) | Blue-tinted ground bounce |
| Specular | (0.05, 0.05, 0.05) | Minimal specular |

### Volumetric Light

| Property | Value |
|----------|-------|
| Type | VolumetricLightScatteringPostProcess |
| Resolution | 1.0 |
| Samples | 100 |
| Sampling Mode | BILINEAR |

## Celestial Bodies

### Sun

| Property | Value |
|----------|-------|
| Geometry | Disc, radius: 50 |
| Material | Emissive (1, 0.8, 0.3) |
| Billboard Mode | ALL |
| Orbit Radius | 1000 units |
| Max Height | 800 units |
| Min Height | -200 units |


### Moon

| Property | Value |
|----------|-------|
| Geometry | Disc, radius: 30 |
| Material | Emissive (0.8, 0.8, 0.9) |
| Billboard Mode | ALL |
| Position | Opposite to sun |

### Glow Layers

| Layer | Target | Intensity | Blur Kernel |
|-------|--------|-----------|-------------|
| Sun Glow | Sun mesh | 0.5 | 64 |
| Moon Glow | Moon mesh | 0.3 | 64 |

## Stars

### Star Field

| Property | Value |
|----------|-------|
| Count | 1000 |
| Geometry | Box, size: 0.2-0.8 (randomized) |
| Distribution | Spherical, radius: 400-600 |
| Material | Emissive, alpha-controlled |

### Star Colors

| Color | RGB Values | Probability |
|-------|------------|-------------|
| White | (1, 1, 1) | 25% |
| Bluish White | (0.9, 0.9, 1) | 25% |
| Yellowish | (1, 0.9, 0.7) | 25% |
| Reddish | (1, 0.8, 0.8) | 25% |

### Twinkling Effect

| Property | Value |
|----------|-------|
| Twinkle Speed | 0.5-2.5 (randomized per star) |
| Twinkle Amount | 0.3-1.0 (randomized per star) |
| Formula | alpha = visibility × (0.7 + twinkle × 0.3) |

## Time-of-Day Moods

### Dawn (5:00 - 7:00)

| Property | Value |
|----------|-------|
| Sun Intensity | 0.5 → 1.5 |
| Ambient Intensity | 0.2 → 0.4 |
| Sun Color | Transitioning to warm |
| Fog Density | 0.005 |
| Fog Color | (0.9, 0.6, 0.4) |
| Mood | Warm, hopeful |

### Day (7:00 - 17:00)

| Property | Value |
|----------|-------|
| Sun Intensity | 1.5 - 2.5 |
| Ambient Intensity | 0.3 |
| Ambient Diffuse | (0.6, 0.6, 0.9) |
| Sun Color | (1, 1, 1) white |
| Fog Density | 0.001 |
| Fog Color | (0.7, 0.8, 1.0) |
| Mood | Bright, clear |

### Dusk (17:00 - 19:00)

| Property | Value |
|----------|-------|
| Sun Intensity | 1.5 → 0.5 |
| Ambient Intensity | 0.4 → 0.2 |
| Sun Color | (1, 0.5, 0.2) orange |
| Fog Density | 0.005 |
| Fog Color | (0.9, 0.6, 0.4) |
| Mood | Warm, nostalgic |

### Night (19:00 - 5:00)

| Property | Value |
|----------|-------|
| Sun Intensity | 0 |
| Ambient Intensity | 0.1 - 0.2 |
| Ambient Diffuse | (0.1, 0.1, 0.3) |
| Moon Glow | 0.4 |
| Star Visibility | Full |
| Fog Density | 0.003 |
| Fog Color | (0.05, 0.05, 0.15) |
| Mood | Cool, mysterious |

## Sky Colors

### Sky Gradient (Dynamic Texture)

| Time | Gradient Stops |
|------|----------------|
| Day | #00BFFF → #87CEEB → #E0FFFF |
| Dawn/Dusk | #FF6B4A → #FF9E8F → #FFB6C1 → #87CEEB → #4169E1 → #191970 |
| Night | #000033 → #0000FF → #191970 |

## Atmospheric Effects

### Fog Configuration

| Condition | Mode | Density | Color |
|-----------|------|---------|-------|
| Clear Day | EXP2 | 0.001 | (0.7, 0.8, 1.0) |
| Dawn/Dusk | EXP2 | 0.005 | (0.9, 0.6, 0.4) |
| Night | EXP2 | 0.003 | (0.05, 0.05, 0.15) |

### Volumetric Light Settings

| Time | Exposure | Decay | Weight |
|------|----------|-------|--------|
| Day | 0.5 | 0.96 | 0.2 |
| Dawn/Dusk | 0.5 | 0.96 | 0.3 |
| Night | 0.1 | 0.9 | 0.1 |

## Image Processing

### Tone Mapping

| Property | Value |
|----------|-------|
| Enabled | true |
| Type | ACES |

### Exposure Adjustment

| Sun Height | Exposure | Contrast |
|------------|----------|----------|
| Low (dawn/dusk) | 1.0 | 1.1 |
| High (midday) | 0.7-0.85 | 1.2-1.3 |
| Below horizon | 1.0 | 1.1 |

## Cloud Lighting

### Time-of-Day Cloud Colors

| Time | Alpha | Emissive Color |
|------|-------|----------------|
| Night | 0.4 | (0.1, 0.1, 0.2) |
| Dawn | 0.7 | (1, 0.7, 0.5) |
| Day | 0.8 | (0.9, 0.9, 0.9) |
| Dusk | 0.7 | (1, 0.5, 0.3) |

## Cross-References

- #[[file:docs/Art_Docs/visual-style-guide.md]]
- #[[file:docs/Design_Docs/environment-systems/day-night-cycle.md]]
- #[[file:docs/Code_Tech_Docs/subsystems/environment-system.md]]
