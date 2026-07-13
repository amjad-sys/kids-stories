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
      id: doc.id,
      name: d.displayName || doc.id,
      score: d.cumulativeScore || 0,
      attempts: d.cumulativeAttempts || 0
    });
  });

  students.sort((a, b) => b.score - a.score);
  
  console.log(JSON.stringify(students, null, 2));
}

run().then(() => process.exit(0)).catch(console.error);
