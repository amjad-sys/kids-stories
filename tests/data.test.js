import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { decideCreate, makeQuizConfig, parseQuizConfig, normalizeUsername } from '../data-core.js';

const nonEmpty = fc.string({ minLength: 1, maxLength: 10 }).filter((s) => s.trim() !== '');

describe('data-core', () => {
  // Feature: english-platform-overhaul, Property 7: Username uniqueness
  it('Property 7: creating a colliding normalized username is rejected, existing set unchanged', () => {
    fc.assert(
      fc.property(fc.array(nonEmpty, { minLength: 1, maxLength: 12 }), nonEmpty, nonEmpty, (existing, pass, name) => {
        const ids = new Set(existing.map(normalizeUsername));
        const idsSnapshot = new Set(ids);
        // pick an existing id (with random casing) to force a collision
        const collidingRaw = existing[0].toUpperCase();

        const res = decideCreate(ids, { username: collidingRaw, password: pass, displayName: name });
        expect(res.ok).toBe(false);
        expect(res.reason).toBe('duplicate');
        // existing set is not mutated by the decision
        expect([...ids].sort()).toEqual([...idsSnapshot].sort());
      }),
      { numRuns: 100 }
    );
  });

  // Feature: english-platform-overhaul, Property 11: New students default to zero score
  it('Property 11: creating without an explicit score yields score 0', () => {
    fc.assert(
      fc.property(nonEmpty, nonEmpty, nonEmpty, (username, password, displayName) => {
        const res = decideCreate([], { username, password, displayName });
        expect(res.ok).toBe(true);
        expect(res.record.score).toBe(0);
      }),
      { numRuns: 100 }
    );
  });

  // Feature: english-platform-overhaul, Property 12: Quiz_Config write-then-read round-trip
  it('Property 12: parse(make(sel)) preserves activeStoryId and activePartIndex', () => {
    fc.assert(
      fc.property(nonEmpty, fc.integer({ min: 0, max: 50 }), (activeStoryId, activePartIndex) => {
        const written = makeQuizConfig({ activeStoryId, activePartIndex });
        const readBack = parseQuizConfig(written);
        expect(readBack).not.toBeNull();
        expect(readBack.activeStoryId).toBe(activeStoryId);
        expect(readBack.activePartIndex).toBe(activePartIndex);
      }),
      { numRuns: 100 }
    );
  });
});
