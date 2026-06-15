// src/config/firebaseDb.js
import { initializeApp } from "firebase/app";
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from "firebase/firestore";
import { getStorage } from "firebase/storage"; 
import { getAuth } from "firebase/auth";

// Initialize Firebase with Vite's client-side environment variables
const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);

// CRITICAL PWA UPGRADE: Enable robust offline IndexedDB caching.
// This allows the Materials Hub, Synced Ledger, and Active Review matrices to function without Wi-Fi.
// The multiple tab manager ensures the cache doesn't corrupt if you open the app in two tabs simultaneously.
export const db = initializeFirestore(app, {
    localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() })
});

// Initialize Cloud Storage for heavy file payloads (PDFs, Docs)
export const storage = getStorage(app);
export const auth = getAuth(app);