import { getSession } from './auth-core.js';

// Configuration
const QUESTIONS = [
  {
    type: 'sentence',
    sentence1: "Ali and Tom are friends.",
    sentence2: "They [ _____ ] playing.",
    options: ["are", "is", "am"],
    correct: "are"
  },
  {
    type: 'sentence',
    sentence1: "Sara is at school.",
    sentence2: "She [ _____ ] reading.",
    options: ["is", "are", "am"],
    correct: "is"
  },
  {
    type: 'sentence',
    sentence1: "The dog is small.",
    sentence2: "[ _____ ] is very fast.",
    options: ["It", "He", "They"],
    correct: "It"
  },
  {
    type: 'sentence',
    sentence1: "My brother and I are hungry.",
    sentence2: "[ _____ ] want an apple.",
    options: ["We", "They", "He"],
    correct: "We"
  },
  {
    type: 'sentence',
    sentence1: "The boys are running.",
    sentence2: "[ _____ ] are happy.",
    options: ["They", "We", "It"],
    correct: "They"
  },
  {
    type: 'sentence',
    sentence1: "Tom says to Ali:",
    sentence2: "\"Can [ _____ ] help me?\"",
    options: ["you", "I", "he"],
    correct: "you"
  },
  {
    type: 'image',
    image: '🐶', 
    options: ["It", "She", "He"],
    correct: "It"
  },
  {
    type: 'image',
    image: '👦', 
    options: ["He", "They", "We"],
    correct: "He"
  },
  {
    type: 'image',
    image: '👧', 
    options: ["It", "She", "You"],
    correct: "She"
  },
  {
    type: 'image',
    image: '🧑‍🤝‍🧑', 
    options: ["They", "He", "I"],
    correct: "They"
  }
];

let selectedQuestions = [];
let currentQ = 0;
let score = 0;
const overlay = document.getElementById('quiz-overlay');
const card = document.getElementById('quiz-card');
const SCORE_POINTS_PER_QUESTION = 1;

// Audio helpers
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
function playCorrect() { tone([660, 880, 1175], 0.16, 'sine', 0.09); }
function playWrong() { tone([300, 235], 0.20, 'triangle', 0.05); }

// Shuffle array
function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

export async function startGrammarQuiz() {
  overlay.classList.remove('hidden');
  
  // Pick 5 random questions
  selectedQuestions = [...QUESTIONS];
  shuffle(selectedQuestions);
  selectedQuestions = selectedQuestions.slice(0, 5);
  currentQ = 0;
  score = 0;
  
  renderIntro();
}

function renderIntro() {
  card.innerHTML =
    '<div class="quiz-intro" style="background: linear-gradient(135deg, #a1c4fd 0%, #c2e9fb 100%);">' +
      '<div class="quiz-intro-badge" style="background: #ff6b6b; color: white;">🌟 Grammar Challenge 🌟</div>' +
      '<h2 class="quiz-intro-title" style="color: #2b3a42; font-size: 2rem; margin-bottom: 20px;">Pronouns Quiz</h2>' +
      '<p class="quiz-intro-note" style="color: #4a5568; font-weight: bold;">5 questions · Can you get them all right?</p>' +
      '<button class="btn3d" id="grammar-start" type="button" style="background: #4ecdc4; box-shadow: 0 6px 0 #3b9b94;">Start ▶</button>' +
    '</div>';
  document.getElementById('grammar-start').addEventListener('click', showQuestion);
}

function showQuestion() {
  if (currentQ >= selectedQuestions.length) {
    finishGrammarQuiz();
    return;
  }
  
  const q = selectedQuestions[currentQ];
  
  let contentHtml = '';
  if (q.type === 'sentence') {
    contentHtml = `
      <div class="grammar-q-sentence">
        <div style="font-size: 1.4rem; font-weight: bold; color: #4a5568; margin-bottom: 15px;">${q.sentence1}</div>
        <div style="font-size: 1.8rem; font-weight: bold; color: #2b3a42; background: white; padding: 15px; border-radius: 12px; border: 2px dashed #a0aec0;">${q.sentence2}</div>
      </div>
    `;
  } else {
    contentHtml = `
      <div class="grammar-q-image">
        <div style="font-size: 5rem; margin: 20px 0; animation: bounce 2s infinite;">${q.image}</div>
        <div style="font-size: 1.5rem; font-weight: bold; color: #4a5568;">Which pronoun?</div>
      </div>
    `;
  }

  let optionsHtml = '<div class="grammar-options" style="display: flex; gap: 15px; justify-content: center; margin-top: 30px; flex-wrap: wrap;">';
  const colors = [
    { bg: '#3498db', shadow: '#2980b9' }, // Blue
    { bg: '#e74c3c', shadow: '#c0392b' }, // Red
    { bg: '#2ecc71', shadow: '#27ae60' }  // Green
  ];
  
  const shuffledOptions = [...q.options];
  shuffle(shuffledOptions);
  
  shuffledOptions.forEach((opt, idx) => {
    const c = colors[idx % colors.length];
    optionsHtml += `
      <button class="grammar-opt-btn" data-val="${opt}" 
              style="
                background: ${c.bg}; 
                box-shadow: 0 6px 0 ${c.shadow}; 
                color: white; 
                font-size: 1.6rem; 
                font-weight: bold; 
                border: none; 
                border-radius: 16px; 
                padding: 15px 30px; 
                cursor: pointer;
                transition: transform 0.1s, box-shadow 0.1s;
              ">
        ${opt}
      </button>
    `;
  });
  optionsHtml += '</div>';

  card.innerHTML = `
    <div class="grammar-quiz-container" style="background: #f7fafc; padding: 20px; border-radius: 20px; text-align: center; max-width: 500px; margin: 0 auto;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
        <span style="background: #edf2f7; color: #718096; padding: 5px 12px; border-radius: 20px; font-weight: bold;">Question ${currentQ + 1}/5</span>
        <span style="color: #f6ad55; font-weight: bold;">⭐ ${score * SCORE_POINTS_PER_QUESTION} pts</span>
      </div>
      ${contentHtml}
      ${optionsHtml}
    </div>
  `;

  // Attach events
  document.querySelectorAll('.grammar-opt-btn').forEach(btn => {
    btn.addEventListener('click', (e) => handleAnswer(e.target, q.correct));
    // Add pressed effect
    btn.addEventListener('mousedown', () => {
      btn.style.transform = 'translateY(6px)';
      btn.style.boxShadow = 'none';
    });
    btn.addEventListener('mouseup', () => {
      btn.style.transform = 'none';
      const c = colors[Array.from(btn.parentNode.children).indexOf(btn) % colors.length];
      btn.style.boxShadow = `0 6px 0 ${c.shadow}`;
    });
  });
}

function handleAnswer(btnEl, correctAns) {
  const chosen = btnEl.getAttribute('data-val');
  if (chosen === correctAns) {
    score++;
    playCorrect();
    btnEl.style.background = '#2ecc71';
    btnEl.style.boxShadow = '0 6px 0 #27ae60';
    btnEl.innerHTML += ' ✅';
  } else {
    playWrong();
    btnEl.style.background = '#e74c3c';
    btnEl.style.boxShadow = '0 6px 0 #c0392b';
    btnEl.innerHTML += ' ❌';
    // Highlight the correct one
    document.querySelectorAll('.grammar-opt-btn').forEach(b => {
      if (b.getAttribute('data-val') === correctAns) {
        b.style.background = '#2ecc71';
        b.style.boxShadow = '0 6px 0 #27ae60';
        b.style.border = '3px solid white';
      }
    });
  }
  
  // Disable all buttons
  document.querySelectorAll('.grammar-opt-btn').forEach(b => b.style.pointerEvents = 'none');
  
  setTimeout(() => {
    currentQ++;
    showQuestion();
  }, 1500);
}

function createConfetti() {
  const container = document.getElementById('quiz-overlay');
  const emojis = ['⭐', '🌟', '✨', '🎉', '🎊', '👏'];
  for (let i = 0; i < 40; i++) {
    const piece = document.createElement('span');
    piece.className = 'confetti-piece';
    piece.textContent = emojis[Math.floor(Math.random() * emojis.length)];
    piece.style.left = Math.random() * 100 + '%';
    piece.style.animationDelay = Math.random() * 2 + 's';
    piece.style.animationDuration = (2 + Math.random() * 3) + 's';
    piece.style.fontSize = (0.8 + Math.random() * 1.2) + 'rem';
    piece.style.position = 'absolute';
    piece.style.pointerEvents = 'none';
    container.appendChild(piece);
  }
}

async function finishGrammarQuiz() {
  const totalPoints = score * SCORE_POINTS_PER_QUESTION;
  
  card.innerHTML = `
    <div class="grammar-result" style="text-align: center; padding: 30px;">
      <div style="font-size: 4rem; margin-bottom: 20px;">🏆</div>
      <h2 style="color: #2b3a42; font-size: 2.2rem; margin-bottom: 10px;">Great Job!</h2>
      <div style="font-size: 1.5rem; color: #4a5568; margin-bottom: 20px;">You answered <strong style="color: #4ecdc4;">${score}</strong> out of 5 correctly.</div>
      <div style="background: #fffaf0; border: 2px dashed #f6ad55; border-radius: 15px; padding: 15px; font-size: 1.8rem; font-weight: bold; color: #dd6b20; margin-bottom: 25px;">
        +${totalPoints} Points!
      </div>
      <p id="grammar-save-msg" style="font-size: 1rem; color: #a0aec0; margin-bottom: 20px;"></p>
      <button class="btn3d" id="grammar-close" type="button" style="background: #3498db; box-shadow: 0 6px 0 #2980b9; width: 100%;">Awesome!</button>
    </div>
  `;
  
  createConfetti();
  
  document.getElementById('grammar-close').addEventListener('click', () => {
    overlay.classList.add('hidden');
    // clear confetti
    document.querySelectorAll('.confetti-piece').forEach(e => e.remove());
  });

  const saveMsg = document.getElementById('grammar-save-msg');
  const session = getSession();
  if (!session) {
    saveMsg.textContent = 'Sign in to save your score.';
    return;
  }
  
  // Save score to leaderboard
  try {
    saveMsg.textContent = 'Saving points...';
    // Fetch active quiz config to get version and max attempts
    const db = window.fs;
    const ref = db.collection('students').doc(session.username);
    
    // Read version from the active quiz (same source as quiz.js)
    let version = 0;
    let maxAttempts = 1;
    try {
      const quizSnap = await db.collection('quizzes').where('isActive', '==', true).limit(1).get();
      if (!quizSnap.empty) {
        const quizCfg = quizSnap.docs[0].data();
        version = Number.isFinite(quizCfg.version) ? quizCfg.version : 0;
        maxAttempts = Number.isFinite(quizCfg.maxAttempts) ? quizCfg.maxAttempts : 1;
      }
    } catch (e) {
      console.warn('Could not load active quiz config for grammar:', e);
    }
    
    let addedPoints = 0;
    
    await db.runTransaction(async (t) => {
      const doc = await t.get(ref);
      if (!doc.exists) throw new Error('Student not found');
      const data = doc.data();
      const currentScore = data.cumulativeScore || 0;
      
      const sameRound = (data.lastGrammarVersion === version);
      const attemptCount = sameRound ? (data.grammarAttemptCount || 1) : 0;
      
      if (sameRound && attemptCount >= maxAttempts && !data.retakeAllowed) {
        throw new Error('max_attempts');
      }
      
      const prevLast = sameRound ? (data.lastGrammarScore || 0) : 0;
      let newLastScore;
      
      if (sameRound) {
        addedPoints = Math.max(0, totalPoints - prevLast);
        newLastScore = Math.max(prevLast, totalPoints);
      } else {
        addedPoints = totalPoints;
        newLastScore = totalPoints;
      }
      
      t.update(ref, { 
        cumulativeScore: currentScore + addedPoints,
        lastGrammarVersion: version,
        grammarAttemptCount: sameRound ? attemptCount + 1 : 1,
        lastGrammarScore: newLastScore,
        lastGrammarQuizTime: window.firebase.firestore.FieldValue.serverTimestamp()
      });
    });
    if (addedPoints > 0) {
      saveMsg.textContent = 'Points added to Leaderboard! 🌟';
    } else {
      saveMsg.textContent = 'Score saved! (No new points)';
    }
  } catch (err) {
    console.error('Failed to save grammar score:', err);
    saveMsg.textContent = 'Could not save points.';
  }
}
