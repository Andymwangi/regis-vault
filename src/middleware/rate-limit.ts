'use server';

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { isRateLimited } from '@/lib/redis/rate-limit';
import { account } from '@/lib/appwrite/config';

export async function rateLimitMiddleware(
  request: NextRequest,
  endpoint: string
) {
  // Try to get the user from Appwrite
  let identifier;
  try {
    const currentUser = await account.get();
    identifier = currentUser.$id;
  } catch (error) {
    // Use IP address as identifier if no user is authenticated
    identifier = request.headers.get('x-forwarded-for')?.split(',')[0] || 'anonymous';
  }
  
  try {
    const { limited, remaining } = await isRateLimited(endpoint, identifier);
    
    if (limited) {
      return new NextResponse(
        JSON.stringify({
          error: 'Too many requests',
          message: 'Please try again later',
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'X-RateLimit-Remaining': remaining.toString(),
            'X-RateLimit-Reset': Math.ceil(Date.now() / 1000).toString(),
          },
        }
      );
    }
    
    // Add rate limit headers to the response
    const response = NextResponse.next();
    response.headers.set('X-RateLimit-Remaining', remaining.toString());
    response.headers.set('X-RateLimit-Reset', Math.ceil(Date.now() / 1000).toString());
    
    return response;
  } catch (error) {
    console.error('Rate limiting error:', error);
    // If Redis is down, allow the request to proceed
    return NextResponse.next();
  }
} 