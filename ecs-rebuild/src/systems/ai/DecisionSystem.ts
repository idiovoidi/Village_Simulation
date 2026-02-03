/**
 * Decision System
 * 
 * Evaluates current needs and goals to select appropriate behavior states.
 * Handles behavior transitions based on survival needs, threats, and goals.
 * 
 * Requirements: 6.1, 6.2, 6.5, 6.6
 */

import { System } from '../../core/System';
import type { World } from '../../core/World';
import type { ComponentSignature } from '../../core/Component';
import type { EntityId } from '../../core/Entity';
import { BehaviourState } from '../../components/AIComponents';
import type {
  AIBehaviourComponent,
  GoalComponent,
  ThreatComponent
} from '../../components/AIComponents';
import type {
  HungerComponent,
  ThirstComponent,
  EnergyComponent
} from '../../components/SurvivalComponents';
import type { VillagerComponent, ZombieComponent } from '../../components/CreatureComponents';

/**
 * Priority levels for different needs and goals.
 */
const PRIORITY = {
  CRITICAL_SURVIVAL: 100,
  HIGH_THREAT: 90,
  URGENT_SURVIVAL: 70,
  MODERATE_SURVIVAL: 50,
  GOAL: 40,
  SCHEDULE: 30,
  IDLE: 0
} as const;

/**
 * Decision system that evaluates needs and selects appropriate behaviors.
 */
export class DecisionSystem extends System {
  readonly componentSignature: ComponentSignature = new Set(['AIBehaviour']);
  readonly priority = 110; // AI systems priority range

  constructor(world: World) {
    super(world);
  }

  update(deltaTime: number): void {
    const entities = this.queryEntities();

    for (const entityId of entities) {
      this.updateEntityBehavior(entityId, deltaTime);
    }
  }

  /**
   * Updates behavior for a single entity.
   */
  private updateEntityBehavior(entityId: EntityId, deltaTime: number): void {
    const behavior = this.world.getComponent<AIBehaviourComponent>(entityId, 'AIBehaviour');
    if (!behavior) return;

    // Update state timer
    behavior.stateTimer += deltaTime;

    // Evaluate all possible behaviors and their priorities
    const decision = this.evaluateBehavior(entityId);

    // Only change behavior if new decision has higher priority or current behavior is complete
    if (decision && decision.state !== behavior.currentState) {
      this.transitionBehavior(entityId, behavior, decision.state);
    }
  }

  /**
   * Evaluates all factors and returns the highest priority behavior.
   */
  private evaluateBehavior(entityId: EntityId): { state: BehaviourState; priority: number } | null {
    const decisions: Array<{ state: BehaviourState; priority: number }> = [];

    // Check survival needs (highest priority)
    const survivalDecision = this.evaluateSurvivalNeeds(entityId);
    if (survivalDecision) {
      decisions.push(survivalDecision);
    }

    // Check threats
    const threatDecision = this.evaluateThreats(entityId);
    if (threatDecision) {
      decisions.push(threatDecision);
    }

    // Check goals
    const goalDecision = this.evaluateGoals(entityId);
    if (goalDecision) {
      decisions.push(goalDecision);
    }

    // Check creature-specific behaviors
    const creatureDecision = this.evaluateCreatureSpecific(entityId);
    if (creatureDecision) {
      decisions.push(creatureDecision);
    }

    // Return highest priority decision
    if (decisions.length === 0) {
      return { state: BehaviourState.Idle, priority: PRIORITY.IDLE };
    }

    return decisions.reduce((highest, current) =>
      current.priority > highest.priority ? current : highest
    );
  }

  /**
   * Evaluates survival needs (hunger, thirst, energy).
   */
  private evaluateSurvivalNeeds(entityId: EntityId): { state: BehaviourState; priority: number } | null {
    const hunger = this.world.getComponent<HungerComponent>(entityId, 'Hunger');
    const thirst = this.world.getComponent<ThirstComponent>(entityId, 'Thirst');
    const energy = this.world.getComponent<EnergyComponent>(entityId, 'Energy');

    // Check energy first (most critical)
    if (energy && energy.level <= 0) {
      return { state: BehaviourState.Sleep, priority: PRIORITY.CRITICAL_SURVIVAL };
    }

    // Check thirst (critical threshold)
    if (thirst && thirst.level < thirst.criticalThreshold) {
      return { state: BehaviourState.Drink, priority: PRIORITY.CRITICAL_SURVIVAL };
    }

    // Check hunger (critical threshold)
    if (hunger && hunger.level < hunger.criticalThreshold) {
      return { state: BehaviourState.Eat, priority: PRIORITY.CRITICAL_SURVIVAL };
    }

    // Check for urgent needs (before they become critical)
    if (energy && energy.level < 20) {
      return { state: BehaviourState.Sleep, priority: PRIORITY.URGENT_SURVIVAL };
    }

    if (thirst && thirst.level < thirst.criticalThreshold * 1.5) {
      return { state: BehaviourState.Drink, priority: PRIORITY.URGENT_SURVIVAL };
    }

    if (hunger && hunger.level < hunger.criticalThreshold * 1.5) {
      return { state: BehaviourState.Eat, priority: PRIORITY.URGENT_SURVIVAL };
    }

    // Check for moderate needs
    if (energy && energy.level < 40) {
      return { state: BehaviourState.Sleep, priority: PRIORITY.MODERATE_SURVIVAL };
    }

    if (thirst && thirst.level < 50) {
      return { state: BehaviourState.Drink, priority: PRIORITY.MODERATE_SURVIVAL };
    }

    if (hunger && hunger.level < 50) {
      return { state: BehaviourState.Eat, priority: PRIORITY.MODERATE_SURVIVAL };
    }

    return null;
  }

  /**
   * Evaluates threats in the environment.
   */
  private evaluateThreats(entityId: EntityId): { state: BehaviourState; priority: number } | null {
    const threat = this.world.getComponent<ThreatComponent>(entityId, 'Threat');
    if (!threat || threat.threats.length === 0) {
      return null;
    }

    // If there's a high threat, flee
    if (threat.highestThreatLevel > 0.7) {
      return { state: BehaviourState.Flee, priority: PRIORITY.HIGH_THREAT };
    }

    return null;
  }

  /**
   * Evaluates current goals.
   */
  private evaluateGoals(entityId: EntityId): { state: BehaviourState; priority: number } | null {
    const goal = this.world.getComponent<GoalComponent>(entityId, 'Goal');
    if (!goal || goal.completed) {
      return null;
    }

    // Map goal types to behavior states
    const goalBehaviorMap: Record<string, BehaviourState> = {
      'work': BehaviourState.Work,
      'socialize': BehaviourState.Socialize,
      'patrol': BehaviourState.Patrol,
      'seek': BehaviourState.Seek,
      'follow': BehaviourState.Follow
    };

    const behavior = goalBehaviorMap[goal.goalType];
    if (behavior) {
      return { state: behavior, priority: PRIORITY.GOAL + goal.priority };
    }

    return null;
  }

  /**
   * Evaluates creature-specific behaviors.
   */
  private evaluateCreatureSpecific(entityId: EntityId): { state: BehaviourState; priority: number } | null {
    // Check if this is a zombie
    const zombie = this.world.getComponent<ZombieComponent>(entityId, 'Zombie');
    if (zombie) {
      // Zombies with targets should attack
      if (zombie.targetEntity !== null) {
        return { state: BehaviourState.Attack, priority: PRIORITY.GOAL };
      }
      // Otherwise wander
      return { state: BehaviourState.Wander, priority: PRIORITY.IDLE };
    }

    // Check if this is a villager
    const villager = this.world.getComponent<VillagerComponent>(entityId, 'Villager');
    if (villager) {
      // Villagers default to their schedule (handled by VillagerScheduleSystem)
      // This system just provides fallback behavior
      return { state: BehaviourState.Wander, priority: PRIORITY.IDLE };
    }

    return null;
  }

  /**
   * Transitions from current behavior to new behavior.
   */
  private transitionBehavior(
    _entityId: EntityId,
    behavior: AIBehaviourComponent,
    newState: BehaviourState
  ): void {
    // Store previous state
    behavior.previousState = behavior.currentState;
    behavior.currentState = newState;
    behavior.stateTimer = 0;

    // Log transition for debugging
    // console.log(`Entity ${_entityId}: ${behavior.previousState} -> ${newState}`);
  }
}
