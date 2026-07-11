const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs } = require('firebase/firestore');

const firebaseConfig = {
  apiKey: "AIzaSyBCA6DCMQH4Ncp82OesfdL4RgDE-8MEh4g",
  authDomain: "storysaadrnd.firebaseapp.com",
  projectId: "storysaadrnd",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function dump() {
  const snap = await getDocs(collection(db, 'students'));
  snap.forEach(doc => {
    console.log(doc.id, "=>", doc.data());
  });
}

dump().then(() => process.exit(0)).catch(console.error);
