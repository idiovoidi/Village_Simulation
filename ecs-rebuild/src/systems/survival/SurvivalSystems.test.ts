/**
 * Property-Based Tests for Survival Systems
 * 
 * Tests universal properties of hunger, thirst, and energy systems.
 * 
 * Feature: typescript-ecs-rebuild
 * Properties: 11, 12
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import fc from 'fast-check';
import { World } from '../../core/World.ts';
import { HungerSystem } from './HungerSystem.ts';
import { ThirstSystem } from './ThirstSystem.ts';
import { EnergySystem } from './EnergySystem.ts';
import {
  createHungerComponent,
  createThirstComponent,
  createEnergyComponent
} from '../../components/SurvivalComponents.ts';
import { createAIBehaviourComponent, createScheduleComponent, BehaviourState } from '../../components/AIComponents.ts';

describe('Survival Systems - Property-Based Tests', () => {
  /**
   * Property 11: Survival Stat Depletion
   * 
   * For any villager entity with hunger, thirst, and energy components,
   * after time delta passes, all three stat values must decrease by their
   * respective depletion rates multiplied by the time delta.
   * 
   * Validates: Requirements 19.1, 19.2, 19.3
   */
  it('Property 11: Survival Stat Depletion', () => {
    fc.assert(
      fc.property(
        // Generate random initial stat levels (above critical to avoid behavior changes)
        fc.record({
          hungerLevel: fc.float({ min: Math.fround(50), max: Math.fround(100) }),
          hungerDepletionRate: fc.float({ min: Math.fround(0.1), max: Math.fround(2.0) }),
          thirstLevel: fc.float({ min: Math.fround(50), max: Math.fround(100) }),
          thirstDepletionRate: fc.float({ min: Math.fround(0.1), max: Math.fround(2.0) }),
          energyLevel: fc.float({ min: Math.fround(50), max: Math.fround(100) }),
          energyDepletionRate: fc.float({ min: Math.fround(0.1), max: Math.fround(2.0) }),
          activityMultiplier: fc.float({ min: Math.fround(0.5), max: Math.fround(2.0) }),
          deltaTime: fc.float({ min: Math.fround(0.1), max: Math.fround(5.0) })
        }),
        (config) => {
          // Create world and systems
          const world = new World();
          const hungerSystem = new HungerSystem(world);
          const thirstSystem = new ThirstSystem(world);
          const energySystem = new EnergySystem(world);

          // Create entity with survival components
          const entity = world.createEntity();
          
          const hunger = createHungerComponent(
            config.hungerLevel,
            config.hungerDepletionRate,
            20 // criticalThreshold
          );
          const thirst = createThirstComponent(
            config.thirstLevel,
            config.thirstDepletionRate,
            15 // criticalThreshold
          );
          const energy = createEnergyComponent(
            config.energyLevel,
            config.energyDepletionRate,
            2.0, // restoreRate
            config.activityMultiplier
          );

          world.addComponent(entity, hunger);
          world.addComponent(entity, thirst);
          world.addComponent(entity, energy);
          
          // Add behavior component (not sleeping)
          world.addComponent(entity, createAIBehaviourComponent(BehaviourState.Idle));

          // Store initial values
          const initialHunger = hunger.level;
          const initialThirst = thirst.level;
          const initialEnergy = energy.level;

          // Update systems
          hungerSystem.update(config.deltaTime);
          thirstSystem.update(config.deltaTime);
          energySystem.update(config.deltaTime);

          // Calculate expected values
          const expectedHunger = Math.max(0, initialHunger - (config.hungerDepletionRate * config.deltaTime));
          const expectedThirst = Math.max(0, initialThirst - (config.thirstDepletionRate * config.deltaTime));
          const expectedEnergy = Math.max(0, initialEnergy - (config.energyDepletionRate * config.activityMultiplier * config.deltaTime));

          // Verify depletion occurred correctly (with small tolerance for floating point)
          const tolerance = 0.001;
          assert.ok(
            Math.abs(hunger.level - expectedHunger) < tolerance,
            `Hunger depletion incorrect: expected ${expectedHunger}, got ${hunger.level}`
          );
          assert.ok(
            Math.abs(thirst.level - expectedThirst) < tolerance,
            `Thirst depletion incorrect: expected ${expectedThirst}, got ${thirst.level}`
          );
          assert.ok(
            Math.abs(energy.level - expectedEnergy) < tolerance,
            `Energy depletion incorrect: expected ${expectedEnergy}, got ${energy.level}`
          );

          // Verify values are clamped to valid range [0, 100]
          assert.ok(hunger.level >= 0 && hunger.level <= 100, 'Hunger level out of range');
          assert.ok(thirst.level >= 0 && thirst.level <= 100, 'Thirst level out of range');
          assert.ok(energy.level >= 0 && energy.level <= 100, 'Energy level out of range');
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 12: Critical Needs Behavior Override
   * 
   * For any villager with a survival stat (hunger, thirst, or energy) below
   * its critical threshold, the villager's schedule must be marked as overridden
   * to allow the DecisionSystem to prioritize the corresponding resource.
   * 
   * Validates: Requirements 19.6, 19.7, 19.8
   */
  it('Property 12: Critical Needs Behavior Override', () => {
    fc.assert(
      fc.property(
        // Generate random critical scenarios
        fc.record({
          needType: fc.constantFrom('hunger', 'thirst', 'energy'),
          criticalLevel: fc.float({ min: Math.fround(0), max: Math.fround(10) }), // Below critical threshold
          depletionRate: fc.float({ min: Math.fround(0.1), max: Math.fround(2.0) }),
          deltaTime: fc.float({ min: Math.fround(0.1), max: Math.fround(2.0) })
        }),
        (config) => {
          // Create world and systems
          const world = new World();
          const hungerSystem = new HungerSystem(world);
          const thirstSystem = new ThirstSystem(world);
          const energySystem = new EnergySystem(world);

          // Create entity with survival components and schedule
          const entity = world.createEntity();
          
          const schedule = createScheduleComponent([]);
          world.addComponent(entity, schedule);
          world.addComponent(entity, createAIBehaviourComponent(BehaviourState.Idle));

          // Add the critical need component
          if (config.needType === 'hunger') {
            const hunger = createHungerComponent(
              config.criticalLevel,
              config.depletionRate,
              20 // criticalThreshold
            );
            world.addComponent(entity, hunger);
            hungerSystem.update(config.deltaTime);
          } else if (config.needType === 'thirst') {
            const thirst = createThirstComponent(
              config.criticalLevel,
              config.depletionRate,
              15 // criticalThreshold
            );
            world.addComponent(entity, thirst);
            thirstSystem.update(config.deltaTime);
          } else if (config.needType === 'energy') {
            const energy = createEnergyComponent(
              config.criticalLevel,
              config.depletionRate,
              2.0,
              1.0
            );
            world.addComponent(entity, energy);
            energySystem.update(config.deltaTime);
          }

          // Verify schedule is marked as overridden
          const updatedSchedule = world.getComponent(entity, 'Schedule');
          assert.ok(
            updatedSchedule?.overridden === true,
            `Schedule should be overridden when ${config.needType} is critical`
          );
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Additional test: Energy restoration during sleep
   */
  it('should restore energy when sleeping', () => {
    fc.assert(
      fc.property(
        fc.record({
          initialEnergy: fc.float({ min: Math.fround(10), max: Math.fround(50) }),
          restoreRate: fc.float({ min: Math.fround(1.0), max: Math.fround(5.0) }),
          deltaTime: fc.float({ min: Math.fround(0.1), max: Math.fround(5.0) })
        }),
        (config) => {
          const world = new World();
          const energySystem = new EnergySystem(world);

          const entity = world.createEntity();
          const energy = createEnergyComponent(
            config.initialEnergy,
            0.3,
            config.restoreRate,
            1.0
          );
          world.addComponent(entity, energy);
          
          // Set entity to sleeping state
          world.addComponent(entity, createAIBehaviourComponent(BehaviourState.Sleep));

          const initialLevel = energy.level;
          energySystem.update(config.deltaTime);

          const expectedLevel = Math.min(100, initialLevel + (config.restoreRate * config.deltaTime));
          const tolerance = 0.001;

          assert.ok(
            Math.abs(energy.level - expectedLevel) < tolerance,
            `Energy restoration incorrect: expected ${expectedLevel}, got ${energy.level}`
          );
          assert.ok(energy.level >= initialLevel, 'Energy should increase when sleeping');
        }
      ),
      { numRuns: 100 }
    );
  });
});
