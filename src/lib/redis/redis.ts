import { Redis } from '@upstash/redis'

let redisClient: Redis | null = null

export async function getRedisInstance() {
  if (redisClient) return redisClient
  
  redisClient = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL || '',
    token: process.env.UPSTASH_REDIS_REST_TOKEN || '',
  })
  
  return redisClient
}