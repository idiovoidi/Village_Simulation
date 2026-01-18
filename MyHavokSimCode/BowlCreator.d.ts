export class BowlCreator {
  constructor(scene: any);
  static getTerrainHeight(x: number, z: number): number;
  createBowl(bowlRadius?: number, bowlDepth?: number, maxSegments?: number): Promise<any>;
  dispose?(): void;
}
