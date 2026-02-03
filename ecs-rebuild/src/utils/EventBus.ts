/**
 * Event Bus
 * 
 * Event bus for system communication using publish/subscribe pattern.
 * Provides type-safe event handling with automatic cleanup.
 * 
 * Requirements: 1.7
 */

import type { EntityId } from '../core/Entity';

/**
 * Base event interface.
 * All events must extend this interface.
 */
export interface Event {
  readonly type: string;
  readonly timestamp: number;
}

/**
 * Event handler function type.
 */
export type EventHandler<T extends Event> = (event: T) => void;

/**
 * Event subscription handle for unsubscribing.
 */
export interface EventSubscription {
  unsubscribe(): void;
}

/**
 * Internal subscription data.
 */
interface Subscription<T extends Event> {
  handler: EventHandler<T>;
  once: boolean;
  entityId?: EntityId;
}

/**
 * Event bus for decoupled system communication.
 * Supports typed events, one-time subscriptions, and entity-specific cleanup.
 */
export class EventBus {
  private subscriptions: Map<string, Subscription<Event>[]>;
  private entitySubscriptions: Map<EntityId, Set<string>>;
  private eventQueue: Event[];
  private isProcessing: boolean;

  constructor() {
    this.subscriptions = new Map();
    this.entitySubscriptions = new Map();
    this.eventQueue = [];
    this.isProcessing = false;
  }

  /**
   * Subscribes to an event type.
   * 
   * @param eventType - Type of event to subscribe to
   * @param handler - Handler function to call when event is published
   * @param entityId - Optional entity ID for automatic cleanup
   * @returns Subscription handle for unsubscribing
   */
  subscribe<T extends Event>(
    eventType: string,
    handler: EventHandler<T>,
    entityId?: EntityId
  ): EventSubscription {
    // Create subscription
    const subscription: Subscription<Event> = {
      handler: handler as EventHandler<Event>,
      once: false,
      entityId
    };

    // Add to subscriptions map
    if (!this.subscriptions.has(eventType)) {
      this.subscriptions.set(eventType, []);
    }
    this.subscriptions.get(eventType)!.push(subscription);

    // Track entity subscription for cleanup
    if (entityId !== undefined) {
      if (!this.entitySubscriptions.has(entityId)) {
        this.entitySubscriptions.set(entityId, new Set());
      }
      this.entitySubscriptions.get(entityId)!.add(eventType);
    }

    // Return unsubscribe handle
    return {
      unsubscribe: () => {
        this.unsubscribe(eventType, handler, entityId);
      }
    };
  }

  /**
   * Subscribes to an event type for a single occurrence.
   * Automatically unsubscribes after the first event.
   * 
   * @param eventType - Type of event to subscribe to
   * @param handler - Handler function to call when event is published
   * @param entityId - Optional entity ID for automatic cleanup
   * @returns Subscription handle for unsubscribing
   */
  subscribeOnce<T extends Event>(
    eventType: string,
    handler: EventHandler<T>,
    entityId?: EntityId
  ): EventSubscription {
    // Create one-time subscription
    const subscription: Subscription<Event> = {
      handler: handler as EventHandler<Event>,
      once: true,
      entityId
    };

    // Add to subscriptions map
    if (!this.subscriptions.has(eventType)) {
      this.subscriptions.set(eventType, []);
    }
    this.subscriptions.get(eventType)!.push(subscription);

    // Track entity subscription for cleanup
    if (entityId !== undefined) {
      if (!this.entitySubscriptions.has(entityId)) {
        this.entitySubscriptions.set(entityId, new Set());
      }
      this.entitySubscriptions.get(entityId)!.add(eventType);
    }

    // Return unsubscribe handle
    return {
      unsubscribe: () => {
        this.unsubscribe(eventType, handler, entityId);
      }
    };
  }

  /**
   * Unsubscribes from an event type.
   * 
   * @param eventType - Type of event to unsubscribe from
   * @param handler - Handler function to remove
   * @param entityId - Optional entity ID
   */
  private unsubscribe<T extends Event>(
    eventType: string,
    handler: EventHandler<T>,
    entityId?: EntityId
  ): void {
    const subs = this.subscriptions.get(eventType);
    if (!subs) {
      return;
    }

    // Remove subscription
    const index = subs.findIndex(
      sub => sub.handler === handler && sub.entityId === entityId
    );
    if (index !== -1) {
      subs.splice(index, 1);
    }

    // Clean up empty subscription arrays
    if (subs.length === 0) {
      this.subscriptions.delete(eventType);
    }

    // Clean up entity tracking
    if (entityId !== undefined) {
      const entitySubs = this.entitySubscriptions.get(entityId);
      if (entitySubs) {
        entitySubs.delete(eventType);
        if (entitySubs.size === 0) {
          this.entitySubscriptions.delete(entityId);
        }
      }
    }
  }

  /**
   * Publishes an event immediately.
   * All subscribers will be notified synchronously.
   * 
   * @param event - Event to publish
   */
  publish<T extends Event>(event: T): void {
    const subs = this.subscriptions.get(event.type);
    if (!subs || subs.length === 0) {
      return;
    }

    // Create a copy to avoid issues if handlers modify subscriptions
    const subsToNotify = [...subs];

    // Notify all subscribers
    for (const sub of subsToNotify) {
      try {
        sub.handler(event);
      } catch (error) {
        console.error(`Error in event handler for ${event.type}:`, error);
      }

      // Remove one-time subscriptions
      if (sub.once) {
        this.unsubscribe(event.type, sub.handler, sub.entityId);
      }
    }
  }

  /**
   * Queues an event for deferred publishing.
   * Events will be published when processQueue() is called.
   * 
   * @param event - Event to queue
   */
  queue<T extends Event>(event: T): void {
    this.eventQueue.push(event);
  }

  /**
   * Processes all queued events.
   * Events are published in the order they were queued.
   */
  processQueue(): void {
    if (this.isProcessing) {
      console.warn('EventBus is already processing queue');
      return;
    }

    this.isProcessing = true;

    while (this.eventQueue.length > 0) {
      const event = this.eventQueue.shift()!;
      this.publish(event);
    }

    this.isProcessing = false;
  }

  /**
   * Clears all queued events without publishing them.
   */
  clearQueue(): void {
    this.eventQueue = [];
  }

  /**
   * Removes all subscriptions for a specific entity.
   * Called when an entity is destroyed.
   * 
   * @param entityId - Entity ID to clean up
   */
  cleanupEntity(entityId: EntityId): void {
    const eventTypes = this.entitySubscriptions.get(entityId);
    if (!eventTypes) {
      return;
    }

    // Remove all subscriptions for this entity
    for (const eventType of eventTypes) {
      const subs = this.subscriptions.get(eventType);
      if (!subs) {
        continue;
      }

      // Filter out subscriptions for this entity
      const filtered = subs.filter(sub => sub.entityId !== entityId);
      if (filtered.length === 0) {
        this.subscriptions.delete(eventType);
      } else {
        this.subscriptions.set(eventType, filtered);
      }
    }

    // Remove entity tracking
    this.entitySubscriptions.delete(entityId);
  }

  /**
   * Removes all subscriptions for a specific event type.
   * 
   * @param eventType - Event type to clear
   */
  clearEventType(eventType: string): void {
    const subs = this.subscriptions.get(eventType);
    if (!subs) {
      return;
    }

    // Remove entity tracking for all subscriptions
    for (const sub of subs) {
      if (sub.entityId !== undefined) {
        const entitySubs = this.entitySubscriptions.get(sub.entityId);
        if (entitySubs) {
          entitySubs.delete(eventType);
          if (entitySubs.size === 0) {
            this.entitySubscriptions.delete(sub.entityId);
          }
        }
      }
    }

    // Remove subscriptions
    this.subscriptions.delete(eventType);
  }

  /**
   * Removes all subscriptions.
   */
  clear(): void {
    this.subscriptions.clear();
    this.entitySubscriptions.clear();
    this.eventQueue = [];
  }

  /**
   * Gets the number of subscribers for an event type.
   */
  getSubscriberCount(eventType: string): number {
    const subs = this.subscriptions.get(eventType);
    return subs ? subs.length : 0;
  }

  /**
   * Gets all event types that have subscribers.
   */
  getEventTypes(): string[] {
    return Array.from(this.subscriptions.keys());
  }

  /**
   * Gets statistics about the event bus.
   */
  getStats(): {
    totalSubscriptions: number;
    eventTypeCount: number;
    queuedEventCount: number;
    entitiesWithSubscriptions: number;
  } {
    let totalSubscriptions = 0;
    for (const subs of this.subscriptions.values()) {
      totalSubscriptions += subs.length;
    }

    return {
      totalSubscriptions,
      eventTypeCount: this.subscriptions.size,
      queuedEventCount: this.eventQueue.length,
      entitiesWithSubscriptions: this.entitySubscriptions.size
    };
  }
}

/**
 * Common event types used throughout the simulation.
 */

/**
 * Entity created event.
 */
export interface EntityCreatedEvent extends Event {
  type: 'entity:created';
  entityId: EntityId;
}

/**
 * Entity destroyed event.
 */
export interface EntityDestroyedEvent extends Event {
  type: 'entity:destroyed';
  entityId: EntityId;
}

/**
 * Component added event.
 */
export interface ComponentAddedEvent extends Event {
  type: 'component:added';
  entityId: EntityId;
  componentType: string;
}

/**
 * Component removed event.
 */
export interface ComponentRemovedEvent extends Event {
  type: 'component:removed';
  entityId: EntityId;
  componentType: string;
}

/**
 * Collision event.
 */
export interface CollisionEvent extends Event {
  type: 'collision:enter' | 'collision:stay' | 'collision:exit';
  entityA: EntityId;
  entityB: EntityId;
}

/**
 * Damage event.
 */
export interface DamageEvent extends Event {
  type: 'damage:dealt';
  source: EntityId;
  target: EntityId;
  amount: number;
  damageType: string;
}

/**
 * Death event.
 */
export interface DeathEvent extends Event {
  type: 'entity:death';
  entityId: EntityId;
  cause: string;
}

/**
 * Infection event.
 */
export interface InfectionEvent extends Event {
  type: 'infection:transmitted';
  source: EntityId;
  target: EntityId;
}

/**
 * Birth event.
 */
export interface BirthEvent extends Event {
  type: 'entity:birth';
  childId: EntityId;
  parent1Id: EntityId;
  parent2Id: EntityId;
}

/**
 * Time event.
 */
export interface TimeEvent extends Event {
  type: 'time:hour' | 'time:day' | 'time:season';
  hour?: number;
  day?: number;
  season?: string;
}

/**
 * Helper function to create an event with timestamp.
 */
export function createEvent<T extends Event>(
  type: string,
  data: Omit<T, 'type' | 'timestamp'>
): T {
  return {
    type,
    timestamp: Date.now(),
    ...data
  } as T;
}

/**
 * Global event bus instance for convenience.
 */
export const eventBus = new EventBus();
