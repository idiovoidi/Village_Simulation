export class CloudSystem {
  constructor(scene: any);
  init(): void;
  createClouds(): void;
  createCloudMesh(): any;
  getRandomPosition(): any;
  updateClouds(): void;
  setTimeOfDay(hours: number): void;
  setWeather(cloudiness: number): void;
  dispose(): void;
}
