# Level System Documentation

## Overview

The Level System manages different simulation configurations, allowing for varied environments and gameplay scenarios.

## Core Components

### Level Configuration
- **Class**: `LevelConfig`
- **Purpose**: Defines level parameters and active systems
- **Features**:
  - System activation flags
  - Entity population controls
  - Environmental settings
  - Performance configurations

### Level Selector
- **Class**: `LevelSelector`
- **Purpose**: Manages level loading and transitions
- **Features**:
  - Level switching
  - State management
  - Resource loading/unloading
  - Transition effects

## Configuration Structure

```javascript
class LevelConfig {
  static getCurrentLevel() {
    return {
      // System Flags
      hasVillage: true,
      hasWater: true,
      hasFish: true,
      hasBirds: true,
      hasZombies: false,
      hasDogs: true,
      hasClouds: true,

      // Population Controls
      fishCount: 50,
      birdCount: 30,
      dogCount: 10,
      zombieCount: 0,

      // Environmental Settings
      timeOfDay: 8 * 60, // 8:00 AM
      weatherType: 'sunny',
      waterLevel: 0,
      
      // Performance Settings
      lodLevels: 3,
      maxEntities: 1000,
      physicsQuality: 'high'
    };
  }
}
```

## Level Loading Process

1. **Initialization**
   ```javascript
   async loadLevel(level) {
     // Dispose current systems
     this.disposeCurrentSystems();
     
     // Load new configuration
     this.currentLevel = level;
     
     // Initialize required systems
     await this.initializeSystems(level);
     
     // Setup environment
     this.setupEnvironment();
   }
   ```

2. **System Initialization**
   ```javascript
   async initializeSystems(level) {
     // Initialize based on system configs
     for (const [key, config] of Object.entries(SYSTEM_CONFIGS)) {
       if (level[config.condition]) {
         await this.initializeSystemGroup(config, level);
       }
     }
   }
   ```

3. **Cleanup**
   ```javascript
   disposeCurrentSystems() {
     // Cleanup resources
     // Remove entities
     // Reset state
   }
   ```

## Performance Management

### Resource Loading
- Progressive asset loading
- Texture streaming
- Mesh instancing
- Memory management

### Level Optimization
- System-specific LOD
- View distance management
- Entity culling
- Physics optimization

## Level Types

1. **Village Environment**
   - Dense population
   - Full infrastructure
   - High interaction count

2. **Rural Environment**
   - Sparse population
   - Natural features
   - Wildlife focus

3. **Coastal Environment**
   - Water features
   - Marine life
   - Boat traffic

4. **Wilderness Environment**
   - Minimal infrastructure
   - Maximum wildlife
   - Natural phenomena

## Integration with Other Systems

### Time System Integration
- Day/night cycle effects
- Weather pattern changes
- Activity scheduling

### AI System Integration
- Population management
- Behavior adaptation
- Territory allocation

### Physics System Integration
- Environment-specific physics
- Performance scaling
- Collision management 