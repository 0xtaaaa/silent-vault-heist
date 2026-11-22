// SILENT VAULT — tuning constants. One place for every number the game
// balances on, so a level or a rule can be retuned without touching logic.
export const TILE = 32;
export const MAP_W = 40;
export const MAP_H = 20;
export const VIEW_W = 1280;
export const VIEW_H = 720;
export const HUD_H = 64;
export const FIELD_Y = HUD_H; // playfield top edge, in canvas pixels
export const FIELD_W = MAP_W * TILE; // 1280
export const FIELD_H = MAP_H * TILE; // 640

// Player: a thief in soft shoes. Crouching is slow and quiet; running is
// fast and loud; walking is the middle ground.
export const PLAYER = {
  radius: 11,
  walk: 150,
  run: 232,
  crouch: 82,
  // Detection multiplier while crouched / running.
  crouchSee: 0.45,
  runSee: 1.6,
  // Noise radius a running thief makes; guards hear it.
  runNoise: 135,
};

// Guards: patrol slowly, chase fast. Their eyes are the whole game.
export const GUARD = {
  radius: 12,
  patrol: 68,
  chase: 168,
  search: 95,
  visionRange: 230,
  coneHalf: Math.PI / 4, // 90-degree cone
  coneRays: 26,
  // Detection meter fills 0..1. Close is faster; the rate is per second.
  fillNear: 1.7,
  fillFar: 0.55,
  decay: 0.38,
  suspiciousAt: 0.35,
  alertAt: 1.0,
  pauseAtWaypoint: 1.1, // seconds stood still at each waypoint
  searchTime: 4.0, // seconds spent looking around the last seen spot
  shadowSee: 0.25, // multiplier while the thief hides in a dark zone
  hearRange: 170, // a thrown coin is heard this far
};

// Cameras: fixed mounts that sweep. They cannot chase, but they raise the
// alarm fast and never blink.
export const CAMERA = {
  range: 250,
  coneHalf: Math.PI / 5, // 72-degree cone
  coneRays: 20,
  fill: 25, // alarm per second while the thief is in the cone
  sweepSpeed: 0.45, // radians per second
};

// The alarm: 0..100. At 100 the thief is caught.
export const ALARM = {
  alertRise: 18, // per second while any guard is in alert
  suspiciousRise: 7, // per second while any guard is suspicious
  decay: 4, // per second while nobody sees the thief
  caughtAt: 100,
};

export const TOOLS = {
  coinsPerLevel: 3,
  coinRange: 200, // guards hear a coin landing within this radius
  empsPerLevel: 1,
  empSeconds: 12, // cameras blind + guard vision dimmed for this long
  empVision: 0.7,
};

export const SCORE = {
  loot: 100,
  ghostBonus: 500, // per level, if the alarm never rose above 0
  timeBonusPerSecond: 5, // leftover par time, per second
  parSeconds: 150,
};

export const STRIKES_PER_LEVEL = 3;
export const STEP = 1 / 60;
