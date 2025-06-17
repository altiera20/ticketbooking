# Universal Ticket Booking System - Test Suite

This directory contains automated tests for the Universal Ticket Booking System, with a focus on the booking pipeline and edge cases.

## Test Structure

```
tests/
├── integration/             # Integration tests
│   └── bookingFlow.test.ts  # End-to-end booking flow tests
├── unit/                    # Unit tests
│   ├── payment.service.test.ts  # Payment service tests
│   └── seatService.test.ts  # Seat reservation logic tests
├── utils/                   # Test utilities
│   ├── concurrency-utils.ts # Utilities for testing concurrent scenarios
│   ├── db-utils.ts          # Database utilities for testing
│   └── test-fixtures.ts     # Test data fixtures
├── setup.ts                 # Global test setup
└── README.md                # This file
```

## Test Coverage

The test suite covers the following scenarios:

### Unit Tests

- **Seat Service Tests**: Tests for seat reservation logic, including:
  - Successful seat reservation
  - Handling already reserved seats
  - Handling concurrent reservations
  - Reservation timeout and cleanup

- **Payment Service Tests**: Tests for payment processing, including:
  - Credit card payments
  - Wallet payments
  - Payment failures
  - Refunds

### Integration Tests

- **End-to-End Booking Flow**: Complete booking process from seat selection to confirmation
- **Concurrent Booking Scenarios**: Multiple users attempting to book the same seats
- **Reservation Timeout**: Seats being released after reservation expiry
- **Payment Failure**: Proper cleanup when payment fails

## Running Tests

### Prerequisites

1. Node.js and npm installed
2. PostgreSQL database server running
3. Environment variables configured (see `.env.example`)

### Setup

1. Install dependencies:
   ```
   npm install
   ```

2. Create a test database (automatically handled by the test setup)

### Running All Tests

```
npm test
```

### Running Specific Test Files

```
npm test -- tests/unit/seatService.test.ts
npm test -- tests/integration/bookingFlow.test.ts
```

### Running Tests with Coverage

```
npm test -- --coverage
```

## Test Environment

The tests use:

- Jest as the test runner
- Supertest for API testing
- Mock time utilities for testing timeouts without waiting
- Concurrent request utilities for testing race conditions

## Handling Concurrency Tests

The concurrency tests simulate multiple users attempting to book the same seats simultaneously. These tests use the `executeConcurrentRequests` utility to send multiple requests at the same time.

Since concurrency tests can sometimes be flaky due to their non-deterministic nature, the tests are designed to:

1. Assert on the final state (only one booking succeeds)
2. Clean up properly even if tests fail
3. Use proper isolation to avoid interference between tests

## Simulating Timeouts

Instead of waiting for actual timeouts (e.g., 15 minutes for seat reservation expiry), the tests use time mocking utilities to simulate the passage of time. This allows testing timeout scenarios quickly and deterministically.

## Database Isolation

Each test run creates a separate test database to ensure isolation. The database is automatically created before tests run and can be optionally preserved after tests for debugging (set `PRESERVE_TEST_DB=true` environment variable).

## Troubleshooting

If tests are failing, check:

1. Database connection settings in `.env` file
2. PostgreSQL server is running
3. JWT secrets are properly configured
4. Redis server is running (if used)

For flaky concurrency tests, try increasing the timeout value:

```
npm test -- --testTimeout=30000
``` 