import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { isRateLimited } from '@/lib/redis/rate-limit';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';

export async function rateLimitMiddleware(
  request: NextRequest,
  endpoint: string
) {
  // Get the user's session
  const session = await getServerSession(authOptions);
  
  // Use IP address as identifier if no session
  const identifier = session?.user?.id || 
    request.headers.get('x-forwarded-for')?.split(',')[0] || 
    'anonymous';
  
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