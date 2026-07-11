/**
 * leaderboard-core.js — Pure leaderboard ordering + display formatting.
 * No Firebase, no DOM. Imported by leaderboard.js (browser) and the property tests.
 */

export const PLACEHOLDER_NAME = 'Mystery Learner';

/**
 * Normalize a username the same way the auth/doc-id layer does, so tie-breaks
 * are deterministic and consistent with document identity.
 */
export function normalizeUsername(raw) {
  return String(raw == null ? '' : raw).trim().toLowerCase();
}

/**
 * Coerce a score to a non-negative integer. Non-numeric / negative -> 0.
 */
function coerceScore(score) {
  const n = Math.floor(Number(score));
  return Number.isFinite(n) && n > 0 ? n : 0;
}

/**
 * rankStudents — total order over students.
 * Sort by score DESC, then displayName ASC (case-insensitive), then normalized
 * username ASC for a fully deterministic, stable total order.
 *
 * @param {Array<{username?:string, displayName?:string, score?:number}>} students
 * @returns {Array<{username:string, displayName:string, score:number, rank:number}>}
 */
export function rankStudents(students) {
  const list = Array.isArray(students) ? students.slice() : [];

  const decorated = list.map((s) => ({
    username: normalizeUsername(s && s.username),
    displayName: s && s.displayName != null ? String(s.displayName) : '',
    score: coerceScore(s && s.score),
    cumulativeAttempts: s && s.cumulativeAttempts || 0,
    scoreUpdatedAt: s && s.scoreUpdatedAt || 0,
  }));

  decorated.sort((a, b) => {
    // 1. Higher score first
    if (b.score !== a.score) return b.score - a.score;
    
    // 2. Fewer total attempts first
    const attemptsA = a.cumulativeAttempts || Number.MAX_SAFE_INTEGER;
    const attemptsB = b.cumulativeAttempts || Number.MAX_SAFE_INTEGER;
    if (attemptsA !== attemptsB) return attemptsA - attemptsB;
    
    // 3. Earlier score achieved time first
    const timeA = a.scoreUpdatedAt || Number.MAX_SAFE_INTEGER;
    const timeB = b.scoreUpdatedAt || Number.MAX_SAFE_INTEGER;
    if (timeA !== timeB) return timeA - timeB;

    // 4. Alphabetical fallback
    const nameCmp = a.displayName.localeCompare(b.displayName, undefined, {
      sensitivity: 'base',
    });
    if (nameCmp !== 0) return nameCmp;
    return a.username < b.username ? -1 : a.username > b.username ? 1 : 0;
  });

  return decorated.map((s, i) => ({ ...s, rank: i + 1 }));
}

/**
 * formatLeaderboardEntry — display shaping only. Substitutes an English
 * placeholder for empty/whitespace display names while preserving rank + score.
 */
export function formatLeaderboardEntry(entry) {
  const name =
    entry && typeof entry.displayName === 'string' && entry.displayName.trim() !== ''
      ? entry.displayName
      : PLACEHOLDER_NAME;
  return {
    rank: entry ? entry.rank : undefined,
    displayName: name,
    score: entry ? entry.score : 0,
  };
}
