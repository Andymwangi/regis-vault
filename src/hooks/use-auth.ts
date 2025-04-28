import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

export function useAuth() {
  const [user, setUser] = useState<any>(null);
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
        toast.success('Logged out successfully');
      } else {
        toast.error('Failed to logout');
      }
    } catch (error) {
      console.error('Logout error:', error);
      toast.error('Failed to logout');
    }
  };

  const isAuthenticated = status === 'authenticated';
  const isLoading = status === 'loading';

  return {
    user,
    isAuthenticated,
    isLoading,
    logout,
  };
}
