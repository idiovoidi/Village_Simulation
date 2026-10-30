/**
 * Orientation helpers shared by every system that moves things around.
 */

export interface QuaternionLike {
  x: number;
  y: number;
  z: number;
  w: number;
}

/**
 * Yaws a quaternion towards the heading of a horizontal velocity.
 * No-op while the entity is (nearly) stationary so idle things keep facing.
 *
 * @param rate - turn responsiveness; roughly "1/seconds to settle"
 * @returns true if the rotation changed
 */
export function faceVelocity(
  q: QuaternionLike,
  vx: number,
  vz: number,
  deltaTime: number,
  rate = 8,
  minSpeed = 0.15
): boolean {
  if (Math.hypot(vx, vz) < minSpeed) return false;

  const currentYaw = 2 * Math.atan2(q.y, q.w);
  const targetYaw = Math.atan2(vx, vz);
  let diff = targetYaw - currentYaw;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;

  const yaw = currentYaw + diff * Math.min(1, deltaTime * rate);
  q.x = 0;
  q.y = Math.sin(yaw / 2);
  q.z = 0;
  q.w = Math.cos(yaw / 2);
  return true;
}
