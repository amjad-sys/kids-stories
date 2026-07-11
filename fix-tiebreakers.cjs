const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, writeBatch } = require('firebase/firestore');

const firebaseConfig = {
  apiKey: "AIzaSyBCA6DCMQH4Ncp82OesfdL4RgDE-8MEh4g",
  authDomain: "storysaadrnd.firebaseapp.com",
  projectId: "storysaadrnd",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function run() {
  const studentsSnap = await getDocs(collection(db, 'students'));
  const resultsSnap = await getDocs(collection(db, 'quiz_results'));

  // Group results by student
  const resultsByUser = {};
  resultsSnap.forEach(doc => {
    const d = doc.data();
    if (!d.studentId) return;
    if (!resultsByUser[d.studentId]) resultsByUser[d.studentId] = [];
    resultsByUser[d.studentId].push(d);
  });

  const batch = writeBatch(db);
  let count = 0;

  studentsSnap.forEach(studentDoc => {
    const s = studentDoc.data();
    const id = studentDoc.id;
    const results = resultsByUser[id] || [];

    // Total attempts across all quizzes
    let totalAttempts = 0;
    // The timestamp when they last INCREASED their cumulative score
    let latestTimestamp = 0;

    results.forEach(r => {
      totalAttempts += (r.attempts || 1);
      if (r.bestScore > 0 && r.lastAttemptAt && r.lastAttemptAt > latestTimestamp) {
        latestTimestamp = r.lastAttemptAt;
      }
    });

    // Fallback for students with no quiz_results
    if (totalAttempts === 0) totalAttempts = s.quizAttemptCount || 1;
    if (latestTimestamp === 0) latestTimestamp = Date.now();

    // Only update if not already set, or if our computed values differ
    const needsUpdate = !s.cumulativeAttempts || !s.scoreUpdatedAt;
    
    if (needsUpdate) {
      batch.update(studentDoc.ref, {
        cumulativeAttempts: totalAttempts,
        scoreUpdatedAt: latestTimestamp
      });
      count++;
      console.log('Updated ' + id + ': attempts=' + totalAttempts + ', timestamp=' + new Date(latestTimestamp).toISOString());
    } else {
      console.log('Skipped ' + id + ' (already has data): attempts=' + s.cumulativeAttempts + ', time=' + new Date(s.scoreUpdatedAt).toISOString());
    }
  });

  if (count > 0) {
    await batch.commit();
    console.log('\nSuccessfully backfilled ' + count + ' students.');
  } else {
    console.log('\nAll students already have tie-breaker data.');
  }
}

run().then(() => process.exit(0)).catch(console.error);
