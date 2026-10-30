/**
 * Navigation Mesh
 * 
 * Creates and manages navigation mesh for agent pathfinding.
 * Ported from MyHavokSimCode/Navigation/NavigationMesh.js
 */

import { System } from '../../core/System.ts';
import type { World } from '../../core/World.ts';
import { TerrainSystem } from '../environment/TerrainSystem.ts';

/**
 * Navigation mesh configuration
 */
export interface NavigationMeshConfig {
  gridSize: number;
  spacing: number;
  debug: boolean;
}

/**
 * Default navigation mesh configuration
 */
const DEFAULT_CONFIG: NavigationMeshConfig = {
  gridSize: 20,
  spacing: 10,
  debug: false,
};

/**
 * Path node structure
 */
interface PathNode {
  id: string;
  position: { x: number; y: number; z: number };
  neighbors: PathNode[];
  walkable: boolean;
}

/**
 * NavigationMesh creates and manages navigation mesh for pathfinding
 */
export class NavigationMesh extends System {
  readonly componentSignature = new Set(['NavigationMesh']);
  readonly priority = 8; // Run early, after terrain

  private scene: unknown = null;
  private config: NavigationMeshConfig;
  private pathNodes: PathNode[] = [];
  private navigationMesh: unknown = null;
  private terrainSystem: TerrainSystem | null = null;
  private initialized = false;

  constructor(world: World, scene: unknown, config: Partial<NavigationMeshConfig> = {}) {
    super(world);
    this.scene = scene;
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Set terrain system for height queries
   */
  setTerrainSystem(terrainSystem: TerrainSystem): void {
    this.terrainSystem = terrainSystem;
  }

  /**
   * Initialize the navigation mesh
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      console.warn('NavigationMesh already initialized');
      return;
    }

    console.log('Creating navigation mesh...');

    // Create path nodes
    this.createPathNodes();

    // Create navigation mesh geometry
    this.createNavigationMeshGeometry();

    this.initialized = true;
    console.log('NavigationMesh initialized');
  }

  /**
   * Create path nodes across the landscape
   */
  private createPathNodes(): void {
    const { gridSize, spacing, debug } = this.config;
    let nodeId = 0;

    for (let x = -gridSize; x <= gridSize; x += spacing) {
      for (let z = -gridSize; z <= gridSize; z += spacing) {
        const worldX = x * 5;
        const worldZ = z * 5;
        const worldY = this.getHeightAtPoint(worldX, worldZ);

        const node: PathNode = {
          id: `node_${nodeId++}`,
          position: { x: worldX, y: worldY, z: worldZ },
          neighbors: [],
          walkable: worldY > -15, // Not underwater
        };

        this.pathNodes.push(node);

        // Visualize nodes in debug mode
        if (debug) {
          this.createNodeVisualization(node);
        }
      }
    }

    // Connect nodes to neighbors
    this.connectNodes();
  }

  /**
   * Create debug visualization for a node
   */
  private createNodeVisualization(node: PathNode): void {
    const BABYLON = (window as unknown as { BABYLON: typeof import('babylonjs') }).BABYLON;
    if (!BABYLON || !this.scene) return;

    const sphere = BABYLON.MeshBuilder.CreateSphere(
      `nodeVis_${node.id}`,
      { diameter: 1 },
      this.scene as import('babylonjs').Scene
    );
    sphere.position = new (BABYLON as any).Vector3(node.position.x, node.position.y, node.position.z);
    sphere.visibility = 0.3;
  }

  /**
   * Connect nodes to their neighbors
   */
  private connectNodes(): void {
    const { spacing } = this.config;
    const connectionDistance = spacing * 5 * 1.5; // Allow diagonal connections

    for (const node of this.pathNodes) {
      if (!node.walkable) continue;

      for (const other of this.pathNodes) {
        if (node.id === other.id || !other.walkable) continue;

        const dx = node.position.x - other.position.x;
        const dz = node.position.z - other.position.z;
        const distance = Math.sqrt(dx * dx + dz * dz);

        if (distance <= connectionDistance) {
          node.neighbors.push(other);
        }
      }
    }
  }

  /**
   * Create navigation mesh geometry
   */
  private createNavigationMeshGeometry(): { positions: number[]; indices: number[] } {
    const positions: number[] = [];
    const indices: number[] = [];

    // Create mesh from walkable nodes
    for (const node of this.pathNodes) {
      if (!node.walkable) continue;

      positions.push(node.position.x, node.position.y + 0.1, node.position.z);
    }

    // Create indices (simplified - just points)
    for (let i = 0; i < positions.length / 3; i++) {
      indices.push(i);
    }

    return { positions, indices };
  }

  /**
   * Get terrain height at point
   */
  private getHeightAtPoint(x: number, z: number): number {
    if (this.terrainSystem) {
      return this.terrainSystem.getHeightAt(x, z);
    }
    return TerrainSystem.getTerrainHeight(x, z);
  }

  /**
   * Find path between two positions using A* algorithm
   */
  findPath(
    start: { x: number; y: number; z: number },
    end: { x: number; y: number; z: number }
  ): { x: number; y: number; z: number }[] {
    const startNode = this.findNearestNode(start);
    const endNode = this.findNearestNode(end);

    if (!startNode || !endNode || !startNode.walkable || !endNode.walkable) {
      return [];
    }

    // A* pathfinding
    const openSet: PathNode[] = [startNode];
    const closedSet = new Set<string>();
    const cameFrom = new Map<string, PathNode>();
    const gScore = new Map<string, number>();
    const fScore = new Map<string, number>();

    gScore.set(startNode.id, 0);
    fScore.set(startNode.id, this.heuristic(startNode, endNode));

    while (openSet.length > 0) {
      // Get node with lowest fScore
      openSet.sort((a, b) => (fScore.get(a.id) || Infinity) - (fScore.get(b.id) || Infinity));
      const current = openSet.shift()!;

      if (current.id === endNode.id) {
        return this.reconstructPath(cameFrom, current);
      }

      closedSet.add(current.id);

      for (const neighbor of current.neighbors) {
        if (closedSet.has(neighbor.id) || !neighbor.walkable) continue;

        const tentativeGScore = (gScore.get(current.id) || 0) + this.distance(current, neighbor);

        if (tentativeGScore < (gScore.get(neighbor.id) || Infinity)) {
          cameFrom.set(neighbor.id, current);
          gScore.set(neighbor.id, tentativeGScore);
          fScore.set(neighbor.id, tentativeGScore + this.heuristic(neighbor, endNode));

          if (!openSet.includes(neighbor)) {
            openSet.push(neighbor);
          }
        }
      }
    }

    return []; // No path found
  }

  /**
   * Heuristic for A* (Euclidean distance)
   */
  private heuristic(a: PathNode, b: PathNode): number {
    return this.distance(a, b);
  }

  /**
   * Distance between two nodes
   */
  private distance(a: PathNode, b: PathNode): number {
    const dx = a.position.x - b.position.x;
    const dy = a.position.y - b.position.y;
    const dz = a.position.z - b.position.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  /**
   * Reconstruct path from A* results
   */
  private reconstructPath(cameFrom: Map<string, PathNode>, current: PathNode): { x: number; y: number; z: number }[] {
    const path: { x: number; y: number; z: number }[] = [current.position];
    let node: PathNode | undefined = current;

    while (node && cameFrom.has(node.id)) {
      node = cameFrom.get(node.id);
      if (node) {
        path.unshift(node.position);
      }
    }

    return path;
  }

  /**
   * Find nearest walkable node to position
   */
  private findNearestNode(position: { x: number; y: number; z: number }): PathNode | null {
    let nearest: PathNode | null = null;
    let minDistance = Infinity;

    for (const node of this.pathNodes) {
      if (!node.walkable) continue;

      const dx = node.position.x - position.x;
      const dz = node.position.z - position.z;
      const distance = Math.sqrt(dx * dx + dz * dz);

      if (distance < minDistance) {
        minDistance = distance;
        nearest = node;
      }
    }

    return nearest;
  }

  /**
   * Get node count
   */
  getNodeCount(): number {
    return this.pathNodes.length;
  }

  /**
   * Get walkable node count
   */
  getWalkableNodeCount(): number {
    return this.pathNodes.filter(n => n.walkable).length;
  }

  /**
   * Update system (not needed for static nav mesh)
   */
  update(_deltaTime: number): void {
    // Navigation mesh is static
  }

  /**
   * Dispose of navigation mesh resources
   */
  dispose(): void {
    if (this.navigationMesh) {
      (this.navigationMesh as { dispose: () => void }).dispose();
      this.navigationMesh = null;
    }

    this.pathNodes = [];
    this.initialized = false;
    console.log('NavigationMesh disposed');
  }
}