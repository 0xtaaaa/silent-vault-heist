// SILENT VAULT — boot and the one loop. The world advances in fixed 1/60 s
// steps (several in a slow frame, none in a fast one), the renderer paints
// what is there, and the game moves between eight screens: title, intro,
// play, paused, busted, room clear, win and game over.
//
// ?seed=N fixes the run. ?shot=start|play|chase|mission (with &seed=N)
// stages that scene instead of running the loop, paints it twice and sets
// window.__shotReady for a screenshot.
import { ALARM, CAMERA, FIELD_Y, GUARD, PLAYER, SCORE, STEP, STRIKES_PER_LEVEL, TILE, TOOLS } from './config.js';
import { LEVELS, hasLineOfSight, isShadow, parseLevel } from './level.js';
import { STATE_ALERT, STATE_SUSPICIOUS, createGuard, hearNoise, updateGuard } from './guards.js';
import { cameraSees, createCamera, updateCamera } from './cameras.js';
import { createPlayer, playerNoiseRadius, updatePlayer } from './player.js';
import { createAudio } from './audio.js';
import { ACTION_COIN, ACTION_CONFIRM, ACTION_EMP, ACTION_PAUSE, createInput } from './input.js';
import { SCREEN_BUSTED, SCREEN_CLEAR, SCREEN_INTRO, SCREEN_OVER, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE, SCREEN_WIN, createRenderer } from './render.js';
import { stageShot } from './shots.js';

const BEST_KEY = 'silent-vault.best';
const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const renderer = createRenderer(canvas);
const input = createInput(canvas);
const audio = createAudio();

function readBest() {
  try {
    return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function saveBest(score) {
  try {
    window.localStorage.setItem(BEST_KEY, String(score));
  } catch {
    // A browser that refuses storage still plays.
  }
}

/** The whole run: rooms, loot, alarm, strikes, score. No drawing here. */
export function createWorld() {
  const world = {
    screen: SCREEN_TITLE,
    levelIndex: 0,
    level: null,
    levelName: '',
    levelSub: '',
    player: null,
    guards: [],
    cameras: [],
    coins: [], // thrown coins, still ringing on the floor
    alarm: 0,
    alarmPeak: 0,
    score: 0,
    strikes: STRIKES_PER_LEVEL,
    elapsed: 0,
    levelElapsed: 0,
    empLeft: 0,
    lootTaken: 0,
    lootTotal: 0,
    time: 0,
    best: readBest(),
    toast: null,
    toastLeft: 0,
    clearBonus: null,
    cleared: false, // the getaway pays once per room, not once per step
  };

  function loadLevel(index) {
    world.levelIndex = index;
    world.level = parseLevel(LEVELS[index]);
    world.levelName = world.level.name;
    world.levelSub = world.level.sub;
    world.player = createPlayer(world.level.start);
    world.guards = world.level.guards.map(createGuard);
    world.cameras = world.level.cameras.map(createCamera);
    world.coins = [];
    world.alarm = 0;
    world.alarmPeak = 0;
    world.empLeft = 0;
    world.strikes = STRIKES_PER_LEVEL;
    world.levelElapsed = 0;
    world.lootTaken = 0;
    world.lootTotal = world.level.loot.length;
    world.toast = null;
    world.clearBonus = null;
    world.cleared = false;
  }

  /** Back to the room's start: guards home, alarm cold. Kept loot stays kept. */
  function resetRoom() {
    const start = world.level.start;
    world.player.x = start.x;
    world.player.y = start.y;
    world.player.angle = 0;
    world.guards = world.level.guards.map(createGuard);
    world.cameras = world.level.cameras.map(createCamera);
    world.coins = [];
    world.alarm = 0;
    world.empLeft = 0;
    world.levelElapsed = 0;
  }

  function showToast(text, seconds = 2.5) {
    world.toast = text;
    world.toastLeft = seconds;
  }

  function throwCoin(aim) {
    const player = world.player;
    if (player.coins <= 0) {
      showToast('No coins left — slip past instead');
      return;
    }
    player.coins -= 1;
    let dx = Math.cos(player.angle);
    let dy = Math.sin(player.angle);
    if (aim) {
      const ax = aim.x - player.x;
      const ay = aim.y - (player.y + FIELD_Y);
      const len = Math.hypot(ax, ay);
      if (len > 8) {
        dx = ax / len;
        dy = ay / len;
      }
    }
    // The coin lands 160px out, or against the first wall in the way.
    let dist = 160;
    for (let d = 16; d <= 160; d += 8) {
      const nx = player.x + dx * d;
      const ny = player.y + dy * d;
      if (world.level.grid[Math.floor(ny / TILE)]?.[Math.floor(nx / TILE)] === '#') break;
      dist = d;
    }
    const coin = { x: player.x + dx * dist, y: player.y + dy * dist, ttl: 6 };
    world.coins.push(coin);
    for (const guard of world.guards) hearNoise(guard, coin.x, coin.y);
    audio.coin();
    showToast('Coin thrown — the guards go to look');
  }

  function fireEmp() {
    const player = world.player;
    if (player.emps <= 0) {
      showToast('EMP spent — the cameras are watching');
      return;
    }
    player.emps -= 1;
    world.empLeft = TOOLS.empSeconds;
    for (const cam of world.cameras) cam.disabled = TOOLS.empSeconds;
    audio.emp();
    showToast(`EMP fired — cameras blind for ${TOOLS.empSeconds}s`);
  }

  /**
   * One fixed step of the live room. Returns the events that happened, so
   * the loop can react (sounds, screens) without the world knowing about
   * screens or sound.
   */
  function step(dt, steer, actions) {
    const events = { alert: false, caught: false, loot: false, clear: false, suspicious: false };
    const wasSuspicious = world.guards.some((g) => g.state === STATE_SUSPICIOUS || g.state === STATE_ALERT);
    world.time += dt;
    world.elapsed += dt;
    world.levelElapsed += dt;
    if (world.toastLeft > 0) {
      world.toastLeft -= dt;
      if (world.toastLeft <= 0) world.toast = null;
    }
    if (world.empLeft > 0) world.empLeft -= dt;

    if (actions.coin) throwCoin(actions.aim);
    if (actions.emp) fireEmp();
    updatePlayer(world.level, world.player, steer, dt);
    audio.step(world.player.running, world.player.moving, world.time);

    // Running is loud: nearby guards turn toward the noise.
    const noise = playerNoiseRadius(world.player);
    if (noise > 0) {
      for (const guard of world.guards) {
        if (Math.hypot(guard.x - world.player.x, guard.y - world.player.y) < noise) {
          hearNoise(guard, world.player.x, world.player.y);
        }
      }
    }

    // Guards and cameras.
    let anyAlert = false;
    let anySus = false;
    let camSees = false;
    for (const guard of world.guards) {
      const alert = updateGuard(world.level, guard, world.player, dt, world.empLeft > 0, events);
      anyAlert = anyAlert || alert;
      anySus = anySus || guard.state === STATE_SUSPICIOUS;
    }
    for (const cam of world.cameras) {
      updateCamera(world.level, cam, dt);
      if (cameraSees(world.level, cam, world.player)) camSees = true;
    }
    if (events.alert) audio.alert();
    if (!wasSuspicious && (anySus || anyAlert)) audio.suspicious();

    // Nearest guard's footsteps, louder up close.
    let nearest = Infinity;
    for (const guard of world.guards) {
      nearest = Math.min(nearest, Math.hypot(guard.x - world.player.x, guard.y - world.player.y));
    }
    audio.guardStep(Math.max(0, 1 - nearest / 320), world.time);

    // The alarm climbs while anyone is on the thief, and cools when not.
    if (anyAlert) world.alarm += ALARM.alertRise * dt;
    else if (anySus) world.alarm += ALARM.suspiciousRise * dt;
    if (camSees) world.alarm += CAMERA.fill * dt;
    if (!anyAlert && !anySus && !camSees) world.alarm -= ALARM.decay * dt;
    world.alarm = Math.max(0, Math.min(ALARM.caughtAt, world.alarm));
    world.alarmPeak = Math.max(world.alarmPeak, world.alarm);

    // Thrown coins fade.
    for (const coin of world.coins) coin.ttl -= dt;
    world.coins = world.coins.filter((c) => c.ttl > 0);

    // Loot.
    for (const loot of world.level.loot) {
      if (loot.taken) continue;
      if (Math.hypot(loot.x - world.player.x, loot.y - world.player.y) < 26) {
        loot.taken = true;
        world.lootTaken += 1;
        world.score += SCORE.loot;
        events.loot = true;
        audio.pickup();
        showToast(`Relic pocketed +${SCORE.loot}  (${world.lootTaken}/${world.lootTotal})`);
      }
    }

    // Caught: a guard's hands, or the alarm maxing out.
    if (events.caught || world.alarm >= ALARM.caughtAt) {
      events.caught = true;
      return events;
    }

    // The getaway: every relic, then the green door. Pays once per room.
    if (!world.cleared && world.lootTaken >= world.lootTotal) {
      const exit = world.level.exit;
      if (Math.hypot(exit.x - world.player.x, exit.y - world.player.y) < 28) {
        world.cleared = true;
        const timeBonus = Math.max(0, Math.round((SCORE.parSeconds - world.levelElapsed) * SCORE.timeBonusPerSecond));
        const ghostBonus = world.alarmPeak === 0 ? SCORE.ghostBonus : 0;
        world.score += timeBonus + ghostBonus;
        world.clearBonus = { timeBonus, ghostBonus, lootText: `${world.lootTaken}/${world.lootTotal} relics · room ${world.levelIndex + 1}/3 clear` };
        events.clear = true;
        audio.levelClear();
        if (world.score > world.best) {
          world.best = world.score;
          saveBest(world.best);
        }
      }
    }
    return events;
  }

  world.loadLevel = loadLevel;
  world.resetRoom = resetRoom;
  world.step = step;
  world.showToast = showToast;
  loadLevel(0);
  return world;
}

const world = createWorld();
let screen = SCREEN_TITLE;
let staged = null;

function setScreen(next) {
  screen = next;
  world.screen = next;
}

function startRun() {
  world.score = 0;
  world.elapsed = 0;
  world.best = readBest();
  world.loadLevel(0);
  setScreen(SCREEN_INTRO);
}

function nextRoom() {
  if (world.levelIndex + 1 >= LEVELS.length) {
    audio.win();
    setScreen(SCREEN_WIN);
    return;
  }
  world.loadLevel(world.levelIndex + 1);
  setScreen(SCREEN_INTRO);
}

function handleCaught() {
  audio.caught();
  world.strikes -= 1;
  if (world.strikes <= 0) {
    if (world.score > world.best) {
      world.best = world.score;
      saveBest(world.best);
    }
    setScreen(SCREEN_OVER);
  } else {
    world.resetRoom();
    setScreen(SCREEN_BUSTED);
  }
}

function update() {
  const steer = input.read();
  const taken = input.takeActions();
  const aim = taken.mouse.clicked ? input.aim() : null;
  const actions = {
    coin: Boolean(taken.actions & ACTION_COIN) || Boolean(aim),
    emp: Boolean(taken.actions & ACTION_EMP),
    aim,
  };
  if (taken.actions & ACTION_PAUSE) {
    if (screen === SCREEN_PLAY) setScreen(SCREEN_PAUSED);
    else if (screen === SCREEN_PAUSED) setScreen(SCREEN_PLAY);
  }
  if (taken.actions & ACTION_CONFIRM) {
    audio.unlock();
    if (screen === SCREEN_TITLE) startRun();
    else if (screen === SCREEN_INTRO) setScreen(SCREEN_PLAY);
    else if (screen === SCREEN_BUSTED) setScreen(SCREEN_PLAY);
    else if (screen === SCREEN_CLEAR) nextRoom();
    else if (screen === SCREEN_WIN || screen === SCREEN_OVER) startRun();
  }
  if (screen === SCREEN_PLAY) {
    const events = world.step(STEP, steer, actions);
    if (events.caught) handleCaught();
    else if (events.clear) setScreen(SCREEN_CLEAR);
  }
}

function render() {
  renderer.draw(screen, world, {
    toast: world.toast,
    lootText: world.clearBonus?.lootText,
    timeBonus: world.clearBonus?.timeBonus,
    ghostBonus: world.clearBonus?.ghostBonus,
  });
  status.textContent = `${world.levelName} — loot ${world.lootTaken}/${world.lootTotal}, alarm ${Math.round(world.alarm)}%`;
}

let last = performance.now();
let acc = 0;
function loop(now) {
  const frameSeconds = Math.min(MAX_FRAME, (now - last) / 1000);
  last = now;
  acc += frameSeconds;
  while (acc >= STEP) {
    update();
    acc -= STEP;
  }
  render();
  requestAnimationFrame(loop);
}

if (shot) {
  // Staged screenshot: build the scene, paint it twice, signal readiness.
  staged = stageShot(shot, world);
  setScreen(staged.screen);
  renderer.draw(screen, world, { toast: staged.toast });
  renderer.draw(screen, world, { toast: staged.toast });
  window.__shotReady = true;
  window.__heist = { world, screen, stageShot };
} else {
  window.__heist = {
    world,
    get screen() {
      return screen;
    },
    startRun,
    setScreen,
    step: (dt, steer, actions) => world.step(dt, steer, actions),
  };
  requestAnimationFrame(loop);
}
