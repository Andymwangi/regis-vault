import React, { useEffect, useState, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from './use-auth';
import { toast } from 'sonner';

type UserRole = 'admin' | 'manager' | 'user';

interface UseRoleGuardOptions {
  redirectTo?: string;
  showToast?: boolean;
  loadingFallback?: ReactNode;
}

/**
 * A hook for role-based access control
 * @param allowedRoles - Array of roles that are allowed to access the component
 * @param options - Configuration options
 * @returns Object containing loading state and authorized state
 */
export function useRoleGuard(
  allowedRoles: UserRole[], 
  options: UseRoleGuardOptions = {}
) {
  const { 
    redirectTo = '/dashboard', 
    showToast = true,
    loadingFallback = null
  } = options;
  
  const { user, isLoading } = useAuth();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Wait until auth state is determined
    if (isLoading) return;

    // Check if user exists and has a role that matches allowedRoles
    const userRole = user?.role as UserRole | undefined;
    const hasAccess = user && userRole && allowedRoles.includes(userRole);

    if (!hasAccess) {
      if (showToast) {
        toast.error('You do not have permission to access this page');
      }
      router.push(redirectTo);
      return;
    }

    setIsAuthorized(true);
  }, [user, isLoading, allowedRoles, redirectTo, router, showToast]);

  return { 
    isLoading: isLoading || !isAuthorized,
    isAuthorized,
    loadingFallback 
  };
}

/**
 * Higher-order component that guards a component with role-based access control
 * @param Component - The component to wrap
 * @param allowedRoles - Array of roles that are allowed to access the component
 * @param options - Configuration options
 * @returns A new component that includes role-based access control
 */
export function withRoleGuard<P extends object>(
  Component: React.ComponentType<P>,
  allowedRoles: UserRole[],
  options: UseRoleGuardOptions = {}
) {
  return function GuardedComponent(props: P) {
    const { isLoading, loadingFallback } = useRoleGuard(allowedRoles, options);

    if (isLoading) {
      return loadingFallback as ReactNode || (
        <div className="flex justify-center items-center h-screen">
          <div className="animate-spin h-8 w-8 border-4 border-red-500 rounded-full border-t-transparent"></div>
        </div>
      );
    }

    return <Component {...props} />;
  };
} 