/**
 * landing-core.js — Pure generators for the landing scene's fireflies and drift words.
 * Emits plain data (consumed by landing.js to set CSS custom properties). No DOM.
 */

export const FIREFLY_MIN = 20;
export const FIREFLY_MAX = 60;
export const DRIFT_MIN = 5;
export const DRIFT_MAX = 15;
export const DEFAULT_ELEMENT_WIDTH = 160;
export const DEFAULT_ELEMENT_HEIGHT = 48;

/** mulberry32 — small deterministic PRNG so generators are seed-reproducible. */
export function makeRng(seed) {
  let a = (seed >>> 0) || 1;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function countInRange(rng, min, max) {
  return min + Math.floor(rng() * (max - min + 1));
}

/**
 * generateFireflies — count in [FIREFLY_MIN, FIREFLY_MAX], each with normalized
 * position (0..1) and animation timing to be applied as CSS custom properties.
 */
export function generateFireflies(seed) {
  const rng = makeRng(seed);
  const n = countInRange(rng, FIREFLY_MIN, FIREFLY_MAX);
  const fireflies = [];
  for (let i = 0; i < n; i++) {
    fireflies.push({
      x: rng(), // 0..1 of viewport width
      y: rng(), // 0..1 of viewport height
      delay: +(rng() * 4).toFixed(3), // seconds
      dur: +(3 + rng() * 5).toFixed(3), // seconds
      size: +(2 + rng() * 4).toFixed(2), // px
    });
  }
  return fireflies;
}

/**
 * generateDriftWords — count in [DRIFT_MIN, DRIFT_MAX]. Positions are absolute px
 * constrained so each element stays fully within the viewport
 * (0 <= x <= vw - elementWidth, 0 <= y <= vh - elementHeight).
 */
export function generateDriftWords(words, seed, viewport, elementSize) {
  const rng = makeRng(seed);
  const pool = Array.isArray(words) && words.length ? words : ['Learn', 'English', 'Story', 'Adventure'];
  const vw = viewport && Number.isFinite(viewport.width) ? viewport.width : 1024;
  const vh = viewport && Number.isFinite(viewport.height) ? viewport.height : 768;
  const ew = elementSize && Number.isFinite(elementSize.width) ? elementSize.width : DEFAULT_ELEMENT_WIDTH;
  const eh = elementSize && Number.isFinite(elementSize.height) ? elementSize.height : DEFAULT_ELEMENT_HEIGHT;

  const maxX = Math.max(0, vw - ew);
  const maxY = Math.max(0, vh - eh);

  const n = countInRange(rng, DRIFT_MIN, DRIFT_MAX);
  const items = [];
  for (let i = 0; i < n; i++) {
    items.push({
      word: pool[Math.floor(rng() * pool.length)],
      x: +(rng() * maxX).toFixed(2),
      y: +(rng() * maxY).toFixed(2),
      delay: +(rng() * 6).toFixed(3),
      dur: +(8 + rng() * 10).toFixed(3),
    });
  }
  return items;
}
