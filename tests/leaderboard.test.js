import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import {
  rankStudents,
  formatLeaderboardEntry,
  normalizeUsername,
  PLACEHOLDER_NAME,
} from '../leaderboard-core.js';

const studentArb = fc.record({
  username: fc.string({ minLength: 1, maxLength: 8 }).filter((s) => s.trim() !== ''),
  displayName: fc.oneof(fc.string({ maxLength: 10 }), fc.constant('')),
  score: fc.integer({ min: 0, max: 100 }),
});

describe('leaderboard-core', () => {
  // Feature: english-platform-overhaul, Property 1: Leaderboard is a well-formed total order
  it('Property 1: ranks form a well-formed total order (score desc, name asc CI, ranks 1..n)', () => {
    fc.assert(
      fc.property(fc.array(studentArb, { maxLength: 30 }), (students) => {
        // ensure unique usernames so the final tie-break is well-defined
        const seen = new Set();
        const unique = students.filter((s) => {
          const u = normalizeUsername(s.username);
          if (seen.has(u)) return false;
          seen.add(u);
          return true;
        });

        const ranked = rankStudents(unique);

        expect(ranked.length).toBe(unique.length);
        // ranks are exactly 1..n in order
        ranked.forEach((r, i) => expect(r.rank).toBe(i + 1));

        for (let i = 1; i < ranked.length; i++) {
          const prev = ranked[i - 1];
          const cur = ranked[i];
          // non-increasing score
          expect(prev.score >= cur.score).toBe(true);
          if (prev.score === cur.score) {
            const nameCmp = prev.displayName.localeCompare(cur.displayName, undefined, {
              sensitivity: 'base',
            });
            if (nameCmp === 0) {
              expect(prev.username <= cur.username).toBe(true);
            } else {
              expect(nameCmp <= 0).toBe(true);
            }
          }
        }
      }),
      { numRuns: 100 }
    );
  });

  // Feature: english-platform-overhaul, Property 2: Empty display names render as a placeholder without losing rank or score
  it('Property 2: empty display names become placeholder while rank + score are preserved', () => {
    fc.assert(
      fc.property(
        fc.record({
          rank: fc.integer({ min: 1, max: 100 }),
          score: fc.integer({ min: 0, max: 100 }),
          whitespace: fc.constantFrom('', ' ', '   ', '\t', '\n  '),
        }),
        ({ rank, score, whitespace }) => {
          const out = formatLeaderboardEntry({ rank, score, displayName: whitespace });
          expect(out.displayName).toBe(PLACEHOLDER_NAME);
          expect(out.rank).toBe(rank);
          expect(out.score).toBe(score);
        }
      ),
      { numRuns: 100 }
    );
  });
});
