# Villager Model Specifications

## Purpose

This document defines the visual specifications for villager agents, including model geometry, materials, and animation requirements.

## Model Structure

### Hierarchy

```
villager_N (TransformNode - root)
├── villager_N_torso (Capsule)
│   ├── villager_N_head (Sphere)
│   │   ├── villager_N_leftEye (Sphere)
│   │   ├── villager_N_rightEye (Sphere)
│   │   └── villager_N_mouth (Cylinder)
│   ├── villager_N_leftArm (Capsule)
│   ├── villager_N_rightArm (Capsule)
│   ├── villager_N_leftLeg (Capsule)
│   └── villager_N_rightLeg (Capsule)
```

### Geometry Specifications

#### Body Parts

| Part | Primitive | Dimensions | Position (relative to parent) |
|------|-----------|------------|-------------------------------|
| Torso | Capsule | radius: 0.4, height: 1.2, tessellation: 16 | y: 1.6 |
| Head | Sphere | diameter: 0.5, segments: 16 | y: 0.8 (from torso) |
| Left Arm | Capsule | radius: 0.15, height: 0.8, tessellation: 16 | x: -0.5, y: 0.3 |
| Right Arm | Capsule | radius: 0.15, height: 0.8, tessellation: 16 | x: 0.5, y: 0.3 |
| Left Leg | Capsule | radius: 0.2, height: 1.0, tessellation: 16 | x: -0.3, y: -0.8 |
| Right Leg | Capsule | radius: 0.2, height: 1.0, tessellation: 16 | x: 0.3, y: -0.8 |

#### Facial Features

| Part | Primitive | Dimensions | Position (relative to head) |
|------|-----------|------------|----------------------------|
| Left Eye | Sphere | diameter: 0.12 | x: -0.1, y: 0.05, z: 0.2 |
| Right Eye | Sphere | diameter: 0.12 | x: 0.1, y: 0.05, z: 0.2 |
| Mouth | Cylinder | height: 0.01, diameter: 0.15, tessellation: 24 | y: -0.1, z: 0.2 |

**Mouth Scaling:** x: 2.0, y: 0.5 (creates elliptical shape)

### Initial Rotations

| Part | Rotation (radians) | Notes |
|------|-------------------|-------|
| Left Arm | z: π/8 | Slight outward angle |
| Right Arm | z: -π/8 | Slight outward angle |
| Mouth | x: π/2 | Horizontal orientation |

## Materials

### Skin Material

| Property | Value | Notes |
|----------|-------|-------|
| Type | StandardMaterial | |
| Diffuse Color | (0.8-1.0, 0.6-0.8, 0.4-0.6) | Randomized per villager |
| Specular Color | (0.3, 0.3, 0.3) | Subtle shine |

**Skin Tone Generation:**
```
r = 0.8 + random() * 0.2
g = 0.6 + random() * 0.2
b = 0.4 + random() * 0.2
```

### Clothing Material

| Property | Value | Notes |
|----------|-------|-------|
| Type | StandardMaterial | |
| Diffuse Color | Selected from preset palette | Randomized per villager |

**Clothing Color Presets:**

| Color Name | RGB Values |
|------------|------------|
| Red | (0.8, 0.2, 0.2) |
| Blue | (0.2, 0.6, 0.8) |
| Green | (0.2, 0.8, 0.2) |
| Yellow | (0.8, 0.8, 0.2) |
| Purple | (0.8, 0.4, 0.8) |
| Cyan | (0.4, 0.8, 0.8) |
| Orange | (0.8, 0.6, 0.2) |

### Facial Feature Materials

| Part | Diffuse Color | Notes |
|------|---------------|-------|
| Eyes | (0.1, 0.1, 0.1) | Dark, nearly black |
| Mouth | (0.5, 0.1, 0.1) | Dark red |

### Material Application

| Part | Material |
|------|----------|
| Head | Skin |
| Torso | Clothing |
| Arms | Clothing |
| Legs | Clothing |
| Eyes | Eye material |
| Mouth | Mouth material |

## Animations

### Animation System

Villagers use Babylon.js AnimationGroups for state-based animation control.

### Animation Definitions

#### Idle Animation

| Property | Value |
|----------|-------|
| Name | idleAnimation |
| Target Property | rotation.y |
| Frame Rate | 30 fps |
| Loop Mode | CYCLE |
| Duration | 60 frames (2 seconds) |

**Keyframes:**
| Frame | Value (radians) |
|-------|-----------------|
| 0 | -0.05 |
| 30 | 0.05 |
| 60 | -0.05 |

#### Walk Animation

**Left Arm:**
| Property | Value |
|----------|-------|
| Name | walkAnimArm |
| Target Property | rotation.x |
| Frame Rate | 30 fps |
| Loop Mode | CYCLE |
| Duration | 30 frames (1 second) |

**Keyframes (Left Arm):**
| Frame | Value (radians) |
|-------|-----------------|
| 0 | -0.5 |
| 15 | 0.5 |
| 30 | -0.5 |

**Right Arm:** Opposite phase (starts at 0.5)

**Left Leg:**
| Property | Value |
|----------|-------|
| Name | walkAnimLeg |
| Target Property | rotation.x |
| Frame Rate | 30 fps |
| Loop Mode | CYCLE |
| Duration | 30 frames (1 second) |

**Keyframes (Left Leg):**
| Frame | Value (radians) |
|-------|-----------------|
| 0 | 0.5 |
| 15 | -0.3 |
| 30 | 0.5 |

**Right Leg:** Opposite phase (starts at -0.3)

#### Work Animation

| Property | Value |
|----------|-------|
| Name | workAnimation |
| Target Property | rotation.x (right arm only) |
| Frame Rate | 30 fps |
| Loop Mode | CYCLE |
| Duration | 30 frames (1 second) |

**Keyframes:**
| Frame | Value (radians) |
|-------|-----------------|
| 0 | -0.2 |
| 10 | -0.8 |
| 20 | -0.2 |
| 30 | -0.2 |

#### Greet Animation

| Property | Value |
|----------|-------|
| Name | greetAnimation |
| Target Property | rotation.z (right arm only) |
| Frame Rate | 30 fps |
| Loop Mode | CYCLE |
| Duration | 30 frames (1 second) |

**Keyframes:**
| Frame | Value (radians) |
|-------|-----------------|
| 0 | 0 |
| 5 | -0.5 |
| 10 | 0 |
| 15 | -0.5 |
| 20 | 0 |
| 30 | 0 |

### Animation Groups

| Group Name | Animations Included | Target Parts |
|------------|---------------------|--------------|
| idle | idleAnimation | Root mesh |
| walk | walkLeftArm, walkRightArm, walkLeftLeg, walkRightLeg | All limbs |
| work | workAnimation | Right arm |
| greet | greetAnimation | Right arm |

### Animation Playback

| Parameter | Default Value | Notes |
|-----------|---------------|-------|
| Loop | true | Most animations loop |
| Speed Ratio | 1.0 | Can be adjusted per state |

**State-to-Animation Mapping:**

| Villager State | Animation Group | Loop | Speed |
|----------------|-----------------|------|-------|
| Idle | idle | true | 1.0 |
| Walking | walk | true | 1.0 |
| Working | work | true | 1.0 |
| Socializing | greet | true | 1.0 |
| Sleeping | idle | true | 0.3 |
| Fleeing | walk | true | 2.0 |
| Sheltering | idle | true | 0.5 |

## Scale and Proportions

### Overall Dimensions

| Measurement | Value (units) |
|-------------|---------------|
| Total Height | ~2.5 |
| Shoulder Width | ~1.0 |
| Body Depth | ~0.8 |

### Proportion Ratios

| Ratio | Value | Notes |
|-------|-------|-------|
| Head to Body | 1:3 | Slightly stylized |
| Arm Length | 0.8 | Relative to torso |
| Leg Length | 1.0 | Relative to torso |

## Visual Distinction

### Silhouette Requirements

- Upright posture clearly distinguishes from zombies
- Rounded head shape visible from all angles
- Arms at natural resting position (slight outward angle)
- Legs clearly separated

### Color Variation

Each villager instance MUST have:
- Unique skin tone (within defined range)
- Unique clothing color (from preset palette)

This ensures visual variety while maintaining consistent style.

## Cross-References

- #[[file:docs/Art_Docs/visual-style-guide.md]]
- #[[file:docs/Design_Docs/agent-behaviors/villager-mechanics.md]]
- #[[file:docs/Code_Tech_Docs/subsystems/agent-system.md]]
