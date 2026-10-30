/**
 * Spatial Grid
 * 
 * Grid-based spatial partitioning for efficient entity queries.
 * Optimizes nearest-neighbor searches and range queries.
 * 
 * Requirements: 10.3
 */

import type { EntityId } from '../core/Entity.ts';
import type { Vector3 } from '../components/CoreComponents.ts';

/**
 * Spatial grid cell containing entity IDs.
 */
interface GridCell {
  entities: Set<EntityId>;
}

/**
 * Spatial grid for efficient spatial queries.
 * Divides 3D space into a grid of cells for fast lookups.
 */
export class SpatialGrid {
  private cellSize: number;
  private cells: Map<string, GridCell>;
  private entityPositions: Map<EntityId, Vector3>;
  private entityCells: Map<EntityId, string>;

  /**
   * Creates a new SpatialGrid.
   * 
   * @param cellSize - Size of each grid cell (larger = fewer cells, less precise)
   */
  constructor(cellSize: number) {
    if (cellSize <= 0) {
      throw new Error('Cell size must be positive');
    }
    this.cellSize = cellSize;
    this.cells = new Map();
    this.entityPositions = new Map();
    this.entityCells = new Map();
  }

  /**
   * Inserts an entity at the given position.
   * 
   * @param entity - Entity ID to insert
   * @param position - Position of the entity
   */
  insert(entity: EntityId, position: Vector3): void {
    // Remove from old cell if it exists
    this.remove(entity);

    // Get cell key for position
    const cellKey = this.getCellKey(position);

    // Create cell if it doesn't exist
    if (!this.cells.has(cellKey)) {
      this.cells.set(cellKey, { entities: new Set() });
    }

    // Add entity to cell
    const cell = this.cells.get(cellKey)!;
    cell.entities.add(entity);

    // Store entity position and cell
    this.entityPositions.set(entity, { ...position });
    this.entityCells.set(entity, cellKey);
  }

  /**
   * Removes an entity from the grid.
   * 
   * @param entity - Entity ID to remove
   * @returns true if the entity was removed, false if it wasn't in the grid
   */
  remove(entity: EntityId): boolean {
    const cellKey = this.entityCells.get(entity);
    if (!cellKey) {
      return false;
    }

    // Remove from cell
    const cell = this.cells.get(cellKey);
    if (cell) {
      cell.entities.delete(entity);

      // Remove empty cells to save memory
      if (cell.entities.size === 0) {
        this.cells.delete(cellKey);
      }
    }

    // Remove entity tracking
    this.entityPositions.delete(entity);
    this.entityCells.delete(entity);

    return true;
  }

  /**
   * Updates an entity's position.
   * More efficient than remove + insert if the entity stays in the same cell.
   * 
   * @param entity - Entity ID to update
   * @param newPosition - New position of the entity
   */
  update(entity: EntityId, newPosition: Vector3): void {
    const oldCellKey = this.entityCells.get(entity);
    const newCellKey = this.getCellKey(newPosition);

    // If cell hasn't changed, just update position
    if (oldCellKey === newCellKey) {
      this.entityPositions.set(entity, { ...newPosition });
      return;
    }

    // Otherwise, move to new cell
    this.insert(entity, newPosition);
  }

  /**
   * Queries for entities within a radius of a position.
   * 
   * @param position - Center position
   * @param radius - Search radius
   * @returns Array of entity IDs within the radius
   */
  query(position: Vector3, radius: number): EntityId[] {
    const results: EntityId[] = [];
    const radiusSquared = radius * radius;

    // Get all cells that could contain entities within radius
    const cellsToCheck = this.getCellsInRadius(position, radius);

    // Check each cell
    for (const cellKey of cellsToCheck) {
      const cell = this.cells.get(cellKey);
      if (!cell) {
        continue;
      }

      // Check each entity in the cell
      for (const entityId of cell.entities) {
        const entityPos = this.entityPositions.get(entityId);
        if (!entityPos) {
          continue;
        }

        // Check if entity is actually within radius
        const distSquared = this.distanceSquared(position, entityPos);
        if (distSquared <= radiusSquared) {
          results.push(entityId);
        }
      }
    }

    return results;
  }

  /**
   * Queries for the nearest entity to a position.
   * 
   * @param position - Center position
   * @param maxRadius - Maximum search radius
   * @returns Nearest entity ID and distance, or null if none found
   */
  queryNearest(
    position: Vector3,
    maxRadius: number
  ): { entity: EntityId; distance: number } | null {
    let nearestEntity: EntityId | null = null;
    let nearestDistanceSquared = maxRadius * maxRadius;

    // Get all cells that could contain entities within max radius
    const cellsToCheck = this.getCellsInRadius(position, maxRadius);

    // Check each cell
    for (const cellKey of cellsToCheck) {
      const cell = this.cells.get(cellKey);
      if (!cell) {
        continue;
      }

      // Check each entity in the cell
      for (const entityId of cell.entities) {
        const entityPos = this.entityPositions.get(entityId);
        if (!entityPos) {
          continue;
        }

        // Check if entity is closer than current nearest
        const distSquared = this.distanceSquared(position, entityPos);
        if (distSquared < nearestDistanceSquared) {
          nearestEntity = entityId;
          nearestDistanceSquared = distSquared;
        }
      }
    }

    if (nearestEntity === null) {
      return null;
    }

    return {
      entity: nearestEntity,
      distance: Math.sqrt(nearestDistanceSquared)
    };
  }

  /**
   * Queries for entities within a box region.
   * 
   * @param min - Minimum corner of the box
   * @param max - Maximum corner of the box
   * @returns Array of entity IDs within the box
   */
  queryBox(min: Vector3, max: Vector3): EntityId[] {
    const results: EntityId[] = [];

    // Get all cells that overlap the box
    const cellsToCheck = this.getCellsInBox(min, max);

    // Check each cell
    for (const cellKey of cellsToCheck) {
      const cell = this.cells.get(cellKey);
      if (!cell) {
        continue;
      }

      // Check each entity in the cell
      for (const entityId of cell.entities) {
        const entityPos = this.entityPositions.get(entityId);
        if (!entityPos) {
          continue;
        }

        // Check if entity is actually within box
        if (
          entityPos.x >= min.x && entityPos.x <= max.x &&
          entityPos.y >= min.y && entityPos.y <= max.y &&
          entityPos.z >= min.z && entityPos.z <= max.z
        ) {
          results.push(entityId);
        }
      }
    }

    return results;
  }

  /**
   * Gets all entities in the grid.
   */
  getAllEntities(): EntityId[] {
    return Array.from(this.entityPositions.keys());
  }

  /**
   * Gets the position of an entity.
   */
  getEntityPosition(entity: EntityId): Vector3 | undefined {
    const pos = this.entityPositions.get(entity);
    return pos ? { ...pos } : undefined;
  }

  /**
   * Checks if an entity is in the grid.
   */
  has(entity: EntityId): boolean {
    return this.entityPositions.has(entity);
  }

  /**
   * Clears all entities from the grid.
   */
  clear(): void {
    this.cells.clear();
    this.entityPositions.clear();
    this.entityCells.clear();
  }

  /**
   * Gets the number of entities in the grid.
   */
  get size(): number {
    return this.entityPositions.size;
  }

  /**
   * Gets the number of cells in the grid.
   */
  get cellCount(): number {
    return this.cells.size;
  }

  /**
   * Gets the cell size.
   */
  getCellSize(): number {
    return this.cellSize;
  }

  /**
   * Gets statistics about the grid.
   */
  getStats(): {
    entityCount: number;
    cellCount: number;
    averageEntitiesPerCell: number;
    maxEntitiesPerCell: number;
    minEntitiesPerCell: number;
  } {
    const entityCount = this.entityPositions.size;
    const cellCount = this.cells.size;

    if (cellCount === 0) {
      return {
        entityCount,
        cellCount,
        averageEntitiesPerCell: 0,
        maxEntitiesPerCell: 0,
        minEntitiesPerCell: 0
      };
    }

    let maxEntities = 0;
    let minEntities = Infinity;
    let totalEntities = 0;

    for (const cell of this.cells.values()) {
      const count = cell.entities.size;
      maxEntities = Math.max(maxEntities, count);
      minEntities = Math.min(minEntities, count);
      totalEntities += count;
    }

    return {
      entityCount,
      cellCount,
      averageEntitiesPerCell: totalEntities / cellCount,
      maxEntitiesPerCell: maxEntities,
      minEntitiesPerCell: minEntities
    };
  }

  /**
   * Gets the cell key for a position.
   */
  private getCellKey(position: Vector3): string {
    const x = Math.floor(position.x / this.cellSize);
    const y = Math.floor(position.y / this.cellSize);
    const z = Math.floor(position.z / this.cellSize);
    return `${x},${y},${z}`;
  }

  /**
   * Gets all cell keys that could contain entities within a radius.
   */
  private getCellsInRadius(position: Vector3, radius: number): string[] {
    const cellKeys: string[] = [];

    // Calculate cell range
    const minX = Math.floor((position.x - radius) / this.cellSize);
    const maxX = Math.floor((position.x + radius) / this.cellSize);
    const minY = Math.floor((position.y - radius) / this.cellSize);
    const maxY = Math.floor((position.y + radius) / this.cellSize);
    const minZ = Math.floor((position.z - radius) / this.cellSize);
    const maxZ = Math.floor((position.z + radius) / this.cellSize);

    // Generate all cell keys in range
    for (let x = minX; x <= maxX; x++) {
      for (let y = minY; y <= maxY; y++) {
        for (let z = minZ; z <= maxZ; z++) {
          cellKeys.push(`${x},${y},${z}`);
        }
      }
    }

    return cellKeys;
  }

  /**
   * Gets all cell keys that overlap a box region.
   */
  private getCellsInBox(min: Vector3, max: Vector3): string[] {
    const cellKeys: string[] = [];

    const minX = Math.floor(min.x / this.cellSize);
    const maxX = Math.floor(max.x / this.cellSize);
    const minY = Math.floor(min.y / this.cellSize);
    const maxY = Math.floor(max.y / this.cellSize);
    const minZ = Math.floor(min.z / this.cellSize);
    const maxZ = Math.floor(max.z / this.cellSize);

    for (let x = minX; x <= maxX; x++) {
      for (let y = minY; y <= maxY; y++) {
        for (let z = minZ; z <= maxZ; z++) {
          cellKeys.push(`${x},${y},${z}`);
        }
      }
    }

    return cellKeys;
  }

  /**
   * Calculates squared distance between two positions.
   */
  private distanceSquared(a: Vector3, b: Vector3): number {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const dz = b.z - a.z;
    return dx * dx + dy * dy + dz * dz;
  }
}
