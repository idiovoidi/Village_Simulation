# Babylon.js 8.29.0 Upgrade
**Date:** February 3, 2026

## Why
Upgrade from Babylon.js 8.4.0 to 8.29.0 for latest features, bug fixes, and performance improvements.

## What Changed

### Package Updates
All `@babylonjs/*` packages updated from 8.4.0 to 8.29.0:
- `@babylonjs/core`, `@babylonjs/gui`, `@babylonjs/inspector`, `@babylonjs/loaders`, `@babylonjs/materials`
- `@babylonjs/havok` unchanged at 1.3.10 (already latest)

### Code Fixes
Fixed incorrect ES6 imports in 2 files (now use global `BABYLON` object from CDN):
- `MyHavokSimCode/Utilities/NavMeshHelper.js`
- `MyHavokSimCode/core/CompatibilityTestFramework.js`

### Compatibility
All existing APIs compatible with 8.29.0:
- Modern `MeshBuilder` API ✓
- Physics engine initialization (both HavokPlugin and PhysicsEnginePlugin) ✓
- Materials, shadows, optimization flags ✓

## Verification
Created test files to validate upgrade:
- `test-babylon-compatibility.js` / `.html`
- `test-api-migration.js` / `.html`
- `test-dev-environment.js` / `.html`

All tests passed. No breaking changes affecting codebase.
