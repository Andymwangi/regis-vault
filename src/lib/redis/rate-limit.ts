import { Redis } from '@upstash/redis';
import { createAdminClient } from '@/lib/appwrite';
import { fullConfig } from '@/lib/appwrite/config';
import { ID, Query } from 'node-appwrite';

// Create Redis client with error handling
let redis: Redis | null = null;
let redisConnected = false;

try {
  const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;
  
  if (!redisUrl || !redisToken) {
    console.warn('Redis URL or token not provided, rate limiting will be disabled');
  } else {
    // Initialize Redis with retry configuration
    redis = new Redis({
      url: redisUrl,
      token: redisToken,
      retry: {
        retries: 3,
        backoff: (retryCount) => Math.min(Math.exp(retryCount) * 50, 1000)
      }
    });
    
    // Test the connection
    redis.ping()
      .then(() => {
        console.log('Redis client initialized successfully and connected');
        redisConnected = true;
      })
      .catch(err => {
        console.error('Redis connection test failed:', err);
        redisConnected = false;
      });
  }
} catch (error) {
  console.error('Failed to initialize Redis client:', error);
  redisConnected = false;
}

// Helper function to check Redis connection before operations
async function withRedis<T>(fallback: T, operation: () => Promise<T>): Promise<T> {
  if (!redis || !redisConnected) {
    return fallback;
  }
  
  try {
    return await operation();
  } catch (error) {
    console.error('Redis operation failed:', error);
    // Try to ping Redis to check connection
    try {
      await redis.ping();
    } catch (pingError) {
      redisConnected = false;
      console.error('Redis connection lost:', pingError);
    }
    return fallback;
  }
}

export interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

export async function getRateLimitConfig(endpoint: string): Promise<RateLimitConfig> {
  try {
    const { databases } = await createAdminClient();
    
    const result = await databases.listDocuments(
      fullConfig.databaseId,
      fullConfig.appSettingsCollectionId,
      [Query.equal('key', [`rate_limit_${endpoint}`])]
    );
    
    if (result.documents.length > 0) {
      const config = result.documents[0].value;
      return {
        maxRequests: config.maxRequests || 100,
        windowMs: config.windowMs || 60 * 1000
      };
    }
    
    // Default rate limit if not configured
    return {
      maxRequests: 100,
      windowMs: 60 * 1000, // 1 minute
    };
  } catch (error) {
    console.error('Error getting rate limit config:', error);
    // Return default if error
    return {
      maxRequests: 100,
      windowMs: 60 * 1000, // 1 minute
    };
  }
}

export async function isRateLimited(
  endpoint: string,
  identifier: string
): Promise<{ limited: boolean; remaining: number }> {
  try {
    // Get rate limit config
    const config = await getRateLimitConfig(endpoint);
    
    return await withRedis(
      { limited: false, remaining: config.maxRequests },
      async () => {
        const key = `rate_limit:${endpoint}:${identifier}`;
        
        // Use Redis REST client for atomic operations
        const multi = redis!.pipeline();
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
    );
  } catch (error) {
    console.error('Rate limiting error:', error);
    // If any error occurs, don't rate limit
    return { limited: false, remaining: 100 };
  }
}

export async function resetRateLimit(endpoint: string, identifier: string): Promise<void> {
  if (!redis) return; // Skip if Redis not available
  
  try {
    const key = `rate_limit:${endpoint}:${identifier}`;
    await redis.del(key);
  } catch (error) {
    console.error('Error resetting rate limit:', error);
  }
}

export async function updateRateLimitConfig(
  endpoint: string,
  config: RateLimitConfig
): Promise<void> {
  try {
    const { databases } = await createAdminClient();
    
    // Check if config exists
    const result = await databases.listDocuments(
      fullConfig.databaseId,
      fullConfig.appSettingsCollectionId,
      [Query.equal('key', [`rate_limit_${endpoint}`])]
    );
    
    if (result.documents.length > 0) {
      // Update existing config
      await databases.updateDocument(
        fullConfig.databaseId,
        fullConfig.appSettingsCollectionId,
        result.documents[0].$id,
        {
          value: config,
          updatedAt: new Date().toISOString()
        }
      );
    } else {
      // Create new config
      await databases.createDocument(
        fullConfig.databaseId,
        fullConfig.appSettingsCollectionId,
        ID.unique(),
        {
          key: `rate_limit_${endpoint}`,
          value: config,
          description: `Rate limit for ${endpoint}`,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      );
    }
  } catch (error) {
    console.error('Error updating rate limit config:', error);
  }
} 