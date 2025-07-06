import Redis from 'ioredis';
import config from './index';

// Create a mock Redis client that logs operations instead of performing them
class MockRedis {
  private logPrefix: string = '[MockRedis]';

  async ping(): Promise<string> {
    console.log(`${this.logPrefix} PING -> PONG (mocked)`);
    return 'PONG';
  }

  // Add other Redis methods as needed
  async get(key: string): Promise<string | null> {
    console.log(`${this.logPrefix} GET ${key} -> null (mocked)`);
    return null;
  }

  async set(key: string, value: string): Promise<string> {
    console.log(`${this.logPrefix} SET ${key} ${value} -> OK (mocked)`);
    return 'OK';
  }

  async setex(key: string, seconds: number, value: string): Promise<string> {
    console.log(`${this.logPrefix} SETEX ${key} ${seconds} ${value} -> OK (mocked)`);
    return 'OK';
  }

  async del(key: string): Promise<number> {
    console.log(`${this.logPrefix} DEL ${key} -> 0 (mocked)`);
    return 0;
  }

  async expire(key: string, seconds: number): Promise<number> {
    console.log(`${this.logPrefix} EXPIRE ${key} ${seconds} -> 1 (mocked)`);
    return 1;
  }

  // Add event emitter methods to prevent errors
  on(event: string, callback: Function): void {
    console.log(`${this.logPrefix} Event listener registered for ${event} (mocked)`);
  }
}

// Try to create a real Redis client, fall back to mock if it fails
let redisClient: Redis | MockRedis;

try {
  redisClient = new Redis({
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD,
    maxRetriesPerRequest: 3,
    connectTimeout: 5000, // 5 seconds timeout
  });
} catch (error) {
  console.warn('Failed to create Redis client, using mock implementation');
  redisClient = new MockRedis();
}

export const redis = redisClient;

export const connectRedis = async (): Promise<void> => {
  try {
    await redis.ping();
  } catch (error) {
    // Throw the error instead of exiting the process
    throw new Error(`Redis connection failed: ${error instanceof Error ? error.message : String(error)}`);
  }
};
