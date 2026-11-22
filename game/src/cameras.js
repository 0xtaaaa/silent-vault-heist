// Security cameras: wall mounts that sweep a cone back and forth. They
// cannot chase, but they raise the alarm the moment the thief crosses
// their light — and they never get tired. An EMP blinds them for a while.
import { CAMERA } from './config.js';
import { conePolygon, guardSees } from './guards.js';
import { hasLineOfSight } from './level.js';

export function createCamera(def) {
  return {
    x: def.x,
    y: def.y,
    baseAngle: def.baseAngle,
    sweep: def.sweep,
    phase: Math.random() * Math.PI * 2,
    angle: def.baseAngle,
    disabled: 0, // seconds of EMP blindness left
  };
}

/** Sweep the mount; returns the cone polygon for drawing. `sweepMul` is the difficulty's camera speed. */
export function updateCamera(level, camera, dt, sweepMul = 1) {
  camera.phase += dt * CAMERA.sweepSpeed * sweepMul;
  camera.angle = camera.baseAngle + Math.sin(camera.phase) * camera.sweep;
  if (camera.disabled > 0) camera.disabled -= dt;
  if (camera.disabled <= 0) {
    return conePolygon(level, camera.x, camera.y, camera.angle, CAMERA.range, CAMERA.coneHalf, CAMERA.coneRays);
  }
  return null; // blind: no cone, no sight
}

/** Does this camera see the thief right now? */
export function cameraSees(level, camera, player) {
  if (camera.disabled > 0) return false;
  const dx = player.x - camera.x;
  const dy = player.y - camera.y;
  const dist = Math.hypot(dx, dy);
  if (dist > CAMERA.range) return false;
  let diff = Math.atan2(dy, dx) - camera.angle;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  if (Math.abs(diff) > CAMERA.coneHalf) return false;
  return hasLineOfSight(level, camera.x, camera.y, player.x, player.y);
}
