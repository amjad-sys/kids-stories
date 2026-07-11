const { initializeApp } = require('firebase/app');
const { getFirestore, doc, updateDoc } = require('firebase/firestore');

const firebaseConfig = {
  apiKey: "AIzaSyBCA6DCMQH4Ncp82OesfdL4RgDE-8MEh4g",
  authDomain: "storysaadrnd.firebaseapp.com",
  projectId: "storysaadrnd",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function fix() {
  await updateDoc(doc(db, 'students', 'adham'), {
    lastQuizVersion: 13,
    lastScore: 10
  });
  console.log("Updated Adham's student document.");
}

fix().then(() => process.exit(0)).catch(console.error);
