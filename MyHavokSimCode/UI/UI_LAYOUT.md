# RTS UI Layout Reference

## Screen Layout

```
┌─────────────────────────────────────────────────────────────────┐
│  TOP BAR (60px height)                                          │
│  ┌──────────────────┬─────────────────┬──────────────────┐     │
│  │ Resources        │   Time: 12:00   │   FPS: 60        │     │
│  │ Villagers: 10    │   [DAY/NIGHT]   │                  │     │
│  │ Zombies: 5       │                 │                  │     │
│  └──────────────────┴─────────────────┴──────────────────┘     │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  [WorldClock]                                                    │
│  (Optional)                                                      │
│                                                                  │
│                                                                  │
│                    3D SCENE AREA                                 │
│                                                                  │
│                  (Click entities to select)                      │
│                                                                  │
│                                                                  │
│                                                                  │
│                                                                  │
├─────────────────────────────────────────────────────────────────┤
│  BOTTOM BAR (200px height)                                      │
│  ┌────────────────────────────────────────────────────────┐    │
│  │  Selected Entity: Villager_1                           │    │
│  │  Type: Villager                                        │    │
│  │  Health: [████████████░░░░] 80/100                     │    │
│  │  State: Moving                                         │    │
│  │  Position: (12.5, 0.0, -8.3)                          │    │
│  └────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

## Component Breakdown

### Top Bar Components

```
┌─────────────────────────────────────────────────────────────────┐
│  LEFT SECTION          CENTER SECTION        RIGHT SECTION      │
│  ┌──────────────┐     ┌──────────────┐     ┌──────────────┐   │
│  │ Resources    │     │ Time Display │     │ FPS Counter  │   │
│  │ - Villagers  │     │ - Hours:Mins │     │ - Real-time  │   │
│  │ - Zombies    │     │ - Day/Night  │     │ - Rounded    │   │
│  │ - Custom     │     │ - 24hr clock │     │              │   │
│  └──────────────┘     └──────────────┘     └──────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### Bottom Bar Components

```
┌─────────────────────────────────────────────────────────────────┐
│  ENTITY SELECTION PANEL                                         │
│  ┌────────────────────────────────────────────────────────┐    │
│  │  Entity Name (Large, Bold, Accent Color)              │    │
│  │  Type: [Entity Type]                                   │    │
│  │                                                        │    │
│  │  Health Bar:                                           │    │
│  │  ┌──────────────────────────────────────────────┐     │    │
│  │  │ ████████████████████░░░░░░░░░░░░░░░░░░░░░░░ │     │    │
│  │  │              75/100                          │     │    │
│  │  └──────────────────────────────────────────────┘     │    │
│  │                                                        │    │
│  │  State: [Current State]                               │    │
│  │  Position: (X, Y, Z)                                  │    │
│  └────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

### Inspector Panel (Optional, Right Side)

```
                                              ┌──────────────────┐
                                              │  INSPECTOR       │
                                              │  (300px width)   │
                                              │                  │
                                              │  Detailed Info   │
                                              │  - Components    │
                                              │  - Stats         │
                                              │  - History       │
                                              │                  │
                                              │  [Future Use]    │
                                              │                  │
                                              └──────────────────┘
```

## Color Scheme

### Default Theme (Dark)

```
Background:     #1a1a1aee  (Semi-transparent dark gray)
Text:           #e0e0e0    (Light gray)
Accent:         #4a9eff    (Blue)
Border:         #666666    (Medium gray)

Health Colors:
  High (>66%):  #4caf50    (Green)
  Med (33-66%): #ff9800    (Orange)
  Low (<33%):   #f44336    (Red)

Special:
  Day:          #FFD700    (Gold)
  Night:        #7EB2DD    (Light blue)
```

## Dimensions

```
Screen Layout:
├─ Top Bar:        60px height, 100% width
├─ Scene Area:     calc(100% - 260px) height
└─ Bottom Bar:     200px height, 100% width

Top Bar Sections:
├─ Left (Resources):   ~400px width
├─ Center (Time):      ~200px width
└─ Right (FPS):        ~200px width

Bottom Bar:
└─ Selection Panel:    400px width, left-aligned

Inspector Panel:
└─ Width:              300px, right-aligned
```

## Responsive Behavior

### Desktop (>1200px)
- All elements visible
- Full width bars
- Inspector panel available

### Tablet (768px - 1200px)
- Bars remain full width
- Inspector panel hidden by default
- Selection panel width: 350px

### Mobile (<768px)
- Top bar: Stacked layout
- Bottom bar: Reduced height (150px)
- Inspector panel: Overlay mode
- Selection panel: Full width

## Z-Index Layers

```
Layer 5 (Top):     Inspector Panel (when visible)
Layer 4:           Top Bar
Layer 3:           Bottom Bar
Layer 2:           WorldClock
Layer 1 (Bottom):  3D Scene
```

## Interaction Zones

```
┌─────────────────────────────────────────────────────────────────┐
│  [Non-interactive - Display Only]                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│                                                                  │
│              [Interactive - Click to Select]                     │
│                                                                  │
│                                                                  │
├─────────────────────────────────────────────────────────────────┤
│  [Non-interactive - Display Only]                               │
└─────────────────────────────────────────────────────────────────┘
```

## Animation States

### Selection Animation
```
Unselected → Hover → Selected
   ↓          ↓         ↓
 Normal    Highlight  Glow
```

### Health Bar Animation
```
Damage Taken:
  Full → Flash Red → Update Bar → Fade to Normal
  
Healing:
  Current → Flash Green → Update Bar → Fade to Normal
```

### Time Display
```
Continuous:
  Update every frame
  Smooth transitions
  No flickering
```

## Accessibility

### Color Contrast
- Text on background: 7:1 ratio
- Accent on background: 4.5:1 ratio
- Health bars: Distinct colors for colorblind users

### Font Sizes
- Headers: 20px (1.25rem)
- Body: 14-16px (0.875-1rem)
- Small: 12px (0.75rem)

### Interactive Elements
- Minimum touch target: 44x44px
- Clear hover states
- Keyboard navigation support (future)

## Performance Targets

```
Update Frequency:
├─ FPS Counter:        Every frame
├─ Time Display:       Every frame
├─ Resources:          Every frame (cached)
├─ Selected Entity:    Every frame (if selected)
└─ Health Bars:        On change only

Render Performance:
├─ UI Draw Calls:      ~10-15
├─ Memory Usage:       ~2MB
└─ Frame Time:         <0.1ms
```

## Integration Points

```
Game Systems → UI System
├─ Day/Night Cycle → Time Display
├─ Agent Manager → Resource Counts
├─ Entity System → Selection Info
├─ Health System → Health Bars
└─ Performance Monitor → FPS Counter
```

## Customization Points

```typescript
// Colors
backgroundColor: string
textColor: string
accentColor: string

// Dimensions
topBarHeight: number
bottomBarHeight: number
inspectorWidth: number

// Behavior
autoHideInspector: boolean
showFPS: boolean
showTime: boolean
showResources: boolean
```

## Future Enhancements

```
Planned Features:
├─ Mini-map (bottom-right corner)
├─ Command buttons (bottom-center)
├─ Multi-select (shift+click)
├─ Entity grouping (ctrl+number)
├─ Hotkeys (1-9 for groups)
└─ Customizable layouts
```
