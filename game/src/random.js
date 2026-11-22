// Seeded random numbers, so a staged screenshot is the same every run.
// Mulberry32: small, fast, and good enough for level dressing and patrol
// jitter. The game never needs crypto randomness.
export function makeRng(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Integer in [min, max). */
export function randInt(rng, min, max) {
  return min + Math.floor(rng() * (max - min));
}

/** Pick one element of an array. */
export function pick(rng, list) {
  return list[Math.floor(rng() * list.length)];
}

/** Small jitter in [-amount, amount]. */
export function jitter(rng, amount) {
  return (rng() * 2 - 1) * amount;
}
