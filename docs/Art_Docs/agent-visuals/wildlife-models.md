# Wildlife Model Specifications

## Purpose

This document defines the visual specifications for all wildlife agents: fish, birds, dogs, and boats. Each agent type has distinct geometry, materials, and animation requirements.

---

## Fish Model

### Model Structure

```
fishBody (Box - root)
└── fishTail (Box)
```

### Geometry Specifications

| Part | Primitive | Dimensions | Position |
|------|-----------|------------|----------|
| Body | Box | width: 0.5, height: 0.3, depth: 1.0 | Origin |
| Tail | Box | width: 0.4, height: 0.2, depth: 0.3 | z: -0.6 (attached to back) |

### Materials

| Property | Value | Notes |
|----------|-------|-------|
| Type | StandardMaterial | |
| Diffuse Color | (0.4, 0.8, 1.0) | Light blue |
| Alpha | 0.8 | Semi-transparent |

### Animation

#### Tail Wagging

| Property | Value |
|----------|-------|
| Target Property | tailMesh.rotation.y |
| Animation Type | Procedural |
| Formula | sin(deltaTime × 5) × 0.5 |

### Scale

| Measurement | Value (units) |
|-------------|---------------|
| Length | 1.0 |
| Height | 0.3 |
| Width | 0.5 |

---

## Bird Model

### Model Structure

```
bird (TransformNode - root)
├── birdBody (Capsule)
├── wingLeft (Box)
├── wingRight (Box)
└── tail (Box)
```

### Geometry Specifications

| Part | Primitive | Dimensions | Position |
|------|-----------|------------|----------|
| Body | Capsule | radius: 0.2, height: 0.8, tessellation: 8 | Origin, rotation.z: π/2 |
| Left Wing | Box | width: 0.8, height: 0.05, depth: 0.3 | y: -0.2 |
| Right Wing | Box | width: 0.8, height: 0.05, depth: 0.3 | y: 0.2 |
| Tail | Box | width: 0.3, height: 0.05, depth: 0.2 | z: -0.4 |

### Materials

#### Body Material

| Property | Value | Notes |
|----------|-------|-------|
| Type | StandardMaterial | |
| Diffuse Color | (0.6-0.8, 0.6-0.8, 0.6-0.8) | Randomized gray tones |

**Color Generation:**
```
r = 0.6 + random() × 0.2
g = 0.6 + random() × 0.2
b = 0.6 + random() × 0.2
```

#### Wing Material

| Property | Value |
|----------|-------|
| Diffuse Color | bodyColor × 0.8 | Slightly darker than body |

### Animation

#### Wing Flapping

| Property | Value |
|----------|-------|
| Target Property | wing.rotation.x |
| Animation Type | Procedural |
| Flap Speed | 15 + speed × 20 |
| Flap Amount | 0.5 + speed × 0.5 |

**Formula:**
```
wingAngle = sin(deltaTime × flapSpeed) × flapAmount
leftWing.rotation.x = wingAngle
rightWing.rotation.x = -wingAngle
```

#### Tail Movement

| Property | Value |
|----------|-------|
| Target Property | tail.rotation.y |
| Formula | sin(deltaTime × 5) × 0.1 |

### Scale

| Measurement | Value (units) |
|-------------|---------------|
| Body Length | 0.8 |
| Wingspan | 1.6 |
| Height | 0.4 |

---

## Dog Model

### Model Structure

```
dogBody (Box - root with physics)
├── dogHead (Box)
│   └── dogSnout (Box)
│   └── dogEar × 2 (Box)
├── dogLeg × 4 (Box)
└── dogTail (Cylinder)
```

### Geometry Specifications

#### Body Parts

| Part | Primitive | Dimensions | Position |
|------|-----------|------------|----------|
| Body | Box | width: 0.8, height: 0.6, depth: 1.2 | Origin |
| Head | Box | width: 0.4, height: 0.4, depth: 0.4 | z: 0.7, y: 0.2 |
| Snout | Box | width: 0.25, height: 0.25, depth: 0.3 | z: 0.3, y: -0.05 (from head) |
| Ear | Box | width: 0.15, height: 0.3, depth: 0.1 | x: ±0.2, y: 0.2, rotation.z: ±π/6 |
| Tail | Cylinder | height: 0.6, diameter: 0.1, tessellation: 8 | z: -0.6, y: 0.1, rotation.x: π/4 |

#### Legs

| Leg | Position |
|-----|----------|
| Front Left | x: -0.3, z: 0.4, y: -0.6 |
| Front Right | x: 0.3, z: 0.4, y: -0.6 |
| Back Left | x: -0.3, z: -0.4, y: -0.6 |
| Back Right | x: 0.3, z: -0.4, y: -0.6 |

**Leg Dimensions:** width: 0.15, height: 0.6, depth: 0.15

### Materials

#### Body Material

| Variant | Diffuse Color | Selection Probability |
|---------|---------------|----------------------|
| Brown | (0.6, 0.4, 0.2) | 30% |
| Black | (0.1, 0.1, 0.1) | 30% |
| Golden | (0.8, 0.6, 0.2) | 40% |

#### Dark Material (Snout)

| Property | Value |
|----------|-------|
| Diffuse Color | (0.1, 0.1, 0.1) |

### Physics

| Property | Value |
|----------|-------|
| Shape Type | BOX |
| Mass | 1 |
| Restitution | 0.2 |
| Friction | 0.8 |

### Animation

#### Walking Animation

**Leg Animation:**
| Property | Value |
|----------|-------|
| Target Property | leg.rotation.x |
| Frame Rate | 30 fps |
| Loop Mode | CYCLE |
| Duration | 30 frames |

**Keyframe Formula:**
```
for frame 0 to 30:
    angle = (frame / 30) × 2π + phase
    value = sin(angle) × 0.3
```

**Phase Offset:** Alternating legs (index % 2) × π

**Tail Wagging:**
| Property | Value |
|----------|-------|
| Target Property | tail.rotation.z |
| Frame Rate | 30 fps |
| Loop Mode | CYCLE |

**Keyframes:**
| Frame | Value (radians) |
|-------|-----------------|
| 0 | -π/4 |
| 15 | π/4 |
| 30 | -π/4 |

### Scale

| Measurement | Value (units) |
|-------------|---------------|
| Length | 1.2 |
| Height | 0.6 (body) + 0.6 (legs) = 1.2 total |
| Width | 0.8 |

---

## Boat Model

### Model Structure

```
boat (TransformNode - root)
├── hull (Box)
├── mast (Cylinder)
└── sail (Plane)
```

### Geometry Specifications

| Part | Primitive | Dimensions | Position |
|------|-----------|------------|----------|
| Hull | Box | width: 2, height: 1, depth: 4 | y: 0.5 |
| Mast | Cylinder | diameter: 0.2, height: 4 | y: 2.5 |
| Sail | Plane | width: 2, height: 3 | y: 2, rotation.y: π/2 |

### Materials

#### Hull Material

| Property | Value | Notes |
|----------|-------|-------|
| Type | StandardMaterial | |
| Diffuse Color | (0.8-1.0, 0.4-0.6, 0.2-0.3) | Randomized wood tones |
| Specular Color | (0.2, 0.2, 0.2) | Low shine |

**Color Generation:**
```
r = 0.8 + random() × 0.2
g = 0.4 + random() × 0.2
b = 0.2 + random() × 0.1
```

#### Sail Material

| Property | Value |
|----------|-------|
| Diffuse Color | (1.0, 1.0, 1.0) |
| Back Face Culling | false |
| Specular Color | (0.1, 0.1, 0.1) |

### Animation

Boats use behavior-driven movement rather than skeletal animation. The boat mesh follows water surface height and rotates based on movement direction.

#### Water Surface Following

```
boat.position.y = waterLevel + 0.5
```

### Scale

| Measurement | Value (units) |
|-------------|---------------|
| Length | 4 |
| Width | 2 |
| Height | 4 (including mast) |

---

## Visual Distinction Summary

### Silhouette Comparison

| Agent | Key Silhouette Features |
|-------|------------------------|
| Fish | Horizontal body, wagging tail |
| Bird | Spread wings, compact body |
| Dog | Four-legged stance, wagging tail |
| Boat | Tall mast with sail |

### Movement Domain

| Agent | Domain | Movement Style |
|-------|--------|----------------|
| Fish | Water volume | Swimming, shoaling |
| Bird | Air volume | Flying, flocking |
| Dog | Ground | Walking, running |
| Boat | Water surface | Sailing |

### Color Palette Summary

| Agent | Primary Colors |
|-------|----------------|
| Fish | Light blue, translucent |
| Bird | Gray tones, varied |
| Dog | Brown/Black/Golden |
| Boat | Wood brown, white sail |

## Cross-References

- #[[file:docs/Art_Docs/visual-style-guide.md]]
- #[[file:docs/Design_Docs/agent-behaviors/wildlife-mechanics.md]]
- #[[file:docs/Code_Tech_Docs/subsystems/agent-system.md]]
