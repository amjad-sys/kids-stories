import { normalizeUsername, validateCredentials, startSession } from './auth-core.js';

const ADMIN_USERNAME = 'admin';
const ADMIN_PASSWORD = 'admin123';

const INVALID_MESSAGE = 'That username or password is not right. Please try again.';
const ERROR_MESSAGE = 'We could not sign you in right now. Please try again.';

// Inject the beautiful Glassmorphism Modal into the body
function injectLoginModal() {
  if (document.getElementById('custom-login-modal')) return;

  const modalHTML = `
    <div id="custom-login-modal" style="display: none; position: fixed; inset: 0; z-index: 9999; background: rgba(11, 13, 16, 0.7); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); align-items: center; justify-content: center; opacity: 0; transition: opacity 0.4s ease;">
      <div style="background: rgba(20, 24, 30, 0.65); border: 1px solid rgba(128, 204, 255, 0.2); border-radius: 24px; padding: 40px; width: 90%; max-width: 400px; box-shadow: 0 24px 64px rgba(0, 0, 0, 0.5); transform: translateY(20px); transition: transform 0.4s ease;" id="custom-login-box">
        
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 32px;">
          <h2 style="font-family: 'Alfa Slab One', serif; font-size: 2rem; color: var(--cyan, #80ccff); margin: 0; line-height: 1;">Sign In</h2>
          <button id="close-login-modal" style="background: none; border: none; color: var(--dim, #a3a3a3); cursor: pointer; padding: 8px;">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>

        <form id="login-form" novalidate>
          <div style="margin-bottom: 20px;">
            <label for="username" style="display: block; margin-bottom: 8px; font-size: 0.8rem; font-family: 'DM Mono', monospace; letter-spacing: 0.1em; text-transform: uppercase; color: var(--dim, #a3a3a3);">Username</label>
            <input id="username" type="text" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" placeholder="Your username" style="width: 100%; background: rgba(0,0,0,0.3); border: 1px solid rgba(128, 204, 255, 0.3); border-radius: 12px; padding: 14px 16px; color: var(--ink, #f2f2f2); font-family: 'Manrope', sans-serif; font-size: 1rem; outline: none; transition: border-color 0.3s ease;">
          </div>
          
          <div style="margin-bottom: 32px;">
            <label for="password" style="display: block; margin-bottom: 8px; font-size: 0.8rem; font-family: 'DM Mono', monospace; letter-spacing: 0.1em; text-transform: uppercase; color: var(--dim, #a3a3a3);">Password</label>
            <input id="password" type="password" autocomplete="new-password" placeholder="Your password" style="width: 100%; background: rgba(0,0,0,0.3); border: 1px solid rgba(128, 204, 255, 0.3); border-radius: 12px; padding: 14px 16px; color: var(--ink, #f2f2f2); font-family: 'Manrope', sans-serif; font-size: 1rem; outline: none; transition: border-color 0.3s ease;">
          </div>

          <button id="login-btn" type="submit" style="width: 100%; min-height: 56px; border: none; border-radius: 100px; background: var(--cyan, #80ccff); color: var(--bg, #0b0d10); font-family: 'DM Mono', monospace; font-size: 0.75rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.18em; cursor: pointer; box-shadow: 0 4px 14px rgba(128, 204, 255, 0.2); transition: transform 0.3s ease, box-shadow 0.3s ease;">
            Let's Go!
          </button>
          
          <p id="login-msg" style="margin-top: 16px; font-size: 0.85rem; color: #ff5555; text-align: center; min-height: 20px; font-family: 'Manrope', sans-serif;"></p>
        </form>
      </div>
    </div>
  `;
  document.body.insertAdjacentHTML('beforeend', modalHTML);

  // Focus styling for inputs
  const inputs = document.querySelectorAll('#custom-login-modal input');
  inputs.forEach(input => {
    input.addEventListener('focus', () => input.style.borderColor = 'var(--cyan, #80ccff)');
    input.addEventListener('blur', () => input.style.borderColor = 'rgba(128, 204, 255, 0.3)');
  });

  setupModalLogic();
}

function setupModalLogic() {
  const modal = document.getElementById('custom-login-modal');
  const box = document.getElementById('custom-login-box');
  const closeBtn = document.getElementById('close-login-modal');
  const form = document.getElementById('login-form');
  const usernameInput = document.getElementById('username');
  const passwordInput = document.getElementById('password');
  const messageEl = document.getElementById('login-msg');
  const btn = document.getElementById('login-btn');

  function openModal() {
    modal.style.display = 'flex';
    // Small delay to allow display block to apply before animating opacity
    setTimeout(() => {
      modal.style.opacity = '1';
      box.style.transform = 'translateY(0)';
      usernameInput.focus();
    }, 10);
  }

  function closeModal() {
    modal.style.opacity = '0';
    box.style.transform = 'translateY(20px)';
    setTimeout(() => {
      modal.style.display = 'none';
      form.reset();
      messageEl.textContent = '';
    }, 400); // match transition duration
  }

  closeBtn.addEventListener('click', closeModal);
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });

  // Attach click to all sign-in buttons in the landing page
  const signinButtons = [document.getElementById('enter'), document.getElementById('signin')];
  signinButtons.forEach(button => {
    if (button) {
      button.addEventListener('click', (e) => {
        e.preventDefault();
        openModal();
      });
    }
  });

  // Setup Auth Logic
  function setMessage(text, isInfo) {
    messageEl.textContent = text || '';
    messageEl.style.color = isInfo ? 'var(--cyan, #80ccff)' : '#ff5555';
  }

  function setLoading(loading) {
    btn.disabled = loading;
    btn.style.opacity = loading ? '0.7' : '1';
    btn.innerHTML = loading ? 'Signing in...' : 'Let\'s Go!';
  }

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

    const check = validateCredentials(username, password);
    if (!check.ok) { setMessage(check.message); return; }

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
        setMessage('Welcome! Loading your stories...', true);
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
}

// Ensure DOM is fully loaded, then inject modal
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', injectLoginModal);
} else {
  injectLoginModal();
}
