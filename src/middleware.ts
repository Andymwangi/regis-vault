import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

// Define public routes that don't require authentication
const publicRoutes = [
  '/',
  '/sign-in',
  '/sign-up',
  '/sign-out',
  '/(auth)',  // Include all paths under the auth group
  '/api/auth',
  '/api/webhook',
  '/api/departments',
];

// Define admin-only routes
const adminRoutes = [
  '/dashboard/admin',
  '/dashboard/settings',
  '/dashboard/users',
  '/api/admin',
];

// Define manager-only routes
const managerRoutes = [
  '/dashboard/teams',
  '/dashboard/reports',
];

export async function middleware(request: NextRequest) {
  const token = await getToken({ req: request });
  const url = request.nextUrl.clone();
  const { pathname } = url;

  // Root path is handled by the welcome page itself
  if (pathname === '/') {
    return NextResponse.next();
  }

  // Allow sign-in and sign-up even for authenticated users
  if (pathname === '/sign-in' || pathname === '/sign-up') {
    // If user is already authenticated and tries to access auth pages, redirect to dashboard
    if (token) {
      if (token.role === 'admin') {
        return NextResponse.redirect(new URL('/dashboard/admin/settings', request.url));
      }
      return NextResponse.redirect(new URL('/dashboard/files', request.url));
    }
    return NextResponse.next();
  }

  // Check for OTP verification paths and redirect to dashboard
  if (pathname.startsWith('/otp-verification')) {
    console.log('Intercepting OTP verification in middleware - redirecting to dashboard');
    return NextResponse.redirect(new URL('/dashboard/files', request.url));
  }

  // Allow public routes
  if (publicRoutes.some(route => pathname.startsWith(route))) {
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

  // Check for manager routes
  if (managerRoutes.some(route => pathname.startsWith(route))) {
    if (token.role !== 'admin' && token.role !== 'manager') {
      return NextResponse.redirect(new URL('/dashboard/files', request.url));
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