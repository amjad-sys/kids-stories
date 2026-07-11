/**
 * activity.js — tracks how long the signed-in student spends browsing.
 * Accumulates active (visible) seconds and flushes them to the student's
 * Firestore doc as `timeToday`, keyed by `timeDate` (YYYY-MM-DD). When the day
 * changes (past midnight), the counter starts fresh for the new date.
 * Loaded on home.html and reader.html.
 */
import { getSession } from './auth-core.js';

const FLUSH_EVERY = 20; // seconds of active time between writes

function todayStr() {
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

const session = getSession();
if (session && window.fs) {
  let pending = 0;   // active seconds not yet written
  let flushing = false;

  setInterval(() => {
    if (document.visibilityState === 'visible') pending++;
    if (pending >= FLUSH_EVERY) flush();
  }, 1000);

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flush();
  });
  window.addEventListener('pagehide', flush);

  async function flush() {
    if (flushing || pending <= 0) return;
    const secs = pending;
    pending = 0;
    flushing = true;
    const ref = window.fs.collection('students').doc(session.username);
    try {
      await window.fs.runTransaction(async (t) => {
        const snap = await t.get(ref);
        if (!snap.exists) return;
        const d = snap.data() || {};
        const today = todayStr();
        const base = d.timeDate === today && Number.isFinite(d.timeToday) ? d.timeToday : 0;
        t.update(ref, { timeToday: base + secs, timeDate: today });
      });
    } catch (e) {
      pending += secs; // retry next tick
      console.warn('Activity flush failed:', e);
    } finally {
      flushing = false;
    }
  }
}
