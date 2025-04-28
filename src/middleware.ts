import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";

// Define public routes that don't require authentication
const publicRoutes = [
  '/',
  '/sign-in',
  '/sign-up',
  '/sign-out',
  '/(auth)',  // Include all paths under the auth group
  '/api/auth',
  '/api/auth/signout',  // Explicitly add the signout endpoint
  '/api/webhook',
  '/api/departments',
];

// Define admin-only routes
const adminRoutes = [
  '/dashboard/admin',
  '/api/admin',
];

// Define manager-only routes
const managerRoutes = [
  '/dashboard/teams',
  '/dashboard/reports',
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Log the request path and available cookies
  console.log(`[Middleware] Processing request for: ${pathname}`);
  const cookies = request.cookies.getAll().map(c => c.name);
  console.log(`[Middleware] Available cookies: ${cookies.join(', ')}`);
  
  // Always skip middleware for the magic link callback path
  if (pathname.startsWith('/api/auth/callback/magic-link')) {
    console.log(`[Middleware] Skipping middleware for magic link callback`);
    return NextResponse.next();
  }
  
  // Allow public routes without authentication
  if (publicRoutes.some(route => pathname.startsWith(route))) {
    console.log(`[Middleware] Public route ${pathname}, proceeding without auth check`);
    return NextResponse.next();
  }
  
  // Check for the session cookie
  const sessionCookie = request.cookies.get("session");
  
  // If there's no session cookie, redirect to sign-in
  if (!sessionCookie) {
    console.log(`[Middleware] No session cookie found for ${pathname}, redirecting to sign-in`);
    return NextResponse.redirect(new URL(`/sign-in?redirect=${encodeURIComponent(pathname)}`, request.url));
  }
  
  try {
    // Verify the session token
    console.log(`[Middleware] Verifying session token for ${pathname}`);
    const decoded = jwt.verify(
      sessionCookie.value, 
      process.env.JWT_SECRET || "fallback-secret"
    ) as {
      id: string;
      email: string;
      role?: string;
      iat: number;
      exp: number;
    };
    
    console.log(`[Middleware] Session verified for user: ${decoded.email} with role: ${decoded.role || 'none'} on route ${pathname}`);
    
    // Check role-based access for admin routes
    if (adminRoutes.some(route => pathname.startsWith(route)) && decoded.role !== 'admin') {
      console.log(`[Middleware] Unauthorized access to admin route ${pathname} by user ${decoded.email} with role ${decoded.role || 'none'}`);
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
    
    // Check role-based access for manager routes
    if (managerRoutes.some(route => pathname.startsWith(route)) && 
        decoded.role !== 'admin' && decoded.role !== 'manager') {
      console.log(`[Middleware] Unauthorized access to manager route ${pathname} by user ${decoded.email} with role ${decoded.role || 'none'}`);
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
    
    // If verification succeeded and role checks passed, allow the request
    return NextResponse.next();
  } catch (error) {
    console.error(`[Middleware] Session verification failed for ${pathname}:`, error);
    // If verification failed, clear the invalid cookie and redirect to sign-in
    const response = NextResponse.redirect(new URL(`/sign-in?error=invalid-session&redirect=${encodeURIComponent(pathname)}`, request.url));
    response.cookies.delete("session");
    return response;
  }
}

// Configure which paths the middleware should run on
export const config = {
  matcher: [
    // Protected routes
    "/dashboard/:path*",
    "/settings/:path*",
    "/profile/:path*",
    "/api/admin/:path*",
    
    // Auth routes (for redirecting already authenticated users)
    "/sign-in",
    "/sign-up",
  ],
}; 