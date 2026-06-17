// ree-tracker/src/contexts/AuthContext.jsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth } from '../config/firebaseDb';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  updateProfile
} from 'firebase/auth';

const AuthContext = createContext(null);

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
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
    
    // PostgreSQL backend handles User Profile generation autonomously 
    // upon the first telemetry sync or API request via the token middleware.
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
        <div className="flex justify-center items-center h-screen bg-bgMain text-textMain">
          <span className="animate-pulse font-mono tracking-widest text-sm uppercase">Securing Session...</span>
        </div>
      )}
    </AuthContext.Provider>
  );
};