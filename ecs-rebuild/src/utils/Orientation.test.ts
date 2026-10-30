/**
 * Orientation + Noise helper tests.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { faceVelocity } from './Orientation.ts';
import { valueNoise2 } from './Noise.ts';

const identity = () => ({ x: 0, y: 0, z: 0, w: 1 });
const yawOf = (q: { y: number; w: number }) => 2 * Math.atan2(q.y, q.w);

describe('faceVelocity', () => {
  it('turns towards the direction of travel', () => {
    const q = identity();
    for (let i = 0; i < 200; i++) faceVelocity(q, 1, 0, 0.05); // +X => yaw +90°
    assert.ok(Math.abs(yawOf(q) - Math.PI / 2) < 0.01, `yaw was ${yawOf(q)}`);
  });

  it('takes the short way round the circle', () => {
    const q = identity();
    // Start facing just past -π/2, target just before +π: shortest path crosses ±π.
    q.y = Math.sin(-2.9 / 2);
    q.w = Math.cos(-2.9 / 2);
    faceVelocity(q, Math.sin(3.0), Math.cos(3.0), 0.05);
    const yaw = yawOf(q);
    assert.ok(yaw < -2.9, `should rotate further negative towards the wrap, got ${yaw}`);
  });

  it('ignores near-stationary entities', () => {
    const q = identity();
    const changed = faceVelocity(q, 0.01, 0.01, 0.1);
    assert.equal(changed, false);
    assert.deepEqual(q, identity());
  });

  it('keeps the quaternion normalised', () => {
    const q = identity();
    faceVelocity(q, 3, -2, 0.016);
    assert.ok(Math.abs(Math.hypot(q.x, q.y, q.z, q.w) - 1) < 1e-9);
  });
});

describe('valueNoise2', () => {
  it('is deterministic and bounded', () => {
    for (let i = 0; i < 200; i++) {
      const x = i * 0.37 - 20;
      const z = i * 0.91 + 3;
      const v = valueNoise2(x, z);
      assert.equal(v, valueNoise2(x, z));
      assert.ok(v >= 0 && v <= 1, `out of range: ${v}`);
    }
  });

  it('varies smoothly between neighbouring samples', () => {
    for (let i = 0; i < 100; i++) {
      const a = valueNoise2(i * 0.5, 4);
      const b = valueNoise2(i * 0.5 + 0.01, 4);
      assert.ok(Math.abs(a - b) < 0.1);
    }
  });
});
