const { initializeApp } = require('firebase/app');
const { getFirestore, doc, setDoc, deleteDoc, getDoc } = require('firebase/firestore');

const firebaseConfig = {
  apiKey: "AIzaSyBCA6DCMQH4Ncp82OesfdL4RgDE-8MEh4g",
  authDomain: "storysaadrnd.firebaseapp.com",
  projectId: "storysaadrnd",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function fix() {
  // Move Adham's score to 13
  const adham14 = await getDoc(doc(db, 'quiz_results', '14_adham'));
  if (adham14.exists()) {
    const data14 = adham14.data();
    
    // Update 13_adham
    await setDoc(doc(db, 'quiz_results', '13_adham'), {
      bestScore: 10,
      attempts: 2,
      lastAttemptAt: data14.lastAttemptAt
    }, { merge: true });
    
    // Delete 14_adham
    await deleteDoc(adham14.ref);
    console.log("Moved Adham's score from 14 to 13 and deleted 14_adham.");
  }
  
  // Delete 14_test
  await deleteDoc(doc(db, 'quiz_results', '14_test'));
  console.log("Deleted 14_test.");
}

fix().then(() => process.exit(0)).catch(console.error);
