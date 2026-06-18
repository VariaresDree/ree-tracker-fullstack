// src/contexts/AuthContext.jsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth } from '../config/firebaseDb';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  updateProfile
} from 'firebase/auth';
// 🚀 NEW: Import the TOS fetch function
import { getAnalyticsProfile, fetchDynamicTOS } from '../services/dbQueries'; 
import { useStore } from '../store/useStore';

const MASTER_ADMIN_EMAILS = [
    'admin@example.com',
    'donreydenxprey@gmail.com' 
];

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      
      if (user) {
        try {
          const profileResponse = await getAnalyticsProfile(user.uid);
          const dbRole = profileResponse?.data?.profile?.role;
          
          const isUserAdmin = MASTER_ADMIN_EMAILS.includes(user.email) || dbRole === 'ADMIN' || dbRole === 'admin';
          
          setIsAdmin(isUserAdmin);
          
          if (useStore.getState) {
              useStore.getState().setIsAdmin(isUserAdmin);
          }

          // 🚀 FETCH THE NEWEST TOS FROM THE DATABASE
          try {
              const cloudTOS = await fetchDynamicTOS();
              if (cloudTOS && useStore.getState) {
                  useStore.getState().setDynamicTOS(cloudTOS);
              }
          } catch (tosError) {
              console.warn("Failed to fetch cloud TOS, maintaining local cached state.");
          }

        } catch (err) {
          console.warn("Clearance authorization query tracking failure. Defaulting to whitelist check.", err);
          
          const isFallbackAdmin = MASTER_ADMIN_EMAILS.includes(user.email);
          setIsAdmin(isFallbackAdmin);
          
          if (useStore.getState) {
              useStore.getState().setIsAdmin(isFallbackAdmin);
          }
        }
      } else {
        setIsAdmin(false);
        if (useStore.getState) {
            useStore.getState().setIsAdmin(false);
        }
      }
      
      setLoading(false);
    });
    
    return unsubscribe;
  }, []);

  const login = (email, password) => signInWithEmailAndPassword(auth, email, password);

  const register = async (email, password, displayName) => {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    if (displayName) await updateProfile(userCredential.user, { displayName });
    return userCredential;
  };

  const logout = async () => {
    setLoading(true);
    await signOut(auth);
    setCurrentUser(null);
    setIsAdmin(false);
    if (useStore.getState) useStore.getState().setIsAdmin(false);
    setLoading(false);
  };

  return (
    <AuthContext.Provider value={{ currentUser, isAdmin, login, register, logout, loading }}>
      {!loading ? children : (
        <div className="flex justify-center items-center h-screen bg-bgMain text-textMain">
          <span className="animate-pulse font-mono tracking-widest text-sm uppercase">Securing Session...</span>
        </div>
      )}
    </AuthContext.Provider>
  );
};