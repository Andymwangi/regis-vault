import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

export function useAuth() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const logout = async () => {
    try {
      await signOut({ redirect: false });
      router.push('/sign-in');
      toast.success('Logged out successfully');
    } catch (error) {
      toast.error('Failed to logout');
    }
  };

  const isAuthenticated = status === 'authenticated';
  const isLoading = status === 'loading';

  return {
    user: session?.user,
    isAuthenticated,
    isLoading,
    logout,
  };
}
