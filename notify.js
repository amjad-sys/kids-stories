/**
 * notify.js — student notifications for newly released parts.
 *
 * On first open, asks permission to show notifications. Listens to the shared
 * `config/notice` document; when the admin releases a part, shows an in-app
 * banner and (if allowed) a system notification with the part's name.
 *
 * NOTE: this delivers notifications while the site is OPEN in a tab. True
 * background push (site closed) would require Firebase Cloud Messaging + a
 * service worker + a server/Cloud Function to send — a larger setup.
 */
import { getSession } from './auth-core.js';

if (getSession()) {
  // Ask permission on open (browsers may require a gesture; this is best-effort).
  if ('Notification' in window && Notification.permission === 'default') {
    try { Notification.requestPermission().catch(() => {}); } catch (e) { /* ignore */ }
  }

  const toast = document.createElement('div');
  toast.className = 'notice-toast';
  toast.setAttribute('role', 'status');
  document.body.appendChild(toast);
  let hideTimer = null;

  function showToast(text) {
    toast.textContent = '🔔 ' + text;
    toast.classList.add('show');
    clearTimeout(hideTimer);
    hideTimer = setTimeout(() => toast.classList.remove('show'), 6000);
  }

  if (window.fs) {
    window.fs.collection('config').doc('notice').onSnapshot((snap) => {
      if (!snap.exists) return;
      const d = snap.data();
      if (!d || !d.ts || !d.text) return;
      const seen = Number(localStorage.getItem('lastNoticeTs') || 0);
      if (d.ts <= seen) return;
      localStorage.setItem('lastNoticeTs', String(d.ts));
      showToast(d.text);
      if ('Notification' in window && Notification.permission === 'granted') {
        try { new Notification('Story Time', { body: d.text }); } catch (e) { /* ignore */ }
      }
    }, (err) => console.warn('Notice listener error:', err));
  }
}
