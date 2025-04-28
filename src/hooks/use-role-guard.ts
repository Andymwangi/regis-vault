import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';

export function useRoleGuard(allowedRoles: string[]) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (status === 'loading') return;

    if (!session) {
      router.push('/auth/signin');
      return;
    }

    if (!allowedRoles.includes(session.user.role)) {
      router.push('/dashboard/files');
      return;
    }

    setIsLoading(false);
  }, [session, status, allowedRoles, router]);

  return { isLoading };
} 