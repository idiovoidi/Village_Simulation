# Visual Style Guide

## Purpose

This document defines the overall visual aesthetic, color palette, and mood for the 3D Village Simulation. It serves as the authoritative reference for maintaining visual consistency across all art assets.

## Overall Aesthetic

### Style Direction

The simulation employs a **stylized low-poly aesthetic** with procedurally generated geometry. Key characteristics:

- **Geometric Simplicity**: Agents and structures use basic primitives (boxes, capsules, spheres, cylinders)
- **Soft Lighting**: Ambient and directional lighting create a warm, inviting atmosphere
- **Natural Color Palette**: Earth tones dominate terrain, with accent colors for agents
- **Atmospheric Depth**: Fog and volumetric lighting add depth and mood

### Visual Hierarchy

| Element | Visual Priority | Treatment |
|---------|----------------|-----------|
| Agents | High | Bright, saturated colors; distinct silhouettes |
| Buildings | Medium-High | Warm earth tones; clear architectural forms |
| Terrain | Medium | Natural gradients; subtle texture variation |
| Environment Effects | Low-Medium | Transparent/translucent; atmospheric |
| UI Elements | Overlay | High contrast; clear readability |

## Color Palette

### Primary Colors

#### Terrain Colors

| Zone | RGB Values | Hex | Usage |
|------|------------|-----|-------|
| Meadow Green | (0.4, 0.6, 0.3) | #669A4D | Central flat areas |
| Hill Green | (0.45, 0.5, 0.35) | #738059 | Rolling hill regions |
| Mountain Brown | (0.5, 0.45, 0.4) | #807366 | Mountain edges |

#### Sky Colors

| Time | Gradient Colors | Usage |
|------|-----------------|-------|
| Day | #00BFFF → #87CEEB → #E0FFFF | Clear daytime sky |
| Sunrise/Sunset | #FF6B4A → #FF9E8F → #FFB6C1 → #87CEEB → #4169E1 → #191970 | Dawn/dusk transitions |
| Night | #000033 → #0000FF → #191970 | Nighttime sky |

#### Water Colors

| Property | RGB Values | Hex |
|----------|------------|-----|
| Diffuse | (0.1, 0.3, 0.5) | #1A4D80 |
| Emissive | (0.1, 0.2, 0.3) | #1A334D |
| Specular | (0.2, 0.2, 0.2) | #333333 |

### Agent Colors

#### Villager Palette

| Element | Color Range | Notes |
|---------|-------------|-------|
| Skin Tones | (0.8-1.0, 0.6-0.8, 0.4-0.6) | Warm, varied skin tones |
| Clothing | Randomized from preset palette | See clothing colors below |

**Clothing Color Presets:**
- Red: (0.8, 0.2, 0.2)
- Blue: (0.2, 0.6, 0.8)
- Green: (0.2, 0.8, 0.2)
- Yellow: (0.8, 0.8, 0.2)
- Purple: (0.8, 0.4, 0.8)
- Cyan: (0.4, 0.8, 0.8)
- Orange: (0.8, 0.6, 0.2)

#### Zombie Palette

| Element | RGB Values | Hex | Notes |
|---------|------------|-----|-------|
| Skin | (0.5, 0.6, 0.4) | #809966 | Sickly green-gray |
| Clothing | (0.3, 0.2, 0.1) | #4D331A | Drab brown, tattered |
| Eyes (Emissive) | (0.8, 0.1, 0.1) | #CC1A1A | Faint red glow |

#### Wildlife Palette

| Agent | Primary Color | Notes |
|-------|---------------|-------|
| Fish | (0.4, 0.8, 1.0) | Translucent blue, alpha 0.8 |
| Bird | (0.6-0.8, 0.6-0.8, 0.6-0.8) | Randomized gray tones |
| Dog | Brown/Black/Golden variants | See dog color variants |
| Boat Hull | (0.8-1.0, 0.4-0.6, 0.2-0.3) | Warm wood tones |
| Boat Sail | (1.0, 1.0, 1.0) | Pure white |

**Dog Color Variants:**
- Brown: (0.6, 0.4, 0.2)
- Black: (0.1, 0.1, 0.1)
- Golden: (0.8, 0.6, 0.2)

### Building Colors

| Element | RGB Values | Notes |
|---------|------------|-------|
| Foundation | (0.4, 0.4, 0.4) | Gray stone |
| Walls | (0.8-1.0, 0.7-0.9, 0.6-0.8) | Warm cream/beige, randomized |
| Door | (0.4, 0.2, 0.1) | Dark wood |
| Door Frame | (0.35, 0.15, 0.05) | Darker wood trim |
| Windows | (0.3, 0.4, 1.0) | Blue glass, alpha 0.7 |
| Window Frame | (0.35, 0.15, 0.05) | Dark wood trim |
| Roof | (0.4-0.6, 0.2-0.4, 0.1-0.2) | Terracotta/brown tiles |
| Chimney | (0.3, 0.3, 0.3) | Gray stone |

## Lighting Moods

### Time-of-Day Lighting

| Time Period | Sun Intensity | Ambient Intensity | Fog Density | Mood |
|-------------|---------------|-------------------|-------------|------|
| Dawn (5-7) | 0.5-1.5 | 0.2-0.4 | 0.005 | Warm, hopeful |
| Day (7-17) | 1.5-2.5 | 0.3 | 0.001 | Bright, clear |
| Dusk (17-19) | 0.5-1.5 | 0.2-0.4 | 0.005 | Warm, nostalgic |
| Night (19-5) | 0 | 0.1-0.2 | 0.003 | Cool, mysterious |

### Lighting Color Temperatures

| Time | Sun Color | Ambient Color | Fog Color |
|------|-----------|---------------|-----------|
| Midday | (1.0, 1.0, 1.0) | (0.6, 0.6, 0.9) | (0.7, 0.8, 1.0) |
| Sunset | (1.0, 0.5, 0.2) | (0.4, 0.4, 0.6) | (0.9, 0.6, 0.4) |
| Night | N/A | (0.1, 0.1, 0.3) | (0.05, 0.05, 0.15) |

## Material Properties

### Standard Material Settings

| Surface Type | Specular Color | Specular Power | Notes |
|--------------|----------------|----------------|-------|
| Skin | (0.3, 0.3, 0.3) | Default | Subtle shine |
| Clothing | Default | Default | Matte finish |
| Metal | (0.6, 0.6, 0.6) | 64 | Reflective |
| Wood | (0.1, 0.1, 0.1) | 32 | Low shine |
| Stone | (0.2, 0.2, 0.2) | 64 | Slight shine |
| Water | (0.2, 0.2, 0.2) | Default | Fresnel effect |
| Glass | (0.2, 0.3, 1.0) | 32 | Emissive glow |

### Transparency Guidelines

| Element | Alpha Value | Notes |
|---------|-------------|-------|
| Water Surface | 0.4 | Semi-transparent |
| Fish | 0.8 | Slightly translucent |
| Windows | 0.7 | Glass effect |
| Clouds | 0.4-0.8 | Variable by weather |
| Walls (boundary) | 0.3 | Barely visible |

## Atmospheric Effects

### Fog Settings

| Condition | Fog Mode | Density | Color |
|-----------|----------|---------|-------|
| Clear Day | EXP2 | 0.001 | (0.7, 0.8, 1.0) |
| Dawn/Dusk | EXP2 | 0.005 | (0.9, 0.6, 0.4) |
| Night | EXP2 | 0.003 | (0.05, 0.05, 0.15) |

### Glow Effects

| Element | Glow Intensity | Blur Kernel | Notes |
|---------|----------------|-------------|-------|
| Sun | 0.5 | 64 | Bright corona |
| Moon | 0.3 | 64 | Soft glow |
| Zombie Eyes | Emissive only | N/A | Subtle red glow |
| Windows (night) | Emissive only | N/A | Warm interior light |

## Visual Consistency Rules

### Scale Guidelines

- **Agent Height**: Villagers ~2.5 units, Zombies ~2.8 units
- **Building Scale**: Houses 5-7 units wide, 4-6 units tall
- **Terrain Scale**: Bowl radius 300 units, depth 50 units
- **Water Level**: -10 units (below terrain center)

### Silhouette Clarity

Each agent type MUST have a distinct silhouette:
- **Villagers**: Upright posture, rounded head, visible limbs
- **Zombies**: Forward lean, extended arms, shambling pose
- **Fish**: Horizontal body with wagging tail
- **Birds**: Spread wings, compact body
- **Dogs**: Four-legged stance, wagging tail
- **Boats**: Tall mast with sail

### Animation Principles

- **Smooth Transitions**: All animations use easing curves
- **Looping**: Idle and movement animations loop seamlessly
- **State Clarity**: Animation clearly indicates agent state
- **Performance**: Animations use keyframe interpolation, not physics

## Cross-References

- #[[file:docs/Art_Docs/agent-visuals/villager-models.md]]
- #[[file:docs/Art_Docs/agent-visuals/zombie-sprites.md]]
- #[[file:docs/Art_Docs/agent-visuals/wildlife-models.md]]
- #[[file:docs/Art_Docs/environment-art/terrain-textures.md]]
- #[[file:docs/Art_Docs/environment-art/water-effects.md]]
- #[[file:docs/Art_Docs/environment-art/lighting-moods.md]]
- #[[file:docs/Design_Docs/environment-systems/day-night-cycle.md]]
