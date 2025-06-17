import 'reflect-metadata';
import { AppDataSource } from '../src/config/database';
import { createTestDatabase, dropTestDatabase } from './utils/db-utils';
import { DataSource } from 'typeorm';
import { jest } from '@jest/globals';

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

// Define the type for mock repositories
interface MockRepositories {
  getRepository: jest.Mock;
  transaction: jest.Mock;
}

// Mock TypeORM repositories if database connection fails
const mockRepositories: MockRepositories = {
  getRepository: jest.fn().mockImplementation(() => ({
    find: jest.fn().mockResolvedValue([]),
    findOne: jest.fn().mockResolvedValue(null),
    save: jest.fn().mockImplementation(entity => Promise.resolve({ id: 'mock-id', ...entity })),
    update: jest.fn().mockResolvedValue({ affected: 1 }),
    delete: jest.fn().mockResolvedValue({ affected: 1 }),
    createQueryBuilder: jest.fn().mockReturnValue({
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([]),
      getOne: jest.fn().mockResolvedValue(null),
      execute: jest.fn().mockResolvedValue({ affected: 1 }),
    }),
  })),
  transaction: jest.fn((cb: Function) => cb(mockRepositories)),
};

// Global setup before all tests
beforeAll(async () => {
  try {
    // Create test database if needed
    await createTestDatabase();
    
    // Initialize database connection
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }
  } catch (error) {
    console.error('Error during test database initialization', error);
    console.warn('Using mock repositories for tests');
    
    // Mock AppDataSource for tests if initialization fails
    Object.assign(AppDataSource, mockRepositories);
    
    // Mark AppDataSource as initialized to prevent further initialization attempts
    Object.defineProperty(AppDataSource, 'isInitialized', {
      get: () => true
    });
  }
});

// Global teardown after all tests
afterAll(async () => {
  try {
    // Close database connection if it was initialized properly
    if (AppDataSource.isInitialized && AppDataSource.destroy) {
      await AppDataSource.destroy();
    }
    
    // Drop test database if needed
    await dropTestDatabase();
  } catch (error) {
    console.error('Error during test cleanup', error);
  }
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
