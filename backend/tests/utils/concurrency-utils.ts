import supertest from 'supertest';
import { Express } from 'express';

/**
 * Execute multiple requests concurrently
 * @param app Express application
 * @param requests Array of request configurations
 * @returns Array of responses
 */
export async function executeConcurrentRequests<T = any>(
  app: Express,
  requests: Array<{
    method: 'get' | 'post' | 'put' | 'delete' | 'patch';
    url: string;
    token?: string;
    body?: any;
  }>
): Promise<Array<{ status: number; body: T }>> {
  // Create an array of promises for each request
  const requestPromises = requests.map(req => {
    let request = supertest(app)[req.method](req.url);
    
    // Add authorization header if token is provided
    if (req.token) {
      request = request.set('Authorization', `Bearer ${req.token}`);
    }
    
    // Add body if provided
    if (req.body) {
      request = request.send(req.body);
    }
    
    // Execute the request and return status and body
    return request.then(response => ({
      status: response.status,
      body: response.body,
    }));
  });
  
  // Execute all requests concurrently
  return Promise.all(requestPromises);
}

/**
 * Simulate a delay
 * @param ms Milliseconds to delay
 */
export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Execute a function with retry logic
 * @param fn Function to execute
 * @param maxRetries Maximum number of retries
 * @param retryDelay Delay between retries in milliseconds
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  retryDelay: number = 500
): Promise<T> {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;
      
      // Wait before retrying
      if (attempt < maxRetries - 1) {
        await delay(retryDelay);
      }
    }
  }
  
  throw lastError || new Error('Function failed after maximum retries');
}

/**
 * Mock the current time for testing timeouts
 * @param targetDate Date to set as current time
 */
export function mockTime(targetDate: Date): () => void {
  const originalDate = global.Date;
  const mockDate = class extends Date {
    constructor(...args: any[]) {
      if (args.length === 0) {
        super(targetDate);
      } else {
        // @ts-ignore
        super(...args);
      }
    }
    
    static now() {
      return targetDate.getTime();
    }
  };
  
  // @ts-ignore
  global.Date = mockDate;
  
  // Return function to restore original Date
  return () => {
    global.Date = originalDate;
  };
}

/**
 * Execute a function after advancing the mocked time
 * @param ms Milliseconds to advance
 * @param fn Function to execute
 */
export async function advanceTime<T>(
  ms: number,
  fn: () => Promise<T>
): Promise<T> {
  const now = new Date();
  const future = new Date(now.getTime() + ms);
  
  const restoreTime = mockTime(future);
  try {
    return await fn();
  } finally {
    restoreTime();
  }
} 