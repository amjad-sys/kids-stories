/**
 * admin.js — Master Admin Dashboard.
 * Student CRUD + Quiz Manager (Firestore) and part-visibility toggles (RTDB).
 * Uses pure decisions from data-core.js.
 *
 * SECURITY (Req 9.4): the admin password below is a CLIENT-SIDE gate only. It
 * ships in this source file and provides deterrence, not real protection. The
 * documented mitigation path (design.md Security Model) is Firebase Auth custom
 * claims + Cloud Functions so the privileged path is server-enforced.
 */
import { decideCreate, makeQuizConfig, normalizeUsername } from './data-core.js';

const ADMIN_PASSWORD = 'admin123'; // ponytail: client-side deterrent only — see header note (Req 9.4)

const gate = document.getElementById('admin-gate');
const panel = document.getElementById('admin-panel');
const gateNote = document.getElementById('gate-note');

function revealPanel() {
  gate.classList.add('hidden');
  panel.classList.remove('hidden');
  initPanel();
}

// ── Password gate (direct visits to admin.html) ──
document.getElementById('admin-unlock').addEventListener('click', unlock);
document.getElementById('admin-pass').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') unlock();
});

function unlock() {
  const val = document.getElementById('admin-pass').value;
  if (val !== ADMIN_PASSWORD) {
    gateNote.textContent = 'Incorrect password.';
    return;
  }
  sessionStorage.setItem('adminAuthed', '1');
  revealPanel();
}

// ── Panel ──
let currentStudentIds = new Set();
let allStudentsData = {}; // { id: { displayName, ... } }

function initPanel() {
  watchStudents();
  document.getElementById('create-student').addEventListener('click', createStudent);
  const logout = document.getElementById('admin-logout');
  if (logout) {
    logout.addEventListener('click', () => {
      sessionStorage.removeItem('adminAuthed');
      window.location.href = 'index.html';
    });
  }
  buildQuizManager();
  buildVisibilityControls();
}

// ── Helpers ──
function todayStr() {
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}
function formatDuration(secs) {
  secs = Math.max(0, Math.floor(secs));
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  if (h) return h + 'h ' + m + 'm';
  if (m) return m + 'm ' + s + 's';
  return s + 's';
}
function timeAgo(ts) {
  if (!ts) return '';
  const diff = Math.floor((Date.now() - ts) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return Math.floor(diff / 60) + 'm ago';
  if (diff < 86400) return Math.floor(diff / 3600) + 'h ago';
  return Math.floor(diff / 86400) + 'd ago';
}

// Allow a single student to retake the current quiz (best score is kept).
async function allowRetake(id, name, btn) {
  btn.disabled = true;
  btn.textContent = 'Enabling…';
  try {
    await window.fs.collection('students').doc(id).update({ retakeAllowed: true });
    const note = document.getElementById('create-note');
    note.className = 'admin-note ok';
    note.textContent = name + ' can now retake the quiz (highest score is kept).';
  } catch (e) {
    console.error('Allow retake failed:', e);
    btn.disabled = false;
    btn.textContent = 'Allow Retake';
  }
}

// ── Student management (Firestore) ──
function watchStudents() {
  const listEl = document.getElementById('student-list');
  window.fs.collection('students').onSnapshot((snap) => {
    currentStudentIds = new Set();
    allStudentsData = {};
    listEl.innerHTML = '';
    if (snap.empty) {
      listEl.innerHTML = '<div class="admin-note">No students yet.</div>';
      updateTotalStudentsCount(0);
      return;
    }
    snap.forEach((doc) => {
      currentStudentIds.add(doc.id);
      const d = doc.data() || {};
      allStudentsData[doc.id] = d;
      const cumulative = Number.isFinite(d.cumulativeScore)
        ? d.cumulativeScore
        : (Number.isFinite(d.score) ? d.score : 0);
      const last = Number.isFinite(d.lastScore) ? d.lastScore : 0;
      const todaySecs = (d.timeDate === todayStr() && Number.isFinite(d.timeToday)) ? d.timeToday : 0;

      const row = document.createElement('div');
      row.className = 'admin-student';

      const name = document.createElement('span');
      name.className = 'admin-student-name';
      name.innerHTML = '<span class="nm-line">' + (d.displayName || doc.id) +
        ' <span class="muted">(@' + doc.id + ')</span></span>' +
        '<span class="admin-time">⏱ Today: ' + formatDuration(todaySecs) +
        (d.retakeAllowed ? ' · <span class="retake-on">retake on</span>' : '') + '</span>';

      // Editable grades
      const grades = document.createElement('div');
      grades.className = 'admin-grades';

      const totalWrap = document.createElement('label');
      totalWrap.className = 'admin-grade';
      totalWrap.append('Total');
      const totalInput = document.createElement('input');
      totalInput.type = 'number'; totalInput.min = '0'; totalInput.value = String(cumulative);
      totalWrap.appendChild(totalInput);

      const lastWrap = document.createElement('label');
      lastWrap.className = 'admin-grade';
      lastWrap.append('Last');
      const lastInput = document.createElement('input');
      lastInput.type = 'number'; lastInput.min = '0'; lastInput.value = String(last);
      lastWrap.appendChild(lastInput);

      const save = document.createElement('button');
      save.className = 'ghost-btn';
      save.type = 'button';
      save.textContent = 'Save';
      save.addEventListener('click', () => saveGrades(doc.id, d, totalInput, lastInput, save));

      grades.append(totalWrap, lastWrap, save);

      const retake = document.createElement('button');
      retake.className = 'ghost-btn';
      retake.type = 'button';
      retake.textContent = d.retakeAllowed ? 'Retake ✓' : 'Allow Retake';
      retake.disabled = !!d.retakeAllowed;
      retake.addEventListener('click', () => allowRetake(doc.id, d.displayName || doc.id, retake));

      const del = document.createElement('button');
      del.className = 'ghost-btn danger';
      del.type = 'button';
      del.textContent = 'Delete';
      del.addEventListener('click', () => deleteStudent(doc.id, d.displayName || doc.id));

      row.append(name, grades, retake, del);
      listEl.appendChild(row);
    });
    updateTotalStudentsCount(currentStudentIds.size);
  });
}

function updateTotalStudentsCount(count) {
  const el = document.getElementById('qm-stat-total');
  if (el) el.textContent = String(count);
}

async function createStudent() {
  const note = document.getElementById('create-note');
  const username = document.getElementById('new-username').value;
  const displayName = document.getElementById('new-name').value;
  const password = document.getElementById('new-password').value;

  const decision = decideCreate(currentStudentIds, { username, displayName, password });
  if (!decision.ok) {
    note.className = 'admin-note err';
    note.textContent = decision.message;
    return;
  }

  const id = decision.record.username;
  try {
    // Transaction guard: create-if-absent (Req 6.6 / 8.2) even under races.
    await window.fs.runTransaction(async (t) => {
      const ref = window.fs.collection('students').doc(id);
      const existing = await t.get(ref);
      if (existing.exists) throw new Error('duplicate');
      t.set(ref, {
        username: id,
        displayName: decision.record.displayName,
        cumulativeScore: 0,
        lastScore: 0,
        lastQuizVersion: 0,
      });
      t.set(window.fs.collection('students_auth').doc(id), { password: decision.record.password });
    });
    note.className = 'admin-note ok';
    note.textContent = 'Student "' + decision.record.displayName + '" added.';
    document.getElementById('new-username').value = '';
    document.getElementById('new-name').value = '';
    document.getElementById('new-password').value = '';
  } catch (err) {
    note.className = 'admin-note err';
    note.textContent = err.message === 'duplicate'
      ? 'That username already exists. Please choose another.'
      : 'Could not add the student. Please try again.';
  }
}

// Edit any grade (raise or lower). Overwrites the doc to keep a clean shape and
// preserves identity + the current quiz round.
async function saveGrades(id, d, totalInput, lastInput, btn) {
  const note = document.getElementById('create-note');
  const cumulative = Math.max(0, Math.floor(Number(totalInput.value) || 0));
  const last = Math.max(0, Math.floor(Number(lastInput.value) || 0));
  btn.disabled = true;
  const original = btn.textContent;
  btn.textContent = 'Saving…';
  try {
    // update() preserves photo / time / retake fields.
    await window.fs.collection('students').doc(id).update({ cumulativeScore: cumulative, lastScore: last });
    note.className = 'admin-note ok';
    note.textContent = 'Updated grades for "' + (d.displayName || id) + '".';
    btn.textContent = 'Saved ✓';
    setTimeout(() => { btn.textContent = original; btn.disabled = false; }, 1200);
  } catch (err) {
    console.error('Grade save failed:', err);
    note.className = 'admin-note err';
    note.textContent = 'Could not update grades. Please try again.';
    btn.textContent = original;
    btn.disabled = false;
  }
}

async function deleteStudent(id, name) {
  if (!confirm('Delete student "' + name + '"? This cannot be undone.')) return;
  const note = document.getElementById('create-note');
  try {
    const batch = window.fs.batch();
    batch.delete(window.fs.collection('students').doc(id));
    batch.delete(window.fs.collection('students_auth').doc(id));
    await batch.commit();
    note.className = 'admin-note ok';
    note.textContent = 'Student "' + name + '" removed.';
  } catch (err) {
    note.className = 'admin-note err';
    note.textContent = 'Could not delete the student. Please try again.';
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// QUIZ MANAGER
// ══════════════════════════════════════════════════════════════════════════════
let storiesCache = [];
let currentLiveGlossary = {};
let currentQuizVersion = 0;

function createWordRow(en, ar, parent) {
  const row = document.createElement('div');
  row.className = 'qm-word-row';
  const enInput = document.createElement('input');
  enInput.type = 'text';
  enInput.value = en || '';
  enInput.placeholder = 'English word';
  enInput.className = 'qm-input-en';
  const arInput = document.createElement('input');
  arInput.type = 'text';
  arInput.value = ar || '';
  arInput.placeholder = 'المعنى العربي';
  arInput.className = 'qm-input-ar';
  const delBtn = document.createElement('button');
  delBtn.className = 'qm-word-del';
  delBtn.type = 'button';
  delBtn.textContent = '✕';
  delBtn.addEventListener('click', () => row.remove());
  row.append(enInput, arInput, delBtn);
  parent.appendChild(row);
  return row;
}

function readGlossaryFromEditor(editorEl) {
  const glossary = {};
  editorEl.querySelectorAll('.qm-word-row').forEach(row => {
    const en = row.querySelector('.qm-input-en').value.trim();
    const ar = row.querySelector('.qm-input-ar').value.trim();
    if (en && ar) glossary[en] = ar;
  });
  return glossary;
}

function renderPreviewWords() {
  const storySel = document.getElementById('quiz-story');
  const partSel = document.getElementById('quiz-part');
  const preview = document.getElementById('qm-preview-words');
  if (!preview) return;

  const story = storiesCache.find(s => s.id === storySel.value);
  const partIndex = parseInt(partSel.value, 10);
  const part = story && story.parts[partIndex];

  preview.innerHTML = '';
  if (!part || !part.glossary) {
    preview.innerHTML = '<div class="qm-empty">No words for this part.</div>';
    return;
  }

  Object.entries(part.glossary).forEach(([en, ar]) => {
    createWordRow(en, ar, preview);
  });
}

async function buildQuizManager() {
  const storySel = document.getElementById('quiz-story');
  const partSel = document.getElementById('quiz-part');
  const note = document.getElementById('quiz-config-note');

  // Load stories
  try {
    const res = await fetch('stories.json');
    const data = await res.json();
    storiesCache = data.stories || [];
  } catch (e) {
    note.className = 'admin-note err';
    note.textContent = 'Could not load stories.';
    return;
  }

  // Populate story select
  storySel.innerHTML = '';
  storiesCache.forEach(s => {
    const opt = document.createElement('option');
    opt.value = s.id;
    opt.textContent = s.title;
    storySel.appendChild(opt);
  });

  function refreshParts() {
    const story = storiesCache.find(s => s.id === storySel.value);
    partSel.innerHTML = '';
    if (!story) return;
    story.parts.forEach((_p, i) => {
      const opt = document.createElement('option');
      opt.value = String(i);
      opt.textContent = 'Part ' + (i + 1);
      partSel.appendChild(opt);
    });
    renderPreviewWords();
  }
  storySel.addEventListener('change', refreshParts);
  partSel.addEventListener('change', renderPreviewWords);
  refreshParts();

  // ── Listen to active quiz config (for global defaults) ──
  const quizRef = window.fs.collection('config').doc('quiz');

  // ── Render Historical Quizzes ──
  const quizzesContainer = document.getElementById('quizzes-container');
  let currentResultsData = []; // Store all results
  
  // First, listen to all results so we can calculate stats per quiz
  window.fs.collection('quiz_results').onSnapshot(snap => {
    currentResultsData = [];
    snap.forEach(doc => currentResultsData.push(doc.data()));
    // Re-render quizzes with new stats
    renderQuizzes();
  });

  let quizzesData = [];
  window.fs.collection('quizzes').orderBy('version', 'desc').onSnapshot(snap => {
    quizzesData = [];
    snap.forEach(doc => quizzesData.push({ id: doc.id, ...doc.data() }));
    
    // Auto-migration for legacy global quiz if quizzes is empty
    if (quizzesData.length === 0) {
      quizRef.get().then(cur => {
        if (cur.exists && cur.data().activeStoryId) {
          const d = cur.data();
          window.fs.collection('quizzes').doc(String(d.version || 1)).set(d);
        }
      });
    }

    renderQuizzes();
  });

  function renderQuizzes() {
    if (!quizzesContainer) return;
    
    if (quizzesData.length === 0) {
      quizzesContainer.innerHTML = '<div class="qm-empty">No quizzes created yet. Publish a new quiz to get started.</div>';
      return;
    }

    quizzesContainer.innerHTML = '';
    
    quizzesData.forEach(q => {
      let title = q.storyTitle;
      let glossary = q.glossary || {};
      
      // Fallback for legacy quizzes
      if (!title || Object.keys(glossary).length === 0) {
        const story = storiesCache.find(s => s.id === q.activeStoryId);
        if (story) {
          title = title || story.title;
          if (Object.keys(glossary).length === 0) {
            const part = story.parts[q.activePartIndex];
            glossary = part && part.glossary ? part.glossary : {};
          }
        }
      }

      const wordsCount = Object.keys(glossary).length;
      const isActive = q.isActive === true;
      const quizVersion = q.version;

      // Calculate stats
      const qResults = currentResultsData.filter(r => r.quizVersion === quizVersion);
      qResults.sort((a, b) => (b.bestScore || 0) - (a.bestScore || 0));
      
      let totalScore = 0;
      let topScore = 0;
      qResults.forEach(r => {
        const score = r.bestScore || 0;
        totalScore += score;
        if (score > topScore) topScore = score;
      });
      const avg = qResults.length > 0 ? Math.round(totalScore / qResults.length * 10) / 10 : '—';

      // Build HTML
      const card = document.createElement('div');
      card.className = 'qm-quiz-card';
      // Styling injected directly to avoid needing separate CSS file edits, though we can add to styles.css later
      card.style.border = isActive ? '2px solid #4CAF50' : '1px solid var(--glass-border)';
      card.style.borderRadius = '12px';
      card.style.background = isActive ? 'rgba(76, 175, 80, 0.05)' : 'var(--glass-bg)';
      card.style.marginBottom = '20px';
      card.style.padding = '15px';
      card.style.position = 'relative';

      const pulseDotHtml = isActive 
        ? '<span class="qm-pulse-dot" style="background:#4CAF50; animation:pulse 1.5s infinite"></span><span class="qm-active-label" style="color:#4CAF50; font-weight:bold;">LIVE</span>'
        : '<span class="qm-pulse-dot" style="background:#9e9e9e;"></span><span class="qm-active-label" style="color:#9e9e9e;">DRAFT</span>';

      const toggleBtnHtml = isActive
        ? `<button class="qm-btn qm-btn-mini qm-toggle-btn" data-id="${q.id}" data-active="true" style="background:#f44336;" type="button">Deactivate</button>`
        : `<button class="qm-btn qm-btn-mini qm-toggle-btn" data-id="${q.id}" data-active="false" style="background:#10b981;" type="button">Activate</button>`;

      let resultsHtml = '';
      if (Object.keys(allStudentsData).length === 0) {
        resultsHtml = '<div class="qm-empty">No students registered yet.</div>';
      } else {
        // Iterate over ALL students
        Object.keys(allStudentsData).forEach(studentId => {
          const studentInfo = allStudentsData[studentId];
          const studentName = studentInfo.displayName || studentId;
          
          // Check if this student took this specific quiz
          const result = qResults.find(r => r.studentId === studentId || r.studentName === studentName);
          
          if (result) {
            resultsHtml += `
              <div class="qm-result-row qm-result-green">
                <div class="qm-result-name">${studentName}</div>
                <div class="qm-result-score">${result.bestScore || 0}/10</div>
                <div class="qm-result-attempts">${result.attempts || 1} attempt${(result.attempts || 1) > 1 ? 's' : ''}</div>
                <div class="qm-result-time">${timeAgo(result.lastAttemptAt)}</div>
              </div>
            `;
          } else {
            resultsHtml += `
              <div class="qm-result-row qm-result-red">
                <div class="qm-result-name">${studentName}</div>
                <div class="qm-result-score">—</div>
                <div class="qm-result-attempts">Did not take</div>
                <div class="qm-result-time">—</div>
              </div>
            `;
          }
        });
      }

      card.innerHTML = `
        <div class="qm-active-banner" style="margin-bottom:15px; border:none; padding:0; background:transparent;">
          <div class="qm-active-indicator">
            ${pulseDotHtml}
          </div>
          <div class="qm-active-info">
            <div class="qm-active-title">${title || q.activeStoryId} — Part ${q.activePartIndex + 1}</div>
            <div class="qm-active-meta">${wordsCount} words · Round ${quizVersion} · Max ${q.maxAttempts || 1} attempt${(q.maxAttempts || 1) > 1 ? 's' : ''}</div>
          </div>
          <div class="qm-active-actions">
            <button class="qm-btn qm-btn-mini qm-btn-preview" data-version="${quizVersion}" type="button">▶ Preview</button>
            ${toggleBtnHtml}
          </div>
        </div>

        <div class="qm-stats-row">
          <div class="qm-stat">
            <span class="qm-stat-value">${qResults.length}</span>
            <span class="qm-stat-label">Submitted</span>
          </div>
          <div class="qm-stat">
            <span class="qm-stat-value">${avg !== '—' ? avg + '/10' : '—'}</span>
            <span class="qm-stat-label">Average</span>
          </div>
          <div class="qm-stat">
            <span class="qm-stat-value">${topScore > 0 ? topScore + '/10' : '—'}</span>
            <span class="qm-stat-label">Top Score</span>
          </div>
        </div>

        <details class="qm-details" style="margin-top:10px;">
          <summary class="qm-summary">📝 Quiz Words</summary>
          <div style="padding: 10px 16px;">
            <div id="editor-words-${q.id}" class="qm-preview-words"></div>
            <div class="qm-publish-actions" style="margin-top: 10px;">
              <button class="qm-btn qm-btn-mini qm-btn-add-word" data-id="${q.id}" type="button">+ Add Word</button>
              <button class="qm-btn qm-btn-mini qm-btn-save-words" data-id="${q.id}" style="background: #2196F3;" type="button">💾 Save Words</button>
            </div>
          </div>
        </details>

        <details class="qm-details">
          <summary class="qm-summary">📊 Student Results <span class="qm-badge">${qResults.length}</span></summary>
          <div class="qm-results-list">
            ${resultsHtml}
          </div>
        </details>
      `;

      quizzesContainer.appendChild(card);

      // Render existing words into the editor
      const wordsContainer = card.querySelector(`#editor-words-${q.id}`);
      Object.entries(glossary).forEach(([en, ar]) => {
        createWordRow(en, ar, wordsContainer);
      });
    });

    // Attach listeners
    document.querySelectorAll('.qm-toggle-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const id = e.target.getAttribute('data-id');
        const currentlyActive = e.target.getAttribute('data-active') === 'true';
        e.target.disabled = true;
        try {
          if (!currentlyActive) {
            // Deactivate all others first
            const batch = window.fs.batch();
            let activatedQuizData = null;
            quizzesData.forEach(qz => {
              if (qz.isActive) {
                batch.update(window.fs.collection('quizzes').doc(qz.id), { isActive: false });
              }
              if (qz.id === id) {
                activatedQuizData = qz;
              }
            });
            batch.update(window.fs.collection('quizzes').doc(id), { isActive: true });
            
            // Sync with legacy config/quiz for old cached clients
            if (activatedQuizData) {
              const legacyData = { ...activatedQuizData, isActive: true };
              batch.set(window.fs.collection('config').doc('quiz'), legacyData);
            }
            
            await batch.commit();
          } else {
            // Just deactivate this one
            const batch = window.fs.batch();
            batch.update(window.fs.collection('quizzes').doc(id), { isActive: false });
            
            // Sync with legacy config/quiz for old cached clients
            batch.set(window.fs.collection('config').doc('quiz'), { version: 0, isActive: false });
            
            await batch.commit();
          }
        } catch (err) {
          console.error('Toggle failed', err);
        } finally {
          e.target.disabled = false;
        }
      });
    });

    document.querySelectorAll('.qm-btn-preview').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const v = e.target.getAttribute('data-version');
        document.getElementById('admin-preview-iframe').src = 'home.html?preview=1&v=' + v;
        document.getElementById('admin-preview-modal').classList.remove('hidden');
      });
    });

    document.querySelectorAll('.qm-btn-add-word').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.target.getAttribute('data-id');
        const wordsContainer = document.getElementById(`editor-words-${id}`);
        createWordRow('', '', wordsContainer);
      });
    });

    document.querySelectorAll('.qm-btn-save-words').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const id = e.target.getAttribute('data-id');
        const wordsContainer = document.getElementById(`editor-words-${id}`);
        const newGlossary = readGlossaryFromEditor(wordsContainer);
        
        if (Object.keys(newGlossary).length < 4) {
          alert('Quiz needs at least 4 words. Please add more.');
          return;
        }

        e.target.disabled = true;
        e.target.textContent = 'Saving...';
        try {
          await window.fs.collection('quizzes').doc(id).update({ glossary: newGlossary });
          e.target.textContent = 'Saved ✓';
          setTimeout(() => { e.target.textContent = '💾 Save Words'; e.target.disabled = false; }, 1500);
        } catch (err) {
          console.error(err);
          alert('Could not save words. Try again.');
          e.target.textContent = '💾 Save Words';
          e.target.disabled = false;
        }
      });
    });
  }

  document.getElementById('admin-preview-close').addEventListener('click', () => {
    document.getElementById('admin-preview-modal').classList.add('hidden');
    document.getElementById('admin-preview-iframe').src = '';
  });

  // ── Max Attempts ──
  setupMaxAttempts(quizRef);

  // ── Prepare New Quiz (Draft) ──
  document.getElementById('save-quiz-config').addEventListener('click', async () => {
    const btn = document.getElementById('save-quiz-config');
    btn.disabled = true;
    btn.textContent = 'Saving Draft…';
    try {
      // Read edited words from the preview area
      const preview = document.getElementById('qm-preview-words');
      const glossary = readGlossaryFromEditor(preview);

      if (Object.keys(glossary).length < 4) {
        note.className = 'admin-note err';
        note.textContent = 'Quiz needs at least 4 words. Please add more.';
        return;
      }

      const story = storiesCache.find(s => s.id === storySel.value);
      const config = makeQuizConfig({
        activeStoryId: storySel.value,
        activePartIndex: parseInt(partSel.value, 10),
        storyTitle: story ? story.title : '',
        glossary: glossary
      });

      // Bump version for new round by finding the highest version in quizzes collection
      let nextVersion = 1;
      let prevMaxAttempts = 1;
      try {
        const snap = await window.fs.collection('quizzes').orderBy('version', 'desc').limit(1).get();
        if (!snap.empty) {
          nextVersion = (snap.docs[0].data().version || 0) + 1;
          prevMaxAttempts = snap.docs[0].data().maxAttempts || 1;
        }
      } catch (e) {}

      config.version = nextVersion;
      config.maxAttempts = prevMaxAttempts;
      config.isActive = false; // Always save as draft first
      
      // Create the new quiz document
      await window.fs.collection('quizzes').doc(String(config.version)).set(config);

      note.className = 'admin-note ok';
      note.textContent = 'Draft saved! Click "Preview Quiz" to test, then click "Activate for Students" in the banner above.';

      // Close publish section
      document.getElementById('qm-publish-details').open = false;
    } catch (err) {
      note.className = 'admin-note err';
      note.textContent = 'Could not save the draft. Please try again.';
    } finally {
      btn.disabled = false;
      btn.textContent = '💾 Save as Draft';
    }
  });
}

// ── Max attempts: let admin set how many times students can take the quiz ──
function setupMaxAttempts(quizRef) {
  const input = document.getElementById('max-attempts');
  const saveBtn = document.getElementById('save-max-attempts');
  const hint = document.getElementById('free-retake-note');
  if (!input || !saveBtn) return;

  // Live-reflect the current value.
  quizRef.onSnapshot((snap) => {
    const val = snap.exists && Number.isFinite(snap.data().maxAttempts) ? snap.data().maxAttempts : 1;
    input.value = val;
  });

  saveBtn.addEventListener('click', async () => {
    saveBtn.disabled = true;
    try {
      const val = Math.max(1, Math.min(99, parseInt(input.value, 10) || 1));
      input.value = val;
      await quizRef.set({ maxAttempts: val }, { merge: true });
      hint.textContent = 'Saved! Up to ' + val + ' attempt' + (val === 1 ? '' : 's') + '.';
    } catch (e) {
      console.error('Save max attempts failed:', e);
      hint.textContent = 'Failed to save. Try again.';
    } finally {
      saveBtn.disabled = false;
    }
  });
}

// ── Part visibility (RTDB settings/visibility — unchanged mechanism, Req 7) ──
async function buildVisibilityControls() {
  const body = document.getElementById('visibility-body');
  let stories = storiesCache;
  if (!stories.length) {
    try {
      const res = await fetch('stories.json');
      stories = (await res.json()).stories || [];
    } catch (e) {
      body.innerHTML = '<div class="admin-note err">Could not load stories.</div>';
      return;
    }
  }

  let visibility = {};
  try {
    const snap = await window.db.ref('settings/visibility').once('value');
    visibility = snap.val() || {};
  } catch (e) { /* default: all visible */ }

  body.innerHTML = '';
  stories.forEach((story) => {
    // Collapsible card per story (keeps the list tidy instead of one long flat list).
    const card = document.createElement('div');
    card.className = 'story-fold';

    const header = document.createElement('div');
    header.className = 'story-fold-head';

    const toggleBtn = document.createElement('button');
    toggleBtn.type = 'button';
    toggleBtn.className = 'story-fold-btn';
    toggleBtn.innerHTML = '<span class="chev">▸</span> 📖 ' + story.title +
      ' <span class="story-count">(' + story.parts.length + ' parts)</span>';

    const viewLink = document.createElement('a');
    viewLink.className = 'ghost-btn';
    viewLink.href = 'reader.html?story=' + encodeURIComponent(story.id);
    viewLink.target = '_blank';
    viewLink.rel = 'noopener';
    viewLink.textContent = 'View';

    header.append(toggleBtn, viewLink);

    const partsWrap = document.createElement('div');
    partsWrap.className = 'story-fold-body';

    toggleBtn.addEventListener('click', () => {
      card.classList.toggle('open');
    });

    story.parts.forEach((_p, index) => {
      const key = story.id + '_part' + (index + 1);
      const isVisible = visibility[key] !== false;

      const row = document.createElement('div');
      row.className = 'admin-vis-row';

      const label = document.createElement('span');
      label.textContent = 'Part ' + (index + 1);
      label.style.flex = '1';

      const toggle = document.createElement('input');
      toggle.type = 'checkbox';
      toggle.checked = isVisible;

      const status = document.createElement('span');
      status.className = 'status';
      status.textContent = isVisible ? 'Visible' : 'Hidden';

      toggle.addEventListener('change', () => {
        const val = toggle.checked;
        const prev = !val;
        toggle.disabled = true;
        status.className = 'status';
        status.textContent = 'Saving…';
        window.db.ref('settings/visibility/' + key).set(val)
          .then(() => {
            status.className = 'status saved';
            status.textContent = val ? 'Visible ✓' : 'Hidden ✓';
            // Releasing a part → notify students with the part's name.
            if (val) {
              window.fs.collection('config').doc('notice').set({
                text: 'New part available: ' + story.title + ' — Part ' + (index + 1),
                ts: Date.now(),
              }).catch((e) => console.warn('Notice write failed:', e));
            }
          })
          .catch((err) => {
            console.error('Visibility save failed:', err);
            toggle.checked = prev;
            status.className = 'status err';
            status.textContent = 'Not saved';
          })
          .finally(() => { toggle.disabled = false; });
      });

      row.append(label, toggle, status);
      partsWrap.appendChild(row);
    });

    card.append(header, partsWrap);
    body.appendChild(card);
  });
}

// Auto-reveal when arriving already authenticated from the sign-in page.
// Placed at the end so all module-level bindings (storiesCache, etc.) are
// initialized before initPanel() runs.
if (sessionStorage.getItem('adminAuthed') === '1') {
  revealPanel();
}
