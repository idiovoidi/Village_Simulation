# UI Asset Specifications

## Purpose

This document defines the visual specifications for all user interface elements, including the world clock, overlays, and interactive controls.

## UI Framework

| Property | Value |
|----------|-------|
| Framework | Babylon.js GUI |
| Texture Type | AdvancedDynamicTexture (Fullscreen) |
| Z-Index | 1000 (ensures UI is on top) |

## World Clock

### Container

| Property | Value |
|----------|-------|
| Type | Rectangle |
| Width | 120px |
| Height | 120px |
| Corner Radius | 60 (circular) |
| Thickness | 2 |
| Background | rgba(0, 0, 0, 0.7) |
| Alignment | Top-Left |
| Top Offset | 20px |
| Left Offset | 20px |

### Progress Ring (Outer)

| Property | Value |
|----------|-------|
| Type | Ellipse |
| Width | 110px |
| Height | 110px |
| Color | #4CAF50 (green) |
| Thickness | 3 |
| Arc | 0-1 (based on day progress) |


### Inner Circle

| Property | Value |
|----------|-------|
| Type | Ellipse |
| Width | 100px |
| Height | 100px |
| Color | white |
| Thickness | 2 |
| Background | rgba(0, 0, 0, 0.5) |

### Time Text

| Property | Value |
|----------|-------|
| Type | TextBlock |
| Font Size | 32 |
| Font Family | Arial |
| Color | white |
| Outline Width | 2 |
| Outline Color | black |
| Format | HH:MM (24-hour) |

### Period Text

| Property | Value |
|----------|-------|
| Type | TextBlock |
| Font Size | 14 |
| Font Family | Arial |
| Outline Width | 1 |
| Outline Color | black |
| Top Offset | 25px |

**Period Colors:**
| Period | Color |
|--------|-------|
| DAY | #FFD700 (gold) |
| NIGHT | #7EB2DD (light blue) |

### Quarter Segments

| Property | Value |
|----------|-------|
| Count | 4 segments |
| Type | Ellipse |
| Width | 110px |
| Height | 110px |
| Thickness | 3 |
| Arc | 0.5 max per segment |

**Segment Colors:**
| Segment | Color | Time Range |
|---------|-------|------------|
| 0 (Dawn) | #FF9800 (orange) | 0:00 - 6:00 |
| 1 (Day) | #4CAF50 (green) | 6:00 - 12:00 |
| 2 (Dusk) | #2196F3 (blue) | 12:00 - 18:00 |
| 3 (Night) | #9C27B0 (purple) | 18:00 - 24:00 |

### Hour Markers

| Property | Value |
|----------|-------|
| Count | 24 markers |
| Type | Rectangle |
| Main Hour Width | 4px |
| Minor Hour Width | 2px |
| Main Hour Height | 12px |
| Minor Hour Height | 8px |
| Background | white |
| Radius | 48px from center |

**Main Hours:** Every 6 hours (0, 6, 12, 18)

### Glow Effect

| Property | Value |
|----------|-------|
| Type | Rectangle |
| Width | 120px |
| Height | 120px |
| Corner Radius | 60 |
| Alpha | 0.2-0.3 (animated) |
| Background | rgba(255, 255, 255, 0.1) |

**Animation:**
```
alpha = 0.2 + sin(time × 2) × 0.1
```

## Color Palette

### UI Colors

| Usage | Color | Hex |
|-------|-------|-----|
| Background | Dark transparent | rgba(0, 0, 0, 0.7) |
| Primary Text | White | #FFFFFF |
| Secondary Text | Light gray | #CCCCCC |
| Accent (Day) | Gold | #FFD700 |
| Accent (Night) | Light Blue | #7EB2DD |
| Progress | Green | #4CAF50 |
| Dawn | Orange | #FF9800 |
| Dusk | Blue | #2196F3 |
| Night | Purple | #9C27B0 |

### Transparency Guidelines

| Element | Alpha |
|---------|-------|
| Container Background | 0.7 |
| Inner Circle Background | 0.5 |
| Glow Effect | 0.2-0.3 |
| Text Outline | 1.0 |

## Typography

### Font Specifications

| Element | Font | Size | Weight |
|---------|------|------|--------|
| Time Display | Arial | 32px | Normal |
| Period Label | Arial | 14px | Normal |
| Labels | Arial | 12px | Normal |

### Text Effects

| Effect | Value |
|--------|-------|
| Outline Width | 1-2px |
| Outline Color | black |
| Shadow | None (outline provides contrast) |

## Animation Guidelines

### Subtle Animations

| Animation | Duration | Easing |
|-----------|----------|--------|
| Glow Pulse | 2 seconds | Sine wave |
| Progress Update | Per frame | Linear |
| Segment Fill | Per frame | Linear |

### Performance Considerations

- Animations use `onBeforeRenderObservable` for frame sync
- Minimal DOM manipulation (Babylon.js GUI is canvas-based)
- Alpha animations are GPU-accelerated

## Accessibility

### Contrast Requirements

| Element | Contrast Ratio |
|---------|----------------|
| Time Text | High (white on dark) |
| Period Text | High (gold/blue on dark) |
| Markers | Medium (white on transparent) |

### Readability

- Large font size (32px) for time display
- High contrast text outlines
- Clear visual hierarchy

## Responsive Behavior

### Fixed Positioning

The clock UI uses fixed pixel positioning:
- Always top-left corner
- 20px margin from edges
- Does not scale with viewport

### Future Considerations

For responsive design, consider:
- Percentage-based positioning
- Scalable font sizes
- Touch-friendly hit areas

## Cross-References

- #[[file:docs/Art_Docs/visual-style-guide.md]]
- #[[file:docs/Design_Docs/environment-systems/day-night-cycle.md]]
- #[[file:docs/Code_Tech_Docs/subsystems/render-system.md]]
