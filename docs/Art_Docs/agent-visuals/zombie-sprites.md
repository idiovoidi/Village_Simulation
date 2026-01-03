# Zombie Visual Specifications

## Purpose

This document defines the visual specifications for zombie agents, including model geometry, materials, animations, and distinctive visual effects.

## Model Structure

### Hierarchy

```
zombie (TransformNode - root)
├── zombieTorso (Capsule)
│   └── patch_N (Box) × 5 - tattered clothing patches
├── zombieHead (Sphere)
│   ├── leftEye (Sphere)
│   └── rightEye (Sphere)
├── zombieNeck (Cylinder)
├── zombieleftArm (TransformNode)
│   ├── leftUpperArm (Capsule)
│   ├── leftElbow (Sphere)
│   ├── leftForearm (Capsule)
│   └── leftHand (Sphere)
├── zombierightArm (TransformNode)
│   ├── rightUpperArm (Capsule)
│   ├── rightElbow (Sphere)
│   ├── rightForearm (Capsule)
│   └── rightHand (Sphere)
├── zombieleftLeg (TransformNode)
│   ├── leftUpperLeg (Capsule)
│   ├── leftKnee (Sphere)
│   ├── leftLowerLeg (Capsule)
│   └── leftFoot (Box)
└── zombierightLeg (TransformNode)
    ├── rightUpperLeg (Capsule)
    ├── rightKnee (Sphere)
    ├── rightLowerLeg (Capsule)
    └── rightFoot (Box)
```

### Geometry Specifications

#### Core Body

| Part | Primitive | Dimensions | Position |
|------|-----------|------------|----------|
| Torso | Capsule | radius: 0.5, height: 1.5, tessellation: 16 | y: 1.5 |
| Head | Sphere | diameter: 0.8, segments: 16 | y: 2.5, z: 0.1 |
| Neck | Cylinder | diameter: 0.3, height: 0.3, tessellation: 16 | y: 2.2 |

#### Arms (per side)

| Part | Primitive | Dimensions | Position (relative to arm container) |
|------|-----------|------------|-------------------------------------|
| Upper Arm | Capsule | radius: 0.15, height: 0.8, tessellation: 16 | y: -0.4 |
| Elbow | Sphere | diameter: 0.25, segments: 16 | y: -0.8 |
| Forearm | Capsule | radius: 0.12, height: 0.7, tessellation: 16 | y: -1.2 |
| Hand | Sphere | diameter: 0.25, segments: 16, scaling: (1, 0.7, 0.5) | y: -1.6 |

**Arm Container Positions:**
- Left Arm: x: -0.6, y: 2
- Right Arm: x: 0.6, y: 2

#### Legs (per side)

| Part | Primitive | Dimensions | Position (relative to leg container) |
|------|-----------|------------|-------------------------------------|
| Upper Leg | Capsule | radius: 0.2, height: 1.0, tessellation: 16 | y: -0.5 |
| Knee | Sphere | diameter: 0.35, segments: 16 | y: -1.0 |
| Lower Leg | Capsule | radius: 0.15, height: 1.0, tessellation: 16 | y: -1.5 |
| Foot | Box | height: 0.2, width: 0.3, depth: 0.6 | y: -2.0, z: 0.1 |

**Leg Container Positions:**
- Left Leg: x: -0.3, y: 0.8
- Right Leg: x: 0.3, y: 0.8

#### Tattered Clothing Patches

| Property | Value |
|----------|-------|
| Count | 5 patches per zombie |
| Primitive | Box |
| Dimensions | height: 0.4, width: 0.4, depth: 0.1 |
| Position Range | x: ±0.5, y: ±0.75, z: 0.5 (randomized) |
| Rotation | y: random() × π |

## Materials

### Zombie Skin Material

| Property | Value | Notes |
|----------|-------|-------|
| Type | StandardMaterial | |
| Diffuse Color | (0.5, 0.6, 0.4) | Sickly green-gray |
| Specular Color | (0.1, 0.1, 0.1) | Low shine |

### Tattered Clothing Material

| Property | Value | Notes |
|----------|-------|-------|
| Type | StandardMaterial | |
| Diffuse Color | (0.3, 0.2, 0.1) | Drab brown |

### Glowing Eyes Material

| Property | Value | Notes |
|----------|-------|-------|
| Type | StandardMaterial | |
| Emissive Color | (0.8, 0.1, 0.1) | Faint red glow |

### Material Application

| Parts | Material |
|-------|----------|
| Head, Neck, Arms, Legs | Zombie Skin |
| Torso, Patches | Tattered Clothing |
| Eyes | Glowing Eyes |

## Animations

### Animation System

Zombies use a combination of AnimationGroups and procedural animation for shambling movement.

### Animation Definitions

#### Attack Animation

| Property | Value |
|----------|-------|
| Name | attackAnimation |
| Target | Right arm container |
| Target Property | rotation.x |
| Frame Rate | 30 fps |
| Loop Mode | CONSTANT (plays once) |
| Duration | 20 frames |

**Keyframes:**
| Frame | Value (radians) |
|-------|-----------------|
| 0 | 0 |
| 10 | -π/2 |
| 20 | 0 |

#### Suspicious Animation

| Property | Value |
|----------|-------|
| Name | suspiciousAnimation |
| Target | Head |
| Target Property | rotation.y |
| Frame Rate | 30 fps |
| Loop Mode | CYCLE |
| Duration | 100 frames |

**Keyframes:**
| Frame | Value (radians) |
|-------|-----------------|
| 0 | 0 |
| 20 | -π/8 |
| 60 | π/8 |
| 100 | 0 |

### Procedural Animation

The zombie's shambling movement is procedurally animated based on movement speed.

#### Limb Movement

```
angle = deltaTime × (speed > 1 ? 6 : 2)

leftArm.rotation.x = sin(angle) × 0.5
rightArm.rotation.x = -sin(angle) × 0.5
leftLeg.rotation.x = -sin(angle) × 0.5
rightLeg.rotation.x = sin(angle) × 0.5
```

#### Body Posture

| State | Body Lean (rotation.x) | Notes |
|-------|------------------------|-------|
| Normal | 0.2 | Slight forward lean |
| Lurge | 0.4 | More pronounced lean |

#### Body Sway

```
mesh.rotation.y += sin(angle × 0.5) × 0.01 × speed
```

#### Head Movement

| State | Head Animation |
|-------|----------------|
| Normal | rotation.z: sin(angle × 0.7) × 0.1, rotation.y: sin(angle × 0.5) × 0.2, rotation.x: 0.2 + sin(angle × 0.3) × 0.1 |
| Lurge | rotation.z: sin(angle × 0.7) × 0.2, rotation.y: sin(angle × 0.5) × 0.3, rotation.x: 0.3 + sin(angle × 0.3) × 0.2 |

### Animation Groups

| Group Name | Animation | Target |
|------------|-----------|--------|
| attack | attackAnimation | Right arm |
| suspicious | suspiciousAnimation | Head |

### State-to-Animation Mapping

| Zombie State | Animation | Procedural | Notes |
|--------------|-----------|------------|-------|
| Wandering | None | Slow shamble | speed = 1 |
| Suspicious | suspicious | Slow shamble | Head turning |
| Pursuing | None | Fast shamble | speed > 1 |
| Lurging | None | Intense shamble | speed > 1, more dramatic |
| Attacking | attack | Paused | One-shot animation |

## Visual Effects

### Blood Stains

| Property | Value |
|----------|-------|
| Storage | Array of mesh references |
| Animation | Subtle dripping effect |

**Drip Animation:**
```
drip.position.y -= sin(deltaTime + index) × 0.0005
drip.scaling.y = 1 + sin(deltaTime × 1.5 + index) × 0.05
```

## Scale and Proportions

### Overall Dimensions

| Measurement | Value (units) |
|-------------|---------------|
| Total Height | ~2.8 |
| Shoulder Width | ~1.2 |
| Arm Reach | ~1.6 |

### Proportion Ratios

| Ratio | Value | Notes |
|-------|-------|-------|
| Head to Body | 1:2.5 | Slightly larger head |
| Arm Length | Extended | Longer than villagers |
| Leg Length | Standard | Similar to villagers |

## Visual Distinction from Villagers

### Key Differences

| Feature | Villager | Zombie |
|---------|----------|--------|
| Posture | Upright | Forward lean |
| Skin Color | Warm tones | Green-gray |
| Eyes | Dark | Red glow |
| Clothing | Colorful | Brown, tattered |
| Movement | Smooth | Shambling |
| Arm Position | Natural | Extended forward |

### Silhouette Requirements

- Forward-leaning posture clearly visible
- Arms extended or swinging dramatically
- Shambling gait distinguishable from walking
- Head tilted or moving erratically

## Cross-References

- #[[file:docs/Art_Docs/visual-style-guide.md]]
- #[[file:docs/Design_Docs/agent-behaviors/zombie-mechanics.md]]
- #[[file:docs/Code_Tech_Docs/subsystems/agent-system.md]]
