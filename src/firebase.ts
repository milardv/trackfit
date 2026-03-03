import { initializeApp } from "firebase/app";
import { getAnalytics, isSupported } from "firebase/analytics";
import { GoogleAuthProvider, getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyBOr0nCcYHtIsRk1TXsD_f8XOlbwlyKBns",
  authDomain: "trackfit-e99de.firebaseapp.com",
  projectId: "trackfit-e99de",
  storageBucket: "trackfit-e99de.firebasestorage.app",
  messagingSenderId: "256061323660",
  appId: "1:256061323660:web:cfa174d8364152e4fc3ea9",
  measurementId: "G-2ZDNV7GQVR",
};

export const firebaseApp = initializeApp(firebaseConfig);
export const auth = getAuth(firebaseApp);
export const db = getFirestore(firebaseApp);
export const storage = getStorage(firebaseApp);
export const googleAuthProvider = new GoogleAuthProvider();

googleAuthProvider.setCustomParameters({
  prompt: "select_account",
});

// Analytics only works in supported browser environments.
void isSupported()
  .then((supported) => {
    if (supported) {
      getAnalytics(firebaseApp);
    }
  })
  .catch(() => {
    // Keep app startup resilient when analytics is unavailable.
  });
