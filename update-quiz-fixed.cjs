const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, doc, updateDoc, query, where, limit } = require('firebase/firestore');

const firebaseConfig = {
  apiKey: "AIzaSyBCA6DCMQH4Ncp82OesfdL4RgDE-8MEh4g",
  authDomain: "storysaadrnd.firebaseapp.com",
  projectId: "storysaadrnd",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// 10 fixed questions for Part 8 — 5 single-word + 5 compound phrases
const fixedQuestions = [
  // ── Single-word questions (5) ──
  {
    prompt: "لص",
    correct: "thief",
    distractors: ["doctor", "girl", "bandage"]
  },
  {
    prompt: "مستشفى",
    correct: "hospital",
    distractors: ["bandage", "brave", "doctor"]
  },
  {
    prompt: "ضمادة",
    correct: "bandage",
    distractors: ["hospital", "checks", "fine"]
  },
  {
    prompt: "شجاع",
    correct: "brave",
    distractors: ["fine", "thief", "checks"]
  },
  {
    prompt: "تنظر",
    correct: "looks",
    distractors: ["checks", "arrive", "arrest"]
  },
  // ── Compound phrase questions (5) ──
  {
    prompt: "وصلت الشرطة",
    correct: "police arrive",
    distractors: ["police arrest", "girls arrive", "police checks"]
  },
  {
    prompt: "يعتقلون اللص",
    correct: "arrest the thief",
    distractors: ["arrive the thief", "checks the thief", "arrest the girl"]
  },
  {
    prompt: "الطبيب يفحص",
    correct: "doctor checks",
    distractors: ["doctor looks", "doctor arrive", "brave doctor"]
  },
  {
    prompt: "فتاة شجاعة",
    correct: "brave girl",
    distractors: ["brave doctor", "fine girl", "brave one"]
  },
  {
    prompt: "هي بخير",
    correct: "she is fine",
    distractors: ["she is brave", "she looks", "she checks"]
  }
];

async function run() {
  // Find the active quiz
  const snap = await getDocs(query(collection(db, 'quizzes'), where('isActive', '==', true), limit(1)));
  
  if (snap.empty) {
    console.log('❌ No active quiz found!');
    process.exit(1);
  }

  const quizDoc = snap.docs[0];
  const data = quizDoc.data();
  console.log(`Found active quiz: id=${quizDoc.id}, version=${data.version}, part=${data.activePartIndex + 1}`);
  console.log(`Story: ${data.storyTitle}`);

  // Add fixedQuestions to the active quiz
  await updateDoc(doc(db, 'quizzes', quizDoc.id), {
    fixedQuestions: fixedQuestions
  });

  console.log(`✅ Added ${fixedQuestions.length} fixed questions (5 single + 5 compound) to quiz ${quizDoc.id}`);
  process.exit(0);
}

run().catch(err => { console.error(err); process.exit(1); });
