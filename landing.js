/**
 * landing.js — Story Time sign-in.
 *
 * Students sign in with username + password (validated against Firestore
 * students_auth via the preserved auth-core helpers). The admin signs in with
 * admin / admin123 and is taken to the full admin dashboard.
 */
import { normalizeUsername, validateCredentials, startSession } from './auth-core.js';

const ADMIN_USERNAME = 'admin';
const ADMIN_PASSWORD = 'admin123';

const INVALID_MESSAGE = 'That username or password is not right. Please try again.';
const ERROR_MESSAGE = 'We could not sign you in right now. Please try again.';

const form = document.getElementById('login-form');
const usernameInput = document.getElementById('username');
const passwordInput = document.getElementById('password');
const messageEl = document.getElementById('login-msg');
const btn = document.getElementById('login-btn');

function setMessage(text, kind) {
  messageEl.textContent = text || '';
  messageEl.className = 'login-msg' + (kind === 'info' ? ' info' : '');
}

function setLoading(loading) {
  btn.disabled = loading;
  btn.innerHTML = loading
    ? '<span class="login-spin" aria-hidden="true"></span>Signing in…'
    : 'Sign In';
}

/** Verify a student's credentials against Firestore. */
async function authenticateStudent(rawUsername, password) {
  const id = normalizeUsername(rawUsername);
  const authSnap = await window.fs.collection('students_auth').doc(id).get();
  if (!authSnap.exists || authSnap.data().password !== password) {
    return { ok: false };
  }
  const profileSnap = await window.fs.collection('students').doc(id).get();
  const displayName = profileSnap.exists ? profileSnap.data().displayName || rawUsername : rawUsername;
  return { ok: true, student: { username: id, displayName } };
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  setMessage('');

  const username = usernameInput.value;
  const password = passwordInput.value;

  // Empty-field guard (no query on empty input).
  const check = validateCredentials(username, password);
  if (!check.ok) { setMessage(check.message); return; }

  // Admin shortcut → full dashboard.
  if (normalizeUsername(username) === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
    sessionStorage.setItem('adminAuthed', '1');
    window.location.href = 'admin.html';
    return;
  }

  setLoading(true);
  try {
    const result = await authenticateStudent(username, password);
    if (result.ok) {
      startSession(result.student);
      setMessage('Welcome! Loading your stories…', 'info');
      window.location.href = 'home.html';
    } else {
      setMessage(INVALID_MESSAGE);
      setLoading(false);
    }
  } catch (err) {
    console.error('Sign-in failed:', err);
    setMessage(ERROR_MESSAGE);
    setLoading(false);
  }
});


// ── Floating hero names on the sign-in page (creative, varied typography) ──
const HERO_NAMES = [
  { n: 'Saad', d: 'the Best' },
  { n: 'Rand', d: 'the Star' },
  { n: 'Mokarram', d: 'the Genius' },
  { n: 'Mais', d: 'Reads with Heart' },
  { n: 'Aboud', d: 'the Smart' },
  { n: 'Azzouz', d: 'Number One' },
  { n: 'Leen', d: 'Reads Like Light' },
  { n: 'Hammoud', d: 'the Hero' },
  { n: 'Adham', d: 'Steals the Spotlight' },
];
const NAME_COLORS = ['#7cf6ff', '#ffd76a', '#5bffc0', '#ff9db0', '#a9d0ff', '#ffd0a8', '#c9f0ff', '#b8ffd9', '#ffe08a'];
// Composition styles: stacked (desc under name), inline (desc beside), typographic (uppercase, spaced).
const NAME_STYLES = ['fn-stacked', 'fn-inline', 'fn-typo'];

function spawnFloatingNames() {
  const layer = document.getElementById('float-names');
  if (!layer) return;
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const mobile = window.matchMedia('(max-width: 768px)').matches;

  // Shuffle for a random appearance order.
  const items = HERO_NAMES.map((h, i) => ({ h, c: NAME_COLORS[i % NAME_COLORS.length], s: NAME_STYLES[i % NAME_STYLES.length] }));
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }

  items.forEach(({ h, c, s }, i) => {
    // On phones/tablets everything stacks so long names never overflow the screen.
    const style = mobile ? 'fn-stacked' : s;
    const el = document.createElement('div');
    el.className = 'float-name ' + style;
    el.style.left = (16 + Math.random() * 68) + '%'; // centered anchor keeps it on-screen
    el.style.setProperty('--dur', (15 + Math.random() * 12) + 's');
    el.style.setProperty('--rot', (Math.random() * 8 - 4).toFixed(1) + 'deg');
    // Random fade-out height (around / just after the middle) + random peak opacity.
    el.style.setProperty('--rise', (52 + Math.random() * 26).toFixed(0) + 'vh');
    el.style.setProperty('--op', (0.55 + Math.random() * 0.35).toFixed(2));
    el.style.animationDelay = (i * 1.7 + Math.random() * 3).toFixed(2) + 's';
    // Random sizes: sometimes big, sometimes small.
    const base = mobile ? (0.9 + Math.random() * 0.8) : (1.1 + Math.random() * 1.8);
    el.style.fontSize = base.toFixed(2) + 'rem';
    el.style.color = c;
    el.innerHTML = '<span class="fn-name">' + h.n + '</span><span class="fn-desc">' + h.d + '</span>';
    layer.appendChild(el);
  });
}

spawnFloatingNames();
