/**
 * auth-core.js — Pure credential validation + session helpers.
 * No Firebase. Session helpers use sessionStorage when present (browser) and
 * accept an injectable store for tests.
 */

export const INVALID_INPUT_MESSAGE = 'Please enter both your username and password.';
export const SESSION_KEY = 'session';

export function normalizeUsername(raw) {
  return String(raw == null ? '' : raw).trim().toLowerCase();
}

/**
 * validateCredentials — reject empty/whitespace input BEFORE any query (Req 2.6).
 * @returns {{ok:true} | {ok:false, message:string}}
 */
export function validateCredentials(username, password) {
  const u = String(username == null ? '' : username).trim();
  const p = String(password == null ? '' : password);
  if (u === '' || p.trim() === '') {
    return { ok: false, message: INVALID_INPUT_MESSAGE };
  }
  return { ok: true };
}

function resolveStore(store) {
  if (store) return store;
  if (typeof sessionStorage !== 'undefined') return sessionStorage;
  return null;
}

/**
 * startSession — persist { username, displayName } (Req 2.8).
 */
export function startSession(student, store) {
  const s = resolveStore(store);
  if (!s) return;
  const session = {
    username: normalizeUsername(student && student.username),
    displayName: student && student.displayName != null ? String(student.displayName) : '',
  };
  s.setItem(SESSION_KEY, JSON.stringify(session));
}

export function getSession(store) {
  const s = resolveStore(store);
  if (!s) return null;
  const raw = s.getItem(SESSION_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch (e) {
    return null;
  }
}

/**
 * requireSession — redirect to index.html when no session (Req 2.9).
 * `nav` is injectable for tests; defaults to window.location.replace.
 */
export function requireSession(store, nav) {
  const session = getSession(store);
  if (!session) {
    const go = nav || (typeof window !== 'undefined' ? (u) => window.location.replace(u) : null);
    if (go) go('index.html');
    return null;
  }
  return session;
}
