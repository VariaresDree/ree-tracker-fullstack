// src/contexts/AuthContext.jsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth, db } from '../config/firebaseDb';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        setCurrentUser({
          uid: user.uid,
          email: user.email,
          ...userDoc.data(),
        });
      } else {
        setCurrentUser(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const login = (email, password) => signInWithEmailAndPassword(auth, email, password);

  const register = async (email, password, displayName) => {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const { uid } = userCredential.user;

    // Create user profile
    await setDoc(doc(db, 'users', uid), {
      displayName,
      email,
      createdAt: new Date().toISOString(),
    });

    // 🔥 CRITICAL: Initialise telemetry document
    const defaultStats = {
      examDate: '2026-08-15',
      dailyTarget: 50,
      dailyMath: 0,
      dailyESAS: 0,
      dailyEE: 0,
      matrix: { hc: 0, hw: 0, lc: 0, lw: 0 },
      microTopics: {},
      blindSpots: [],
      thetaHistory: [],
      irt: { theta: 0.0, consecutiveCorrect: 0, consecutiveWrong: 0 },
      globalStreak: 0,
      lastActiveDate: null,
    };
    await setDoc(doc(db, 'userData', uid), defaultStats);

    return userCredential;
  };

  const logout = async () => {
    setLoading(true);
    await signOut(auth);
    setCurrentUser(null);
    setLoading(false);
  };

  return (
    <AuthContext.Provider value={{ currentUser, login, register, logout, loading }}>
      {!loading ? children : (
        <div className="flex justify-center items-center h-screen bg-bg text-muted font-mono text-sm">
          🔒 Verifying Secure Cryptographic Credentials...
        </div>
      )}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};