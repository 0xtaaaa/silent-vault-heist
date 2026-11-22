// The screenshot scenes behind ?shot=start|play|chase|mission. Each one
// builds a real level, puts the pieces where the story needs them, then
// plays the real rules forward for a few seconds, so the frame is what a
// short game really looks like — and the same seed always gives the same
// frame. Nothing here fakes a render: the cones, the meters and the alarm
// are all live simulation state. The cover shows the new Server Room: a
// terminal to hack, an elite guard's violet cone, a camera cone, gold
// bars, the alarm meter and the minimap.
import { SCREEN_PLAY } from './render.js';
import { STATE_ALERT, STATE_SUSPICIOUS } from './guards.js';
import { TILE } from './config.js';
import { createHack, updateHack } from './hack.js';

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
    world.step(1 / 60, inputFn(i), { coin: false, emp: false, hack: false, aim: null });
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
    // The Safe Deposit: a second new room — three safes, an art piece, an
    // elite watching the hall, the thief mid-route between two safes.
    world.loadLevel(4);
    const p = at(20, 8);
    world.player.x = p.x;
    world.player.y = p.y;
    world.cameras[0].phase = 1.2;
    world.cameras[1].phase = -0.8;
    playForward(world, 2, (i) => (i < 60 ? { x: 1, y: 0, run: false, crouch: false } : { x: 0, y: 1, run: false, crouch: true }));
    return { screen: SCREEN_PLAY, toast: 'THE SAFE DEPOSIT — three safes, an elite, one art piece' };
  }
  if (name === 'chase') {
    // The near-miss in the Server Room: the alarm is almost full, the elite
    // guard is on the thief and a second guard is closing in, suspicious.
    world.loadLevel(3);
    const p = at(20, 11);
    world.player.x = p.x;
    world.player.y = p.y;
    const elite = world.guards[2];
    const elitePos = at(18, 11);
    elite.x = elitePos.x;
    elite.y = elitePos.y;
    elite.state = STATE_ALERT;
    elite.meter = 1;
    elite.lastSeen = { x: p.x, y: p.y };
    const g1 = world.guards[1];
    const g1pos = at(26, 12);
    g1.x = g1pos.x;
    g1.y = g1pos.y;
    g1.state = STATE_SUSPICIOUS;
    g1.meter = 0.55;
    g1.investigate = { x: p.x, y: p.y };
    world.alarm = 82;
    world.alarmPeak = 82;
    playForward(world, 0.5, () => ({ x: -1, y: 0, run: true, crouch: false }));
    return { screen: SCREEN_PLAY, toast: 'SPOTTED BY THE ELITE — the alarm is nearly full, run for the shadows' };
  }
  if (name === 'mission') {
    // The hack: the thief at the security terminal, the minigame open, the
    // marker mid-flight over the green zone. The room is frozen while the
    // hack runs, so the frame is the minigame itself.
    world.loadLevel(3);
    const term = world.level.terminals[0];
    const p = { x: term.x + 40, y: term.y };
    world.player.x = p.x;
    world.player.y = p.y;
    world.player.angle = Math.PI;
    world.hack = createHack('terminal', term);
    updateHack(world.hack, 0.5);
    return { screen: SCREEN_PLAY, toast: 'HACK THE TERMINAL — stop the marker in the green zone' };
  }
  // Cover: the Server Room, one frame holding everything the brief asks
  // for — the room, a guard cone sweeping past the crouched thief, an
  // elite's violet cone, a camera cone, a terminal and gold bars, the
  // alarm meter and the minimap.
  world.loadLevel(3);
  const p = at(6, 4);
  world.player.x = p.x;
  world.player.y = p.y;
  world.player.crouching = true;
  const g0 = world.guards[0];
  const g0pos = at(10, 9);
  g0.x = g0pos.x;
  g0.y = g0pos.y;
  g0.angle = 0.3;
  g0.meter = 0.22;
  const elite = world.guards[2];
  const elitePos = at(30, 14);
  elite.x = elitePos.x;
  elite.y = elitePos.y;
  elite.angle = Math.PI;
  world.cameras[0].phase = 1.9;
  world.alarm = 12;
  world.alarmPeak = 12;
  playForward(world, 0.4, idleInput);
  return { screen: SCREEN_PLAY, toast: 'SILENT VAULT — five rooms, hack the terminal, crack the safes' };
}
