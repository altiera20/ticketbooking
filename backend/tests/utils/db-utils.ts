import { Client } from 'pg';
import config from '../../src/config';

// Test database name
const TEST_DB_NAME = `${config.db.database}_test`;
// Flag to indicate if we should skip database creation
let skipDbCreation = false;

/**
 * Create a test database if it doesn't exist
 */
export async function createTestDatabase(): Promise<void> {
  // If we already know we don't have permissions, skip this
  if (skipDbCreation) {
    console.log('Skipping test database creation due to previous permission error');
    // Still set the database name for tests
    config.db.database = TEST_DB_NAME;
    return;
  }

  // Connect to default postgres database
  const client = new Client({
    host: config.db.host,
    port: config.db.port,
    user: config.db.username,
    password: config.db.password,
    database: 'postgres', // Connect to default database
  });

  try {
    await client.connect();

    // Check if test database exists
    const checkResult = await client.query(
      `SELECT 1 FROM pg_database WHERE datname = $1`,
      [TEST_DB_NAME]
    );

    // Create test database if it doesn't exist
    if (checkResult.rowCount === 0) {
      console.log(`Creating test database: ${TEST_DB_NAME}`);
      try {
        await client.query(`CREATE DATABASE ${TEST_DB_NAME}`);
      } catch (err: any) {
        if (err.code === '42501') { // Permission denied error code
          console.warn('Permission denied to create database. Using mock database for tests.');
          skipDbCreation = true;
        } else {
          throw err;
        }
      }
    } else {
      console.log(`Test database ${TEST_DB_NAME} already exists`);
    }
  } catch (error) {
    console.error('Error checking test database:', error);
    // Don't throw error, just mark to skip database operations
    skipDbCreation = true;
  } finally {
    await client.end();
  }

  // Override database configuration for tests
  config.db.database = TEST_DB_NAME;
}

/**
 * Drop the test database
 */
export async function dropTestDatabase(): Promise<void> {
  // Skip if we don't have permissions
  if (skipDbCreation || process.env.PRESERVE_TEST_DB === 'true') {
    console.log('Skipping test database drop');
    return;
  }

  // Connect to default postgres database
  const client = new Client({
    host: config.db.host,
    port: config.db.port,
    user: config.db.username,
    password: config.db.password,
    database: 'postgres', // Connect to default database
  });

  try {
    await client.connect();

    // Terminate all connections to the test database
    await client.query(
      `SELECT pg_terminate_backend(pg_stat_activity.pid)
       FROM pg_stat_activity
       WHERE pg_stat_activity.datname = $1
       AND pid <> pg_backend_pid()`,
      [TEST_DB_NAME]
    );

    // Drop the test database
    console.log(`Dropping test database: ${TEST_DB_NAME}`);
    await client.query(`DROP DATABASE IF EXISTS ${TEST_DB_NAME}`);
  } catch (error) {
    console.error('Error dropping test database:', error);
    // Don't throw error
  } finally {
    await client.end();
  }
}

/**
 * Clear all tables in the test database
 */
export async function clearTestDatabase(client: any): Promise<void> {
  try {
    // Disable foreign key checks
    await client.query('SET session_replication_role = replica;');

    // Get all tables
    const tablesResult = await client.query(
      `SELECT tablename FROM pg_tables 
       WHERE schemaname = 'public' AND tablename != 'migrations'`
    );

    // Truncate all tables
    for (const row of tablesResult.rows) {
      await client.query(`TRUNCATE TABLE "${row.tablename}" CASCADE`);
    }

    // Enable foreign key checks
    await client.query('SET session_replication_role = DEFAULT;');
  } catch (error) {
    console.error('Error clearing test database:', error);
    throw error;
  }
}

/**
 * Generate a unique identifier for test isolation
 */
export function generateTestId(): string {
  return `test_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
} 