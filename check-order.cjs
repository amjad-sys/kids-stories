const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs } = require('firebase/firestore');

const firebaseConfig = {
  apiKey: "AIzaSyBCA6DCMQH4Ncp82OesfdL4RgDE-8MEh4g",
  authDomain: "storysaadrnd.firebaseapp.com",
  projectId: "storysaadrnd",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function run() {
  const snap = await getDocs(collection(db, 'students'));
  const students = [];
  snap.forEach(doc => {
    const d = doc.data();
    students.push({
      name: d.displayName || doc.id,
      score: d.cumulativeScore || 0,
      attempts: d.cumulativeAttempts || 0,
      scoreTime: d.scoreUpdatedAt || 0,
      scoreTimeStr: d.scoreUpdatedAt ? new Date(d.scoreUpdatedAt).toLocaleString('en-GB', {timeZone: 'Asia/Amman'}) : 'N/A'
    });
  });

  // Sort same as leaderboard-core.js
  students.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (a.attempts !== b.attempts) return a.attempts - b.attempts;
    if (a.scoreTime !== b.scoreTime) return a.scoreTime - b.scoreTime;
    return a.name.localeCompare(b.name);
  });

  console.log('=== LEADERBOARD ORDER (after fix) ===');
  students.forEach((s, i) => {
    console.log((i+1) + '. ' + s.name + ' — Score: ' + s.score + ' | Attempts: ' + s.attempts + ' | Time: ' + s.scoreTimeStr);
  });
}

run().then(() => process.exit(0)).catch(console.error);
