// src/config/firebaseDb.js
import { initializeApp } from "firebase/app";
import {
    initializeAuth, connectAuthEmulator,
    indexedDBLocalPersistence, browserLocalPersistence, browserSessionPersistence,
} from "firebase/auth";

const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'missing',
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'localhost',
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'demo-project',
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
    appId: import.meta.env.VITE_FIREBASE_APP_ID || ''
};

// Exported for the services that start their SDK on demand: Storage loads
// with the handouts uploader (features/materials/useFileManager), not on boot.
export const app = initializeApp(firebaseConfig);

// getAuth() also bundles Google/popup/redirect sign-in, which the app doesn't
// use (email and password only): 11.5 kB of the boot download. Same
// persistence list as getAuth's, in the same order, so sessions carry over.
export const auth = initializeAuth(app, {
    persistence: [indexedDBLocalPersistence, browserLocalPersistence, browserSessionPersistence],
});

// The authed Playwright run signs in against the Firebase Auth emulator
// (playwright.authed.config.ts). Dev server only: a production build never
// reads this, so it can't be pointed at an emulator by an env var.
if (import.meta.env.DEV && import.meta.env.VITE_FIREBASE_AUTH_EMULATOR) {
    connectAuthEmulator(auth, import.meta.env.VITE_FIREBASE_AUTH_EMULATOR, { disableWarnings: true });
}
