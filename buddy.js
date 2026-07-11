/**
 * buddy.js — "Story Buddy": a floating, VOICE AI helper for students.
 *
 * - Floating robot button; when tapped, the assistant greets the student by name,
 *   says today's active story/part, and asks what they'd like help with.
 * - Voice-first: the student speaks (Web Speech recognition), the assistant replies
 *   out loud (speech synthesis). Answers stay within the school's stories.
 * - Powered by Gemini through Firebase AI Logic (no API key in the client).
 *
 * One-time setup required in the Firebase console:
 *   AI Services → AI Logic → Get started → choose "Gemini Developer API".
 */
import { getSession } from './auth-core.js';

const FIREBASE_AI_VERSION = '11.10.0';
const MODEL = 'gemini-2.5-flash';

const session = getSession();
if (session) initBuddy();

async function initBuddy() {
  // ── Load story context + today's active selection ──
  let stories = [];
  try { stories = (await (await fetch('stories.json')).json()).stories || []; } catch (e) { /* ignore */ }

  let cfg = null;
  try {
    const snap = await window.fs.collection('config').doc('quiz').get();
    if (snap.exists) cfg = snap.data();
  } catch (e) { /* ignore */ }

  const activeStory = cfg ? stories.find((s) => s.id === cfg.activeStoryId) : null;
  const activePart = cfg && Number.isFinite(cfg.activePartIndex) ? cfg.activePartIndex : 0;
  const todayLine = activeStory
    ? 'the story "' + activeStory.title + '", part ' + (activePart + 1)
    : 'a wonderful story';
  const greeting = 'Hi ' + (session.displayName || 'friend') + '! I am your Story Buddy. ' +
    'Today we have ' + todayLine + '. What would you like help with today?';

  // ── Build UI (self-injected) ──
  const fab = document.createElement('button');
  fab.className = 'buddy-fab';
  fab.type = 'button';
  fab.title = 'Talk to Story Buddy';
  fab.textContent = '🤖';

  const overlay = document.createElement('div');
  overlay.className = 'buddy-overlay hidden';
  overlay.innerHTML =
    '<div class="buddy-card glass">' +
      '<button class="buddy-close" id="buddy-close" type="button" aria-label="Close">✕</button>' +
      '<div class="buddy-avatar" id="buddy-avatar">🤖</div>' +
      '<div class="buddy-status" id="buddy-status">Tap the mic and talk to me</div>' +
      '<div class="buddy-caption" id="buddy-caption"></div>' +
      '<button class="buddy-mic" id="buddy-mic" type="button" aria-label="Talk">🎤</button>' +
    '</div>';

  document.body.append(fab, overlay);

  const avatar = overlay.querySelector('#buddy-avatar');
  const statusEl = overlay.querySelector('#buddy-status');
  const captionEl = overlay.querySelector('#buddy-caption');
  const micBtn = overlay.querySelector('#buddy-mic');

  const setStatus = (t) => { statusEl.textContent = t; };
  const setCaption = (t) => { captionEl.textContent = t; };

  // ── Text-to-speech ──
  function pickVoice() {
    const voices = window.speechSynthesis ? window.speechSynthesis.getVoices() : [];
    return voices.find((v) => v.lang && v.lang.startsWith('en') && /Samantha|Google US|female/i.test(v.name)) ||
           voices.find((v) => v.lang && v.lang.startsWith('en-US')) ||
           voices.find((v) => v.lang && v.lang.startsWith('en')) || null;
  }
  function speak(text) {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'en-US'; u.rate = 0.95; u.pitch = 1.1;
    const v = pickVoice(); if (v) u.voice = v;
    u.onstart = () => avatar.classList.add('speaking');
    u.onend = () => avatar.classList.remove('speaking');
    window.speechSynthesis.speak(u);
  }
  if ('speechSynthesis' in window) { window.speechSynthesis.onvoiceschanged = pickVoice; }

  // ── Gemini (lazy init on first open) ──
  let model = null; let chat = null; let aiFailed = false;
  function buildSystemInstruction() {
    const corpus = stories.map((s) => {
      const parts = (s.parts || []).map((p, i) => {
        const text = p.text || (p.segments ? p.segments.map((x) => x.text).join(' ') : '');
        return 'Part ' + (i + 1) + ': ' + text;
      }).join('\n');
      return 'STORY: ' + s.title + '\n' + parts;
    }).join('\n\n');
    return (
      "You are 'Story Buddy', a kind reading helper for young children learning English. " +
      'Your replies are read ALOUD, so answer in 1-3 short, simple English sentences. ' +
      'Be warm, cheerful, and encouraging. Help the child understand the stories below: explain words, ' +
      'summarize parts, and ask gentle comprehension questions. Stay within these stories; if asked about ' +
      'something unrelated, kindly guide back to the story. Never say anything unsafe or inappropriate for kids.\n\n' +
      'TODAY we are focused on: ' + todayLine + '.\n\n' + corpus
    );
  }
  async function ensureAI() {
    if (model || aiFailed) return;
    try {
      const cfgObj = window.firebaseConfig;
      const [appMod, aiMod] = await Promise.all([
        import('https://www.gstatic.com/firebasejs/' + FIREBASE_AI_VERSION + '/firebase-app.js'),
        import('https://www.gstatic.com/firebasejs/' + FIREBASE_AI_VERSION + '/firebase-ai.js'),
      ]);
      const aiApp = appMod.initializeApp(cfgObj, 'buddy');
      const ai = aiMod.getAI(aiApp, { backend: new aiMod.GoogleAIBackend() });
      model = aiMod.getGenerativeModel(ai, { model: MODEL, systemInstruction: buildSystemInstruction() });
      chat = model.startChat({ history: [{ role: 'model', parts: [{ text: greeting }] }] });
    } catch (e) {
      aiFailed = true;
      console.error('Story Buddy AI init failed:', e);
    }
  }

  async function ask(text) {
    setStatus('Thinking…');
    await ensureAI();
    if (aiFailed || !chat) {
      const msg = 'Sorry, I cannot talk right now. Please tell your teacher.';
      setCaption('Buddy: ' + msg); speak(msg); setStatus('Tap the mic and talk to me');
      return;
    }
    try {
      const result = await chat.sendMessage(text);
      const reply = (result && result.response && result.response.text()) || 'Let us look at the story together!';
      setCaption('Buddy: ' + reply);
      speak(reply);
    } catch (e) {
      console.error('Story Buddy reply failed:', e);
      const msg = 'Oops, I did not catch that. Can you say it again?';
      setCaption('Buddy: ' + msg); speak(msg);
    } finally {
      setStatus('Tap the mic and talk to me');
    }
  }

  // ── Speech-to-text (student speaking) ──
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  let recognizing = false;
  function listen() {
    if (!SR) {
      const msg = 'Voice input is not supported on this browser. Please use Chrome.';
      setCaption(msg); speak(msg);
      return;
    }
    if (recognizing) return;
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    const rec = new SR();
    rec.lang = 'en-US';
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    recognizing = true;
    micBtn.classList.add('listening');
    setStatus('Listening…');
    rec.onresult = (e) => {
      const t = e.results[0][0].transcript;
      setCaption('You: ' + t);
      ask(t);
    };
    rec.onerror = () => { setStatus('Tap the mic and talk to me'); };
    rec.onend = () => { recognizing = false; micBtn.classList.remove('listening'); };
    try { rec.start(); } catch (e) { recognizing = false; micBtn.classList.remove('listening'); }
  }

  // ── Wiring ──
  let greeted = false;
  function openBuddy() {
    overlay.classList.remove('hidden');
    ensureAI(); // warm up in the background
    if (!greeted) { greeted = true; setCaption('Buddy: ' + greeting); speak(greeting); }
  }
  function closeBuddy() {
    overlay.classList.add('hidden');
    if (window.speechSynthesis) window.speechSynthesis.cancel();
  }

  fab.addEventListener('click', openBuddy);
  micBtn.addEventListener('click', listen);
  overlay.querySelector('#buddy-close').addEventListener('click', closeBuddy);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) closeBuddy(); });
}
