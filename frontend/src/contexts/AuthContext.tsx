// frontend/src/contexts/AuthContext.tsx

import React, { createContext, useContext, ReactNode } from 'react';
import { User } from '../types';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import authService from '../services/auth.service';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  // Use Redux state instead of local state
  const { user, token, isAuthenticated, isLoading } = useSelector((state: RootState) => state.auth);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated,
        isLoading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  
  return context;
};

export default AuthContext;

// Let's add logging to see how the wallet balance is handled in the context
console.log('AuthContext file loaded'); 