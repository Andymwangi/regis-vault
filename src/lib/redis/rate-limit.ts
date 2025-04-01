import { Redis } from '@upstash/redis';
import { rateLimits } from '@/server/db/schema/schema';
import { db } from '@/lib/db';
import { eq } from 'drizzle-orm';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

export interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

export async function getRateLimitConfig(endpoint: string): Promise<RateLimitConfig> {
  const config = await db
    .select({
      maxRequests: rateLimits.maxRequests,
      windowMs: rateLimits.windowMs,
    })
    .from(rateLimits)
    .where(eq(rateLimits.endpoint, endpoint))
    .limit(1);

  if (!config.length) {
    // Default rate limit if not configured
    return {
      maxRequests: 100,
      windowMs: 60 * 1000, // 1 minute
    };
  }

  return config[0];
}

export async function isRateLimited(
  endpoint: string,
  identifier: string
): Promise<{ limited: boolean; remaining: number }> {
  const config = await getRateLimitConfig(endpoint);
  const key = `rate_limit:${endpoint}:${identifier}`;

  // Use Redis REST client for atomic operations
  const multi = redis.pipeline();
  multi.incr(key);
  multi.expire(key, Math.ceil(config.windowMs / 1000));
  multi.ttl(key);

  const [count, , ttl] = await multi.exec();
  const currentCount = count as number;

  return {
    limited: currentCount > config.maxRequests,
    remaining: Math.max(0, config.maxRequests - currentCount),
  };
}

export async function resetRateLimit(endpoint: string, identifier: string): Promise<void> {
  const key = `rate_limit:${endpoint}:${identifier}`;
  await redis.del(key);
}

export async function updateRateLimitConfig(
  endpoint: string,
  config: RateLimitConfig
): Promise<void> {
  await db
    .insert(rateLimits)
    .values({
      endpoint,
      maxRequests: config.maxRequests,
      windowMs: config.windowMs,
      description: `Rate limit for ${endpoint}`,
    })
    .onConflictDoUpdate({
      target: rateLimits.endpoint,
      set: {
        maxRequests: config.maxRequests,
        windowMs: config.windowMs,
        updatedAt: new Date(),
      },
    });
} 