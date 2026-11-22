// The hacking minigame: stop a moving marker inside the green zone,
// three rounds. A terminal hack blinds every camera for a window; a safe
// hack cracks the safe open. Keyboard only: SPACE locks the marker in.
// Fail once and the alarm jumps — the minigame is a gamble, not a free
// action. Pure state: no drawing, no sound, no DOM here.
export const HACK_ROUNDS = 3;

// The green zone per round: it narrows as the rounds go on, so the third
// lock is the one that takes a steady hand.
function zoneFor(round) {
  const from = 0.32 + round * 0.05;
  const to = 0.68 - round * 0.05;
  return { from, to };
}

// Marker speed per round: faster every round, so the last lock is quick.
function speedFor(round) {
  return 0.85 + round * 0.25;
}

/** A fresh hack on a terminal or a safe. The marker starts at the left edge. */
export function createHack(kind, target) {
  return {
    kind, // 'terminal' | 'safe'
    target,
    round: 0,
    marker: 0,
    dir: 1,
    zone: zoneFor(0),
    speed: speedFor(0),
    done: false,
    success: false,
    failed: false,
  };
}

/** Advance the marker one step. It bounces between the ends of the bar. */
export function updateHack(hack, dt) {
  if (hack.done) return;
  hack.marker += hack.dir * hack.speed * dt;
  if (hack.marker >= 1) {
    hack.marker = 1;
    hack.dir = -1;
  } else if (hack.marker <= 0) {
    hack.marker = 0;
    hack.dir = 1;
  }
}

/**
 * Lock the marker in. Returns 'hit' (round cleared), 'done' (all three
 * rounds cleared) or 'miss' (outside the zone: the hack fails at once).
 */
export function lockHack(hack) {
  if (hack.done) return hack.success ? 'done' : 'miss';
  if (hack.marker >= hack.zone.from && hack.marker <= hack.zone.to) {
    hack.round += 1;
    if (hack.round >= HACK_ROUNDS) {
      hack.done = true;
      hack.success = true;
      return 'done';
    }
    hack.zone = zoneFor(hack.round);
    hack.speed = speedFor(hack.round);
    hack.marker = 0;
    hack.dir = 1;
    return 'hit';
  }
  hack.done = true;
  hack.failed = true;
  return 'miss';
}

/** The marker's position as a fraction of the bar, 0..1. */
export function hackMarker(hack) {
  return hack.marker;
}
