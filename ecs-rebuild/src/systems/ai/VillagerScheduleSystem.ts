/**
 * Villager Schedule System
 * 
 * Manages villager daily schedules based on time of day.
 * Loads schedule templates and updates current activities.
 * Allows survival needs to override scheduled activities.
 * 
 * Requirements: 6.1
 */

import { System } from '../../core/System';
import type { World } from '../../core/World';
import type { ComponentSignature } from '../../core/Component';
import type { EntityId } from '../../core/Entity';
import { BehaviourState } from '../../components/AIComponents';
import type {
  AIBehaviourComponent,
  ScheduleComponent,
  ScheduleActivity,
  SteeringComponent
} from '../../components/AIComponents';
import type { VillagerComponent } from '../../components/CreatureComponents';
import type { TimeOfDayComponent } from '../../components/WorldComponents';
import type { Vector3, PositionComponent } from '../../components/CoreComponents';
import type { HungerComponent, ThirstComponent, EnergyComponent } from '../../components/SurvivalComponents';

/**
 * Default schedule templates for different villager professions.
 */
const SCHEDULE_TEMPLATES: Record<string, ScheduleActivity[]> = {
  peasant: [
    { name: 'Sleep', startHour: 22, endHour: 6, location: null, behaviour: BehaviourState.Sleep },
    { name: 'Breakfast', startHour: 6, endHour: 7, location: null, behaviour: BehaviourState.Eat },
    { name: 'Work', startHour: 7, endHour: 12, location: null, behaviour: BehaviourState.Work },
    { name: 'Lunch', startHour: 12, endHour: 13, location: null, behaviour: BehaviourState.Eat },
    { name: 'Work', startHour: 13, endHour: 18, location: null, behaviour: BehaviourState.Work },
    { name: 'Dinner', startHour: 18, endHour: 19, location: null, behaviour: BehaviourState.Eat },
    { name: 'Socialize', startHour: 19, endHour: 22, location: null, behaviour: BehaviourState.Socialize }
  ],
  farmer: [
    { name: 'Sleep', startHour: 21, endHour: 5, location: null, behaviour: BehaviourState.Sleep },
    { name: 'Breakfast', startHour: 5, endHour: 6, location: null, behaviour: BehaviourState.Eat },
    { name: 'Farm Work', startHour: 6, endHour: 12, location: null, behaviour: BehaviourState.Work },
    { name: 'Lunch', startHour: 12, endHour: 13, location: null, behaviour: BehaviourState.Eat },
    { name: 'Farm Work', startHour: 13, endHour: 18, location: null, behaviour: BehaviourState.Work },
    { name: 'Dinner', startHour: 18, endHour: 19, location: null, behaviour: BehaviourState.Eat },
    { name: 'Rest', startHour: 19, endHour: 21, location: null, behaviour: BehaviourState.Idle }
  ],
  guard: [
    { name: 'Sleep', startHour: 22, endHour: 6, location: null, behaviour: BehaviourState.Sleep },
    { name: 'Breakfast', startHour: 6, endHour: 7, location: null, behaviour: BehaviourState.Eat },
    { name: 'Patrol', startHour: 7, endHour: 12, location: null, behaviour: BehaviourState.Patrol },
    { name: 'Lunch', startHour: 12, endHour: 13, location: null, behaviour: BehaviourState.Eat },
    { name: 'Patrol', startHour: 13, endHour: 18, location: null, behaviour: BehaviourState.Patrol },
    { name: 'Dinner', startHour: 18, endHour: 19, location: null, behaviour: BehaviourState.Eat },
    { name: 'Patrol', startHour: 19, endHour: 22, location: null, behaviour: BehaviourState.Patrol }
  ],
  merchant: [
    { name: 'Sleep', startHour: 22, endHour: 7, location: null, behaviour: BehaviourState.Sleep },
    { name: 'Breakfast', startHour: 7, endHour: 8, location: null, behaviour: BehaviourState.Eat },
    { name: 'Trade', startHour: 8, endHour: 12, location: null, behaviour: BehaviourState.Work },
    { name: 'Lunch', startHour: 12, endHour: 13, location: null, behaviour: BehaviourState.Eat },
    { name: 'Trade', startHour: 13, endHour: 18, location: null, behaviour: BehaviourState.Work },
    { name: 'Dinner', startHour: 18, endHour: 19, location: null, behaviour: BehaviourState.Eat },
    { name: 'Socialize', startHour: 19, endHour: 22, location: null, behaviour: BehaviourState.Socialize }
  ]
};

/**
 * System that manages villager schedules based on time of day.
 */
export class VillagerScheduleSystem extends System {
  readonly componentSignature: ComponentSignature = new Set([
    'Villager',
    'Schedule',
    'AIBehaviour'
  ]);
  readonly priority = 105; // Before DecisionSystem

  private timeOfDayEntity: EntityId | null = null;

  constructor(world: World) {
    super(world);
  }

  initialize(): void {
    // Find the TimeOfDay entity (should be a singleton)
    const timeEntities = this.world.query(new Set(['TimeOfDay']));
    if (timeEntities.length > 0) {
      this.timeOfDayEntity = timeEntities[0];
    }
  }

  update(_deltaTime: number): void {
    // Get current time
    const timeOfDay = this.getCurrentTime();
    if (!timeOfDay) {
      return; // No time entity, can't update schedules
    }

    const entities = this.queryEntities();

    for (const entityId of entities) {
      this.updateVillagerSchedule(entityId, timeOfDay);
    }
  }

  /**
   * Gets the current time of day.
   */
  private getCurrentTime(): TimeOfDayComponent | null {
    if (!this.timeOfDayEntity) {
      // Try to find it again
      const timeEntities = this.world.query(new Set(['TimeOfDay']));
      if (timeEntities.length > 0) {
        this.timeOfDayEntity = timeEntities[0];
      } else {
        return null;
      }
    }

    return this.world.getComponent<TimeOfDayComponent>(this.timeOfDayEntity, 'TimeOfDay') || null;
  }

  /**
   * Updates a villager's schedule based on current time.
   */
  private updateVillagerSchedule(entityId: EntityId, timeOfDay: TimeOfDayComponent): void {
    const villager = this.world.getComponent<VillagerComponent>(entityId, 'Villager');
    const schedule = this.world.getComponent<ScheduleComponent>(entityId, 'Schedule');
    const behavior = this.world.getComponent<AIBehaviourComponent>(entityId, 'AIBehaviour');

    if (!villager || !schedule || !behavior) return;

    // If schedule is overridden (by critical needs), don't update
    if (schedule.overridden) {
      // Check if we should restore schedule (needs are no longer critical)
      if (this.shouldRestoreSchedule(entityId)) {
        schedule.overridden = false;
      } else {
        return; // Keep override active
      }
    }

    // Load schedule template if activities are empty
    if (schedule.activities.length === 0) {
      this.loadScheduleTemplate(entityId, villager.profession);
    }

    // Find current activity based on time
    const currentActivity = this.findCurrentActivity(schedule, timeOfDay.hour);

    if (currentActivity) {
      // Update current activity index
      const activityIndex = schedule.activities.indexOf(currentActivity);
      if (activityIndex !== -1) {
        schedule.currentActivityIndex = activityIndex;
      }

      // Update behavior to match scheduled activity
      if (behavior.currentState !== currentActivity.behaviour) {
        behavior.previousState = behavior.currentState;
        behavior.currentState = currentActivity.behaviour;
        behavior.stateTimer = 0;
      }

      // Update steering target if activity has a location
      if (currentActivity.location) {
        const steering = this.world.getComponent<SteeringComponent>(entityId, 'Steering');
        if (steering) {
          steering.target = { ...currentActivity.location };
        }
      }
    }
  }

  /**
   * Finds the current activity for the given hour.
   */
  private findCurrentActivity(
    schedule: ScheduleComponent,
    currentHour: number
  ): ScheduleActivity | null {
    for (const activity of schedule.activities) {
      // Handle activities that span midnight
      if (activity.startHour > activity.endHour) {
        // Activity spans midnight (e.g., 22:00 to 6:00)
        if (currentHour >= activity.startHour || currentHour < activity.endHour) {
          return activity;
        }
      } else {
        // Normal activity within same day
        if (currentHour >= activity.startHour && currentHour < activity.endHour) {
          return activity;
        }
      }
    }

    return null;
  }

  /**
   * Loads a schedule template for a villager.
   */
  private loadScheduleTemplate(entityId: EntityId, profession: string): void {
    const schedule = this.world.getComponent<ScheduleComponent>(entityId, 'Schedule');
    if (!schedule) return;

    // Get template for profession (default to peasant if not found)
    const template = SCHEDULE_TEMPLATES[profession] || SCHEDULE_TEMPLATES.peasant;

    // Copy template activities
    schedule.activities = template.map(activity => ({ ...activity }));

    // Assign locations based on villager's home and workplace
    this.assignActivityLocations(entityId);
  }

  /**
   * Assigns specific locations to scheduled activities.
   */
  private assignActivityLocations(entityId: EntityId): void {
    const villager = this.world.getComponent<VillagerComponent>(entityId, 'Villager');
    const schedule = this.world.getComponent<ScheduleComponent>(entityId, 'Schedule');

    if (!villager || !schedule) return;

    for (const activity of schedule.activities) {
      // Assign home location for sleep and meals
      if (
        (activity.behaviour === BehaviourState.Sleep ||
          activity.behaviour === BehaviourState.Eat) &&
        villager.home !== null
      ) {
        const homePosition = this.getEntityPosition(villager.home);
        if (homePosition) {
          activity.location = homePosition;
        }
      }

      // Assign workplace location for work activities
      if (activity.behaviour === BehaviourState.Work && villager.workplace !== null) {
        const workPosition = this.getEntityPosition(villager.workplace);
        if (workPosition) {
          activity.location = workPosition;
        }
      }
    }
  }

  /**
   * Gets the position of an entity.
   */
  private getEntityPosition(entityId: EntityId): Vector3 | null {
    const position = this.world.getComponent<PositionComponent>(
      entityId,
      'Position'
    );
    return position ? { x: position.x, y: position.y, z: position.z } : null;
  }

  /**
   * Checks if schedule should be restored (needs are no longer critical).
   */
  private shouldRestoreSchedule(entityId: EntityId): boolean {
    // Check if any survival needs are still critical
    const hunger = this.world.getComponent<HungerComponent>(entityId, 'Hunger');
    const thirst = this.world.getComponent<ThirstComponent>(entityId, 'Thirst');
    const energy = this.world.getComponent<EnergyComponent>(entityId, 'Energy');

    // If any need is still critical, keep override
    if (hunger) {
      if (hunger.level < hunger.criticalThreshold) return false;
    }

    if (thirst) {
      if (thirst.level < thirst.criticalThreshold) return false;
    }

    if (energy) {
      if (energy.level <= 0) return false;
    }

    // All needs are satisfied, restore schedule
    return true;
  }

  /**
   * Loads a custom schedule for a villager.
   */
  loadCustomSchedule(entityId: EntityId, activities: ScheduleActivity[]): void {
    const schedule = this.world.getComponent<ScheduleComponent>(entityId, 'Schedule');
    if (!schedule) return;

    schedule.activities = activities.map(activity => ({ ...activity }));
    this.assignActivityLocations(entityId);
  }

  /**
   * Gets available schedule templates.
   */
  static getScheduleTemplates(): Record<string, ScheduleActivity[]> {
    return { ...SCHEDULE_TEMPLATES };
  }
}
