// The screenshot scenes behind ?shot=start|play|chase|mission. Each one
// builds a real level, puts the pieces where the story needs them, then
// plays the real rules forward for a few seconds, so the frame is what a
// short game really looks like — and the same seed always gives the same
// frame. Nothing here fakes a render: the cones, the meters and the alarm
// are all live simulation state.
import { SCREEN_PLAY } from './render.js';
import { STATE_ALERT, STATE_SUSPICIOUS } from './guards.js';
import { TILE } from './config.js';

function at(tx, ty) {
  return { x: tx * TILE + TILE / 2, y: ty * TILE + TILE / 2 };
}

function idleInput() {
  return { x: 0, y: 0, run: false, crouch: false };
}

/** Run the real rules for `seconds` with a fixed scripted input. */
function playForward(world, seconds, inputFn) {
  const steps = Math.round(seconds * 60);
  for (let i = 0; i < steps; i += 1) {
    world.step(1 / 60, inputFn(i), { coin: false, emp: false, aim: null });
    if (world.screen !== 'play') break;
  }
}

/**
 * Set `world` to the named scene and return the screen to draw and a toast
 * line for the frame. Any other name is the cover.
 */
export function stageShot(name, world) {
  world.screen = 'play'; // the staged rules run as live play
  if (name === 'play') {
    // The Gallery: a second room, a different look — glass cases, two
    // cameras, the thief mid-route between two relics.
    world.loadLevel(1);
    const p = at(20, 8);
    world.player.x = p.x;
    world.player.y = p.y;
    world.cameras[0].phase = 1.2;
    world.cameras[1].phase = -0.8;
    playForward(world, 2, (i) => (i < 60 ? { x: 1, y: 0, run: false, crouch: false } : { x: 0, y: 1, run: false, crouch: true }));
    return { screen: SCREEN_PLAY, toast: 'THE GALLERY — two cameras, three guards, four relics' };
  }
  if (name === 'chase') {
    // The near-miss: the alarm is almost full, one guard is on the thief
    // and a second is closing in, suspicious.
    world.loadLevel(0);
    const p = at(16, 10);
    world.player.x = p.x;
    world.player.y = p.y;
    const g0 = world.guards[0];
    const g0pos = at(14, 8);
    g0.x = g0pos.x;
    g0.y = g0pos.y;
    g0.state = STATE_ALERT;
    g0.meter = 1;
    g0.lastSeen = { x: p.x, y: p.y };
    const g1 = world.guards[1];
    const g1pos = at(24, 12);
    g1.x = g1pos.x;
    g1.y = g1pos.y;
    g1.state = STATE_SUSPICIOUS;
    g1.meter = 0.55;
    g1.investigate = { x: p.x, y: p.y };
    world.alarm = 82;
    world.alarmPeak = 82;
    playForward(world, 0.5, () => ({ x: -1, y: 0, run: true, crouch: false }));
    return { screen: SCREEN_PLAY, toast: 'SPOTTED — the alarm is nearly full, run for the shadows' };
  }
  if (name === 'mission') {
    // The getaway: every relic pocketed, the thief one step from the exit.
    world.loadLevel(2);
    for (const loot of world.level.loot) loot.taken = true;
    world.lootTaken = world.lootTotal;
    world.score = 500;
    const p = at(31, 8);
    world.player.x = p.x;
    world.player.y = p.y;
    world.player.angle = 0;
    world.alarm = 8;
    world.alarmPeak = 8;
    world.cameras[0].phase = 2.2;
    world.cameras[1].phase = 0.4;
    world.cameras[2].phase = -1.4;
    playForward(world, 0.5, () => ({ x: 1, y: 0, run: false, crouch: false }));
    return { screen: SCREEN_PLAY, toast: 'ALL RELICS — reach the green EXIT' };
  }
  // Cover: the Lobby, one frame holding everything the brief asks for —
  // the room, a guard cone sweeping past the crouched thief, a camera cone,
  // a relic, the alarm meter and the minimap.
  world.loadLevel(0);
  const p = at(14, 11);
  world.player.x = p.x;
  world.player.y = p.y;
  world.player.crouching = true;
  const g0 = world.guards[0];
  const g0pos = at(10, 9);
  g0.x = g0pos.x;
  g0.y = g0pos.y;
  g0.angle = 0.3;
  g0.meter = 0.22;
  world.cameras[0].phase = 1.9;
  world.alarm = 12;
  world.alarmPeak = 12;
  playForward(world, 0.4, idleInput);
  return { screen: SCREEN_PLAY, toast: 'SILENT VAULT — cross the cones, pocket every relic' };
}
