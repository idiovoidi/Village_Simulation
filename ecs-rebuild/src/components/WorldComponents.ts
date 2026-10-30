/**
 * World and Environment Components
 * 
 * Components for world structures, environmental features, and natural resources.
 * Includes buildings, roads, navigation, weather, seasons, and agriculture.
 */

import type { Component } from '../core/Component.ts';
import type { Vector3 } from './CoreComponents.ts';

/**
 * House/building component.
 */
export interface HouseComponent extends Component {
  readonly type: 'House';
  owner: number | null; // Entity ID of owner
  capacity: number;
  occupants: number[]; // Entity IDs of current occupants
  beds: number[]; // Entity IDs of bed entities
  containers: number[]; // Entity IDs of storage containers
}

/**
 * Road network component.
 */
export interface RoadComponent extends Component {
  readonly type: 'Road';
  roadId: string;
  connectedRoads: string[];
  width: number;
  pathPoints: Vector3[];
}

/**
 * Navigation mesh component.
 */
export interface NavMeshComponent extends Component {
  readonly type: 'NavMesh';
  meshData: unknown; // Navigation mesh data structure
  walkable: boolean;
  cost: number; // Pathfinding cost multiplier
}

/**
 * Water body component.
 */
export interface WaterComponent extends Component {
  readonly type: 'Water';
  depth: number;
  flowDirection: Vector3;
  flowSpeed: number;
  waveHeight: number;
  waveFrequency: number;
}

/**
 * Storage container component.
 */
export interface ContainerComponent extends Component {
  readonly type: 'Container';
  capacity: number;
  items: Array<{
    itemType: string;
    quantity: number;
  }>;
  locked: boolean;
}

/**
 * Workstation component for crafting and production.
 */
export interface WorkStationComponent extends Component {
  readonly type: 'WorkStation';
  stationType: string;
  recipes: Array<{
    output: string;
    inputs: Array<{ itemType: string; quantity: number }>;
    productionTime: number;
  }>;
  currentProduction: {
    recipe: string;
    progress: number;
  } | null;
}

/**
 * Agricultural field component.
 */
export interface FieldComponent extends Component {
  readonly type: 'Field';
  fieldType: string;
  crops: number[]; // Entity IDs of crop entities
  soilQuality: number; // 0-1
  irrigated: boolean;
}

/**
 * Water source component.
 */
export interface WellComponent extends Component {
  readonly type: 'Well';
  waterLevel: number;
  maxCapacity: number;
  refillRate: number;
}

/**
 * Sleeping location component.
 */
export interface BedComponent extends Component {
  readonly type: 'Bed';
  owner: number | null; // Entity ID of owner
  occupied: boolean;
  comfort: number; // Affects energy restoration rate
}

/**
 * Weather states.
 */
export enum WeatherType {
  Clear = 'Clear',
  Cloudy = 'Cloudy',
  Rain = 'Rain',
  Snow = 'Snow',
  Storm = 'Storm',
  Fog = 'Fog'
}

/**
 * Weather component.
 */
export interface WeatherComponent extends Component {
  readonly type: 'Weather';
  currentWeather: WeatherType;
  intensity: number; // 0-1
  temperature: number;
  windSpeed: number;
  windDirection: Vector3;
  visibility: number; // 0-1
}

/**
 * Season types.
 */
export enum Season {
  Spring = 'Spring',
  Summer = 'Summer',
  Autumn = 'Autumn',
  Winter = 'Winter'
}

/**
 * Season component.
 */
export interface SeasonComponent extends Component {
  readonly type: 'Season';
  current: Season;
  dayInSeason: number;
  daysPerSeason: number;
  temperatureModifier: number;
  growthRateModifier: number;
}

/**
 * Time of day component.
 */
export interface TimeOfDayComponent extends Component {
  readonly type: 'TimeOfDay';
  hour: number; // 0-23
  minute: number; // 0-59
  timeScale: number; // Simulation speed multiplier
  dayNumber: number;
}

/**
 * Crop growth stages.
 */
export enum CropStage {
  Planted = 'Planted',
  Sprouting = 'Sprouting',
  Growing = 'Growing',
  Mature = 'Mature',
  Withered = 'Withered'
}

/**
 * Crop component.
 */
export interface CropComponent extends Component {
  readonly type: 'Crop';
  cropType: string;
  stage: CropStage;
  growthProgress: number; // 0-1
  growthRate: number;
  harvestYield: number;
  waterLevel: number; // 0-1
}

/**
 * Tree component.
 */
export interface TreeComponent extends Component {
  readonly type: 'Tree';
  treeType: string;
  age: number;
  height: number;
  resources: Array<{
    resourceType: string;
    quantity: number;
    regenerationRate: number;
  }>;
}

/**
 * Harvestable resource component.
 */
export interface ResourceComponent extends Component {
  readonly type: 'Resource';
  resourceType: string;
  quantity: number;
  maxQuantity: number;
  regenerationRate: number;
  lastHarvestTime: number;
}

/**
 * Factory functions for creating world and environment components.
 */

export function createHouseComponent(capacity = 4): HouseComponent {
  return {
    type: 'House',
    owner: null,
    capacity,
    occupants: [],
    beds: [],
    containers: []
  };
}

export function createRoadComponent(roadId: string, width = 3): RoadComponent {
  return {
    type: 'Road',
    roadId,
    connectedRoads: [],
    width,
    pathPoints: []
  };
}

export function createNavMeshComponent(walkable = true, cost = 1.0): NavMeshComponent {
  return {
    type: 'NavMesh',
    meshData: null,
    walkable,
    cost
  };
}

export function createWaterComponent(depth = 10): WaterComponent {
  return {
    type: 'Water',
    depth,
    flowDirection: { x: 0, y: 0, z: 0 },
    flowSpeed: 0,
    waveHeight: 0.5,
    waveFrequency: 1.0
  };
}

export function createContainerComponent(capacity = 100): ContainerComponent {
  return {
    type: 'Container',
    capacity,
    items: [],
    locked: false
  };
}

export function createWorkStationComponent(stationType: string): WorkStationComponent {
  return {
    type: 'WorkStation',
    stationType,
    recipes: [],
    currentProduction: null
  };
}

export function createFieldComponent(fieldType = 'wheat'): FieldComponent {
  return {
    type: 'Field',
    fieldType,
    crops: [],
    soilQuality: 0.8,
    irrigated: false
  };
}

export function createWellComponent(maxCapacity = 1000): WellComponent {
  return {
    type: 'Well',
    waterLevel: maxCapacity,
    maxCapacity,
    refillRate: 10
  };
}

export function createBedComponent(comfort = 0.8): BedComponent {
  return {
    type: 'Bed',
    owner: null,
    occupied: false,
    comfort
  };
}

export function createWeatherComponent(
  currentWeather: WeatherType = WeatherType.Clear,
  temperature = 20
): WeatherComponent {
  return {
    type: 'Weather',
    currentWeather,
    intensity: 0.5,
    temperature,
    windSpeed: 0,
    windDirection: { x: 0, y: 0, z: 0 },
    visibility: 1.0
  };
}

export function createSeasonComponent(
  current: Season = Season.Spring,
  daysPerSeason = 30
): SeasonComponent {
  return {
    type: 'Season',
    current,
    dayInSeason: 0,
    daysPerSeason,
    temperatureModifier: 0,
    growthRateModifier: 1.0
  };
}

export function createTimeOfDayComponent(
  hour = 6,
  minute = 0,
  timeScale = 1.0
): TimeOfDayComponent {
  return {
    type: 'TimeOfDay',
    hour,
    minute,
    timeScale,
    dayNumber: 0
  };
}

export function createCropComponent(
  cropType: string,
  growthRate = 0.1
): CropComponent {
  return {
    type: 'Crop',
    cropType,
    stage: CropStage.Planted,
    growthProgress: 0,
    growthRate,
    harvestYield: 10,
    waterLevel: 1.0
  };
}

export function createTreeComponent(treeType: string, age = 10): TreeComponent {
  return {
    type: 'Tree',
    treeType,
    age,
    height: age * 0.5,
    resources: []
  };
}

export function createResourceComponent(
  resourceType: string,
  quantity: number,
  maxQuantity?: number
): ResourceComponent {
  return {
    type: 'Resource',
    resourceType,
    quantity,
    maxQuantity: maxQuantity ?? quantity,
    regenerationRate: 0.1,
    lastHarvestTime: 0
  };
}
