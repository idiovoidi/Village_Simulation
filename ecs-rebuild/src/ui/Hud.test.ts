/**
 * HUD helper tests (the DOM-bound class itself is covered by browser checks).
 * Hud.ts only touches `document` inside the class, so importing it is safe in Node.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { periodName } from './Hud.ts';

describe('periodName', () => {
  it('labels the day', () => {
    const cases: Array<[number, string]> = [
      [2, 'Night'],
      [5.5, 'Dawn'],
      [9, 'Morning'],
      [12.5, 'Midday'],
      [15, 'Afternoon'],
      [18.5, 'Evening'],
      [22, 'Night'],
    ];
    for (const [hour, label] of cases) assert.equal(periodName(hour), label, `hour ${hour}`);
  });

  it('covers every hour', () => {
    for (let h = 0; h < 24; h += 0.25) assert.ok(periodName(h).length > 0);
  });
});
