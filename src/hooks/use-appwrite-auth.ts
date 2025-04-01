import { useState, useEffect } from 'react';
import { account, getUserByEmail } from '@/lib/appwrite/config';
import { useRouter } from 'next/navigation';

type User = {
  $id: string;
  name: string;
  email: string;
  department?: string;
  role?: string;
  status?: string;
} | null;

export const useAppwriteAuth = () => {
  const [user, setUser] = useState<User>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Check if the user is authenticated
    const checkAuth = async () => {
      try {
        setLoading(true);
        const currentAccount = await account.get();
        
        // Get user profile data
        const userProfile = await getUserByEmail(currentAccount.email);
        
        // Combine basic account info with profile data
        setUser({
          $id: currentAccount.$id,
          name: currentAccount.name,
          email: currentAccount.email,
          department: userProfile?.department,
          role: userProfile?.role || 'user',
          status: userProfile?.status,
        });
      } catch (error) {
        console.error('Authentication error:', error);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      setLoading(true);
      
      // Create a session
      await account.createSession(email, password);
      
      // Get the logged-in user
      const currentAccount = await account.get();
      
      // Get additional user profile data
      const userProfile = await getUserByEmail(email);
      
      // Combine account info with profile data
      setUser({
        $id: currentAccount.$id,
        name: currentAccount.name,
        email: currentAccount.email,
        department: userProfile?.department,
        role: userProfile?.role || 'user',
        status: userProfile?.status,
      });
      
      return { success: true, user: currentAccount };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error };
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      setLoading(true);
      await account.deleteSession('current');
      setUser(null);
      router.push('/sign-in');
      return { success: true };
    } catch (error) {
      console.error('Logout error:', error);
      return { success: false, error };
    } finally {
      setLoading(false);
    }
  };

  const isAdmin = () => {
    return user?.role === 'admin';
  };

  const isManager = () => {
    return user?.role === 'manager';
  };

  return {
    user,
    loading,
    login,
    logout,
    isAdmin,
    isManager,
  };
}; 