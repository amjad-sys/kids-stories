/**
 * leaderboard.js — Live Wall of Fame renderer.
 * Uses the pure rankStudents/formatLeaderboardEntry cores; owns the DOM + Firestore listener.
 */
import { rankStudents, formatLeaderboardEntry } from './leaderboard-core.js';
import { getSession } from './auth-core.js';
import { pickAndUploadPhoto } from './profile.js';

const listEl = document.getElementById('lb-list');
const mySession = getSession();
const myUsername = mySession ? mySession.username : null;
// By score tier: highest score (and anyone tied) = crown, next = gold, next = silver.
const MEDAL_EMOJI = { 1: '👑', 2: '🥇', 3: '🥈' };
const TIER_CLASS = { 1: 't-crown', 2: 't-gold', 3: 't-silver' };

let hasRenderedRows = false;

function initial(name) {
  const m = String(name || '').trim().match(/[A-Za-z0-9\u0600-\u06FF]/);
  return m ? m[0].toUpperCase() : '?';
}

// One student bar: photo circle · name · last-quiz score · cumulative total.
function studentBar(entry, view, last, photo) {
  const row = document.createElement('div');
  row.className = 'lb-row' + (TIER_CLASS[entry.tier] ? ' ' + TIER_CLASS[entry.tier] : '');

  const rank = document.createElement('div');
  rank.className = 'lb-rank';
  rank.textContent = MEDAL_EMOJI[entry.tier] || String(entry.rank);

  const avatar = document.createElement('div');
  avatar.className = 'lb-avatar';
  if (photo) {
    avatar.style.backgroundImage = 'url("' + photo + '")';
  } else {
    avatar.textContent = initial(view.displayName);
  }
  // The signed-in student uploads by clicking their own avatar.
  if (myUsername && entry.username === myUsername) {
    avatar.classList.add('me');
    avatar.title = 'Click to change your photo';
    avatar.setAttribute('role', 'button');
    avatar.setAttribute('tabindex', '0');
    const cam = document.createElement('span');
    cam.className = 'lb-avatar-cam';
    cam.textContent = '📷';
    avatar.appendChild(cam);
    const trigger = () => pickAndUploadPhoto(myUsername, (state) => {
      avatar.classList.toggle('uploading', state === 'uploading');
    });
    avatar.addEventListener('click', trigger);
    avatar.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); trigger(); }
    });
  }

  const nameCell = document.createElement('div');
  nameCell.className = 'lb-name';
  nameCell.textContent = view.displayName;

  const metrics = document.createElement('div');
  metrics.className = 'lb-metrics';
  const lastEl = document.createElement('span');
  lastEl.className = 'lb-last';
  lastEl.textContent = 'Last: ' + last;
  const totalEl = document.createElement('span');
  totalEl.className = 'lb-total';
  totalEl.textContent = 'Total: ' + view.score;
  metrics.append(lastEl, totalEl);

  row.append(rank, avatar, nameCell, metrics);
  return row;
}

function renderLeaderboard(students) {
  const lastByUser = {};
  const photoByUser = {};
  students.forEach((s) => { lastByUser[s.username] = s.last; photoByUser[s.username] = s.photo; });

  const ranked = rankStudents(students.map((s) => ({
    username: s.username, 
    displayName: s.displayName, 
    score: s.cumulative,
    cumulativeAttempts: s.cumulativeAttempts,
    scoreUpdatedAt: s.scoreUpdatedAt
  })));

  // Tier by distinct score value so tied students share the same icon.
  let tier = 0;
  let prevScore = null;
  ranked.forEach((e) => {
    if (e.score !== prevScore) { tier += 1; prevScore = e.score; }
    e.tier = tier;
  });

  if (ranked.length === 0) {
    listEl.innerHTML = '<div class="lb-empty">No scores yet — be the first to climb the Wall of Fame! 🌟</div>';
    hasRenderedRows = false;
    return;
  }

  const makeRow = (e, i) => {
    const row = studentBar(e, formatLeaderboardEntry(e), lastByUser[e.username] || 0, photoByUser[e.username]);
    row.style.animationDelay = (i * 0.04) + 's';
    return row;
  };

  const frag = document.createDocumentFragment();

  // Show at least 3, and ALWAYS include every crown holder (top-score tier),
  // even if there are more than 3 of them. No upper cap for crown holders.
  const crownCount = ranked.filter((e) => e.tier === 1).length;
  const visibleCount = Math.max(3, crownCount);

  const top = document.createElement('div');
  top.className = 'lb-list';
  ranked.slice(0, visibleCount).forEach((e, i) => top.appendChild(makeRow(e, i)));
  frag.appendChild(top);

  // The rest are hidden behind a "Show all" toggle.
  const rest = ranked.slice(visibleCount);
  if (rest.length) {
    const more = document.createElement('div');
    more.className = 'lb-list lb-more';
    rest.forEach((e, i) => more.appendChild(makeRow(e, i + visibleCount)));

    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'lb-toggle';
    toggle.innerHTML = 'Show all <span class="chev">▾</span>';
    toggle.addEventListener('click', () => {
      const open = more.classList.toggle('open');
      toggle.innerHTML = (open ? 'Show less ' : 'Show all ') + '<span class="chev">' + (open ? '▴' : '▾') + '</span>';
    });

    frag.appendChild(toggle);
    frag.appendChild(more);
  }

  listEl.innerHTML = '';
  listEl.appendChild(frag);
  hasRenderedRows = true;
}

function showError() {
  // Retain previously displayed rankings; only show an error when we have nothing (Req 3.9).
  if (!hasRenderedRows) {
    listEl.innerHTML = '<div class="lb-error">The leaderboard could not be loaded. Please try again later.</div>';
  }
}

let lastSignature = null;

function subscribeLeaderboard() {
  if (!window.fs) return;

  let firstSnapshot = false;
  // 3s watchdog: if no first snapshot arrives, show error but keep any prior rows (Req 3.9).
  const watchdog = setTimeout(() => {
    if (!firstSnapshot) showError();
  }, 3000);

  window.fs.collection('students').onSnapshot(
    (snap) => {
      firstSnapshot = true;
      clearTimeout(watchdog);
      const students = [];
      snap.forEach((doc) => {
        const d = doc.data() || {};
        const cumulative = Number.isFinite(d.cumulativeScore)
          ? d.cumulativeScore
          : (Number.isFinite(d.score) ? d.score : 0);
        students.push({
          username: doc.id,
          displayName: d.displayName,
          cumulative,
          last: Number.isFinite(d.lastScore) ? d.lastScore : 0,
          photo: typeof d.photo === 'string' ? d.photo : '',
          cumulativeAttempts: d.cumulativeAttempts || 0,
          scoreUpdatedAt: d.scoreUpdatedAt || 0,
        });
      });
      // Only re-render when something VISIBLE changed (name, scores, photo, order).
      // This ignores the frequent time-tracking writes so the list stops jumping.
      const sig = JSON.stringify(
        students
          .map((s) => [s.username, s.displayName, s.cumulative, s.last, s.photo, s.cumulativeAttempts, s.scoreUpdatedAt])
          .sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0))
      );
      if (sig === lastSignature) return;
      lastSignature = sig;
      renderLeaderboard(students);
    },
    (err) => {
      firstSnapshot = true;
      clearTimeout(watchdog);
      console.error('Leaderboard error:', err);
      showError();
    }
  );
}

subscribeLeaderboard();
