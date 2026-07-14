/**
 * quiz-core.js — Pure quiz generation, scoring, and best-score merge.
 * No Firebase, no DOM, no timers. Imported by quiz.js (browser) and property tests.
 */

export const QUESTION_COUNT = 10;
export const OPTIONS_PER_QUESTION = 4;
export const MAX_SCORE = 100;

/** Distinct signal for the "not enough vocabulary" condition (Requirement 4.13). */
export class InsufficientVocabulary extends Error {
  constructor(distinctCount) {
    super('Insufficient vocabulary: need at least ' + OPTIONS_PER_QUESTION + ' distinct words, got ' + distinctCount);
    this.name = 'InsufficientVocabulary';
    this.distinctCount = distinctCount;
  }
}

function fisherYatesShuffle(arr, rng) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const t = a[i];
    a[i] = a[j];
    a[j] = t;
  }
  return a;
}

/**
 * buildQuiz — generate exactly QUESTION_COUNT questions from a glossary.
 *
 * @param {Object<string,string>} glossary  english -> arabic
 * @param {() => number} [rng]  returns [0,1); defaults to Math.random
 * @returns {Array<{prompt:string, options:string[], correctIndex:number}>}
 * @throws {InsufficientVocabulary} when fewer than OPTIONS_PER_QUESTION distinct English words exist
 */
export function buildQuiz(glossary, rng = Math.random) {
  const englishWords = Object.keys(glossary || {});
  if (englishWords.length < OPTIONS_PER_QUESTION) {
    throw new InsufficientVocabulary(englishWords.length);
  }

  // No-repeat targets: draw from a shuffled queue and only refill (reshuffle) once
  // every distinct word has been used. Words repeat only if there are fewer than
  // QUESTION_COUNT distinct words (Req 4.14).
  let queue = [];
  const nextTarget = () => {
    if (queue.length === 0) queue = fisherYatesShuffle(englishWords, rng);
    return queue.pop();
  };

  const questions = [];
  for (let i = 0; i < QUESTION_COUNT; i++) {
    const correct = nextTarget();
    const prompt = glossary[correct];

    // Distractors: distinct English words whose meaning differs from the prompt,
    // guaranteeing exactly one option maps to the prompt (Property 3).
    let pool = englishWords.filter((w) => w !== correct && glossary[w] !== prompt);
    // Fallback for meaning-collision-heavy glossaries: allow any distinct word.
    if (pool.length < OPTIONS_PER_QUESTION - 1) {
      pool = englishWords.filter((w) => w !== correct);
    }

    const distractors = fisherYatesShuffle(pool, rng).slice(0, OPTIONS_PER_QUESTION - 1);
    const options = fisherYatesShuffle([correct, ...distractors], rng);

    questions.push({
      prompt,
      options,
      correctIndex: options.indexOf(correct),
    });
  }
  return questions;
}

/**
 * buildFixedQuiz — use pre-defined questions (with compound phrases / custom distractors).
 * Shuffles question order AND option order within each question so every student
 * sees them in a different arrangement.
 *
 * @param {Array<{prompt:string, correct:string, distractors:string[]}>} fixedQuestions
 * @param {() => number} [rng]  returns [0,1); defaults to Math.random
 * @returns {Array<{prompt:string, options:string[], correctIndex:number}>}
 */
export function buildFixedQuiz(fixedQuestions, rng = Math.random) {
  const shuffled = fisherYatesShuffle(fixedQuestions, rng);
  // Take up to QUESTION_COUNT
  const selected = shuffled.slice(0, QUESTION_COUNT);
  return selected.map((q) => {
    const options = fisherYatesShuffle([q.correct, ...q.distractors], rng);
    return {
      prompt: q.prompt,
      options,
      correctIndex: options.indexOf(q.correct),
    };
  });
}

/**
 * scoreQuiz — count answers whose selected index equals the correct index.
 * A timeout / no selection is represented by null/undefined/-1 and counts as wrong.
 *
 * @param {Array<{correctIndex:number}>} questions
 * @param {Array<number|null>} answers
 * @returns {number} integer in [0, questions.length]
 */
export function scoreQuiz(questions, answers) {
  const qs = Array.isArray(questions) ? questions : [];
  const ans = Array.isArray(answers) ? answers : [];
  let score = 0;
  for (let i = 0; i < qs.length; i++) {
    if (ans[i] != null && ans[i] === qs[i].correctIndex) score++;
  }
  return score;
}

/**
 * mergeScore — best-score rule. Monotonic non-decreasing, clamped to [0, MAX_SCORE].
 */
export function mergeScore(stored, achieved) {
  const s = Number.isFinite(stored) ? stored : 0;
  const a = Number.isFinite(achieved) ? achieved : 0;
  const best = Math.max(s, a);
  return Math.min(MAX_SCORE, Math.max(0, Math.floor(best)));
}
