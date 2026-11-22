// The thief: Rook. Walks, runs, crouches; throws coins to pull guards
// away and fires an EMP to blind the cameras. Picks up loot, reaches the
// getaway door. Everything the player does is a trade: speed for noise,
// a coin for a guard's attention, an EMP for twelve seconds of dark.
import { PLAYER, TOOLS } from './config.js';
import { moveCircle } from './level.js';

export function createPlayer(start) {
  return {
    x: start.x,
    y: start.y,
    angle: 0,
    crouching: false,
    running: false,
    moving: false,
    coins: TOOLS.coinsPerLevel,
    emps: TOOLS.empsPerLevel,
    loot: 0,
    stepPhase: 0,
  };
}

/**
 * Move the thief one step. `input` is {x, y} in -1..1 plus flags. Returns
 * nothing; the player object is the state. Running makes noise the guards
 * can hear, crouching makes the thief hard to see.
 */
export function updatePlayer(level, player, input, dt) {
  const len = Math.hypot(input.x, input.y);
  player.moving = len > 0.1;
  player.crouching = input.crouch;
  player.running = input.run && !input.crouch && len > 0.1;
  if (!player.moving) return;
  const speed = player.crouching ? PLAYER.crouch : player.running ? PLAYER.run : PLAYER.walk;
  const nx = (input.x / len) * speed * dt;
  const ny = (input.y / len) * speed * dt;
  moveCircle(level, player, nx, ny, PLAYER.radius);
  player.angle = Math.atan2(input.y, input.x);
  player.stepPhase += (speed * dt) / 14;
}

/** The thief is loud right now (running): guards nearby will turn. */
export function playerNoiseRadius(player) {
  return player.running && player.moving ? PLAYER.runNoise : 0;
}
