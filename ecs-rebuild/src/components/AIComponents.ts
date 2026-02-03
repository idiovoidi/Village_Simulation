/**
 * AI Components
 * 
 * Components for AI behavior, decision-making, and navigation.
 * Used by intelligent agents like villagers, zombies, and animals.
 */

import type { Component } from '../core/Component';
import type { Vector3 } from './CoreComponents';

/**
 * Behavior states for AI agents.
 */
export const BehaviourState = {
  Idle: 'Idle',
  Wander: 'Wander',
  Seek: 'Seek',
  Flee: 'Flee',
  Follow: 'Follow',
  Work: 'Work',
  Sleep: 'Sleep',
  Eat: 'Eat',
  Drink: 'Drink',
  Socialize: 'Socialize',
  Attack: 'Attack',
  Patrol: 'Patrol'
} as const;

export type BehaviourState = typeof BehaviourState[keyof typeof BehaviourState];

/**
 * AI behavior state machine component.
 * Tracks current and previous behavior states with timing.
 */
export interface AIBehaviourComponent extends Component {
  readonly type: 'AIBehaviour';
  currentState: BehaviourState;
  previousState: BehaviourState;
  stateTimer: number;
  parameters: Record<string, unknown>;
}

/**
 * Steering forces for movement AI.
 * Implements steering behaviors like seek, flee, arrive, wander.
 */
export interface SteeringComponent extends Component {
  readonly type: 'Steering';
  desiredVelocity: Vector3;
  steeringForce: Vector3;
  target: Vector3 | null;
  arrivalRadius: number;
  maxForce: number;
}

/**
 * Short-term memory for AI decision-making.
 * Stores recent observations and events.
 */
export interface MemoryComponent extends Component {
  readonly type: 'Memory';
  observations: Array<{
    timestamp: number;
    type: string;
    data: unknown;
  }>;
  maxMemorySize: number;
  memoryDuration: number; // How long to keep memories (seconds)
}

/**
 * Activity in a daily schedule.
 */
export interface ScheduleActivity {
  name: string;
  startHour: number;
  endHour: number;
  location: Vector3 | null;
  behaviour: BehaviourState;
}

/**
 * Daily schedule for time-based behaviors.
 * Used primarily by villagers for routine activities.
 */
export interface ScheduleComponent extends Component {
  readonly type: 'Schedule';
  activities: ScheduleActivity[];
  currentActivityIndex: number;
  overridden: boolean; // True when needs override schedule
}

/**
 * Current goal and priority for AI agents.
 */
export interface GoalComponent extends Component {
  readonly type: 'Goal';
  goalType: string;
  target: Vector3 | number | null; // Position or entity ID
  priority: number;
  progress: number; // 0-1
  completed: boolean;
}

/**
 * Perceived threats in the environment.
 */
export interface ThreatComponent extends Component {
  readonly type: 'Threat';
  threats: Array<{
    entityId: number;
    dangerLevel: number;
    lastSeenPosition: Vector3;
    lastSeenTime: number;
  }>;
  highestThreatLevel: number;
}

/**
 * Factory functions for creating AI components with default values.
 */

export function createAIBehaviourComponent(
  initialState: BehaviourState = BehaviourState.Idle,
  parameters: Record<string, unknown> = {}
): AIBehaviourComponent {
  return {
    type: 'AIBehaviour',
    currentState: initialState,
    previousState: initialState,
    stateTimer: 0,
    parameters
  };
}

export function createSteeringComponent(
  maxForce = 10,
  arrivalRadius = 2
): SteeringComponent {
  return {
    type: 'Steering',
    desiredVelocity: { x: 0, y: 0, z: 0 },
    steeringForce: { x: 0, y: 0, z: 0 },
    target: null,
    arrivalRadius,
    maxForce
  };
}

export function createMemoryComponent(
  maxMemorySize = 50,
  memoryDuration = 300
): MemoryComponent {
  return {
    type: 'Memory',
    observations: [],
    maxMemorySize,
    memoryDuration
  };
}

export function createScheduleComponent(
  activities: ScheduleActivity[] = []
): ScheduleComponent {
  return {
    type: 'Schedule',
    activities,
    currentActivityIndex: 0,
    overridden: false
  };
}

export function createGoalComponent(
  goalType: string,
  target: Vector3 | number | null = null,
  priority = 1
): GoalComponent {
  return {
    type: 'Goal',
    goalType,
    target,
    priority,
    progress: 0,
    completed: false
  };
}

export function createThreatComponent(): ThreatComponent {
  return {
    type: 'Threat',
    threats: [],
    highestThreatLevel: 0
  };
}
