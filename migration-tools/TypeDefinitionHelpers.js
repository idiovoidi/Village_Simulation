/**
 * TypeScript Type Definition Helpers
 * 
 * Set up custom type definitions for project-specific interfaces
 * and create type helpers for Babylon.js and Havok Physics integration.
 * 
 * Requirements: 4.3, 4.4, 4.5
 */

import fs from 'fs/promises';
import path from 'path';

/**
 * Manages TypeScript type definitions for the migration
 */
export class TypeDefinitionHelpers {
  constructor(projectRoot = process.cwd()) {
    this.projectRoot = projectRoot;
    this.typesDir = path.join(projectRoot, 'MyHavokSimCode', 'types');
  }

  /**
   * Initialize type definition structure
   */
  async initialize() {
    try {
      // Create types directory
      await fs.mkdir(this.typesDir, { recursive: true });
      
      // Create all type definition files
      await this.createAgentTypes();
      await this.createSystemTypes();
      await this.createEnvironmentTypes();
      await this.createBabylonIntegrationTypes();
      await this.createHavokIntegrationTypes();
      await this.createCoreTypes();
      
      return true;
    } catch (error) {
      console.error('Failed to initialize type definitions:', error);
      return false;
    }
  }

  /**
   * Create agent-specific type definitions
   */
  async createAgentTypes() {
    const agentTypes = `/**
 * Agent System Type Definitions
 * 
 * Type definitions for all agent-related interfaces and classes
 */

import { Vector3, Mesh, Scene, TransformNode } from '@babylonjs/core';

// Base agent interfaces
export interface IAgentState {
  id: string;
  position: Vector3;
  rotation: Vector3;
  velocity: Vector3;
  health: number;
  energy: number;
  isActive: boolean;
  lastUpdate: number;
}

export interface IAgentBehavior {
  currentState: string;
  previousState: string;
  stateTransitions: Map<string, string[]>;
  behaviorData: Record<string, any>;
}

export interface IAgentModel {
  mesh: Mesh;
  animations: Map<string, any>;
  materials: Map<string, any>;
  boundingInfo: any;
}

// Agent configuration interfaces
export interface IAgentConfig {
  type: AgentType;
  spawnPosition?: Vector3;
  initialState?: string;
  behaviorParams?: Record<string, any>;
  modelParams?: Record<string, any>;
}

export enum AgentType {
  VILLAGER = 'villager',
  ZOMBIE = 'zombie',
  BIRD = 'bird',
  FISH = 'fish',
  DOG = 'dog',
  BOAT = 'boat',
  DINOSAUR = 'dinosaur'
}

// Villager-specific types
export interface IVillagerState extends IAgentState {
  hunger: number;
  happiness: number;
  shelter: string | null;
  occupation: string;
  socialConnections: string[];
}

export interface IVillagerBehavior extends IAgentBehavior {
  workSchedule: IWorkSchedule;
  socialNetwork: ISocialNetwork;
  survivalInstincts: ISurvivalInstincts;
}

export interface IWorkSchedule {
  currentTask: string;
  workLocation: Vector3 | null;
  workStartTime: number;
  workDuration: number;
}

export interface ISocialNetwork {
  friends: string[];
  enemies: string[];
  family: string[];
  reputation: number;
}

export interface ISurvivalInstincts {
  fleeThreshold: number;
  shelterSeekingEnabled: boolean;
  groupFormationEnabled: boolean;
}

// Zombie-specific types
export interface IZombieState extends IAgentState {
  huntingTarget: string | null;
  groupId: string | null;
  aggressionLevel: number;
  detectionRadius: number;
}

export interface IZombieBehavior extends IAgentBehavior {
  pathfinding: IPathfindingData;
  groupBehavior: IGroupBehavior;
  intelligence: IZombieIntelligence;
}

export interface IPathfindingData {
  currentPath: Vector3[];
  pathIndex: number;
  destination: Vector3 | null;
  obstacleAvoidance: boolean;
}

export interface IGroupBehavior {
  isLeader: boolean;
  followTarget: string | null;
  groupFormationPosition: Vector3;
  communicationRange: number;
}

export interface IZombieIntelligence {
  memoryDuration: number;
  learningRate: number;
  adaptiveBehavior: boolean;
  knownLocations: Vector3[];
}

// Bird-specific types
export interface IBirdState extends IAgentState {
  flockId: string | null;
  altitude: number;
  flightSpeed: number;
  isLanding: boolean;
}

export interface IBirdBehavior extends IAgentBehavior {
  flocking: IFlockingBehavior;
  migration: IMigrationBehavior;
}

export interface IFlockingBehavior {
  separationRadius: number;
  alignmentRadius: number;
  cohesionRadius: number;
  separationWeight: number;
  alignmentWeight: number;
  cohesionWeight: number;
}

export interface IMigrationBehavior {
  migrationRoute: Vector3[];
  currentWaypoint: number;
  seasonalBehavior: boolean;
}

// Fish-specific types
export interface IFishState extends IAgentState {
  schoolId: string | null;
  depth: number;
  oxygenLevel: number;
  waterTemperature: number;
}

export interface IFishBehavior extends IAgentBehavior {
  schooling: ISchoolingBehavior;
  feeding: IFeedingBehavior;
}

export interface ISchoolingBehavior {
  schoolRadius: number;
  followDistance: number;
  avoidancePriority: number;
}

export interface IFeedingBehavior {
  feedingTime: number;
  foodSources: Vector3[];
  huntingEnabled: boolean;
}

// Agent communication types
export interface IAgentMessage {
  senderId: string;
  receiverId: string | null; // null for broadcast
  messageType: string;
  data: any;
  timestamp: number;
  priority: number;
}

export interface IAgentCommunication {
  sendMessage(message: IAgentMessage): void;
  receiveMessage(message: IAgentMessage): void;
  broadcastMessage(messageType: string, data: any): void;
}

// Agent spawn system types
export interface ISpawnConfig {
  agentType: AgentType;
  spawnCount: number;
  spawnArea: ISpawnArea;
  spawnInterval: number;
  maxAgents: number;
}

export interface ISpawnArea {
  center: Vector3;
  radius: number;
  height?: number;
  excludeAreas?: ISpawnArea[];
}

// Agent performance tracking
export interface IAgentPerformanceMetrics {
  agentId: string;
  frameTime: number;
  updateTime: number;
  renderTime: number;
  memoryUsage: number;
  behaviorComplexity: number;
}`;

    await fs.writeFile(path.join(this.typesDir, 'agents.d.ts'), agentTypes);
  }

  /**
   * Create system-level type definitions
   */
  async createSystemTypes() {
    const systemTypes = `/**
 * System Type Definitions
 * 
 * Type definitions for core simulation systems
 */

import { Scene, Engine, Vector3 } from '@babylonjs/core';

// Core system interfaces
export interface ISystem {
  name: string;
  isActive: boolean;
  priority: number;
  initialize(scene: Scene): Promise<boolean>;
  update(deltaTime: number): void;
  dispose(): void;
}

export interface ISystemManager {
  systems: Map<string, ISystem>;
  addSystem(system: ISystem): void;
  removeSystem(name: string): void;
  updateSystems(deltaTime: number): void;
  getSystem<T extends ISystem>(name: string): T | null;
}

// Physics system types
export interface IPhysicsConfig {
  gravity: Vector3;
  timeStep: number;
  maxSubSteps: number;
  enableDebugDraw: boolean;
}

export interface IPhysicsBody {
  id: string;
  mass: number;
  friction: number;
  restitution: number;
  isStatic: boolean;
  position: Vector3;
  rotation: Vector3;
}

// Level system types
export interface ILevelConfig {
  name: string;
  description: string;
  systems: string[];
  agents: IAgentSpawnConfig[];
  environment: IEnvironmentConfig;
  physics: IPhysicsConfig;
}

export interface IAgentSpawnConfig {
  type: string;
  count: number;
  spawnArea: {
    center: Vector3;
    radius: number;
  };
}

export interface IEnvironmentConfig {
  terrain: ITerrainConfig;
  water: IWaterConfig;
  weather: IWeatherConfig;
  lighting: ILightingConfig;
}

export interface ITerrainConfig {
  size: number;
  heightMap?: string;
  texture: string;
  normalMap?: string;
}

export interface IWaterConfig {
  enabled: boolean;
  level: number;
  waveHeight: number;
  waveSpeed: number;
  transparency: number;
}

export interface IWeatherConfig {
  cloudCoverage: number;
  windSpeed: number;
  windDirection: Vector3;
  precipitation: number;
}

export interface ILightingConfig {
  sunIntensity: number;
  sunColor: [number, number, number];
  ambientIntensity: number;
  ambientColor: [number, number, number];
  dayNightCycle: boolean;
}

// Performance monitoring types
export interface IPerformanceMetrics {
  frameRate: number;
  frameTime: number;
  renderTime: number;
  updateTime: number;
  memoryUsage: number;
  drawCalls: number;
  triangleCount: number;
}

export interface IPerformanceThresholds {
  minFrameRate: number;
  maxFrameTime: number;
  maxMemoryUsage: number;
  maxDrawCalls: number;
}

export interface IPerformanceAlert {
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  timestamp: number;
  metrics: IPerformanceMetrics;
}

// Navigation system types
export interface INavigationMesh {
  vertices: Vector3[];
  triangles: number[];
  connections: Map<number, number[]>;
}

export interface IPathfindingRequest {
  id: string;
  start: Vector3;
  end: Vector3;
  agentRadius: number;
  priority: number;
}

export interface IPathfindingResult {
  requestId: string;
  path: Vector3[];
  success: boolean;
  error?: string;
}

// Asset management types
export interface IAssetConfig {
  name: string;
  type: 'mesh' | 'texture' | 'material' | 'animation' | 'sound';
  url: string;
  preload: boolean;
  cached: boolean;
}

export interface IAssetLoadResult {
  name: string;
  asset: any;
  success: boolean;
  error?: string;
  loadTime: number;
}`;

    await fs.writeFile(path.join(this.typesDir, 'systems.d.ts'), systemTypes);
  }

  /**
   * Create environment-specific type definitions
   */
  async createEnvironmentTypes() {
    const environmentTypes = `/**
 * Environment System Type Definitions
 * 
 * Type definitions for environmental systems and world generation
 */

import { Vector3, Color3, Texture, Material } from '@babylonjs/core';

// Environment system interfaces
export interface IEnvironmentSystem {
  dayNightCycle: IDayNightCycle;
  weatherSystem: IWeatherSystem;
  terrainSystem: ITerrainSystem;
  waterSystem: IWaterSystem;
  vegetationSystem: IVegetationSystem;
}

// Day/Night cycle types
export interface IDayNightCycle {
  currentTime: number; // 0-24 hours
  dayDuration: number; // seconds for full day
  isDay: boolean;
  sunPosition: Vector3;
  sunIntensity: number;
  ambientColor: Color3;
  skyboxMaterial: Material;
}

export interface ITimeOfDay {
  hour: number;
  minute: number;
  sunAngle: number;
  lightIntensity: number;
  ambientIntensity: number;
  skyColor: Color3;
}

// Weather system types
export interface IWeatherSystem {
  currentWeather: IWeatherState;
  weatherTransition: IWeatherTransition;
  cloudSystem: ICloudSystem;
  precipitationSystem: IPrecipitationSystem;
}

export interface IWeatherState {
  type: WeatherType;
  intensity: number;
  visibility: number;
  windSpeed: number;
  windDirection: Vector3;
  temperature: number;
  humidity: number;
}

export enum WeatherType {
  CLEAR = 'clear',
  CLOUDY = 'cloudy',
  OVERCAST = 'overcast',
  RAIN = 'rain',
  STORM = 'storm',
  FOG = 'fog',
  SNOW = 'snow'
}

export interface IWeatherTransition {
  fromWeather: WeatherType;
  toWeather: WeatherType;
  duration: number;
  progress: number;
}

export interface ICloudSystem {
  cloudCoverage: number;
  cloudSpeed: number;
  cloudHeight: number;
  cloudDensity: number;
  cloudTextures: Texture[];
}

export interface IPrecipitationSystem {
  enabled: boolean;
  intensity: number;
  particleCount: number;
  dropSize: number;
  windEffect: number;
}

// Terrain system types
export interface ITerrainSystem {
  heightMap: Float32Array;
  terrainSize: number;
  heightScale: number;
  materials: ITerrainMaterial[];
  vegetation: IVegetationData[];
}

export interface ITerrainMaterial {
  name: string;
  diffuseTexture: Texture;
  normalTexture?: Texture;
  heightRange: [number, number];
  slope: [number, number];
  blendFactor: number;
}

export interface IVegetationData {
  type: VegetationType;
  density: number;
  heightRange: [number, number];
  slopeRange: [number, number];
  instances: IVegetationInstance[];
}

export enum VegetationType {
  GRASS = 'grass',
  TREE = 'tree',
  BUSH = 'bush',
  FLOWER = 'flower',
  ROCK = 'rock'
}

export interface IVegetationInstance {
  position: Vector3;
  rotation: Vector3;
  scale: Vector3;
  type: VegetationType;
  variant: number;
}

// Water system types
export interface IWaterSystem {
  waterLevel: number;
  waveHeight: number;
  waveSpeed: number;
  waveDirection: Vector3;
  waterColor: Color3;
  transparency: number;
  reflectivity: number;
  caustics: boolean;
}

export interface IWaterPhysics {
  buoyancy: number;
  viscosity: number;
  flowSpeed: number;
  flowDirection: Vector3;
  turbulence: number;
}

// Village generation types
export interface IVillageConfig {
  size: 'small' | 'medium' | 'large';
  population: number;
  buildingTypes: IBuildingType[];
  roadNetwork: IRoadNetwork;
  centerPoint: Vector3;
  radius: number;
}

export interface IBuildingType {
  type: string;
  count: number;
  size: Vector3;
  materials: string[];
  requiredDistance: number;
}

export interface IRoadNetwork {
  mainRoads: IRoad[];
  sideRoads: IRoad[];
  intersections: Vector3[];
  roadWidth: number;
  roadMaterial: string;
}

export interface IRoad {
  start: Vector3;
  end: Vector3;
  width: number;
  type: 'main' | 'side' | 'path';
  waypoints: Vector3[];
}

// Decoration system types
export interface IDecorationSystem {
  decorations: IDecoration[];
  spawnRules: IDecorationSpawnRule[];
  maxDecorations: number;
}

export interface IDecoration {
  id: string;
  type: string;
  position: Vector3;
  rotation: Vector3;
  scale: Vector3;
  mesh: string;
  material: string;
}

export interface IDecorationSpawnRule {
  decorationType: string;
  spawnChance: number;
  minDistance: number;
  maxDistance: number;
  terrainTypes: string[];
  nearWater: boolean;
  nearRoads: boolean;
}`;

    await fs.writeFile(path.join(this.typesDir, 'environment.d.ts'), environmentTypes);
  }

  /**
   * Create Babylon.js integration type definitions
   */
  async createBabylonIntegrationTypes() {
    const babylonTypes = `/**
 * Babylon.js Integration Type Definitions
 * 
 * Extended type definitions for Babylon.js integration
 */

import { 
  Scene, 
  Engine, 
  Camera, 
  Light, 
  Mesh, 
  Material, 
  Texture,
  Vector3,
  Color3,
  Animation,
  AnimationGroup,
  TransformNode,
  AbstractMesh
} from '@babylonjs/core';

// Extended Babylon.js interfaces for our project
export interface ISceneManager {
  scene: Scene;
  engine: Engine;
  camera: Camera;
  lights: Light[];
  initialize(): Promise<boolean>;
  dispose(): void;
  render(): void;
}

export interface IMeshManager {
  meshes: Map<string, Mesh>;
  loadMesh(name: string, url: string): Promise<Mesh>;
  createMesh(name: string, geometry: any): Mesh;
  disposeMesh(name: string): void;
  getMesh(name: string): Mesh | null;
}

export interface IMaterialManager {
  materials: Map<string, Material>;
  createMaterial(name: string, config: IMaterialConfig): Material;
  loadTexture(name: string, url: string): Promise<Texture>;
  getMaterial(name: string): Material | null;
}

export interface IMaterialConfig {
  type: 'standard' | 'pbr' | 'node';
  diffuseTexture?: string;
  normalTexture?: string;
  specularTexture?: string;
  emissiveTexture?: string;
  diffuseColor?: Color3;
  specularColor?: Color3;
  emissiveColor?: Color3;
  roughness?: number;
  metallic?: number;
}

// Animation system extensions
export interface IAnimationManager {
  animations: Map<string, Animation>;
  animationGroups: Map<string, AnimationGroup>;
  createAnimation(name: string, config: IAnimationConfig): Animation;
  playAnimation(meshName: string, animationName: string): void;
  stopAnimation(meshName: string, animationName: string): void;
}

export interface IAnimationConfig {
  property: string;
  dataType: number;
  frameRate: number;
  keys: IAnimationKey[];
  loopMode?: number;
}

export interface IAnimationKey {
  frame: number;
  value: any;
  inTangent?: Vector3;
  outTangent?: Vector3;
}

// Camera system extensions
export interface ICameraController {
  camera: Camera;
  target: Vector3;
  followTarget: AbstractMesh | null;
  setTarget(target: Vector3): void;
  followMesh(mesh: AbstractMesh, offset: Vector3): void;
  update(deltaTime: number): void;
}

export interface ICameraConfig {
  type: 'arc' | 'free' | 'universal';
  position: Vector3;
  target: Vector3;
  fov?: number;
  near?: number;
  far?: number;
  controls?: ICameraControls;
}

export interface ICameraControls {
  enabled: boolean;
  panSensibility: number;
  wheelSensibility: number;
  pinchSensibility: number;
  maxZ: number;
  minZ: number;
}

// Lighting system extensions
export interface ILightingManager {
  lights: Map<string, Light>;
  createDirectionalLight(name: string, direction: Vector3, color: Color3): Light;
  createPointLight(name: string, position: Vector3, color: Color3): Light;
  createSpotLight(name: string, position: Vector3, direction: Vector3, color: Color3): Light;
  updateLighting(timeOfDay: number): void;
}

export interface ILightConfig {
  type: 'directional' | 'point' | 'spot' | 'hemispheric';
  position?: Vector3;
  direction?: Vector3;
  color: Color3;
  intensity: number;
  range?: number;
  angle?: number;
  exponent?: number;
}

// Rendering optimization types
export interface IRenderOptimization {
  lodEnabled: boolean;
  frustumCulling: boolean;
  occlusionCulling: boolean;
  instancedRendering: boolean;
  batchedRendering: boolean;
}

export interface ILODConfig {
  distances: number[];
  meshes: string[];
  reductions: number[];
}

// Asset loading extensions
export interface IAssetLoader {
  loadingProgress: number;
  loadMeshes(urls: string[]): Promise<Mesh[]>;
  loadTextures(urls: string[]): Promise<Texture[]>;
  loadMaterials(configs: IMaterialConfig[]): Promise<Material[]>;
  loadAnimations(urls: string[]): Promise<AnimationGroup[]>;
}

export interface ILoadingProgress {
  total: number;
  loaded: number;
  percentage: number;
  currentAsset: string;
}

// Performance monitoring for Babylon.js
export interface IBabylonPerformanceMetrics {
  fps: number;
  frameTime: number;
  renderTime: number;
  drawCalls: number;
  triangles: number;
  vertices: number;
  textures: number;
  materials: number;
  meshes: number;
  lights: number;
  cameras: number;
}

// WebGL/WebGPU compatibility
export interface IGraphicsCapabilities {
  webglVersion: string;
  webgpuSupported: boolean;
  maxTextureSize: number;
  maxVertexAttributes: number;
  maxVaryingVectors: number;
  maxFragmentUniforms: number;
  maxVertexUniforms: number;
  extensions: string[];
}`;

    await fs.writeFile(path.join(this.typesDir, 'babylon-integration.d.ts'), babylonTypes);
  }

  /**
   * Create Havok Physics integration type definitions
   */
  async createHavokIntegrationTypes() {
    const havokTypes = `/**
 * Havok Physics Integration Type Definitions
 * 
 * Type definitions for Havok Physics engine integration
 */

import { Vector3, Quaternion, Mesh } from '@babylonjs/core';

// Havok Physics core types
export interface IHavokPhysicsEngine {
  world: any; // HK.World
  timeStep: number;
  gravity: Vector3;
  initialize(): Promise<boolean>;
  step(deltaTime: number): void;
  dispose(): void;
}

export interface IPhysicsBody {
  id: string;
  mesh: Mesh;
  havokBody: any; // HK.RigidBody
  mass: number;
  friction: number;
  restitution: number;
  isStatic: boolean;
  isKinematic: boolean;
  position: Vector3;
  rotation: Quaternion;
  linearVelocity: Vector3;
  angularVelocity: Vector3;
}

export interface IPhysicsShape {
  type: PhysicsShapeType;
  dimensions: Vector3;
  mesh?: Mesh;
  convexHull?: Vector3[];
}

export enum PhysicsShapeType {
  BOX = 'box',
  SPHERE = 'sphere',
  CAPSULE = 'capsule',
  CYLINDER = 'cylinder',
  CONVEX_HULL = 'convexHull',
  TRIANGLE_MESH = 'triangleMesh'
}

export interface IPhysicsBodyConfig {
  shape: IPhysicsShape;
  mass: number;
  friction: number;
  restitution: number;
  isStatic: boolean;
  isKinematic: boolean;
  initialPosition: Vector3;
  initialRotation: Quaternion;
  material?: IPhysicsMaterial;
}

export interface IPhysicsMaterial {
  name: string;
  friction: number;
  restitution: number;
  density: number;
  rollingFriction?: number;
  spinningFriction?: number;
}

// Collision detection types
export interface ICollisionEvent {
  bodyA: IPhysicsBody;
  bodyB: IPhysicsBody;
  contactPoint: Vector3;
  contactNormal: Vector3;
  impulse: number;
  timestamp: number;
}

export interface ICollisionFilter {
  group: number;
  mask: number;
  category: CollisionCategory;
}

export enum CollisionCategory {
  STATIC = 1,
  DYNAMIC = 2,
  KINEMATIC = 4,
  AGENT = 8,
  PROJECTILE = 16,
  TRIGGER = 32,
  WATER = 64,
  TERRAIN = 128
}

// Constraint types
export interface IPhysicsConstraint {
  id: string;
  type: ConstraintType;
  bodyA: IPhysicsBody;
  bodyB: IPhysicsBody;
  pivotA: Vector3;
  pivotB: Vector3;
  axisA?: Vector3;
  axisB?: Vector3;
  limits?: IConstraintLimits;
}

export enum ConstraintType {
  POINT_TO_POINT = 'pointToPoint',
  HINGE = 'hinge',
  SLIDER = 'slider',
  CONE_TWIST = 'coneTwist',
  GENERIC_6DOF = 'generic6DOF'
}

export interface IConstraintLimits {
  linearLower: Vector3;
  linearUpper: Vector3;
  angularLower: Vector3;
  angularUpper: Vector3;
}

// Character controller types
export interface ICharacterController {
  body: IPhysicsBody;
  capsuleHeight: number;
  capsuleRadius: number;
  stepHeight: number;
  slopeLimit: number;
  isGrounded: boolean;
  groundNormal: Vector3;
  move(direction: Vector3, deltaTime: number): void;
  jump(force: number): void;
}

export interface ICharacterControllerConfig {
  height: number;
  radius: number;
  mass: number;
  stepHeight: number;
  slopeLimit: number;
  skinWidth: number;
  pushForce: number;
}

// Vehicle physics types
export interface IVehicleController {
  chassis: IPhysicsBody;
  wheels: IWheelInfo[];
  engine: IEngineInfo;
  steering: ISteeringInfo;
  suspension: ISuspensionInfo;
}

export interface IWheelInfo {
  position: Vector3;
  radius: number;
  width: number;
  suspensionLength: number;
  frictionSlip: number;
  rollInfluence: number;
  isFrontWheel: boolean;
}

export interface IEngineInfo {
  maxForce: number;
  maxReverseForce: number;
  maxSpeed: number;
  acceleration: number;
  deceleration: number;
}

export interface ISteeringInfo {
  maxSteerAngle: number;
  steerSpeed: number;
  returnSpeed: number;
}

export interface ISuspensionInfo {
  stiffness: number;
  damping: number;
  compression: number;
  restLength: number;
}

// Water physics types
export interface IWaterPhysics {
  waterLevel: number;
  density: number;
  viscosity: number;
  buoyancyForce: number;
  dragCoefficient: number;
  flowVelocity: Vector3;
}

export interface IBuoyancyInfo {
  isSubmerged: boolean;
  submersionDepth: number;
  buoyancyForce: Vector3;
  dragForce: Vector3;
  waterVelocity: Vector3;
}

// Physics debugging types
export interface IPhysicsDebugRenderer {
  enabled: boolean;
  showBodies: boolean;
  showConstraints: boolean;
  showContacts: boolean;
  showAABBs: boolean;
  wireframeMode: boolean;
}

export interface IPhysicsPerformanceMetrics {
  stepTime: number;
  bodyCount: number;
  constraintCount: number;
  contactCount: number;
  islandCount: number;
  memoryUsage: number;
}`;

    await fs.writeFile(path.join(this.typesDir, 'havok-integration.d.ts'), havokTypes);
  }

  /**
   * Create core utility type definitions
   */
  async createCoreTypes() {
    const coreTypes = `/**
 * Core Utility Type Definitions
 * 
 * Type definitions for core utilities and infrastructure
 */

import { Vector3 } from '@babylonjs/core';

// Error handling types
export interface IErrorHandler {
  handleError(error: Error, context?: string): void;
  logError(message: string, error?: Error): void;
  reportError(error: Error, metadata?: Record<string, any>): void;
}

export interface IErrorContext {
  component: string;
  method: string;
  parameters?: any[];
  timestamp: number;
  stackTrace?: string;
}

export interface IErrorReport {
  id: string;
  error: Error;
  context: IErrorContext;
  severity: ErrorSeverity;
  handled: boolean;
  timestamp: number;
}

export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

// Component system types
export interface IComponent {
  id: string;
  type: string;
  entity: IEntity;
  isActive: boolean;
  initialize(): void;
  update(deltaTime: number): void;
  dispose(): void;
}

export interface IEntity {
  id: string;
  name: string;
  components: Map<string, IComponent>;
  transform: ITransform;
  isActive: boolean;
  addComponent<T extends IComponent>(component: T): T;
  getComponent<T extends IComponent>(type: string): T | null;
  removeComponent(type: string): void;
  hasComponent(type: string): boolean;
}

export interface ITransform {
  position: Vector3;
  rotation: Vector3;
  scale: Vector3;
  parent: ITransform | null;
  children: ITransform[];
}

// State machine types
export interface IStateMachine<T> {
  currentState: T;
  previousState: T | null;
  states: Map<T, IState<T>>;
  transitions: Map<T, T[]>;
  changeState(newState: T): boolean;
  canTransition(fromState: T, toState: T): boolean;
  update(deltaTime: number): void;
}

export interface IState<T> {
  name: T;
  onEnter(previousState: T | null): void;
  onUpdate(deltaTime: number): void;
  onExit(nextState: T): void;
}

// Event system types
export interface IEventBus {
  subscribe<T>(eventType: string, handler: IEventHandler<T>): void;
  unsubscribe<T>(eventType: string, handler: IEventHandler<T>): void;
  emit<T>(eventType: string, data: T): void;
  clear(): void;
}

export interface IEventHandler<T> {
  (data: T): void;
}

export interface IEvent<T> {
  type: string;
  data: T;
  timestamp: number;
  source?: string;
}

// Dependency injection types
export interface IDependencyContainer {
  register<T>(name: string, factory: () => T): void;
  registerSingleton<T>(name: string, factory: () => T): void;
  resolve<T>(name: string): T;
  isRegistered(name: string): boolean;
}

export interface IDependencyFactory<T> {
  (): T;
}

// Configuration types
export interface IConfiguration {
  get<T>(key: string, defaultValue?: T): T;
  set<T>(key: string, value: T): void;
  has(key: string): boolean;
  load(source: string): Promise<void>;
  save(destination: string): Promise<void>;
}

export interface IConfigurationSource {
  load(): Promise<Record<string, any>>;
  save(data: Record<string, any>): Promise<void>;
}

// Logging types
export interface ILogger {
  debug(message: string, ...args: any[]): void;
  info(message: string, ...args: any[]): void;
  warn(message: string, ...args: any[]): void;
  error(message: string, error?: Error, ...args: any[]): void;
  setLevel(level: LogLevel): void;
}

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3
}

export interface ILogEntry {
  level: LogLevel;
  message: string;
  timestamp: number;
  source?: string;
  metadata?: Record<string, any>;
}

// Utility types
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type Constructor<T = {}> = new (...args: any[]) => T;

export type Mixin<T extends Constructor> = T & Constructor;

export interface IDisposable {
  dispose(): void;
}

export interface IInitializable {
  initialize(): Promise<boolean> | boolean;
}

export interface IUpdateable {
  update(deltaTime: number): void;
}`;

    await fs.writeFile(path.join(this.typesDir, 'core.d.ts'), coreTypes);
  }

  /**
   * Create a main index file that exports all types
   */
  async createIndexFile() {
    const indexContent = `/**
 * Main Type Definitions Index
 * 
 * Exports all type definitions for the TypeScript migration
 */

// Core types
export * from './core';

// System types
export * from './systems';

// Agent types
export * from './agents';

// Environment types
export * from './environment';

// Babylon.js integration types
export * from './babylon-integration';

// Havok Physics integration types
export * from './havok-integration';

// Re-export commonly used Babylon.js types
export {
  Vector3,
  Vector2,
  Color3,
  Color4,
  Quaternion,
  Matrix,
  Scene,
  Engine,
  Mesh,
  Material,
  Texture,
  Camera,
  Light,
  Animation,
  AnimationGroup,
  TransformNode,
  AbstractMesh
} from '@babylonjs/core';

// Re-export Havok Physics types (when available)
declare global {
  const HK: any;
  const BABYLON: any;
}`;

    await fs.writeFile(path.join(this.typesDir, 'index.d.ts'), indexContent);
  }

  /**
   * Generate type definitions for existing JavaScript files
   */
  async generateTypeDefinitionsForFile(filePath) {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const fileName = path.basename(filePath, '.js');
      
      // Basic type inference from JavaScript code
      const typeDefinitions = this.inferTypesFromJavaScript(content, fileName);
      
      const typeDefPath = path.join(this.typesDir, 'generated', `${fileName}.d.ts`);
      await fs.mkdir(path.dirname(typeDefPath), { recursive: true });
      await fs.writeFile(typeDefPath, typeDefinitions);
      
      return typeDefPath;
    } catch (error) {
      console.error(`Failed to generate type definitions for ${filePath}:`, error);
      return null;
    }
  }

  /**
   * Infer TypeScript types from JavaScript code
   */
  inferTypesFromJavaScript(content, fileName) {
    let typeDefinitions = `/**\n * Generated type definitions for ${fileName}\n */\n\n`;
    
    // Extract class definitions
    const classMatches = content.match(/class\s+(\w+)(?:\s+extends\s+(\w+))?\s*{/g);
    if (classMatches) {
      for (const match of classMatches) {
        const classMatch = match.match(/class\s+(\w+)(?:\s+extends\s+(\w+))?/);
        if (classMatch) {
          const className = classMatch[1];
          const baseClass = classMatch[2];
          
          typeDefinitions += `export declare class ${className}`;
          if (baseClass) {
            typeDefinitions += ` extends ${baseClass}`;
          }
          typeDefinitions += ' {\n';
          
          // Extract constructor
          const constructorMatch = content.match(new RegExp(`constructor\\s*\\([^)]*\\)\\s*{`));
          if (constructorMatch) {
            typeDefinitions += '  constructor(...args: any[]);\n';
          }
          
          // Extract methods (basic detection)
          const methodMatches = content.match(/(\w+)\s*\([^)]*\)\s*{/g);
          if (methodMatches) {
            const methods = new Set();
            for (const methodMatch of methodMatches) {
              const method = methodMatch.match(/(\w+)\s*\(/);
              if (method && method[1] !== 'constructor' && method[1] !== className) {
                methods.add(method[1]);
              }
            }
            
            for (const method of methods) {
              typeDefinitions += `  ${method}(...args: any[]): any;\n`;
            }
          }
          
          typeDefinitions += '}\n\n';
        }
      }
    }
    
    // Extract function exports
    const functionMatches = content.match(/export\s+function\s+(\w+)\s*\([^)]*\)/g);
    if (functionMatches) {
      for (const match of functionMatches) {
        const funcMatch = match.match(/export\s+function\s+(\w+)/);
        if (funcMatch) {
          typeDefinitions += `export declare function ${funcMatch[1]}(...args: any[]): any;\n`;
        }
      }
    }
    
    // Extract constant exports
    const constMatches = content.match(/export\s+const\s+(\w+)/g);
    if (constMatches) {
      for (const match of constMatches) {
        const constMatch = match.match(/export\s+const\s+(\w+)/);
        if (constMatch) {
          typeDefinitions += `export declare const ${constMatch[1]}: any;\n`;
        }
      }
    }
    
    return typeDefinitions;
  }

  /**
   * Create tsconfig.json with proper type references
   */
  async createTSConfig() {
    const tsConfig = {
      compilerOptions: {
        target: "ES2022",
        lib: ["ES2022", "DOM", "WebWorker"],
        module: "ES2022",
        moduleResolution: "node",
        allowSyntheticDefaultImports: true,
        esModuleInterop: true,
        
        strict: true,
        noImplicitAny: true,
        strictNullChecks: true,
        strictFunctionTypes: true,
        noImplicitReturns: true,
        noFallthroughCasesInSwitch: true,
        
        allowJs: true,
        checkJs: false,
        declaration: true,
        declarationMap: true,
        sourceMap: true,
        
        outDir: "./dist",
        rootDir: "./MyHavokSimCode",
        baseUrl: "./",
        paths: {
          "@core/*": ["MyHavokSimCode/core/*"],
          "@agents/*": ["MyHavokSimCode/Agents/*"],
          "@systems/*": ["MyHavokSimCode/systems/*"],
          "@types/*": ["MyHavokSimCode/types/*"]
        },
        
        typeRoots: [
          "node_modules/@types",
          "MyHavokSimCode/types"
        ]
      },
      include: [
        "MyHavokSimCode/**/*",
        "assets/AssetManager.js"
      ],
      exclude: [
        "node_modules",
        "dist",
        "coverage",
        "docs",
        "migration-tools/tests"
      ]
    };
    
    const tsConfigPath = path.join(this.projectRoot, 'tsconfig.json');
    await fs.writeFile(tsConfigPath, JSON.stringify(tsConfig, null, 2));
    
    return tsConfigPath;
  }
}