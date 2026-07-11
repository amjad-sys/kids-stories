import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import {
  generateFireflies,
  generateDriftWords,
  FIREFLY_MIN,
  FIREFLY_MAX,
  DRIFT_MIN,
  DRIFT_MAX,
  DEFAULT_ELEMENT_WIDTH,
  DEFAULT_ELEMENT_HEIGHT,
} from '../landing-core.js';

describe('landing-core', () => {
  // Feature: english-platform-overhaul, Property 13: Visual generators respect count and viewport bounds
  it('Property 13: firefly count in [20,60], drift count in [5,15], drift positions within viewport', () => {
    fc.assert(
      fc.property(
        fc.integer(),
        // viewports at least as large as an element so the invariant is satisfiable
        fc.integer({ min: DEFAULT_ELEMENT_WIDTH, max: 4000 }),
        fc.integer({ min: DEFAULT_ELEMENT_HEIGHT, max: 4000 }),
        fc.array(fc.string({ minLength: 1, maxLength: 8 }), { maxLength: 10 }),
        (seed, width, height, words) => {
          const fireflies = generateFireflies(seed);
          expect(fireflies.length).toBeGreaterThanOrEqual(FIREFLY_MIN);
          expect(fireflies.length).toBeLessThanOrEqual(FIREFLY_MAX);

          const drift = generateDriftWords(words, seed, { width, height });
          expect(drift.length).toBeGreaterThanOrEqual(DRIFT_MIN);
          expect(drift.length).toBeLessThanOrEqual(DRIFT_MAX);

          const maxX = width - DEFAULT_ELEMENT_WIDTH;
          const maxY = height - DEFAULT_ELEMENT_HEIGHT;
          for (const d of drift) {
            expect(d.x).toBeGreaterThanOrEqual(0);
            expect(d.x).toBeLessThanOrEqual(maxX);
            expect(d.y).toBeGreaterThanOrEqual(0);
            expect(d.y).toBeLessThanOrEqual(maxY);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
