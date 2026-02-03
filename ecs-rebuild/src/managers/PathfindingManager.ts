/**
 * PathfindingManager
 * 
 * Manages navigation mesh and A* pathfinding for agent navigation.
 * Caches paths for performance and handles dynamic obstacle updates.
 * 
 * Requirements: 6.7
 */

import type { Vector3 } from '../components/CoreComponents.ts';
import { distance } from '../utils/Vector3Helpers.ts';

/**
 * Navigation node in the navigation mesh.
 */
export interface NavNode {
  id: number;
  position: Vector3;
  neighbors: number[]; // IDs of connected nodes
  walkable: boolean;
}

/**
 * Path result from pathfinding.
 */
export interface PathResult {
  found: boolean;
  path: Vector3[];
  cost: number;
}

/**
 * A* pathfinding node for search algorithm.
 */
interface AStarNode {
  id: number;
  position: Vector3;
  g: number; // Cost from start
  h: number; // Heuristic cost to goal
  f: number; // Total cost (g + h)
  parent: number | null;
}

/**
 * PathfindingManager handles navigation mesh creation and A* pathfinding.
 */
export class PathfindingManager {
  private nodes: Map<number, NavNode> = new Map();
  private nextNodeId = 0;
  private pathCache: Map<string, PathResult> = new Map();
  private maxCacheSize = 1000;
  private gridSize = 2; // Size of grid cells for nav mesh

  /**
   * Creates a navigation mesh from world geometry.
   * Generates a grid of walkable nodes.
   * 
   * @param bounds - Bounding box for the navigation area
   * @param obstacles - Positions of obstacles to avoid
   */
  createNavMesh(
    bounds: { min: Vector3; max: Vector3 },
    obstacles: Vector3[] = []
  ): void {
    this.nodes.clear();
    this.pathCache.clear();

    // Generate grid of nodes
    for (let x = bounds.min.x; x <= bounds.max.x; x += this.gridSize) {
      for (let z = bounds.min.z; z <= bounds.max.z; z += this.gridSize) {
        const position: Vector3 = { x, y: 0, z };

        // Check if position is blocked by obstacle
        const isBlocked = obstacles.some(
          obstacle => distance(position, obstacle) < this.gridSize
        );

        if (!isBlocked) {
          const node: NavNode = {
            id: this.nextNodeId++,
            position,
            neighbors: [],
            walkable: true
          };
          this.nodes.set(node.id, node);
        }
      }
    }

    // Connect neighboring nodes
    this.connectNodes();
  }

  /**
   * Connects nodes to their neighbors in the grid.
   */
  private connectNodes(): void {
    const nodeArray = Array.from(this.nodes.values());

    for (const node of nodeArray) {
      // Find neighbors within connection distance
      const connectionDistance = this.gridSize * 1.5; // Allow diagonal connections

      for (const other of nodeArray) {
        if (node.id === other.id) continue;

        const dist = distance(node.position, other.position);
        if (dist <= connectionDistance) {
          node.neighbors.push(other.id);
        }
      }
    }
  }

  /**
   * Finds a path from start to goal using A* algorithm.
   * 
   * @param start - Starting position
   * @param goal - Goal position
   * @param useCache - Whether to use cached paths
   * @returns Path result with waypoints
   */
  findPath(start: Vector3, goal: Vector3, useCache = true): PathResult {
    // Check cache
    if (useCache) {
      const cacheKey = this.getCacheKey(start, goal);
      const cached = this.pathCache.get(cacheKey);
      if (cached) {
        return cached;
      }
    }

    // Find nearest nodes to start and goal
    const startNode = this.findNearestNode(start);
    const goalNode = this.findNearestNode(goal);

    if (!startNode || !goalNode) {
      return { found: false, path: [], cost: 0 };
    }

    // Run A* algorithm
    const result = this.aStar(startNode.id, goalNode.id);

    // Add actual start and goal positions to path
    if (result.found && result.path.length > 0) {
      result.path = [start, ...result.path, goal];
    }

    // Cache result
    if (useCache) {
      this.cachePathResult(start, goal, result);
    }

    return result;
  }

  /**
   * A* pathfinding algorithm implementation.
   */
  private aStar(startId: number, goalId: number): PathResult {
    const openSet = new Map<number, AStarNode>();
    const closedSet = new Set<number>();

    const startNode = this.nodes.get(startId);
    const goalNode = this.nodes.get(goalId);

    if (!startNode || !goalNode) {
      return { found: false, path: [], cost: 0 };
    }

    // Initialize start node
    const startAStarNode: AStarNode = {
      id: startId,
      position: startNode.position,
      g: 0,
      h: distance(startNode.position, goalNode.position),
      f: 0,
      parent: null
    };
    startAStarNode.f = startAStarNode.g + startAStarNode.h;
    openSet.set(startId, startAStarNode);

    while (openSet.size > 0) {
      // Find node with lowest f score
      let current: AStarNode | null = null;
      let lowestF = Infinity;

      for (const node of openSet.values()) {
        if (node.f < lowestF) {
          lowestF = node.f;
          current = node;
        }
      }

      if (!current) break;

      // Goal reached
      if (current.id === goalId) {
        return this.reconstructPath(current, openSet);
      }

      openSet.delete(current.id);
      closedSet.add(current.id);

      // Check neighbors
      const currentNavNode = this.nodes.get(current.id);
      if (!currentNavNode) continue;

      for (const neighborId of currentNavNode.neighbors) {
        if (closedSet.has(neighborId)) continue;

        const neighborNavNode = this.nodes.get(neighborId);
        if (!neighborNavNode || !neighborNavNode.walkable) continue;

        const tentativeG = current.g + distance(current.position, neighborNavNode.position);

        let neighborAStarNode = openSet.get(neighborId);

        if (!neighborAStarNode) {
          // New node
          neighborAStarNode = {
            id: neighborId,
            position: neighborNavNode.position,
            g: tentativeG,
            h: distance(neighborNavNode.position, goalNode.position),
            f: 0,
            parent: current.id
          };
          neighborAStarNode.f = neighborAStarNode.g + neighborAStarNode.h;
          openSet.set(neighborId, neighborAStarNode);
        } else if (tentativeG < neighborAStarNode.g) {
          // Better path found
          neighborAStarNode.g = tentativeG;
          neighborAStarNode.f = neighborAStarNode.g + neighborAStarNode.h;
          neighborAStarNode.parent = current.id;
        }
      }
    }

    // No path found
    return { found: false, path: [], cost: 0 };
  }

  /**
   * Reconstructs the path from A* search result.
   */
  private reconstructPath(goalNode: AStarNode, openSet: Map<number, AStarNode>): PathResult {
    const path: Vector3[] = [];
    const visitedNodes = new Map<number, AStarNode>(openSet);
    let current: AStarNode | null = goalNode;
    let cost = goalNode.g;

    // Add goal node to visited for reconstruction
    visitedNodes.set(goalNode.id, goalNode);

    while (current) {
      path.unshift(current.position);

      if (current.parent === null) break;

      const parentNode: AStarNode | undefined = visitedNodes.get(current.parent) || this.findNodeInClosed(current.parent) || undefined;
      current = parentNode || null;
    }

    return { found: true, path, cost };
  }

  /**
   * Helper to find a node that was in the closed set.
   */
  private findNodeInClosed(nodeId: number): AStarNode | null {
    const navNode = this.nodes.get(nodeId);
    if (!navNode) return null;

    return {
      id: nodeId,
      position: navNode.position,
      g: 0,
      h: 0,
      f: 0,
      parent: null
    };
  }

  /**
   * Finds the nearest walkable node to a position.
   */
  private findNearestNode(position: Vector3): NavNode | null {
    let nearest: NavNode | null = null;
    let minDistance = Infinity;

    for (const node of this.nodes.values()) {
      if (!node.walkable) continue;

      const dist = distance(position, node.position);
      if (dist < minDistance) {
        minDistance = dist;
        nearest = node;
      }
    }

    return nearest;
  }

  /**
   * Updates the navigation mesh when obstacles change.
   * Marks nodes as unwalkable if they're blocked by obstacles.
   */
  updateObstacles(obstacles: Vector3[]): void {
    // Reset all nodes to walkable
    for (const node of this.nodes.values()) {
      node.walkable = true;
    }

    // Mark blocked nodes
    for (const node of this.nodes.values()) {
      const isBlocked = obstacles.some(
        obstacle => distance(node.position, obstacle) < this.gridSize
      );
      if (isBlocked) {
        node.walkable = false;
      }
    }

    // Clear path cache since obstacles changed
    this.pathCache.clear();
  }

  /**
   * Generates a cache key for a path.
   */
  private getCacheKey(start: Vector3, goal: Vector3): string {
    // Round to grid size for better cache hits
    const sx = Math.round(start.x / this.gridSize);
    const sz = Math.round(start.z / this.gridSize);
    const gx = Math.round(goal.x / this.gridSize);
    const gz = Math.round(goal.z / this.gridSize);
    return `${sx},${sz}-${gx},${gz}`;
  }

  /**
   * Caches a path result.
   */
  private cachePathResult(start: Vector3, goal: Vector3, result: PathResult): void {
    const key = this.getCacheKey(start, goal);

    // Limit cache size
    if (this.pathCache.size >= this.maxCacheSize) {
      // Remove oldest entry (first in map)
      const firstKey = this.pathCache.keys().next().value;
      if (firstKey) {
        this.pathCache.delete(firstKey);
      }
    }

    this.pathCache.set(key, result);
  }

  /**
   * Clears the path cache.
   */
  clearCache(): void {
    this.pathCache.clear();
  }

  /**
   * Gets the number of nodes in the navigation mesh.
   */
  getNodeCount(): number {
    return this.nodes.size;
  }

  /**
   * Gets all nodes (for debugging/visualization).
   */
  getNodes(): NavNode[] {
    return Array.from(this.nodes.values());
  }

  /**
   * Sets the grid size for the navigation mesh.
   */
  setGridSize(size: number): void {
    this.gridSize = size;
  }
}
