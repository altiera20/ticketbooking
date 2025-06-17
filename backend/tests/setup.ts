import 'reflect-metadata';
import { AppDataSource } from '../src/config/database';
import { createTestDatabase, dropTestDatabase } from './utils/db-utils';

// Set test environment
process.env.NODE_ENV = 'test';

// Mock Redis
jest.mock('../src/config/redis', () => ({
  redis: {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    expire: jest.fn(),
  },
}));

// Global setup before all tests
beforeAll(async () => {
  // Create test database if needed
  await createTestDatabase();
  
  // Initialize database connection
  try {
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }
  } catch (error) {
    console.error('Error during test database initialization', error);
    throw error;
  }
});

// Global teardown after all tests
afterAll(async () => {
  // Close database connection
  if (AppDataSource.isInitialized) {
    await AppDataSource.destroy();
  }
  
  // Drop test database if needed
  await dropTestDatabase();
});

// Global setup before each test
beforeEach(() => {
  jest.clearAllMocks();
});

// Extend Jest matchers
expect.extend({
  toBeWithinRange(received: number, floor: number, ceiling: number) {
    const pass = received >= floor && received <= ceiling;
    if (pass) {
      return {
        message: () => `expected ${received} not to be within range ${floor} - ${ceiling}`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be within range ${floor} - ${ceiling}`,
        pass: false,
      };
    }
  },
});
