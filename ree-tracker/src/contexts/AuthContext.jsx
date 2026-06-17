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
import { getAnalyticsProfile } from '../services/dbQueries'; // Internal network fetch handler

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
          // Queries PostgreSQL record properties to confirm permissions safely
          const profileData = await getAnalyticsProfile(user.uid);
          const userRole = profileData?.role || profileData?.user?.role;
          
          if (userRole === 'ADMIN') {
            setIsAdmin(true);
          } else {
            setIsAdmin(false);
          }
        } catch (err) {
          console.error("Clearance authorization query tracking failure:", err);
          setIsAdmin(false);
        }
      } else {
        setIsAdmin(false);
      }
      
      setLoading(false);
    });
    
    return unsubscribe;
  }, []);

  const login = (email, password) => signInWithEmailAndPassword(auth, email, password);

  const register = async (email, password, displayName) => {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    
    if (displayName) {
      await updateProfile(userCredential.user, { displayName });
    }
    
    return userCredential;
  };

  const logout = async () => {
    setLoading(true);
    await signOut(auth);
    setCurrentUser(null);
    setIsAdmin(false);
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