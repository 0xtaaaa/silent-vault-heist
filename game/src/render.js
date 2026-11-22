// Drawing only: the world's state and the current screen in, pixels out.
// The 1280x720 playfield is drawn at fixed logical size; the page scales
// it. Flat shapes, canvas text for the HUD and the panels. A guard's cone
// is drawn from the same raycast polygon the rules use, so what the player
// sees is exactly what the guard sees.
import { FIELD_H, FIELD_W, FIELD_Y, GUARD, HUD_H, PLAYER, TILE, VIEW_H, VIEW_W } from './config.js';
import { conePolygon } from './guards.js';
import { STATE_ALERT, STATE_SUSPICIOUS } from './guards.js';
import { ALARM_PENALTY } from './scoring.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_INTRO = 'intro';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_BUSTED = 'busted';
export const SCREEN_CLEAR = 'clear';
export const SCREEN_WIN = 'win';
export const SCREEN_OVER = 'over';

const PALETTE = {
  bg: '#0b0e14',
  floorA: '#171c26',
  floorB: '#141922',
  shadow: '#0e1220',
  wall: '#2b3345',
  wallTop: '#3d4a63',
  gold: '#f2c14e',
  exit: '#39d98a',
  alarmLow: '#39d98a',
  alarmMid: '#f2c14e',
  alarmHigh: '#ef4444',
  conePatrol: 'rgba(242, 193, 78, 0.20)',
  coneEdge: 'rgba(242, 193, 78, 0.55)',
  coneSus: 'rgba(245, 158, 11, 0.30)',
  coneAlert: 'rgba(239, 68, 68, 0.38)',
  camCone: 'rgba(56, 189, 248, 0.18)',
  camEdge: 'rgba(56, 189, 248, 0.5)',
  text: '#e8ecf3',
  muted: '#8b94a7',
  panel: 'rgba(10, 13, 20, 0.88)',
};

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawCone(ctx, points, fill, edge) {
  if (points.length < 3) return;
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i += 1) ctx.lineTo(points[i].x, points[i].y);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = edge;
  ctx.lineWidth = 1.5;
  ctx.stroke();
}

function bar(ctx, x, y, w, h, frac, color, bg = '#232a3a') {
  roundRect(ctx, x, y, w, h, 4);
  ctx.fillStyle = bg;
  ctx.fill();
  if (frac > 0) {
    roundRect(ctx, x, y, Math.max(8, w * Math.min(1, frac)), h, 4);
    ctx.fillStyle = color;
    ctx.fill();
  }
}

export function createRenderer(canvas) {
  canvas.width = VIEW_W;
  canvas.height = VIEW_H;
  const ctx = canvas.getContext('2d');

  function drawField(world) {
    const { level, player, guards, cameras, coins, empLeft } = world;
    ctx.save();
    ctx.translate(0, FIELD_Y);
    // Floor: subtle checker + dark zones.
    for (let ty = 0; ty < 20; ty += 1) {
      for (let tx = 0; tx < 40; tx += 1) {
        const c = level.grid[ty][tx];
        if (c === '#') continue;
        ctx.fillStyle = c === ',' ? PALETTE.shadow : (tx + ty) % 2 === 0 ? PALETTE.floorA : PALETTE.floorB;
        ctx.fillRect(tx * TILE, ty * TILE, TILE, TILE);
      }
    }
    // Walls, with a lit top edge so rooms read at a glance.
    for (let ty = 0; ty < 20; ty += 1) {
      for (let tx = 0; tx < 40; tx += 1) {
        if (level.grid[ty][tx] !== '#') continue;
        ctx.fillStyle = PALETTE.wall;
        ctx.fillRect(tx * TILE, ty * TILE, TILE, TILE);
        if (ty + 1 < 20 && level.grid[ty + 1][tx] !== '#') {
          ctx.fillStyle = PALETTE.wallTop;
          ctx.fillRect(tx * TILE, ty * TILE + TILE - 4, TILE, 4);
        }
      }
    }
    // Exit: the getaway door, green and glowing when all loot is taken.
    const allLoot = world.lootTaken >= world.lootTotal;
    ctx.save();
    ctx.fillStyle = allLoot ? PALETTE.exit : '#2f7d5a';
    ctx.shadowColor = PALETTE.exit;
    ctx.shadowBlur = allLoot ? 18 : 0;
    ctx.fillRect(level.exit.x - 15, level.exit.y - 15, 30, 30);
    ctx.restore();
    ctx.fillStyle = '#0b0e14';
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(allLoot ? 'EXIT' : 'LOCK', level.exit.x, level.exit.y + 1);
    // Security terminals: hack one to blind every camera for a window.
    for (const term of level.terminals ?? []) {
      ctx.save();
      ctx.fillStyle = term.used ? '#1e293b' : '#0e7490';
      ctx.strokeStyle = term.used ? '#475569' : '#22d3ee';
      ctx.lineWidth = 2;
      roundRect(ctx, term.x - 14, term.y - 11, 28, 22, 4);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = term.used ? '#64748b' : '#a5f3fc';
      ctx.font = 'bold 12px sans-serif';
      ctx.fillText(term.used ? '×' : 'T', term.x, term.y + 1);
      ctx.restore();
    }
    // Safes: steel boxes worth $300 once cracked open.
    for (const safe of level.safes ?? []) {
      ctx.save();
      if (safe.opened) {
        ctx.fillStyle = '#1e293b';
        ctx.strokeStyle = '#f2c14e';
        ctx.lineWidth = 2;
        roundRect(ctx, safe.x - 13, safe.y - 13, 26, 26, 4);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = PALETTE.gold;
        ctx.font = 'bold 11px sans-serif';
        ctx.fillText('$', safe.x, safe.y + 1);
      } else {
        ctx.fillStyle = '#64748b';
        ctx.strokeStyle = '#cbd5e1';
        ctx.lineWidth = 2;
        roundRect(ctx, safe.x - 13, safe.y - 13, 26, 26, 4);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#0b0e14';
        ctx.font = 'bold 12px sans-serif';
        ctx.fillText('S', safe.x, safe.y + 1);
      }
      ctx.restore();
    }
    // Loot: each kind reads at a glance — relic diamond, gold bar, data
    // drive, art piece.
    for (const loot of level.loot) {
      if (loot.taken) continue;
      const pulse = 1 + Math.sin(world.time * 3 + loot.x) * 0.12;
      ctx.save();
      ctx.translate(loot.x, loot.y);
      if (loot.kind === 'gold') {
        ctx.fillStyle = '#fbbf24';
        ctx.shadowColor = '#fbbf24';
        ctx.shadowBlur = 10;
        ctx.fillRect(-10 * pulse, -4 * pulse, 20 * pulse, 8 * pulse);
      } else if (loot.kind === 'data') {
        ctx.fillStyle = '#22d3ee';
        ctx.shadowColor = '#22d3ee';
        ctx.shadowBlur = 10;
        const s = 7 * pulse;
        ctx.fillRect(-s, -s, s * 2, s * 2);
        ctx.fillStyle = '#ecfeff';
        ctx.fillRect(-2, -2, 4, 4);
      } else if (loot.kind === 'art') {
        ctx.rotate(Math.PI / 4);
        ctx.fillStyle = '#e879f9';
        ctx.shadowColor = '#e879f9';
        ctx.shadowBlur = 12;
        const s = 11 * pulse;
        ctx.fillRect(-s, -s, s * 2, s * 2);
      } else {
        ctx.rotate(Math.PI / 4);
        ctx.fillStyle = PALETTE.gold;
        ctx.shadowColor = PALETTE.gold;
        ctx.shadowBlur = 10;
        const s = 8 * pulse;
        ctx.fillRect(-s, -s, s * 2, s * 2);
      }
      ctx.restore();
    }
    // Thrown coins on the floor, still ringing.
    for (const coin of coins) {
      ctx.beginPath();
      ctx.arc(coin.x, coin.y, 5, 0, Math.PI * 2);
      ctx.fillStyle = '#e8ecf3';
      ctx.fill();
      ctx.beginPath();
      ctx.arc(coin.x, coin.y, 10 + Math.sin(world.time * 8) * 2, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(232, 236, 243, 0.5)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
    // Camera cones first (under guard cones), then the cameras.
    for (const cam of cameras) {
      if (cam.disabled > 0) continue;
      const poly = conePolygon(level, cam.x, cam.y, cam.angle, 250, Math.PI / 5, 20);
      drawCone(ctx, poly, PALETTE.camCone, PALETTE.camEdge);
    }
    // Guard cones: amber on patrol, orange when suspicious, red on alert;
    // elites sweep a wider violet cone.
    for (const guard of guards) {
      const range = (empLeft > 0 ? guard.range * 0.7 : guard.range);
      const poly = conePolygon(level, guard.x, guard.y, guard.angle, range, guard.coneHalf, 26);
      const fill = guard.elite ? 'rgba(167, 139, 250, 0.22)'
        : guard.state === STATE_ALERT ? PALETTE.coneAlert
          : guard.state === STATE_SUSPICIOUS ? PALETTE.coneSus : PALETTE.conePatrol;
      const edge = guard.elite ? 'rgba(167, 139, 250, 0.65)'
        : guard.state === STATE_ALERT ? 'rgba(239,68,68,0.7)'
          : guard.state === STATE_SUSPICIOUS ? 'rgba(245,158,11,0.6)' : PALETTE.coneEdge;
      drawCone(ctx, poly, fill, edge);
    }
    // Cameras: wall mounts with a lens that follows the sweep.
    for (const cam of cameras) {
      ctx.beginPath();
      ctx.arc(cam.x, cam.y, 9, 0, Math.PI * 2);
      ctx.fillStyle = cam.disabled > 0 ? '#3a4152' : '#0ea5e9';
      ctx.fill();
      ctx.strokeStyle = '#e8ecf3';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      if (cam.disabled > 0) {
        ctx.fillStyle = '#e8ecf3';
        ctx.font = 'bold 11px sans-serif';
        ctx.fillText('×', cam.x, cam.y + 1);
      } else {
        ctx.beginPath();
        ctx.moveTo(cam.x, cam.y);
        ctx.lineTo(cam.x + Math.cos(cam.angle) * 14, cam.y + Math.sin(cam.angle) * 14);
        ctx.strokeStyle = '#bae6fd';
        ctx.lineWidth = 3;
        ctx.stroke();
      }
    }
    // Guards: dark uniforms, a facing tick, a meter arc, and a ? or !.
    // Elites wear violet and carry a star: faster, wider, harder to shake.
    for (const guard of guards) {
      ctx.beginPath();
      ctx.arc(guard.x, guard.y, GUARD.radius, 0, Math.PI * 2);
      ctx.fillStyle = guard.state === STATE_ALERT ? '#7f1d1d' : '#334155';
      ctx.fill();
      ctx.strokeStyle = guard.elite ? '#a78bfa' : guard.state === STATE_ALERT ? '#ef4444' : '#cbd5e1';
      ctx.lineWidth = guard.elite ? 3 : 2;
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(guard.x, guard.y);
      ctx.lineTo(guard.x + Math.cos(guard.angle) * (GUARD.radius + 6), guard.y + Math.sin(guard.angle) * (GUARD.radius + 6));
      ctx.strokeStyle = '#e8ecf3';
      ctx.lineWidth = 2.5;
      ctx.stroke();
      if (guard.meter > 0.05) {
        ctx.beginPath();
        ctx.arc(guard.x, guard.y, GUARD.radius + 6, -Math.PI / 2, -Math.PI / 2 + guard.meter * Math.PI * 2);
        ctx.strokeStyle = guard.meter >= 1 ? '#ef4444' : '#f2c14e';
        ctx.lineWidth = 3;
        ctx.stroke();
      }
      if (guard.state === STATE_SUSPICIOUS || guard.state === STATE_ALERT) {
        ctx.fillStyle = guard.state === STATE_ALERT ? '#ef4444' : '#f2c14e';
        ctx.font = 'bold 16px sans-serif';
        ctx.fillText(guard.state === STATE_ALERT ? '!' : '?', guard.x, guard.y - GUARD.radius - 10);
      }
      if (guard.elite) {
        ctx.fillStyle = '#a78bfa';
        ctx.font = 'bold 11px sans-serif';
        ctx.fillText('★', guard.x, guard.y - GUARD.radius - 24);
      }
    }
    // The thief: a hooded circle, darker and smaller while crouched.
    ctx.beginPath();
    ctx.arc(player.x, player.y, player.crouching ? 9 : PLAYER.radius, 0, Math.PI * 2);
    ctx.fillStyle = player.crouching ? '#1e3a2f' : '#14532d';
    ctx.fill();
    ctx.strokeStyle = '#4ade80';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(player.x, player.y);
    ctx.lineTo(player.x + Math.cos(player.angle) * 15, player.y + Math.sin(player.angle) * 15);
    ctx.strokeStyle = '#bbf7d0';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();
  }

  function drawMinimap(world) {
    const { level, player, guards, cameras } = world;
    const scale = 0.125;
    const w = 40 * TILE * scale;
    const h = 20 * TILE * scale;
    const x0 = VIEW_W - w - 12;
    const y0 = FIELD_Y + FIELD_H - h - 12;
    ctx.save();
    ctx.globalAlpha = 0.92;
    roundRect(ctx, x0 - 6, y0 - 6, w + 12, h + 12, 6);
    ctx.fillStyle = 'rgba(8, 10, 16, 0.85)';
    ctx.fill();
    ctx.globalAlpha = 1;
    for (let ty = 0; ty < 20; ty += 1) {
      for (let tx = 0; tx < 40; tx += 1) {
        if (level.grid[ty][tx] !== '#') continue;
        ctx.fillStyle = '#3d4a63';
        ctx.fillRect(x0 + tx * TILE * scale, y0 + ty * TILE * scale, TILE * scale, TILE * scale);
      }
    }
    for (const loot of level.loot) {
      if (loot.taken) continue;
      ctx.fillStyle = loot.kind === 'gold' ? '#fbbf24' : loot.kind === 'data' ? '#22d3ee' : loot.kind === 'art' ? '#e879f9' : PALETTE.gold;
      ctx.fillRect(x0 + loot.x * scale - 2, y0 + loot.y * scale - 2, 4, 4);
    }
    ctx.fillStyle = PALETTE.exit;
    ctx.fillRect(x0 + level.exit.x * scale - 2.5, y0 + level.exit.y * scale - 2.5, 5, 5);
    for (const cam of cameras) {
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.arc(x0 + cam.x * scale, y0 + cam.y * scale, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
    for (const guard of guards) {
      ctx.fillStyle = guard.state === STATE_ALERT ? '#ef4444' : '#f87171';
      ctx.beginPath();
      ctx.arc(x0 + guard.x * scale, y0 + guard.y * scale, 3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = '#4ade80';
    ctx.beginPath();
    ctx.arc(x0 + player.x * scale, y0 + player.y * scale, 3.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawHud(world) {
    ctx.fillStyle = '#0d1119';
    ctx.fillRect(0, 0, VIEW_W, HUD_H);
    ctx.fillStyle = '#232a3a';
    ctx.fillRect(0, HUD_H - 2, VIEW_W, 2);
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    ctx.fillStyle = PALETTE.text;
    ctx.font = 'bold 17px sans-serif';
    ctx.fillText(world.levelName, 16, 24);
    ctx.fillStyle = PALETTE.muted;
    ctx.font = '13px sans-serif';
    ctx.fillText(`ROOM ${world.levelIndex + 1} / ${world.roomCount} · ${world.difficulty.toUpperCase()}`, 16, 46);
    // Alarm meter, centre stage.
    const alarmColor = world.alarm > 66 ? PALETTE.alarmHigh : world.alarm > 33 ? PALETTE.alarmMid : PALETTE.alarmLow;
    ctx.fillStyle = world.alarm > 66 ? '#ef4444' : PALETTE.muted;
    ctx.font = 'bold 13px sans-serif';
    ctx.fillText('ALARM', 300, 22);
    bar(ctx, 300, 34, 320, 16, world.alarm / 100, alarmColor);
    ctx.fillStyle = PALETTE.text;
    ctx.font = 'bold 13px sans-serif';
    ctx.fillText(`${Math.round(world.alarm)}%`, 628, 42);
    // Loot, tools, strikes, timer, score.
    ctx.fillStyle = PALETTE.gold;
    ctx.font = 'bold 16px sans-serif';
    ctx.fillText(`◆ ${world.lootTaken}/${world.lootTotal}  $${world.lootValue}`, 680, 24);
    ctx.fillStyle = PALETTE.text;
    ctx.font = '15px sans-serif';
    ctx.fillText(`◉ ${world.player.coins}   EMP ${world.player.emps}`, 680, 46);
    ctx.fillStyle = '#f87171';
    ctx.font = 'bold 15px sans-serif';
    ctx.fillText('✖'.repeat(world.strikes), 830, 24);
    ctx.fillStyle = PALETTE.muted;
    ctx.font = '13px sans-serif';
    ctx.fillText('strikes left', 830, 46);
    const mins = Math.floor(world.elapsed / 60);
    const secs = Math.floor(world.elapsed % 60).toString().padStart(2, '0');
    ctx.fillStyle = PALETTE.text;
    ctx.font = 'bold 17px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(`${mins}:${secs}`, 1050, 24);
    ctx.fillStyle = PALETTE.muted;
    ctx.font = '13px sans-serif';
    ctx.fillText('SCORE', 1050, 46);
    ctx.fillStyle = PALETTE.text;
    ctx.font = 'bold 17px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`${world.score}`, 1070, 24);
    ctx.fillStyle = PALETTE.muted;
    ctx.font = '13px sans-serif';
    ctx.fillText('best ' + world.best, 1070, 46);
    if (world.empLeft > 0) {
      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 14px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`EMP BLIND ${Math.ceil(world.empLeft)}s`, 460, 22);
      ctx.textAlign = 'left';
    }
  }

  function drawHack(world) {
    const hack = world.hack;
    const w = 560;
    const h = 210;
    const x = (VIEW_W - w) / 2;
    const y = (VIEW_H - h) / 2;
    ctx.fillStyle = PALETTE.panel;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    roundRect(ctx, x, y, w, h, 10);
    ctx.fillStyle = '#12161f';
    ctx.fill();
    ctx.strokeStyle = '#22d3ee';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.textAlign = 'center';
    ctx.fillStyle = '#22d3ee';
    ctx.font = 'bold 26px sans-serif';
    ctx.fillText(hack.kind === 'terminal' ? 'HACKING THE TERMINAL' : 'CRACKING THE SAFE', VIEW_W / 2, y + 44);
    ctx.fillStyle = PALETTE.muted;
    ctx.font = '14px sans-serif';
    ctx.fillText('Stop the marker inside the green zone — three locks to open', VIEW_W / 2, y + 70);
    // The timing bar: the green zone and the moving marker.
    const barX = x + 40;
    const barY = y + 104;
    const barW = w - 80;
    const barH = 26;
    roundRect(ctx, barX, barY, barW, barH, 6);
    ctx.fillStyle = '#232a3a';
    ctx.fill();
    roundRect(ctx, barX + hack.zone.from * barW, barY, (hack.zone.to - hack.zone.from) * barW, barH, 6);
    ctx.fillStyle = '#39d98a';
    ctx.fill();
    const mx = barX + hack.marker * barW;
    ctx.fillStyle = '#e8ecf3';
    ctx.fillRect(mx - 3, barY - 8, 6, barH + 16);
    // Round pips.
    for (let i = 0; i < 3; i += 1) {
      ctx.beginPath();
      ctx.arc(VIEW_W / 2 - 30 + i * 30, y + 162, 7, 0, Math.PI * 2);
      ctx.fillStyle = i < hack.round ? '#39d98a' : '#232a3a';
      ctx.fill();
      ctx.strokeStyle = '#39d98a';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
    ctx.fillStyle = PALETTE.text;
    ctx.font = 'bold 15px sans-serif';
    ctx.fillText('SPACE to lock · P to abort', VIEW_W / 2, y + h - 16);
    ctx.textAlign = 'left';
  }

  function panel(title, lines, prompt, accent = PALETTE.gold) {
    ctx.fillStyle = PALETTE.panel;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    const w = 640;
    const h = 150 + lines.length * 30;
    const x = (VIEW_W - w) / 2;
    const y = (VIEW_H - h) / 2;
    roundRect(ctx, x, y, w, h, 10);
    ctx.fillStyle = '#12161f';
    ctx.fill();
    ctx.strokeStyle = accent;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.textAlign = 'center';
    ctx.fillStyle = accent;
    ctx.font = 'bold 34px sans-serif';
    ctx.fillText(title, VIEW_W / 2, y + 58);
    ctx.fillStyle = PALETTE.text;
    ctx.font = '16px sans-serif';
    lines.forEach((line, i) => ctx.fillText(line, VIEW_W / 2, y + 102 + i * 30));
    ctx.fillStyle = PALETTE.muted;
    ctx.font = '15px sans-serif';
    ctx.fillText(prompt, VIEW_W / 2, y + h - 30);
    ctx.textAlign = 'left';
  }

  function draw(screen, world, extra = {}) {
    ctx.fillStyle = PALETTE.bg;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    if (screen === SCREEN_TITLE) {
      drawField(world);
      drawHud(world);
      panel('SILENT VAULT', [
        'Rook the thief. Five rooms. One getaway.',
        'Cross the cones, pocket every relic, slip out unseen.',
        'WASD move · Shift run (loud) · C crouch (quiet)',
        'Q throw a coin · E EMP the cameras · F hack a terminal or safe',
        `Difficulty: 1 Easy · 2 Normal · 3 Hard — ${world.difficulty.toUpperCase()}`,
      ], 'Press SPACE to start', PALETTE.gold);
      ctx.fillStyle = PALETTE.muted;
      ctx.font = '14px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`Best score: ${world.best}`, VIEW_W / 2, VIEW_H - 60);
      ctx.textAlign = 'left';
      return;
    }
    drawField(world);
    drawHud(world);
    drawMinimap(world);
    if (world.hack) drawHack(world);
    if (screen === SCREEN_INTRO) {
      const elites = world.guards.filter((g) => g.elite).length;
      panel(world.levelName, [world.levelSub, `Loot ${world.lootTotal} pieces, then reach the green EXIT.`, `Guards: ${world.guards.length}${elites > 0 ? ` (${elites} elite)` : ''} · Cameras: ${world.cameras.length}`], 'Press SPACE to begin the room');
    } else if (screen === SCREEN_PAUSED) {
      panel('PAUSED', ['The vault waits. The guards do not.', ''], 'Press P to resume');
    } else if (screen === SCREEN_BUSTED) {
      panel('CAUGHT', [`The alarm hit 100%. Strikes left: ${world.strikes}.`, 'The room resets — the loot you kept stays kept.', `Caught penalty -$${ALARM_PENALTY}`], 'Press SPACE to try the room again', '#ef4444');
    } else if (screen === SCREEN_CLEAR) {
      panel('ROOM CLEAR', [`${extra.lootText ?? ''}`, `Time bonus +${extra.timeBonus ?? 0} · Ghost bonus +${extra.ghostBonus ?? 0}`, `${extra.breakdown ?? ''}`], 'Press SPACE for the next room', PALETTE.exit);
    } else if (screen === SCREEN_WIN) {
      panel('THE GETAWAY', [`Every piece, every room. Final score: ${world.score}.`, `${extra.breakdown ?? ''}`, `Best: ${world.best}`], 'Press SPACE to play again', PALETTE.exit);
    } else if (screen === SCREEN_OVER) {
      panel('BURNED', ['Three strikes. The crew cuts you loose.', `${extra.breakdown ?? ''}`, `Final score: ${world.score} · Best: ${world.best}`], 'Press SPACE to start over', '#ef4444');
    }
    if (extra.toast) {
      ctx.fillStyle = 'rgba(10, 13, 20, 0.8)';
      const w = 420;
      roundRect(ctx, (VIEW_W - w) / 2, FIELD_Y + 14, w, 34, 8);
      ctx.fill();
      ctx.fillStyle = PALETTE.text;
      ctx.font = 'bold 15px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(extra.toast, VIEW_W / 2, FIELD_Y + 36);
      ctx.textAlign = 'left';
    }
  }

  return { draw };
}
