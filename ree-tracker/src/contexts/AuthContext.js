// src/contexts/AuthContext.js
//
// The auth context and the hook every screen reads it with. The provider is
// in AuthProvider.jsx.
import { createContext, useContext } from 'react';

export const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);
