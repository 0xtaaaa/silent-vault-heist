// The three rooms of the Halcyon Vault. Maps are strings, one per row:
//   # wall   . floor   , shadow floor (dark zone: guards see the thief slower)
//   P thief start   E getaway door   L loot
// Guards and cameras are data, not map letters: their patrol routes and
// sweep arcs are part of the level design, so they read as a plan.
import { TILE } from './config.js';

function tileCenter(tx, ty) {
  return { x: tx * TILE + TILE / 2, y: ty * TILE + TILE / 2 };
}

export const LEVELS = [
  {
    name: 'THE LOBBY',
    sub: 'Two guards, one camera — learn to read the cones',
    map: [
      '########################################',
      '#P......#..........#...................#',
      '#.......#..........#....L..............#',
      '#.......#..........#...................#',
      '#.......#....,,....#...................#',
      '#..,,...#....,,....#........#..........#',
      '#..,,............#..........#....E.....#',
      '#.......#..........#........#..........#',
      '####.####..........#........#..........#',
      '#..........,,......#...................#',
      '#..L.......,,......#.....,,............#',
      '#......................,,..............#',
      '#....#..........#.......,,.....#.......#',
      '#....#..........#..............#..L....#',
      '#....#....,,....#..............#.......#',
      '#....#....,,....#..............#.......#',
      '#....#..........#..............#.......#',
      '#......................................#',
      '#......................................#',
      '########################################',
    ],
    guards: [
      { waypoints: [[10, 2], [10, 8], [20, 8], [20, 2]] },
      { waypoints: [[30, 10], [30, 16], [35, 16], [35, 10]] },
    ],
    cameras: [
      { tx: 19, ty: 4, angle: 0, sweep: 0.9 },
    ],
  },
  {
    name: 'THE GALLERY',
    sub: 'Glass cases, two cameras, three guards — plan two routes',
    map: [
      '########################################',
      '#....L.....#........#........#.........#',
      '#..........#........#....,,..#.........#',
      '#..........#........#....,,..#....L....#',
      '#..,,......#........#........#.........#',
      '#..,,......#....L...#........#.........#',
      '#..........#........#........#....,,...#',
      '#..........####.#####....,,..#....,,...#',
      '#......................................#',
      '#....#........#........#........#......#',
      '#....#........#........#........#..L...#',
      '#....#...,,...#........#........#......#',
      '#....#...,,...#....,,..#........#......#',
      '#....#........#....,,..#........#......#',
      '#....#........#........#........#......#',
      '#......................................#',
      '#..P...................................#',
      '#......................................#',
      '#..................................E...#',
      '########################################',
    ],
    guards: [
      { waypoints: [[6, 2], [6, 6], [13, 6], [13, 2]] },
      { waypoints: [[24, 2], [24, 13], [30, 13], [30, 2]] },
      { waypoints: [[8, 10], [8, 15], [20, 15], [20, 10]] },
    ],
    cameras: [
      { tx: 11, ty: 7, angle: Math.PI / 2, sweep: 1.1 },
      { tx: 23, ty: 9, angle: -Math.PI / 2, sweep: 1.1 },
    ],
  },
  {
    name: 'THE VAULT',
    sub: 'Four guards, three cameras, five relics — the big score',
    map: [
      '########################################',
      '#P....#......L......#......L.....#.....#',
      '#.....#............#.............#..L..#',
      '#.....#............#....,,.......#.....#',
      '#.....#............#....,,.......#.....#',
      '#.....#............#.............#.....#',
      '###.#####..........###.#####....#......#',
      '#........#.........#........#..........#',
      '#...L....#....,,...#....,,..#....E.....#',
      '#........#....,,...#....,,..#..........#',
      '#........#.........#........#..........#',
      '#...#....#.........#........#....#.....#',
      '#...#....#....,,...#...,,...#....#..L..#',
      '#...#....#....,,...#...,,...#....#.....#',
      '#...#....#.........#........#....#.....#',
      '#...#....#.........#........#....#.....#',
      '#......................................#',
      '#......................................#',
      '#......................................#',
      '########################################',
    ],
    guards: [
      { waypoints: [[4, 2], [4, 5], [10, 5], [10, 2]] },
      { waypoints: [[16, 2], [16, 8], [24, 8], [24, 2]] },
      { waypoints: [[8, 10], [8, 15], [18, 15], [18, 10]] },
      { waypoints: [[30, 10], [30, 15], [36, 15], [36, 10]] },
    ],
    cameras: [
      { tx: 5, ty: 6, angle: Math.PI / 2, sweep: 1.0 },
      { tx: 19, ty: 6, angle: Math.PI / 2, sweep: 1.0 },
      { tx: 32, ty: 6, angle: Math.PI / 2, sweep: 1.0 },
    ],
  },
];

/** Parse one level's map into walkable grids and placed objects. */
export function parseLevel(def) {
  const grid = def.map.map((row) => row.split(''));
  const shadow = grid.map((row) => row.map((c) => c === ','));
  const walkable = grid.map((row) => row.map((c) => c !== '#'));
  let start = { x: 2 * TILE, y: 2 * TILE };
  let exit = { x: 37 * TILE, y: 2 * TILE };
  const loot = [];
  for (let y = 0; y < grid.length; y += 1) {
    for (let x = 0; x < grid[y].length; x += 1) {
      const c = grid[y][x];
      if (c === 'P') start = tileCenter(x, y);
      else if (c === 'E') exit = tileCenter(x, y);
      else if (c === 'L') loot.push({ x: x * TILE + TILE / 2, y: y * TILE + TILE / 2, taken: false });
    }
  }
  const guards = def.guards.map((g) => ({
    waypoints: g.waypoints.map(([tx, ty]) => tileCenter(tx, ty)),
  }));
  const cameras = def.cameras.map((c) => ({
    x: c.tx * TILE + TILE / 2,
    y: c.ty * TILE + TILE / 2,
    baseAngle: c.angle,
    sweep: c.sweep,
    phase: 0,
  }));
  return { name: def.name, sub: def.sub, grid, shadow, walkable, start, exit, loot, guards, cameras };
}

/** Is the pixel point inside a wall tile? Out of bounds counts as wall. */
export function isWall(level, px, py) {
  const tx = Math.floor(px / TILE);
  const ty = Math.floor(py / TILE);
  if (tx < 0 || ty < 0 || tx >= 40 || ty >= 20) return true;
  return level.grid[ty][tx] === '#';
}

/** Is the pixel point inside a shadow (dark) tile? */
export function isShadow(level, px, py) {
  const tx = Math.floor(px / TILE);
  const ty = Math.floor(py / TILE);
  if (tx < 0 || ty < 0 || tx >= 40 || ty >= 20) return false;
  return level.shadow[ty][tx];
}

/**
 * Move a circle by (dx, dy) through the tile walls, sliding along them.
 * Axis-separated so a thief hugging a wall keeps moving along it.
 */
export function moveCircle(level, obj, dx, dy, radius) {
  const nx = obj.x + dx;
  if (!circleHitsWall(level, nx, obj.y, radius)) obj.x = nx;
  const ny = obj.y + dy;
  if (!circleHitsWall(level, obj.x, ny, radius)) obj.y = ny;
}

function circleHitsWall(level, cx, cy, radius) {
  const x0 = Math.floor((cx - radius) / TILE);
  const x1 = Math.floor((cx + radius) / TILE);
  const y0 = Math.floor((cy - radius) / TILE);
  const y1 = Math.floor((cy + radius) / TILE);
  for (let ty = y0; ty <= y1; ty += 1) {
    for (let tx = x0; tx <= x1; tx += 1) {
      if (tx < 0 || ty < 0 || tx >= 40 || ty >= 20) return true;
      if (level.grid[ty][tx] !== '#') continue;
      const nearestX = Math.max(tx * TILE, Math.min(cx, tx * TILE + TILE));
      const nearestY = Math.max(ty * TILE, Math.min(cy, ty * TILE + TILE));
      const ddx = cx - nearestX;
      const ddy = cy - nearestY;
      if (ddx * ddx + ddy * ddy < radius * radius) return true;
    }
  }
  return false;
}
export function hasLineOfSight(level, ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  const dist = Math.hypot(dx, dy);
  const steps = Math.max(1, Math.ceil(dist / 6));
  for (let i = 1; i < steps; i += 1) {
    const t = i / steps;
    if (isWall(level, ax + dx * t, ay + dy * t)) return false;
  }
  return true;
}
