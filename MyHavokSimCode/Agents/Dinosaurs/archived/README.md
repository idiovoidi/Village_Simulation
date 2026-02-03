# Archived Dinosaur System

## Why Archived
The dinosaur system was imported in `BehavioralSim.js` but never initialized in the main entry point (`Havokimport.js`). It was not being used in any active levels.

## Archived Files
- `DinosaurBehaviour.js` (200 lines) - Dinosaur behavior and movement
- `DinosaurModel.js` (201 lines) - Dinosaur visual model

**Total:** 401 lines

## What This System Provided
- Large wandering creatures
- Bigger wander radius than dogs
- Rest/active cycles
- Visual dinosaur models with body parts

## Why Not Used
- Not included in any level configurations
- `initializeDinosaur()` method exists in BehavioralSim but never called
- No dinosaur-specific gameplay mechanics implemented

## Restoration
To restore and use dinosaurs:

1. **Copy files back:**
   ```bash
   copy MyHavokSimCode\Agents\Dinosaurs\archived\*.js MyHavokSimCode\Agents\Dinosaurs\
   ```

2. **Add to level config** in `LevelSystem/LevelConfig.js`:
   ```javascript
   {
     name: 'Jurassic Village',
     hasDinosaurs: true,
     dinosaurCount: 3,
     // ... other config
   }
   ```

3. **Add to SYSTEM_CONFIGS** in `Havokimport.js`:
   ```javascript
   dinosaurs: {
     condition: 'hasDinosaurs',
     systems: [
       { 
         name: 'dinosaurSystem', 
         class: DinosaurBehaviour,
         initialize: (instance, level) => instance.initialize(level.dinosaurCount)
       }
     ]
   }
   ```

4. **Import in Havokimport.js:**
   ```javascript
   import { DinosaurBehaviour } from './Agents/Dinosaurs/DinosaurBehaviour.js';
   ```

**Archived:** February 3, 2026
**Reason:** Not initialized or used in any active levels
