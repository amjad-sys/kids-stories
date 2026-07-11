/**
 * data-core.js — Pure decisions for student creation and quiz-config round-trip.
 * No Firebase. The actual writes happen in admin.js; this module decides validity
 * and shapes records so the logic is property-testable.
 */

export function normalizeUsername(raw) {
  return String(raw == null ? '' : raw).trim().toLowerCase();
}

/**
 * decideCreate — create-if-absent decision + default-score shaping.
 *
 * @param {string[]|Set<string>} existingIds  normalized usernames already present
 * @param {{username:string, password:string, displayName?:string, score?:number}} newStudent
 * @returns {{ok:true, record:{username,password,displayName,score}} | {ok:false, reason:string, message:string}}
 */
export function decideCreate(existingIds, newStudent) {
  const ids = existingIds instanceof Set ? existingIds : new Set(existingIds || []);
  const username = normalizeUsername(newStudent && newStudent.username);
  const password = newStudent && newStudent.password != null ? String(newStudent.password) : '';
  const displayName = newStudent && newStudent.displayName != null ? String(newStudent.displayName) : '';

  if (username === '' || password.trim() === '' || displayName.trim() === '') {
    return { ok: false, reason: 'empty-field', message: 'Username, password, and name are all required.' };
  }
  if (ids.has(username)) {
    return { ok: false, reason: 'duplicate', message: 'That username already exists. Please choose another.' };
  }

  const hasScore = newStudent && Number.isFinite(newStudent.score);
  const score = hasScore ? Math.max(0, Math.floor(newStudent.score)) : 0; // default 0 (Req 8.4)

  return { ok: true, record: { username, password, displayName, score } };
}

/**
 * makeQuizConfig / parseQuizConfig — round-trip the active quiz selection (Req 6.10/6.11).
 */
export function makeQuizConfig(sel) {
  const activeStoryId = sel && sel.activeStoryId != null ? String(sel.activeStoryId) : '';
  const activePartIndex = sel && Number.isFinite(sel.activePartIndex) ? Math.floor(sel.activePartIndex) : NaN;
  if (activeStoryId === '' || !Number.isFinite(activePartIndex) || activePartIndex < 0) {
    throw new Error('Invalid quiz config selection.');
  }
  const config = { activeStoryId, activePartIndex };
  if (sel.storyTitle != null) config.storyTitle = sel.storyTitle;
  if (sel.glossary != null) config.glossary = sel.glossary;
  return config;
}

export function parseQuizConfig(doc) {
  if (!doc) return null;
  const activeStoryId = doc.activeStoryId != null ? String(doc.activeStoryId) : '';
  const activePartIndex = Number.isFinite(doc.activePartIndex) ? Math.floor(doc.activePartIndex) : NaN;
  if (activeStoryId === '' || !Number.isFinite(activePartIndex) || activePartIndex < 0) return null;
  const config = { activeStoryId, activePartIndex };
  if (doc.storyTitle != null) config.storyTitle = doc.storyTitle;
  if (doc.glossary != null) config.glossary = doc.glossary;
  return config;
}
