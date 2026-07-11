const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, doc, setDoc, deleteDoc, query, where } = require('firebase/firestore');

const firebaseConfig = {
  apiKey: "AIzaSyBCA6DCMQH4Ncp82OesfdL4RgDE-8MEh4g",
  authDomain: "storysaadrnd.firebaseapp.com",
  projectId: "storysaadrnd",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function fix() {
  const q = query(collection(db, 'quiz_results'), where('quizVersion', '==', 4));
  const snap = await getDocs(q);
  if (snap.empty) {
    console.log("No results found for version 4.");
    return;
  }
  
  for (const result of snap.docs) {
    const data = result.data();
    console.log("Found result for student:", data.studentName, "moving to version 3...");
    
    // Create new doc in version 3
    data.quizVersion = 3;
    await setDoc(doc(db, 'quiz_results', '3_' + data.studentId), data);
    
    // Delete old doc
    await deleteDoc(result.ref);
    console.log("Moved successfully.");
  }
}

fix().then(() => process.exit(0)).catch(console.error);
