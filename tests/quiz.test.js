import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import {
  buildQuiz,
  scoreQuiz,
  mergeScore,
  InsufficientVocabulary,
  QUESTION_COUNT,
  OPTIONS_PER_QUESTION,
  MAX_SCORE,
} from '../quiz-core.js';
import { makeRng } from '../landing-core.js';

// A bijective glossary: distinct english keys mapped to distinct arabic values.
const bijectiveGlossaryArb = (minWords) =>
  fc
    .uniqueArray(fc.string({ minLength: 1, maxLength: 6 }).filter((s) => s.trim() !== ''), {
      minLength: minWords,
      maxLength: minWords + 8,
    })
    .map((words) => {
      const g = {};
      words.forEach((w, i) => {
        g[w] = 'ar_' + i; // distinct meaning per word
      });
      return g;
    });

describe('quiz-core', () => {
  // Feature: english-platform-overhaul, Property 3: Generated quizzes are well-formed
  it('Property 3: exactly 10 questions, 4 distinct in-glossary options, exactly one correct', () => {
    fc.assert(
      fc.property(bijectiveGlossaryArb(4), fc.integer(), (glossary, seed) => {
        const questions = buildQuiz(glossary, makeRng(seed));
        const englishSet = new Set(Object.keys(glossary));

        expect(questions.length).toBe(QUESTION_COUNT);
        for (const q of questions) {
          expect(q.options.length).toBe(OPTIONS_PER_QUESTION);
          // distinct options
          expect(new Set(q.options).size).toBe(OPTIONS_PER_QUESTION);
          // all drawn from glossary
          q.options.forEach((o) => expect(englishSet.has(o)).toBe(true));
          // exactly one option maps to the prompt
          const matching = q.options.filter((o) => glossary[o] === q.prompt);
          expect(matching.length).toBe(1);
          // correctIndex points at the matching option
          expect(glossary[q.options[q.correctIndex]]).toBe(q.prompt);
        }
      }),
      { numRuns: 100 }
    );
  });

  // Feature: english-platform-overhaul, Property 3b: No repeated correct words when enough vocabulary
  it('Property 3b: with >= 10 distinct words, the 10 correct answers are all distinct', () => {
    fc.assert(
      fc.property(bijectiveGlossaryArb(10), fc.integer(), (glossary, seed) => {
        const questions = buildQuiz(glossary, makeRng(seed));
        const corrects = questions.map((q) => q.options[q.correctIndex]);
        expect(new Set(corrects).size).toBe(QUESTION_COUNT);
      }),
      { numRuns: 100 }
    );
  });

  // Feature: english-platform-overhaul, Property 6: Insufficient vocabulary is rejected
  it('Property 6: glossaries with fewer than 4 distinct words throw InsufficientVocabulary', () => {
    fc.assert(
      fc.property(
        fc
          .uniqueArray(fc.string({ minLength: 1, maxLength: 6 }).filter((s) => s.trim() !== ''), {
            minLength: 0,
            maxLength: 3,
          })
          .map((words) => {
            const g = {};
            words.forEach((w, i) => (g[w] = 'ar_' + i));
            return g;
          }),
        (glossary) => {
          expect(() => buildQuiz(glossary, makeRng(1))).toThrow(InsufficientVocabulary);
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: english-platform-overhaul, Property 4: Scoring counts exactly the matching answers
  it('Property 4: score equals count of matching indices and stays within [0, n]', () => {
    fc.assert(
      fc.property(
        fc.array(fc.record({ correctIndex: fc.integer({ min: 0, max: 3 }) }), {
          minLength: QUESTION_COUNT,
          maxLength: QUESTION_COUNT,
        }),
        fc.array(fc.oneof(fc.integer({ min: 0, max: 3 }), fc.constant(null)), {
          minLength: QUESTION_COUNT,
          maxLength: QUESTION_COUNT,
        }),
        (questions, answers) => {
          const expected = questions.reduce(
            (acc, q, i) => acc + (answers[i] != null && answers[i] === q.correctIndex ? 1 : 0),
            0
          );
          const score = scoreQuiz(questions, answers);
          expect(score).toBe(expected);
          expect(score).toBeGreaterThanOrEqual(0);
          expect(score).toBeLessThanOrEqual(QUESTION_COUNT);
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: english-platform-overhaul, Property 5: Best-score persistence is monotonic and range-bounded
  it('Property 5: mergeScore returns the max, never decreases, clamped to [0, MAX_SCORE]', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 100 }),
        fc.integer({ min: 0, max: 100 }),
        (stored, achieved) => {
          const merged = mergeScore(stored, achieved);
          expect(merged).toBe(Math.max(stored, achieved));
          expect(merged).toBeGreaterThanOrEqual(stored);
          expect(merged).toBeGreaterThanOrEqual(0);
          expect(merged).toBeLessThanOrEqual(MAX_SCORE);
          expect(Number.isInteger(merged)).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });
});
