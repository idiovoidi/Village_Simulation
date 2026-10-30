/**
 * Performance System
 * 
 * Comprehensive performance monitoring and optimization.
 * Ported from MyHavokSimCode/Performance/PerformanceMonitor.js
 */

import { System } from '../../core/System.ts';
import type { World } from '../../core/World.ts';

/**
 * Performance configuration
 */
export interface PerformanceConfig {
  targetFPS: number;
  updateFrequency: number;
  enableMonitoring: boolean;
  enableOptimization: boolean;
}

/**
 * Default performance configuration
 */
const DEFAULT_CONFIG: PerformanceConfig = {
  targetFPS: 60,
  updateFrequency: 60,
  enableMonitoring: true,
  enableOptimization: true,
};

/**
 * Performance metrics
 */
export interface PerformanceMetrics {
  fps: number;
  frameTime: number;
  memoryUsage: number;
  drawCalls: number;
  triangles: number;
  entities: number;
  activeEntities: number;
}

/**
 * Performance alert
 */
export interface PerformanceAlert {
  type: 'fps' | 'memory' | 'cpu';
  severity: 'info' | 'warning' | 'critical';
  message: string;
  timestamp: number;
}

/**
 * PerformanceSystem monitors and optimizes performance
 */
export class PerformanceSystem extends System {
  readonly componentSignature = new Set(['Performance']);
  readonly priority = 800; // Run late

  private scene: unknown = null;
  private engine: unknown = null;
  private config: PerformanceConfig;
  
  // Metrics tracking
  private fps = 60;
  private frameTime = 0;
  private memoryUsage = 0;
  private drawCalls = 0;
  private triangles = 0;
  
  // History
  private metricsHistory: PerformanceMetrics[] = [];
  private maxHistorySize = 1000;
  
  // Monitoring state
  private isMonitoring = false;
  private lastUpdate = 0;
  
  // Callbacks
  private updateCallbacks: ((metrics: PerformanceMetrics) => void)[] = [];
  private alertCallbacks: ((alert: PerformanceAlert) => void)[] = [];
  
  // Thresholds
  private fpsWarningThreshold = 30;
  private fpsCriticalThreshold = 15;
  private memoryWarningThreshold = 75;
  private memoryCriticalThreshold = 90;

  constructor(world: World, scene: unknown, engine: unknown, config: Partial<PerformanceConfig> = {}) {
    super(world);
    this.scene = scene;
    this.engine = engine;
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Initialize the performance system
   */
  async initialize(): Promise<void> {
    console.log('Initializing performance system...');
    
    if (this.config.enableMonitoring) {
      this.startMonitoring();
    }
    
    console.log('PerformanceSystem initialized');
  }

  /**
   * Start performance monitoring
   */
  startMonitoring(): void {
    if (this.isMonitoring) return;
    
    this.isMonitoring = true;
    this.lastUpdate = performance.now();
    
    console.log('Performance monitoring started');
  }

  /**
   * Stop performance monitoring
   */
  stopMonitoring(): void {
    this.isMonitoring = false;
    console.log('Performance monitoring stopped');
  }

  /**
   * Update performance metrics
   */
  update(_deltaTime: number): void {
    if (!this.isMonitoring) return;

    const now = performance.now();
    const updateInterval = 1000 / this.config.updateFrequency;

    if (now - this.lastUpdate < updateInterval) return;
    this.lastUpdate = now;

    // Collect metrics
    this.collectMetrics();

    // Store in history
    this.storeMetrics();

    // Check thresholds
    this.checkThresholds();

    // Notify callbacks
    this.notifyUpdateCallbacks();
  }

  /**
   * Collect current performance metrics
   */
  private collectMetrics(): void {
    // Get FPS from engine
    if (this.engine) {
      const eng = this.engine as { getFps?: () => number; getDeltaTime?: () => number };
      this.fps = eng.getFps?.() || 60;
      this.frameTime = eng.getDeltaTime?.() || 16.67;
    }

    // Get memory usage
    if (typeof performance !== 'undefined' && (performance as { memory?: { usedJSHeapSize?: number } }).memory) {
      const memory = (performance as unknown as { memory: { usedJSHeapSize: number; jsHeapSizeLimit: number } }).memory;
      this.memoryUsage = (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100;
    }

    // Get rendering metrics from scene
    if (this.scene) {
      const scn = this.scene as {
        getEngine?: () => { getDrawCalls?: () => number };
        getActiveMeshes?: () => { length: number; data?: Array<{ getTotalIndices?: () => number }> };
      };
      
      const babylonEngine = scn.getEngine?.();
      this.drawCalls = babylonEngine?.getDrawCalls?.() || 0;
      
      const activeMeshes = scn.getActiveMeshes?.();
      const active = activeMeshes?.data ?? [];
      this.triangles = active.reduce((sum, m) => sum + (m?.getTotalIndices?.() ?? 0), 0) / 3;
    }
  }

  /**
   * Store metrics in history
   */
  private storeMetrics(): void {
    const metrics: PerformanceMetrics = {
      fps: this.fps,
      frameTime: this.frameTime,
      memoryUsage: this.memoryUsage,
      drawCalls: this.drawCalls,
      triangles: this.triangles,
      entities: this.world.entityCount,
      activeEntities: this.world.entityCount,
    };

    this.metricsHistory.push(metrics);

    // Trim history
    if (this.metricsHistory.length > this.maxHistorySize) {
      this.metricsHistory.shift();
    }
  }

  /**
   * Check performance thresholds
   */
  private checkThresholds(): void {
    // Check FPS
    if (this.fps < this.fpsCriticalThreshold) {
      this.triggerAlert({
        type: 'fps',
        severity: 'critical',
        message: `Critical FPS drop: ${this.fps.toFixed(1)}`,
        timestamp: performance.now(),
      });
    } else if (this.fps < this.fpsWarningThreshold) {
      this.triggerAlert({
        type: 'fps',
        severity: 'warning',
        message: `Low FPS: ${this.fps.toFixed(1)}`,
        timestamp: performance.now(),
      });
    }

    // Check memory
    if (this.memoryUsage > this.memoryCriticalThreshold) {
      this.triggerAlert({
        type: 'memory',
        severity: 'critical',
        message: `High memory usage: ${this.memoryUsage.toFixed(1)}%`,
        timestamp: performance.now(),
      });
    } else if (this.memoryUsage > this.memoryWarningThreshold) {
      this.triggerAlert({
        type: 'memory',
        severity: 'warning',
        message: `Elevated memory usage: ${this.memoryUsage.toFixed(1)}%`,
        timestamp: performance.now(),
      });
    }
  }

  /**
   * Trigger performance alert
   */
  private triggerAlert(alert: PerformanceAlert): void {
    for (const callback of this.alertCallbacks) {
      try {
        callback(alert);
      } catch (error) {
        console.error('Error in performance alert callback:', error);
      }
    }
  }

  /**
   * Notify update callbacks
   */
  private notifyUpdateCallbacks(): void {
    const metrics = this.getCurrentMetrics();
    
    for (const callback of this.updateCallbacks) {
      try {
        callback(metrics);
      } catch (error) {
        console.error('Error in performance update callback:', error);
      }
    }
  }

  /**
   * Get current performance metrics
   */
  getCurrentMetrics(): PerformanceMetrics {
    return {
      fps: this.fps,
      frameTime: this.frameTime,
      memoryUsage: this.memoryUsage,
      drawCalls: this.drawCalls,
      triangles: this.triangles,
      entities: this.world.entityCount,
      activeEntities: this.world.entityCount,
    };
  }

  /**
   * Get metrics history
   */
  getMetricsHistory(count?: number): PerformanceMetrics[] {
    if (count) {
      return this.metricsHistory.slice(-count);
    }
    return [...this.metricsHistory];
  }

  /**
   * Get average FPS over recent frames
   */
  getAverageFPS(count: number = 60): number {
    const recent = this.metricsHistory.slice(-count);
    if (recent.length === 0) return this.fps;
    
    const sum = recent.reduce((acc, m) => acc + m.fps, 0);
    return sum / recent.length;
  }

  /**
   * Register update callback
   */
  onUpdate(callback: (metrics: PerformanceMetrics) => void): () => void {
    this.updateCallbacks.push(callback);
    return () => {
      const index = this.updateCallbacks.indexOf(callback);
      if (index > -1) this.updateCallbacks.splice(index, 1);
    };
  }

  /**
   * Register alert callback
   */
  onAlert(callback: (alert: PerformanceAlert) => void): () => void {
    this.alertCallbacks.push(callback);
    return () => {
      const index = this.alertCallbacks.indexOf(callback);
      if (index > -1) this.alertCallbacks.splice(index, 1);
    };
  }

  /**
   * Set target FPS
   */
  setTargetFPS(fps: number): void {
    this.config.targetFPS = fps;
  }

  /**
   * Get target FPS
   */
  getTargetFPS(): number {
    return this.config.targetFPS;
  }

  /**
   * Check if performance is optimal
   */
  isPerformanceOptimal(): boolean {
    return this.fps >= this.config.targetFPS * 0.9;
  }

  /**
   * Dispose of performance system resources
   */
  dispose(): void {
    this.stopMonitoring();
    this.metricsHistory = [];
    this.updateCallbacks = [];
    this.alertCallbacks = [];
    console.log('PerformanceSystem disposed');
  }
}