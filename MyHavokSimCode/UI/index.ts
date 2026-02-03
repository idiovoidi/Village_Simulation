/**
 * UI Module Exports
 * 
 * RTS-style interface system with entity inspection
 * 
 * Quick Start:
 * ```typescript
 * import { RTSIntegrationHelper } from './UI';
 * 
 * const rtsUI = new RTSIntegrationHelper(scene);
 * rtsUI.initialize();
 * 
 * // In render loop
 * rtsUI.update();
 * rtsUI.updateResources(villagers, zombies, food);
 * ```
 * 
 * Documentation:
 * - QUICK_START.md - Get started in 5 minutes
 * - RTS_UI_README.md - Complete API reference
 * - INTEGRATION_GUIDE.md - Step-by-step integration
 * - UI_LAYOUT.md - Visual layout reference
 * - RTS_UI_SUMMARY.md - Implementation overview
 * - RTSInterfaceDemo.html - Interactive demo
 */

export { RTSInterface } from './RTSInterface';
export { RTSInterfaceSystem } from './RTSInterfaceSystem';
export { RTSIntegrationHelper } from './RTSIntegrationExample';
export { WorldClock } from './WorldClock';
