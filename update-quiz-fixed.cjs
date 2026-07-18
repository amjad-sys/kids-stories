const { initializeApp } = require('firebase/app');
const { getFirestore, doc, updateDoc } = require('firebase/firestore');

const firebaseConfig = {
  apiKey: "AIzaSyBCA6DCMQH4Ncp82OesfdL4RgDE-8MEh4g",
  authDomain: "storysaadrnd.firebaseapp.com",
  projectId: "storysaadrnd",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const fixedQuestions = [
  // ── Single-word questions (5) ──
  { prompt: "لص", correct: "thief", distractors: ["doctor", "girl", "bandage"] },
  { prompt: "مستشفى", correct: "hospital", distractors: ["bandage", "brave", "doctor"] },
  { prompt: "ضمادة", correct: "bandage", distractors: ["hospital", "checks", "fine"] },
  { prompt: "شجاع", correct: "brave", distractors: ["fine", "thief", "checks"] },
  { prompt: "تنظر", correct: "looks", distractors: ["checks", "arrive", "arrest"] },
  // ── Compound phrase questions (5) ──
  { prompt: "وصلت الفتيات", correct: "girls arrive", distractors: ["police arrive", "girls arrest", "doctor arrive"] },
  { prompt: "يعتقلون الطبيب", correct: "arrest doctor", distractors: ["arrest thief", "doctor checks", "doctor looks"] },
  { prompt: "لص شجاع", correct: "brave thief", distractors: ["brave girl", "brave doctor", "fine thief"] },
  { prompt: "يفحص اللص", correct: "checks thief", distractors: ["arrest thief", "checks doctor", "thief looks"] },
  { prompt: "فتاة تنظر", correct: "girl looks", distractors: ["doctor looks", "girl checks", "brave girl"] },
];

async function run() {
  // Update quiz 18 (the currently active one)
  await updateDoc(doc(db, 'quizzes', '18'), { fixedQuestions });
  console.log('✅ Added fixedQuestions to quiz 18');
  process.exit(0);
}

run().catch(err => { console.error(err); process.exit(1); });
