import { Express } from 'express';
import supertest from 'supertest';
import { AppDataSource } from '../../src/config/database';
import { createTestUser, createTestEvent, createTestSeats, cleanupTestData } from '../utils/test-fixtures';
import { executeConcurrentRequests, delay, advanceTime } from '../utils/concurrency-utils';
import { User } from '../../src/models/User.model';
import { Event } from '../../src/models/Event.model';
import { Seat } from '../../src/models/Seat.model';
import { Booking } from '../../src/models/Booking.model';
import { Payment } from '../../src/models/Payment.model';
import { PaymentMethod } from '../../src/types/common.types';
import { BookingStatus } from '../../src/types/common.types';
import { sign } from 'jsonwebtoken';
import app from '../../src/app';
import { jest, describe, it, expect, beforeAll, afterAll } from '@jest/globals';

// Check if we're running in a mock environment
const isMockEnvironment = process.env.NODE_ENV === 'test' && !process.env.RAZORPAY_KEY_ID;

describe('Booking Flow Integration Tests', () => {
  let testUsers: User[] = [];
  let testEvent: Event;
  let testSeats: Seat[] = [];
  let testBookings: Booking[] = [];
  let authTokens: Record<string, string> = {};

  beforeAll(async () => {
    // Create test users
    testUsers = await Promise.all([
      createTestUser({ name: 'Test User 1', email: 'test1@example.com' }),
      createTestUser({ name: 'Test User 2', email: 'test2@example.com' })
    ]);

    // Create auth tokens
    testUsers.forEach(user => {
      authTokens[user.id] = sign({ id: user.id }, process.env.JWT_SECRET || 'test-secret', { expiresIn: '1h' });
    });

    // Create test event
    testEvent = await createTestEvent({
      title: 'Test Event',
      price: 50
    });

    // Create test seats
    testSeats = await createTestSeats(testEvent.id, 20);
  });

  afterAll(async () => {
    await cleanupTestData(testUsers, testEvent, testSeats, testBookings);
  });

  describe('End-to-End Booking Flow', () => {
    // Skip tests that require Razorpay in mock environment
    const testFn = isMockEnvironment ? it.skip : it;
    
    testFn('should successfully complete the booking flow', async () => {
      const user = testUsers[0];
      const token = authTokens[user.id];
      const selectedSeats = testSeats.slice(0, 2); // Select first 2 seats
      
      // Step 1: Reserve seats temporarily
      const reserveResponse = await supertest(app)
        .post('/api/bookings/reserve-seats')
        .set('Authorization', `Bearer ${token}`)
        .send({
          eventId: testEvent.id,
          seatIds: selectedSeats.map(seat => seat.id)
        });
      
      expect(reserveResponse.status).toBe(200);
      expect(reserveResponse.body.success).toBe(true);
      expect(reserveResponse.body.data).toHaveLength(2);
      
      // Step 2: Create booking with payment
      // For testing, we'll mock the Razorpay payment verification
      const bookingResponse = await supertest(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${token}`)
        .send({
          eventId: testEvent.id,
          seatIds: selectedSeats.map(seat => seat.id),
          paymentMethod: PaymentMethod.CREDIT_CARD,
          paymentDetails: {
            razorpayOrderId: 'order_test123',
            razorpayPaymentId: 'pay_test123',
            razorpaySignature: 'valid_signature'
          }
        });
      
      // Mock the verification in the service
      jest.spyOn(require('../../src/services/payment.service').PaymentService.prototype, 'verifyPaymentSignature')
        .mockReturnValue(true);
      
      expect(bookingResponse.status).toBe(201);
      expect(bookingResponse.body.success).toBe(true);
      expect(bookingResponse.body.data).toHaveProperty('id');
      expect(bookingResponse.body.data.status).toBe(BookingStatus.CONFIRMED);
      
      // Store booking for cleanup
      const bookingId = bookingResponse.body.data.id;
      const bookingRepo = AppDataSource.getRepository(Booking);
      const booking = await bookingRepo.findOne({ where: { id: bookingId } });
      if (booking) {
        testBookings.push(booking);
      }
    });
  });

  describe('Concurrent Booking Scenarios', () => {
    // Skip tests that require Razorpay in mock environment
    const testFn = isMockEnvironment ? it.skip : it;
    
    testFn('should handle concurrent booking attempts for the same seats', async () => {
      const user1 = testUsers[0];
      const user2 = testUsers[1];
      const token1 = authTokens[user1.id];
      const token2 = authTokens[user2.id];
      
      // Select seats that haven't been booked yet
      const availableSeats = testSeats.filter(seat => !seat.bookingId);
      const selectedSeats = availableSeats.slice(0, 2);
      
      // Prepare concurrent requests
      const requests = [
        {
          method: 'post' as const,
          url: '/api/bookings',
          token: token1,
          body: {
            eventId: testEvent.id,
            seatIds: selectedSeats.map(seat => seat.id),
            paymentMethod: PaymentMethod.CREDIT_CARD,
            paymentDetails: {
              razorpayOrderId: 'order_test123',
              razorpayPaymentId: 'pay_test123',
              razorpaySignature: 'valid_signature'
            }
          }
        },
        {
          method: 'post' as const,
          url: '/api/bookings',
          token: token2,
          body: {
            eventId: testEvent.id,
            seatIds: selectedSeats.map(seat => seat.id),
            paymentMethod: PaymentMethod.WALLET,
            paymentDetails: {}
          }
        }
      ];
      
      // Mock the verification in the service
      jest.spyOn(require('../../src/services/payment.service').PaymentService.prototype, 'verifyPaymentSignature')
        .mockReturnValue(true);
      
      // Execute concurrent requests
      const responses = await executeConcurrentRequests(app, requests);
      
      // Check results
      const successResponses = responses.filter(r => r.status === 201 && r.body.success === true);
      const failureResponses = responses.filter(r => r.status !== 201 || r.body.success !== true);
      
      // Exactly one request should succeed and one should fail
      expect(successResponses.length).toBe(1);
      expect(failureResponses.length).toBe(1);
      
      // Store booking for cleanup
      if (successResponses.length > 0) {
        const bookingId = successResponses[0].body.data.id;
        const bookingRepo = AppDataSource.getRepository(Booking);
        const booking = await bookingRepo.findOne({ where: { id: bookingId } });
        if (booking) {
          testBookings.push(booking);
        }
      }
    });

    testFn('should release seats after reservation timeout', async () => {
      const user = testUsers[0];
      const token = authTokens[user.id];
      
      // Select seats that haven't been booked yet
      const availableSeats = testSeats.filter(seat => !seat.bookingId);
      const selectedSeats = availableSeats.slice(0, 2);
      
      // Step 1: Reserve seats temporarily
      const reserveResponse = await supertest(app)
        .post('/api/bookings/reserve-seats')
        .set('Authorization', `Bearer ${token}`)
        .send({
          eventId: testEvent.id,
          seatIds: selectedSeats.map(seat => seat.id)
        });
      
      expect(reserveResponse.status).toBe(200);
      expect(reserveResponse.body.success).toBe(true);
      
      // Step 2: Simulate timeout by advancing time
      await advanceTime(11 * 60 * 1000); // 11 minutes
      
      // Step 3: Another user tries to reserve the same seats
      const user2 = testUsers[1];
      const token2 = authTokens[user2.id];
      
      const reserveResponse2 = await supertest(app)
        .post('/api/bookings/reserve-seats')
        .set('Authorization', `Bearer ${token2}`)
        .send({
          eventId: testEvent.id,
          seatIds: selectedSeats.map(seat => seat.id)
        });
      
      // Should succeed because the first reservation has timed out
      expect(reserveResponse2.status).toBe(200);
      expect(reserveResponse2.body.success).toBe(true);
      
      // Step 4: Complete the booking
      const bookingResponse = await supertest(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${token2}`)
        .send({
          eventId: testEvent.id,
          seatIds: selectedSeats.map(seat => seat.id),
          paymentMethod: PaymentMethod.CREDIT_CARD,
          paymentDetails: {
            razorpayOrderId: 'order_test123',
            razorpayPaymentId: 'pay_test123',
            razorpaySignature: 'valid_signature'
          }
        });
      
      // Mock the verification in the service
      jest.spyOn(require('../../src/services/payment.service').PaymentService.prototype, 'verifyPaymentSignature')
        .mockReturnValue(true);
      
      expect(bookingResponse.status).toBe(201);
      expect(bookingResponse.body.success).toBe(true);
      
      // Store booking for cleanup
      const bookingId = bookingResponse.body.data.id;
      const bookingRepo = AppDataSource.getRepository(Booking);
      const booking = await bookingRepo.findOne({ where: { id: bookingId } });
      if (booking) {
        testBookings.push(booking);
      }
    });
  });
  
  describe('Payment Failure Scenario', () => {
    it('should release seats when payment fails', async () => {
      const user = testUsers[0];
      const token = authTokens[user.id];
      
      // Select seats that haven't been booked yet
      const availableSeats = testSeats.filter(seat => !seat.bookingId);
      const selectedSeats = availableSeats.slice(0, 2);
      
      // Step 1: Reserve seats temporarily
      const reserveResponse = await supertest(app)
        .post('/api/bookings/reserve-seats')
        .set('Authorization', `Bearer ${token}`)
        .send({
          eventId: testEvent.id,
          seatIds: selectedSeats.map(seat => seat.id)
        });
      
      expect(reserveResponse.status).toBe(200);
      expect(reserveResponse.body.success).toBe(true);
      
      // Step 2: Attempt booking with invalid payment details
      // Mock the verification in the service to return false
      jest.spyOn(require('../../src/services/payment.service').PaymentService.prototype, 'verifyPaymentSignature')
        .mockReturnValue(false);
      
      const bookingResponse = await supertest(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${token}`)
        .send({
          eventId: testEvent.id,
          seatIds: selectedSeats.map(seat => seat.id),
          paymentMethod: PaymentMethod.CREDIT_CARD,
          paymentDetails: {
            razorpayOrderId: 'order_test123',
            razorpayPaymentId: 'pay_test123',
            razorpaySignature: 'invalid_signature'
          }
        });
      
      // Payment should fail
      expect(bookingResponse.status).toBe(400);
      expect(bookingResponse.body.success).toBe(false);
      
      // Step 3: Verify seats are released
      await delay(500); // Wait a bit for async operations
      
      // Check that seats are available again
      for (const seat of selectedSeats) {
        const seatRepo = AppDataSource.getRepository(Seat);
        const updatedSeat = await seatRepo.findOne({ where: { id: seat.id } });
        expect(updatedSeat?.bookingId).toBeNull();
        expect(updatedSeat?.status).toBe('available');
      }
    });
  });
}); 