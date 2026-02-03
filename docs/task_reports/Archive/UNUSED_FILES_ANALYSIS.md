# Unused Files Analysis
**Generated:** February 3, 2026

## Summary

Based on import analysis and coverage data, the following files are **not imported or used** in the active codebase:

## 🔴 Confirmed Unused - Safe to Delete

### Archived Villager Systems (Already Archived)
These are in `MyHavokSimCode/Agents/Villagers/archived/` and not imported anywhere:
- ✅ `VillagerBehaviour.advanced.js` (1,477 lines)
- ✅ `VillagerShelterSystem.js` (2,209 lines)
- ✅ `VillagerSocialNetwork.js` (1,670 lines)
- ✅ `VillagerSurvivalInstinct.js` (1,089 lines)

**Total:** 6,445 lines already archived

### Backup/Duplicate Files
- `VillagerBehaviour.simple.js` - Backup copy of current `VillagerBehaviour.js`, not imported
- `CloudSystem.ts` - TypeScript version exists but `.js` version is used
- `CloudSystem.d.ts` - Type definition not needed (using JS)
- `BowlCreator.d.ts` - Type definition not needed (using JS)
- `WorldClock.d.ts` - Type definition not needed (using JS)
- `LevelConfig.d.ts` - Type definition not needed (using JS)

### Enhanced Zombie Systems (Not Used)
Current zombie system uses `ZombieBehaviour.js` only. These advanced systems are not imported:
- `EnhancedZombieBehaviour.js` (1,164 lines) - Not imported in Havokimport.js
- `ZombieGroupManager.js` (1,444 lines) - Only used by EnhancedZombieBehaviour
- `ZombieIntelligence.js` (1,068 lines) - Only used by EnhancedZombieBehaviour
- `ZombiePathfinding.js` (1,037 lines) - Only used by EnhancedZombieBehaviour

**Total:** 4,713 lines of unused zombie AI

### Dinosaur System (Not Used)
Imported in `BehavioralSim.js` but never initialized in main entry point:
- `DinosaurBehaviour.js` (200 lines)
- `DinosaurModel.js` (201 lines)

**Note:** BehavioralSim has `initializeDinosaur()` method but it's never called from `Havokimport.js`

### Test/Development Files (Root Directory)
- `test-eslint-property.js` - ESLint testing script
- `test-eslint-output-format.js` - ESLint testing script
- `test-eslint-output-format-final.js` - ESLint testing script
- `test-fastify.js` - Server testing script
- `test-migration.html` - Migration testing page
- `test-performance-monitor.html` - Performance testing page
- `compatibility-test.html` - Compatibility testing page
- `demo-coverage.js` - Coverage demo script (if exists)
- `test-browser-coverage.js` - Browser coverage script (if exists)

### Migration Tools (Not Used in Production)
- `migration-tools/FilePriorityManager.js`
- `migration-tools/MigrationOrchestrator.js`
- `migration-tools/TypeDefinitionHelpers.js`
- `migration-tools/tests/migration-priority-ordering.test.js`
- `migration-tools/tests/migration-progress-tracking.test.js`

### Cleanup Orchestrator (Standalone Tool)
- `cleanup-orchestrator.js` (4,400+ lines) - Standalone tool, not imported by main app
- `cleanup-orchestrator.cjs` - CommonJS version
- `cleanup-config.json` - Config for cleanup tool

### Build/Dev Tools
- `build-validate.js` - Only used by dev-server.js
- `dev-server.js` - Development server (not used in production)
- `dev.config.js` - Dev server config
- `launch-with-browser.js` - Launch script
- `launch-browser.bat` - Windows launch script

### Performance Test Files (Root Directory)
- `run-performance-tests.js` - Test runner
- `run-cpu-profiler-tests.js` - Test runner
- `run-data-storage-tests.js` - Test runner

### UI System Files (Not Integrated)
- `MyHavokSimCode/UI/RTSInterface.ts` - TypeScript RTS interface (not compiled/used)
- `MyHavokSimCode/UI/RTSInterfaceSystem.ts` - TypeScript RTS system (not compiled/used)
- `MyHavokSimCode/UI/RTSIntegrationExample.ts` - TypeScript example (not compiled/used)
- `MyHavokSimCode/UI/index.ts` - TypeScript index (not compiled/used)
- `MyHavokSimCode/UI/RTSInterfaceDemo.html` - Demo page (not linked)

**Note:** `RTSIntegrationHelper.js` IS used (imported in Havokimport.js)

### Core System Files (Not Used)
- `MyHavokSimCode/core/ErrorHandlers.js` - Not imported anywhere
- `MyHavokSimCode/core/ErrorHandling.ts` - TypeScript version (JS version exists)
- `MyHavokSimCode/core/SimulationSetup.ts` - TypeScript version (JS version exists)

### Emergency Patches
- `EMERGENCY-PERFORMANCE-PATCH.js` - Temporary patch file (should be integrated or removed)

## ⚠️ Potentially Unused - Needs Verification

### Systems Imported but Maybe Not Used
These are imported in `BehavioralSim.js` but may not be actively used:
- `DinosaurBehaviour` - Has init method but never called from main entry

### Performance System Files
Many performance monitoring files exist but may not be actively used in production. Need to verify which are actually initialized.

## 📊 Size Impact

### Immediate Deletion Candidates
- Archived villager systems: **6,445 lines**
- Enhanced zombie systems: **4,713 lines**
- Dinosaur system: **401 lines**
- Test files: ~**2,000 lines**
- Migration tools: ~**1,500 lines**
- Cleanup orchestrator: ~**4,400 lines**
- UI TypeScript files: ~**800 lines**

**Total potential reduction: ~20,000 lines of code**

## 🎯 Recommended Actions

### Phase 1: Safe Deletions (No Risk)
1. Delete test files in root directory
2. Delete `.d.ts` and `.ts` duplicate files
3. Delete `VillagerBehaviour.simple.js` (backup)
4. Delete `EMERGENCY-PERFORMANCE-PATCH.js` (if integrated)

### Phase 2: Archive Complex Systems
1. Move enhanced zombie systems to `archived/` folder
2. Move dinosaur system to `archived/` folder
3. Document why they were archived

### Phase 3: Tool Cleanup
1. Move migration tools to separate repository or archive
2. Move cleanup orchestrator to separate tools directory
3. Keep only essential build/dev tools

### Phase 4: Verify and Remove
1. Verify dinosaur system is truly unused
2. Verify enhanced zombie systems are not needed
3. Remove after confirmation

## 🔍 How to Verify Before Deletion

```bash
# Search for any references to a file
grep -r "filename" --exclude-dir=node_modules .

# Or use the cleanup orchestrator
node cleanup-orchestrator.js --phase analysis
node cleanup-orchestrator.js --phase verification
```

## 📝 Notes

- All archived villager systems are already safely archived
- Enhanced zombie systems are complete but unused (simple ZombieBehaviour is used instead)
- Dinosaur system is imported but never initialized
- Test files are development-only and safe to remove
- TypeScript files without compiled JS versions are unused
