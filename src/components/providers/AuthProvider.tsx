'use client';

import { createContext, useContext, ReactNode } from 'react';
import { useAppwriteAuth } from '@/hooks/use-appwrite-auth';

type User = {
  $id: string;
  name: string;
  email: string;
  department?: string;
  role?: string;
  status?: string;
} | null;

interface AuthContextType {
  user: User;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: any; }>;
  logout: () => Promise<{ success: boolean; error?: any; }>;
  isAdmin: () => boolean;
  isManager: () => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const auth = useAppwriteAuth();
  
  return (
    <AuthContext.Provider value={auth}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
} 