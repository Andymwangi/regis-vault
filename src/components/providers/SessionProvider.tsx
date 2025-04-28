'use client';

import { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import { useRouter } from 'next/navigation';

// Create a type for the authentication context
type AuthContextType = {
  user: any | null;
  status: 'loading' | 'authenticated' | 'unauthenticated';
  logout: () => Promise<void>;
};

// Create the context
const AuthContext = createContext<AuthContextType>({
  user: null,
  status: 'loading',
  logout: async () => {},
});

// Custom hook to use the auth context
export const useSession = () => useContext(AuthContext);

// Provider component
export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any | null>(null);
  const [status, setStatus] = useState<'loading' | 'authenticated' | 'unauthenticated'>('loading');
  const router = useRouter();

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await fetch('/api/auth/me');
        if (response.ok) {
          const userData = await response.json();
          setUser(userData);
          setStatus('authenticated');
        } else {
          setStatus('unauthenticated');
        }
      } catch (error) {
        console.error('Failed to fetch user:', error);
        setStatus('unauthenticated');
      }
    };

    fetchUser();
  }, []);

  const logout = async () => {
    try {
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
      });
      
      if (response.ok) {
        setUser(null);
        setStatus('unauthenticated');
        router.push('/sign-in');
      }
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, status, logout }}>
      {children}
    </AuthContext.Provider>
  );
} 