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
  { prompt: "وصلت الشرطة", correct: "police arrive", distractors: ["police arrest", "girls arrive", "police checks"] },
  { prompt: "يعتقلون اللص", correct: "arrest the thief", distractors: ["arrive the thief", "checks the thief", "arrest the girl"] },
  { prompt: "الطبيب يفحص", correct: "doctor checks", distractors: ["doctor looks", "doctor arrive", "brave doctor"] },
  { prompt: "فتاة شجاعة", correct: "brave girl", distractors: ["brave doctor", "fine girl", "brave one"] },
  { prompt: "هي بخير", correct: "she is fine", distractors: ["she is brave", "she looks", "she checks"] },
];

async function run() {
  // Update quiz 18 (the currently active one)
  await updateDoc(doc(db, 'quizzes', '18'), { fixedQuestions });
  console.log('✅ Added fixedQuestions to quiz 18');
  process.exit(0);
}

run().catch(err => { console.error(err); process.exit(1); });
