const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, query, where, limit } = require('firebase/firestore');

const firebaseConfig = {
  apiKey: "AIzaSyBCA6DCMQH4Ncp82OesfdL4RgDE-8MEh4g",
  authDomain: "storysaadrnd.firebaseapp.com",
  projectId: "storysaadrnd",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function run() {
  const snap = await getDocs(query(collection(db, 'quizzes'), where('isActive', '==', true), limit(1)));
  
  if (snap.empty) {
    console.log('No active quiz');
    process.exit(1);
  }

  const doc = snap.docs[0];
  const data = doc.data();
  
  console.log('Quiz ID:', doc.id);
  console.log('Version:', data.version);
  console.log('Part:', data.activePartIndex);
  console.log('Has fixedQuestions:', !!data.fixedQuestions);
  console.log('fixedQuestions type:', typeof data.fixedQuestions);
  
  if (data.fixedQuestions) {
    console.log('fixedQuestions length:', data.fixedQuestions.length);
    console.log('First question:', JSON.stringify(data.fixedQuestions[0], null, 2));
  } else {
    console.log('fixedQuestions is NULL or undefined');
    console.log('All keys in quiz doc:', Object.keys(data));
  }
  
  process.exit(0);
}

run().catch(err => { console.error(err); process.exit(1); });
