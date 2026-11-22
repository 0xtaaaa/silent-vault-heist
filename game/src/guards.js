// Guards: the eyes of the vault. Each one patrols a loop of waypoints,
// pauses to look around, and runs a five-state mind:
//   patrol -> suspicious -> alert -> search -> return -> patrol
// A guard's vision cone is real geometry: rays are cast against the walls,
// so the cone genuinely stops at cover. A thief behind a wall is safe;
// a thief in the open, in the light, is not.
import { FIELD_H, FIELD_W, GUARD, PLAYER, TILE } from './config.js';
import { hasLineOfSight, isShadow, moveCircle } from './level.js';

export const STATE_PATROL = 'patrol';
export const STATE_SUSPICIOUS = 'suspicious';
export const STATE_ALERT = 'alert';
export const STATE_SEARCH = 'search';
export const STATE_RETURN = 'return';

/** Cast one ray from (x, y) along `angle`; return how far it travels. */
export function castRay(level, x, y, angle, maxDist) {
  const dx = Math.cos(angle);
  const dy = Math.sin(angle);
  const step = 6;
  for (let d = step; d <= maxDist; d += step) {
    if (level.grid[Math.floor((y + dy * d) / TILE)]?.[Math.floor((x + dx * d) / TILE)] !== '.'
      && level.grid[Math.floor((y + dy * d) / TILE)]?.[Math.floor((x + dx * d) / TILE)] !== ',') {
      return d;
    }
  }
  return maxDist;
}

/**
 * The visible cone as a polygon (origin + ray endpoints), in field pixels.
 * Walls clip it: the cone stops where the wall starts, which is what makes
 * cover meaningful.
 */
export function conePolygon(level, x, y, angle, range, halfAngle, rays) {
  const points = [{ x, y }];
  for (let i = 0; i <= rays; i += 1) {
    const a = angle - halfAngle + (2 * halfAngle * i) / rays;
    const d = castRay(level, x, y, a, range);
    points.push({ x: x + Math.cos(a) * d, y: y + Math.sin(a) * d });
  }
  return points;
}

export function createGuard(def) {
  const start = def.waypoints[0];
  return {
    x: start.x,
    y: start.y,
    angle: 0,
    waypoint: 1 % def.waypoints.length,
    waypoints: def.waypoints,
    pause: 0,
    state: STATE_PATROL,
    meter: 0, // 0..1 detection of the thief
    lastSeen: null,
    loseSight: 0,
    searchLeft: 0,
    investigate: null, // {x, y} a noise to check out
    bobPhase: Math.random() * Math.PI * 2,
  };
}

/** Does this guard currently see the thief? Returns a 0..1 strength. */
export function guardSees(level, guard, player, empActive) {
  const dx = player.x - guard.x;
  const dy = player.y - guard.y;
  const dist = Math.hypot(dx, dy);
  const range = GUARD.visionRange * (empActive ? 0.7 : 1);
  if (dist > range || dist < 1) return 0;
  let diff = Math.atan2(dy, dx) - guard.angle;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  if (Math.abs(diff) > GUARD.coneHalf) return 0;
  if (!hasLineOfSight(level, guard.x, guard.y, player.x, player.y)) return 0;
  return 1 - (dist / range) * 0.6; // closer reads stronger
}

/** A noise at (x, y): guards in earshot go to look. */
export function hearNoise(guard, x, y) {
  const d = Math.hypot(x - guard.x, y - guard.y);
  if (d > GUARD.hearRange) return;
  if (guard.state === STATE_ALERT) return;
  guard.investigate = { x, y };
  if (guard.state === STATE_PATROL) {
    guard.state = STATE_SUSPICIOUS;
    guard.meter = Math.max(guard.meter, GUARD.suspiciousAt);
  }
}

function moveToward(level, guard, tx, ty, speed, dt) {
  const dx = tx - guard.x;
  const dy = ty - guard.y;
  const dist = Math.hypot(dx, dy);
  if (dist < 4) return true;
  const step = Math.min(dist, speed * dt);
  moveCircle(level, guard, (dx / dist) * step, (dy / dist) * step, GUARD.radius);
  guard.angle = Math.atan2(dy, dx);
  return dist <= speed * dt + 4;
}

function nearestWaypointIndex(guard) {
  let best = 0;
  let bestD = Infinity;
  guard.waypoints.forEach((w, i) => {
    const d = Math.hypot(w.x - guard.x, w.y - guard.y);
    if (d < bestD) {
      bestD = d;
      best = i;
    }
  });
  return best;
}

/**
 * Advance one guard a fixed step. Returns true while the guard is in alert
 * (the alarm rises), and sets events.alert when a guard first spots the
 * thief — the moment the run goes loud.
 */
export function updateGuard(level, guard, player, dt, empActive, events) {
  const seen = guardSees(level, guard, player, empActive);
  const inShadow = isShadow(level, player.x, player.y);
  let fill = 0;
  if (seen > 0) {
    const closeness = GUARD.fillFar + (GUARD.fillNear - GUARD.fillFar) * seen;
    fill = closeness
      * (player.crouching ? PLAYER.crouchSee : 1)
      * (player.running ? PLAYER.runSee : 1)
      * (inShadow ? GUARD.shadowSee : 1);
    guard.lastSeen = { x: player.x, y: player.y };
    guard.loseSight = 0;
  } else {
    guard.meter = Math.max(0, guard.meter - GUARD.decay * dt);
    if (guard.state === STATE_ALERT) guard.loseSight += dt;
  }
  if (seen > 0) guard.meter = Math.min(1, guard.meter + fill * dt);

  const wasAlert = guard.state === STATE_ALERT;
  if (guard.meter >= GUARD.alertAt && guard.state !== STATE_ALERT) {
    guard.state = STATE_ALERT;
    if (!wasAlert && events) events.alert = true;
  } else if (guard.meter >= GUARD.suspiciousAt && guard.state === STATE_PATROL) {
    guard.state = STATE_SUSPICIOUS;
    guard.investigate = guard.investigate ?? (guard.lastSeen ? { ...guard.lastSeen } : null);
  }

  switch (guard.state) {
    case STATE_PATROL: {
      if (guard.pause > 0) {
        guard.pause -= dt;
        guard.angle += Math.sin(guard.bobPhase += dt * 2) * 0.002;
        break;
      }
      const target = guard.waypoints[guard.waypoint];
      if (moveToward(level, guard, target.x, target.y, GUARD.patrol, dt)) {
        guard.waypoint = (guard.waypoint + 1) % guard.waypoints.length;
        guard.pause = GUARD.pauseAtWaypoint;
      }
      break;
    }
    case STATE_SUSPICIOUS: {
      const target = guard.investigate ?? guard.lastSeen;
      if (!target) {
        guard.state = STATE_PATROL;
        break;
      }
      if (moveToward(level, guard, target.x, target.y, GUARD.patrol * 1.25, dt)) {
        guard.investigate = null;
        guard.state = STATE_SEARCH;
        guard.searchLeft = GUARD.searchTime;
      }
      break;
    }
    case STATE_ALERT: {
      const target = guard.lastSeen ?? { x: player.x, y: player.y };
      moveToward(level, guard, target.x, target.y, GUARD.chase, dt);
      if (guard.loseSight > 2.5) {
        guard.state = STATE_SEARCH;
        guard.searchLeft = GUARD.searchTime;
      }
      // Caught: the guard is on top of the thief.
      if (Math.hypot(player.x - guard.x, player.y - guard.y) < GUARD.radius + PLAYER.radius + 2) {
        if (events) events.caught = true;
      }
      break;
    }
    case STATE_SEARCH: {
      guard.searchLeft -= dt;
      guard.angle += dt * 1.6; // scanning the room
      if (guard.searchLeft <= 0) {
        guard.state = STATE_RETURN;
        guard.waypoint = nearestWaypointIndex(guard);
      }
      break;
    }
    case STATE_RETURN: {
      const target = guard.waypoints[guard.waypoint];
      if (moveToward(level, guard, target.x, target.y, GUARD.patrol * 1.3, dt)) {
        guard.state = STATE_PATROL;
        guard.meter = 0;
      }
      break;
    }
    default:
      break;
  }

  // Keep the guard inside the field, whatever the state did.
  guard.x = Math.max(GUARD.radius, Math.min(FIELD_W - GUARD.radius, guard.x));
  guard.y = Math.max(GUARD.radius, Math.min(FIELD_H - GUARD.radius, guard.y));
  return guard.state === STATE_ALERT;
}
