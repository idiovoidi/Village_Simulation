/**
 * Sky palette tests (pure colour maths; no Babylon needed).
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { sampleSky } from './AtmosphereManager.ts';

const luma = (c: { r: number; g: number; b: number }) => 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b;

describe('sampleSky', () => {
  it('is dark at night and bright at noon', () => {
    const night = sampleSky(-0.6);
    const noon = sampleSky(1);
    assert.ok(luma(night.horizon) < 0.12, 'night horizon should be dark');
    assert.ok(luma(noon.horizon) > 0.6, 'noon horizon should be bright');
    assert.ok(luma(noon.zenith) > luma(night.zenith) * 4);
  });

  it('has a warm horizon at sunset', () => {
    const dusk = sampleSky(0.02);
    assert.ok(dusk.horizon.r > dusk.horizon.b, 'sunset horizon should be orange/red');
    assert.ok(dusk.sunColor.r > dusk.sunColor.b);
  });

  it('clamps outside the keyframe range instead of extrapolating', () => {
    assert.deepEqual(sampleSky(-5), sampleSky(-0.3));
    assert.deepEqual(sampleSky(5), sampleSky(1));
  });

  it('blends continuously (no jumps between close elevations)', () => {
    let prev = sampleSky(-0.3).horizon;
    for (let e = -0.29; e <= 1; e += 0.01) {
      const cur = sampleSky(e).horizon;
      assert.ok(Math.abs(cur.r - prev.r) < 0.08, `red jumped at ${e.toFixed(2)}`);
      assert.ok(Math.abs(cur.g - prev.g) < 0.08, `green jumped at ${e.toFixed(2)}`);
      assert.ok(Math.abs(cur.b - prev.b) < 0.08, `blue jumped at ${e.toFixed(2)}`);
      prev = cur;
    }
  });
});
