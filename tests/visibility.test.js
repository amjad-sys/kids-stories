import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { filterVisibleParts, resolveRequestedPart, STORY_LISTING } from '../visibility-core.js';

const STORY = 's1';

describe('visibility-core', () => {
  // Feature: english-platform-overhaul, Property 8: Reader honors part visibility
  it('Property 8: visible sequence excludes exactly hidden parts; hidden request resolves to next visible or listing', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 12 }),
        // per-part visibility flag: true=visible, false=hidden, undefined=absent(visible)
        fc.array(fc.constantFrom(true, false, undefined), { minLength: 1, maxLength: 12 }),
        (partCount, flags) => {
          const parts = Array.from({ length: partCount }, (_, i) => ({ id: i }));
          const map = {};
          for (let i = 0; i < partCount; i++) {
            const f = flags[i];
            if (f === false) map[`${STORY}_part${i + 1}`] = false;
            else if (f === true) map[`${STORY}_part${i + 1}`] = true;
            // undefined -> leave absent
          }

          const visible = filterVisibleParts(STORY, parts, map);
          const expected = parts.filter((_p, i) => map[`${STORY}_part${i + 1}`] !== false);
          expect(visible).toEqual(expected);

          // resolve each requested index
          for (let i = 0; i < partCount; i++) {
            const res = resolveRequestedPart(STORY, parts, map, i);
            if (map[`${STORY}_part${i + 1}`] !== false) {
              // requested part visible -> returned as-is
              expect(res).not.toBe(STORY_LISTING);
              expect(res.index).toBe(i);
            } else if (expected.length === 0) {
              expect(res).toBe(STORY_LISTING);
            } else {
              // resolves to some visible part (never the hidden one)
              expect(res).not.toBe(STORY_LISTING);
              expect(map[`${STORY}_part${res.index + 1}`]).not.toBe(false);
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
