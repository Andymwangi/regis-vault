import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

// Define public routes that don't require authentication
const publicRoutes = [
  '/sign-in',
  '/sign-up',
  '/otp-verification',
  '/api/auth',
  '/api/webhook',
  '/api/departments',
];

// Define admin-only routes
const adminRoutes = [
  '/dashboard/admin',
  '/dashboard/settings',
  '/dashboard/users',
];

// Define routes that require email verification
const requireVerificationRoutes = [
  '/dashboard/files',
  '/dashboard/shared',
  '/dashboard/recent',
  '/dashboard/teams',
  '/dashboard/trash',
];

export async function middleware(request: NextRequest) {
  const token = await getToken({ req: request });
  const { pathname } = request.nextUrl;

  // Handle root path - redirect to sign-in if not authenticated, dashboard if authenticated
  if (pathname === '/') {
    if (!token) {
      return NextResponse.redirect(new URL('/sign-in', request.url));
    }
    return NextResponse.redirect(new URL('/dashboard/files', request.url));
  }

  // Allow public routes
  if (publicRoutes.some(route => pathname.startsWith(route))) {
    // If user is already authenticated and tries to access auth pages, redirect to dashboard
    if (token && (pathname === '/sign-in' || pathname === '/sign-up')) {
      return NextResponse.redirect(new URL('/dashboard/files', request.url));
    }
    return NextResponse.next();
  }

  // Check for authentication
  if (!token) {
    const signInUrl = new URL('/sign-in', request.url);
    signInUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(signInUrl);
  }

  // Check for admin routes
  if (adminRoutes.some(route => pathname.startsWith(route))) {
    if (token.role !== 'admin') {
      return NextResponse.redirect(new URL('/dashboard/files', request.url));
    }
  }

  // Check if user is verified for protected routes
  if (requireVerificationRoutes.some(route => pathname.startsWith(route))) {
    if (!token.emailVerified) {
      const verificationUrl = new URL('/otp-verification', request.url);
      verificationUrl.searchParams.set('callbackUrl', pathname);
      return NextResponse.redirect(verificationUrl);
    }
  }

  // Add user info to headers for use in components
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-user-id', token.sub as string);
  requestHeaders.set('x-user-role', token.role as string);
  requestHeaders.set('x-user-email', token.email as string);

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

// Configure which routes to run middleware on
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|public).*)',
  ],
}; 