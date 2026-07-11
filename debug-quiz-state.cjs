const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, doc, getDoc } = require('firebase/firestore');

const firebaseConfig = {
  apiKey: "AIzaSyBCA6DCMQH4Ncp82OesfdL4RgDE-8MEh4g",
  authDomain: "storysaadrnd.firebaseapp.com",
  projectId: "storysaadrnd",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function run() {
  // 1. Check all quizzes
  console.log("=== ALL QUIZZES ===");
  const quizzesSnap = await getDocs(collection(db, 'quizzes'));
  quizzesSnap.forEach(d => {
    const data = d.data();
    console.log(`Quiz ${d.id}: version=${data.version}, isActive=${data.isActive}, storyTitle=${data.storyTitle}, partIndex=${data.activePartIndex}, maxAttempts=${data.maxAttempts}`);
  });

  // 2. Check legacy config/quiz
  console.log("\n=== LEGACY CONFIG/QUIZ ===");
  const cfgSnap = await getDoc(doc(db, 'config', 'quiz'));
  if (cfgSnap.exists()) {
    const c = cfgSnap.data();
    console.log(`version=${c.version}, isActive=${c.isActive}, storyTitle=${c.storyTitle}, partIndex=${c.activePartIndex}`);
  } else {
    console.log("No config/quiz doc found");
  }

  // 3. Check all quiz_results
  console.log("\n=== ALL QUIZ RESULTS ===");
  const resultsSnap = await getDocs(collection(db, 'quiz_results'));
  resultsSnap.forEach(d => {
    const data = d.data();
    console.log(`${d.id}: studentId=${data.studentId}, version=${data.quizVersion}, bestScore=${data.bestScore}, attempts=${data.attempts}, partIndex=${data.partIndex}, time=${new Date(data.lastAttemptAt).toISOString()}`);
  });

  // 4. Check all students
  console.log("\n=== ALL STUDENTS ===");
  const studentsSnap = await getDocs(collection(db, 'students'));
  studentsSnap.forEach(d => {
    const data = d.data();
    console.log(`${d.id}: lastQuizVersion=${data.lastQuizVersion}, attempts=${data.quizAttemptCount}, cumulative=${data.cumulativeScore}, retake=${data.retakeAllowed}`);
  });
}

run().then(() => process.exit(0)).catch(console.error);
