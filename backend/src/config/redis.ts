import Redis from 'ioredis';
import config from './index';

export const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  maxRetriesPerRequest: 3,
});

export const connectRedis = async (): Promise<void> => {
  return new Promise((resolve, reject) => {
    redis.on('error', (error) => {
      console.error('Redis connection error:', error);
      reject(error);
    });

    redis.on('connect', () => {
      console.log('Connected to Redis');
      resolve();
    });
  });
};
