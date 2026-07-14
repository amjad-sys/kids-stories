/**
 * quiz.js — Quick Quiz engine UI.
 * Pure generation/scoring/merge live in quiz-core.js; this owns the timer, DOM,
 * confetti, and Firestore persistence.
 */
import { buildQuiz, buildFixedQuiz, scoreQuiz, InsufficientVocabulary, QUESTION_COUNT } from './quiz-core.js';
import { getSession } from './auth-core.js';

const QUESTION_MS = 5000;

// Admin preview mode: no one-attempt gate, no score saving (set on admin.html).
const PREVIEW = typeof window !== 'undefined' && window.QUIZ_PREVIEW === true;

// Common English function words / short glue words to exclude from quizzes so
// only meaningful vocabulary is tested (no "was", "for", "it", "his"…).
const STOPWORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'but', 'if', 'of', 'to', 'in', 'on', 'at', 'by',
  'for', 'from', 'with', 'as', 'is', 'are', 'was', 'were', 'be', 'been', 'am',
  'it', 'its', 'he', 'she', 'they', 'them', 'his', 'her', 'him', 'we', 'you',
  'i', 'me', 'my', 'your', 'our', 'their', 'this', 'that', 'these', 'those',
  'had', 'has', 'have', 'do', 'does', 'did', 'will', 'would', 'can', 'could',
  'not', 'no', 'so', 'up', 'out', 'off', 'too', 'then', 'than', 'there', 'here',
  'who', 'what', 'when', 'where', 'why', 'how', 'all', 'any', 'some', 'now',
]);

// Keep only substantial words (length >= 3 and not a stopword). Falls back to the
// full glossary if filtering leaves fewer than 4 distinct words.
function meaningfulGlossary(glossary) {
  const filtered = {};
  const seenMeaning = new Set();
  for (const [en, ar] of Object.entries(glossary || {})) {
    const w = String(en).toLowerCase();
    if (w.length < 3 || STOPWORDS.has(w)) continue;
    if (seenMeaning.has(ar)) continue; // drop words that share the same Arabic meaning
    seenMeaning.add(ar);
    filtered[en] = ar;
  }
  return Object.keys(filtered).length >= 4 ? filtered : glossary;
}

const fab = document.getElementById('quiz-fab');
const overlay = document.getElementById('quiz-overlay');
const card = document.getElementById('quiz-card');

let questions = [];
let answers = [];
let current = 0;
let timer = null;
let activeVersion = 0; // the quiz round currently published by the admin
let mandatory = false;  // true when the student must finish before browsing
let completed = false;  // set once the student has answered all questions

async function loadActiveConfig() {
  const urlParams = new URLSearchParams(window.location.search);
  const isPreview = urlParams.get('preview') === '1';
  const previewVersion = urlParams.get('v');

  let cfg = null;

  if (isPreview && previewVersion) {
    const cfgSnap = await window.fs.collection('quizzes').doc(String(previewVersion)).get();
    if (!cfgSnap.exists) throw new Error('no-config');
    cfg = cfgSnap.data();
  } else {
    const snap = await window.fs.collection('quizzes').where('isActive', '==', true).limit(1).get();
    if (snap.empty) {
      if (isPreview) {
        // Fallback for previewing without specific version
        const allSnap = await window.fs.collection('quizzes').orderBy('version', 'desc').limit(1).get();
        if (allSnap.empty) throw new Error('no-config');
        cfg = allSnap.docs[0].data();
      } else {
        throw new Error('not-active');
      }
    } else {
      cfg = snap.docs[0].data();
    }
  }

  const glossary = cfg.glossary;
  const storyTitle = cfg.storyTitle;
  
  // Glossary MUST come from Firestore (set when admin publishes the quiz).
  // No fallback to stories.json — this prevents the wrong-words bug.
  if (!glossary || Object.keys(glossary).length < 4) throw new Error('no-glossary');
  if (!storyTitle) throw new Error('no-title');
  
  return {
    glossary: glossary,
    fixedQuestions: cfg.fixedQuestions || null,
    version: Number.isFinite(cfg.version) ? cfg.version : 0,
    storyTitle: storyTitle,
    storyId: cfg.activeStoryId || '',
    partIndex: cfg.activePartIndex,
    maxAttempts: Number.isFinite(cfg.maxAttempts) ? cfg.maxAttempts : 1,
  };
}

let activeGlossary = null;
let activeFixedQuestions = null; // pre-defined questions with compound phrases
let activeMaxAttempts = 1; // how many times a student can take the same quiz round
let activeStoryId = '';
let activePartIndex = 0;

// ── Sounds ──
const music = new Audio('assets/newmusic-quiz.mp3');
music.loop = true;
music.volume = 0.35;
function startMusic() { try { music.currentTime = 0; const p = music.play(); if (p && p.catch) p.catch(() => {}); } catch (e) { /* ignore */ } }
function stopMusic() { try { music.pause(); } catch (e) { /* ignore */ } }

let audioCtx = null;
function getCtx() {
  if (!audioCtx) { try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { /* ignore */ } }
  return audioCtx;
}
function tone(freqs, dur, type, gain) {
  const ac = getCtx(); if (!ac) return;
  const t0 = ac.currentTime;
  freqs.forEach((f, i) => {
    const o = ac.createOscillator(); const g = ac.createGain();
    o.type = type; o.frequency.value = f;
    const start = t0 + i * 0.09; const end = start + dur;
    o.connect(g); g.connect(ac.destination);
    g.gain.setValueAtTime(0.0001, start);
    g.gain.linearRampToValueAtTime(gain, start + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, end);
    o.start(start); o.stop(end + 0.03);
  });
}
function playCorrect() { tone([660, 880, 1175], 0.16, 'sine', 0.09); }   // cheerful rising chime
function playWrong() { tone([300, 235], 0.20, 'triangle', 0.05); }        // soft, gentle (not harsh)

// ── Encouragement messages (English + Arabic). Shown each morning before the quiz. ──
const ENCOURAGE = [
  { en: 'Good morning, superstar! Reading makes you shine.', ar: 'صباح الخير يا نجم! القراءة بتخليك تلمع.' },
  { en: 'Every page you read makes you smarter!', ar: 'كل صفحة بتقرأها بتخليك أذكى!' },
  { en: 'You are a Reading Hero today!', ar: 'إنت بطل قراءة اليوم!' },
  { en: 'Little readers grow into big dreamers.', ar: 'القرّاء الصغار بيكبروا أحلامًا كبيرة.' },
  { en: 'Believe in yourself. You can do it!', ar: 'آمن بنفسك. إنت قادر!' },
  { en: 'Your brain loves new words. Feed it!', ar: 'عقلك بيحب الكلمات الجديدة. غذّيه!' },
  { en: 'Mistakes help us learn. Keep going!', ar: 'الأخطاء بتعلّمنا. استمر!' },
  { en: 'Reading is a magical adventure.', ar: 'القراءة مغامرة سحرية.' },
  { en: 'You get a little braver every day.', ar: 'بتصير أشجع شوي كل يوم.' },
  { en: 'Smart, kind, and ready to learn — that is you!', ar: 'ذكي، طيّب، ومستعد تتعلّم — هذا إنت!' },
  { en: 'A book a day keeps boredom away!', ar: 'كتاب كل يوم بيبعد الملل!' },
  { en: 'Your words are your superpowers.', ar: 'كلماتك هي قوّتك الخارقة.' },
  { en: 'Focus, breathe, and do your best.', ar: 'ركّز، خذ نفس، واعمل أفضل ما عندك.' },
  { en: 'Learning English is fun with you!', ar: 'تعلّم الإنجليزي ممتع معك!' },
  { en: 'Shine bright like the star you are.', ar: 'تألّق مثل النجمة اللي إنت ياها.' },
  { en: 'Today is a great day to be curious.', ar: 'اليوم يوم رائع لتكون فضوليًا.' },
  { en: 'Champions never give up.', ar: 'الأبطال ما بيستسلموا أبدًا.' },
  { en: 'You are stronger than you think.', ar: 'إنت أقوى مما تظن.' },
  { en: 'Read like light — fast and bright!', ar: 'اقرأ مثل الضوء — سريع ومشرق!' },
  { en: 'New words, new worlds. Let us explore!', ar: 'كلمات جديدة، عوالم جديدة. يلا نستكشف!' },
  { en: 'Your smile makes learning brighter.', ar: 'ابتسامتك بتنوّر التعلّم.' },
  { en: 'Slow and steady wins the race.', ar: 'الهدوء والثبات بيربحوا السباق.' },
  { en: 'Great readers become great leaders.', ar: 'القرّاء العظماء بيصيروا قادة عظماء.' },
  { en: 'You are full of amazing ideas.', ar: 'إنت مليان أفكار رائعة.' },
  { en: 'Try your best — that is all that matters.', ar: 'اعمل أفضل ما عندك — هذا كل المهم.' },
  { en: 'Every hero started as a beginner.', ar: 'كل بطل بدأ مبتدئ.' },
  { en: 'Your effort today builds your future.', ar: 'مجهودك اليوم بيبني مستقبلك.' },
  { en: 'Be proud of how much you have learned.', ar: 'افتخر بقد ما تعلّمت.' },
  { en: 'Keep your eyes on the words and win!', ar: 'ركّز عينك على الكلمات واربح!' },
  { en: 'You are a bright little genius.', ar: 'إنت عبقري صغير لامع.' },
  { en: 'Learning is a gift you give yourself.', ar: 'التعلّم هدية بتعطيها لنفسك.' },
  { en: 'One step at a time, you are amazing.', ar: 'خطوة خطوة، إنت رائع.' },
  { en: 'Dream big and read on!', ar: 'احلم كبير وكمّل قراءة!' },
  { en: 'Your teacher is proud of you.', ar: 'معلّمك فخور فيك.' },
  { en: 'Words are seeds — plant many today.', ar: 'الكلمات بذور — ازرع كثير اليوم.' },
  { en: 'You make reading look easy!', ar: 'إنت بتخلي القراءة تبان سهلة!' },
];

function unlockPage() {
  mandatory = false;
  document.body.classList.remove('quiz-locked');
}

function closeQuiz() {
  if (mandatory && !completed) return; // can't leave a mandatory quiz until it's done
  clearTimeout(timer);
  stopMusic();
  overlay.classList.add('hidden');
  document.body.classList.remove('quiz-locked');
  card.innerHTML = '';
}

function renderMessage(msg) {
  // If a mandatory quiz can't run (no active quiz / not enough words), don't trap the student.
  unlockPage();
  stopMusic();
  card.innerHTML =
    '<div class="quiz-result"><p class="quiz-message">' + msg + '</p>' +
    '<button class="btn3d" id="quiz-close" type="button">Close</button></div>';
  document.getElementById('quiz-close').addEventListener('click', closeQuiz);
}

function renderQuestion() {
  const q = questions[current];
  card.classList.remove('quiz-pulse');
  card.innerHTML =
    '<div class="quiz-meta"><span>Question ' + (current + 1) + ' of ' + QUESTION_COUNT + '</span>' +
    '<span>⚡ Quick Quiz</span></div>' +
    '<div class="quiz-ask" style="font-weight: 900; font-size: 1.5em; color: #ffffff; text-shadow: 1px 1px 3px rgba(0,0,0,0.5);">What is the meaning of the word</div>' +
    '<div class="quiz-prompt" dir="rtl">"' + q.prompt + '"</div>' +
    '<div class="quiz-options" id="quiz-options"></div>';

  const optionsEl = document.getElementById('quiz-options');
  q.options.forEach((opt, idx) => {
    const b = document.createElement('button');
    b.className = 'quiz-option';
    b.type = 'button';
    b.textContent = opt;
    b.addEventListener('click', () => selectAnswer(idx));
    optionsEl.appendChild(b);
  });

  clearTimeout(timer);
  
  // Wait 2 seconds before showing options and starting the 5s timer
  timer = setTimeout(() => {
    optionsEl.classList.add('show');

    // Kick off the background pulse (calm → red) on the card.
    // eslint-disable-next-line no-unused-expressions
    card.offsetWidth;
    card.classList.add('quiz-pulse');

    timer = setTimeout(() => selectAnswer(null), QUESTION_MS); // auto-fail on timeout
  }, 4000);
}

function selectAnswer(idx) {
  clearTimeout(timer);
  answers[current] = idx;
  if (idx !== null && idx === questions[current].correctIndex) playCorrect();
  else playWrong();
  current++;
  if (current < QUESTION_COUNT) {
    renderQuestion();
  } else {
    finishQuiz();
  }
}

function launchConfetti() {
  const emojis = ['⭐', '🌟', '✨', '🎉', '🎊', '🥳', '💫'];
  const box = document.createElement('div');
  box.className = 'confetti-container';
  for (let i = 0; i < 40; i++) {
    const piece = document.createElement('span');
    piece.className = 'confetti-piece';
    piece.textContent = emojis[Math.floor(Math.random() * emojis.length)];
    piece.style.left = Math.random() * 100 + '%';
    piece.style.animationDelay = Math.random() * 1.5 + 's';
    piece.style.animationDuration = 2 + Math.random() * 2.5 + 's';
    box.appendChild(piece);
  }
  card.appendChild(box);
}

// Persist: add to the cumulative total, record the last score, and stamp the
// quiz round so this student cannot retake the same round. A transaction guard
// also blocks double-submits within the same round.
async function saveScore(session, achieved, version, maxAttempts) {
  const ref = window.fs.collection('students').doc(session.username);
  const resultRef = window.fs.collection('quiz_results').doc(version + '_' + session.username);
  
  await window.fs.runTransaction(async (t) => {
    const snap = await t.get(ref);
    const d = snap.exists ? (snap.data() || {}) : {};
    
    const resultSnap = await t.get(resultRef);
    const hasResult = resultSnap.exists;
    const rData = hasResult ? resultSnap.data() : {};

    // sameRound means they have taken THIS specific historical quiz version before
    const sameRound = hasResult || (version !== 0 && d.lastQuizVersion === version);
    const attemptCount = sameRound ? (hasResult ? (rData.attempts || 1) : (d.quizAttemptCount || 1)) : 0;
    const maxAllowed = maxAttempts || 1;
    const allowRepeat = attemptCount < maxAllowed || !!d.retakeAllowed;
    
    // Block if max attempts reached (unless per-student retake was granted).
    if (sameRound && !allowRepeat) throw new Error('already');

    const prevCumulative = Number.isFinite(d.cumulativeScore)
      ? d.cumulativeScore
      : (Number.isFinite(d.score) ? d.score : 0); // migrate old { score } docs
      
    // What was their last score for THIS specific quiz?
    const prevLast = sameRound ? (hasResult ? (rData.bestScore || 0) : (Number.isFinite(d.lastScore) ? d.lastScore : 0)) : 0;

    let cumulative, lastScore;
    if (sameRound) {
      // Repeating the same round → only the improvement counts; keep the highest.
      cumulative = prevCumulative + Math.max(0, achieved - prevLast);
      lastScore = Math.max(prevLast, achieved);
    } else {
      // First attempt of this round → add the full score.
      cumulative = prevCumulative + achieved;
      lastScore = achieved;
    }
    
    // Update tie-breakers for the leaderboard
    const newCumulativeAttempts = (d.cumulativeAttempts || 0) + 1;
    const newScoreUpdatedAt = (cumulative > prevCumulative) ? Date.now() : (d.scoreUpdatedAt || Date.now());
    
    // update() preserves photo / timeToday / timeDate; clears the per-student retake flag.
    t.update(ref, {
      cumulativeScore: cumulative,
      lastScore: lastScore,
      lastQuizVersion: version,
      quizAttemptCount: sameRound ? attemptCount + 1 : 1,
      retakeAllowed: false,
      cumulativeAttempts: newCumulativeAttempts,
      scoreUpdatedAt: newScoreUpdatedAt,
    });
    
    // Also save/update the quiz_results document inside the transaction
    t.set(resultRef, {
      studentId: session.username,
      studentName: session.displayName || session.username,
      quizVersion: version,
      storyId: activeStoryId,
      partIndex: activePartIndex,
      bestScore: lastScore,
      attempts: sameRound ? attemptCount + 1 : 1,
      lastAttemptAt: Date.now(),
    }, { merge: true });
  });
}

async function finishQuiz() {
  completed = true; // answering is done → the student may now leave / browse
  stopMusic(); // music ends when the score appears
  const score = scoreQuiz(questions, answers);
  card.innerHTML =
    '<div class="quiz-result"><h2>Great job!</h2>' +
    '<div class="final-score">' + score + ' / ' + QUESTION_COUNT + '</div>' +
    '<p class="quiz-message" id="quiz-save-msg"></p>' +
    '<button class="btn3d" id="quiz-close" type="button">Back to Home</button></div>';
  document.getElementById('quiz-close').addEventListener('click', closeQuiz);
  launchConfetti();

  const saveMsg = document.getElementById('quiz-save-msg');
  if (PREVIEW) {
    saveMsg.textContent = 'Preview mode — this attempt was not saved.';
    return;
  }

  const session = getSession();
  if (!session) {
    saveMsg.textContent = 'Your score was not saved because you are not signed in.';
    return;
  }
  try {
    await saveScore(session, score, activeVersion, activeMaxAttempts);
  } catch (err) {
    if (err && err.message === 'already') {
      saveMsg.textContent = 'You already completed this quiz.';
      return;
    }
    console.error('Score save failed:', err);
    saveMsg.textContent = 'Your score could not be saved. Please try again.';
  }
}

async function startQuiz() {
  overlay.classList.remove('hidden');
  card.innerHTML = '<div class="quiz-result"><p class="quiz-message info">Loading your quiz…</p></div>';

  const session = getSession();
  if (!session && !PREVIEW) {
    renderMessage('Please sign in first.');
    return;
  }

  let cfg;
  try {
    cfg = await loadActiveConfig();
    activeGlossary = meaningfulGlossary(cfg.glossary);
    activeFixedQuestions = cfg.fixedQuestions || null;
    activeVersion = cfg.version;
    activeMaxAttempts = cfg.maxAttempts;
    activeStoryId = cfg.storyId || '';
    activePartIndex = cfg.partIndex || 0;
  } catch (e) {
    renderMessage('The quiz is not ready yet. Please ask your teacher to set it up.');
    return;
  }

  // Check attempt count against maxAttempts — unless per-student retake was
  // allowed (skipped in admin preview).
  if (!PREVIEW && session) {
    try {
      const meSnap = await window.fs.collection('students').doc(session.username).get();
      const me = meSnap.exists ? (meSnap.data() || {}) : {};
      if (activeVersion !== 0 && me.lastQuizVersion === activeVersion && !me.retakeAllowed) {
        const attemptCount = me.quizAttemptCount || 1;
        if (attemptCount >= activeMaxAttempts) {
          renderMessage('You already took this quiz. Please wait for your teacher to start a new one.');
          return;
        }
      }
    } catch (e) {
      // If the check fails, fall through and let the write-time guard protect us.
    }
  }

  renderIntro(cfg);
}

// Intro screen: shows which story/part the quiz covers + a Start button.
function renderIntro(cfg) {
  card.innerHTML =
    '<div class="quiz-intro">' +
      '<div class="quiz-intro-badge">⚡ Quick Quiz</div>' +
      '<h2 class="quiz-intro-title">' + cfg.storyTitle + '</h2>' +
      '<p class="quiz-intro-part">Part ' + (cfg.partIndex + 1) + '</p>' +
      '<p class="quiz-intro-note">' + QUESTION_COUNT + ' questions · ' + (QUESTION_MS / 1000) + ' seconds each</p>' +
      '<button class="btn3d" id="quiz-start" type="button">Start ▶</button>' +
    '</div>';
  document.getElementById('quiz-start').addEventListener('click', runQuiz);
}

function runQuiz() {
  if (!activeGlossary && !activeFixedQuestions) return;
  try {
    if (activeFixedQuestions && activeFixedQuestions.length >= QUESTION_COUNT) {
      questions = buildFixedQuiz(activeFixedQuestions);
    } else {
      questions = buildQuiz(activeGlossary);
    }
  } catch (e) {
    if (e instanceof InsufficientVocabulary) {
      renderMessage('This lesson does not have enough words for a quiz yet.');
      return;
    }
    renderMessage('Something went wrong building the quiz. Please try again.');
    return;
  }
  answers = new Array(QUESTION_COUNT).fill(null);
  current = 0;
  startMusic(); // game-show music plays until the score appears
  renderQuestion();
}

// Morning welcome screen: a random encouraging message (English + Arabic) with the
// student's photo, then a Start button that begins the quiz.
function renderEncouragement(cfg, photo) {
  const msg = ENCOURAGE[Math.floor(Math.random() * ENCOURAGE.length)];
  const avatar = photo
    ? '<div class="enc-photo" style="background-image:url(&quot;' + photo + '&quot;)"></div>'
    : '<div class="enc-photo enc-photo-empty">🌟</div>';
  card.innerHTML =
    '<div class="enc">' +
      avatar +
      '<p class="enc-en">' + msg.en + '</p>' +
      '<p class="enc-ar" dir="rtl">' + msg.ar + '</p>' +
      '<div class="enc-quiz">Today: ' + cfg.storyTitle + ' — Part ' + (cfg.partIndex + 1) + '</div>' +
      '<button class="btn3d" id="enc-start" type="button">Start ▶</button>' +
    '</div>';
  document.getElementById('enc-start').addEventListener('click', runQuiz);
}

if (fab && overlay && card) {
  fab.addEventListener('click', startQuiz);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeQuiz();
  });
}

// Mandatory-quiz gate: on the student home page, if there is an active quiz round
// the student has not completed, force them to take it before doing anything else.
async function checkMandatoryQuiz() {
  const session = getSession();
  if (!session) return;
  let cfg;
  try {
    cfg = await loadActiveConfig();
    activeGlossary = meaningfulGlossary(cfg.glossary);
    activeFixedQuestions = cfg.fixedQuestions || null;
    activeVersion = cfg.version;
    activeMaxAttempts = cfg.maxAttempts;
    activeStoryId = cfg.storyId || '';
    activePartIndex = cfg.partIndex || 0;
  } catch (e) {
    return; // no active/valid quiz → free to browse
  }
  if (!cfg.version) return; // nothing published yet
  let me = {};
  try {
    const meSnap = await window.fs.collection('students').doc(session.username).get();
    me = meSnap.exists ? (meSnap.data() || {}) : {};
    
    // Check quiz_results to see if they took this specific historical version
    const resultSnap = await window.fs.collection('quiz_results').doc(cfg.version + '_' + session.username).get();
    const hasResult = resultSnap.exists;
    const resultData = hasResult ? resultSnap.data() : {};
    
    const sameRound = hasResult || (me.lastQuizVersion === cfg.version);
    const attemptCount = sameRound ? (hasResult ? (resultData.attempts || 1) : (me.quizAttemptCount || 1)) : 0;
    const maxAllowed = cfg.maxAttempts || 1;
    const allowRepeat = attemptCount < maxAllowed || !!me.retakeAllowed;
    
    if (allowRepeat && fab) {
      fab.style.display = 'flex';
    }

    if (sameRound) return; // already done this round AT LEAST ONCE → free to browse
  } catch (e) {
    if (fab) fab.style.display = 'flex';
    return; // be lenient if the check fails
  }
  mandatory = true;
  completed = false;
  document.body.classList.add('quiz-locked');
  overlay.classList.remove('hidden');
  // Morning: show an encouraging message with the student's photo, then the quiz.
  renderEncouragement(cfg, typeof me.photo === 'string' ? me.photo : '');
}

if (!PREVIEW && overlay && card) {
  checkMandatoryQuiz();
} else if (PREVIEW) {
  if (fab) fab.style.display = 'flex';
  // Admin preview auto-starts to save a click
  setTimeout(startQuiz, 300);
}
