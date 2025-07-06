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
import { jest, describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';

// Mock Razorpay for testing
jest.mock('razorpay', () => {
  return jest.fn().mockImplementation(() => {
    return {
      orders: {
        create: jest.fn().mockResolvedValue({ 
          id: 'order_test123',
          amount: 10000,
          currency: 'INR',
          receipt: 'receipt_test123',
          status: 'created'
        })
      },
      payments: {
        refund: jest.fn().mockResolvedValue({ 
          id: 'ref_test123',
          payment_id: 'pay_test123',
          amount: 10000,
          status: 'processed'
        })
      }
    };
  });
});

// Mock crypto for signature verification
jest.mock('crypto', () => {
  const originalModule = jest.requireActual('crypto');
  return {
    ...originalModule,
    createHmac: jest.fn().mockReturnValue({
      update: jest.fn().mockReturnThis(),
      digest: jest.fn().mockReturnValue('valid_signature')
    })
  };
});

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
      authTokens[user.id] = sign({ id: user.id }, process.env.JWT_ACCESS_SECRET || 'test-secret', { expiresIn: '1h' });
    });

    // Create test event
    testEvent = await createTestEvent({
      title: 'Test Event',
      price: 50
    });

    // Create test seats
    testSeats = await createTestSeats(testEvent.id, 20);
  });

  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();
    
    // Mock the verification in the service
    jest.spyOn(require('../../src/services/payment.service').PaymentService.prototype, 'verifyPaymentSignature')
      .mockReturnValue(true);
  });

  afterAll(async () => {
    await cleanupTestData(testUsers, testEvent, testSeats, testBookings);
  });

  describe('End-to-End Booking Flow', () => {
    it('should successfully complete the booking flow with Razorpay', async () => {
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
      
      // Step 2: Create a payment order
      const orderResponse = await supertest(app)
        .post('/api/payments/order')
        .set('Authorization', `Bearer ${token}`)
        .send({
          amount: 100,
          currency: 'INR',
          receipt: `receipt_${Date.now()}`
        });
      
      expect(orderResponse.status).toBe(200);
      expect(orderResponse.body.success).toBe(true);
      expect(orderResponse.body.data).toHaveProperty('id');
      
      const orderId = orderResponse.body.data.id;
      
      // Step 3: Create booking with payment
      const bookingResponse = await supertest(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${token}`)
        .send({
          eventId: testEvent.id,
          seatIds: selectedSeats.map(seat => seat.id),
          paymentMethod: PaymentMethod.CREDIT_CARD,
          paymentDetails: {
            razorpayOrderId: orderId,
            razorpayPaymentId: 'pay_test123',
            razorpaySignature: 'valid_signature'
          }
        });
      
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
      
      // Step 4: Verify payment
      const verifyResponse = await supertest(app)
        .post('/api/payments/verify')
        .set('Authorization', `Bearer ${token}`)
        .send({
          razorpay_order_id: orderId,
          razorpay_payment_id: 'pay_test123',
          razorpay_signature: 'valid_signature'
        });
      
      expect(verifyResponse.status).toBe(200);
      expect(verifyResponse.body.success).toBe(true);
    });
    
    it('should handle payment verification failure', async () => {
      const user = testUsers[0];
      const token = authTokens[user.id];
      const selectedSeats = testSeats.slice(2, 4); // Select next 2 seats
      
      // Mock the verification to fail
      jest.spyOn(require('../../src/services/payment.service').PaymentService.prototype, 'verifyPaymentSignature')
        .mockReturnValue(false);
      
      // Step 1: Reserve seats temporarily
      await supertest(app)
        .post('/api/bookings/reserve-seats')
        .set('Authorization', `Bearer ${token}`)
        .send({
          eventId: testEvent.id,
          seatIds: selectedSeats.map(seat => seat.id)
        });
      
      // Step 2: Create a payment order
      const orderResponse = await supertest(app)
        .post('/api/payments/order')
        .set('Authorization', `Bearer ${token}`)
        .send({
          amount: 100,
          currency: 'INR'
        });
      
      const orderId = orderResponse.body.data.id;
      
      // Step 3: Create booking with invalid payment signature
      const bookingResponse = await supertest(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${token}`)
        .send({
          eventId: testEvent.id,
          seatIds: selectedSeats.map(seat => seat.id),
          paymentMethod: PaymentMethod.CREDIT_CARD,
          paymentDetails: {
            razorpayOrderId: orderId,
            razorpayPaymentId: 'pay_test123',
            razorpaySignature: 'invalid_signature'
          }
        });
      
      // Should fail due to invalid signature
      expect(bookingResponse.status).toBe(400);
      expect(bookingResponse.body.success).toBe(false);
      expect(bookingResponse.body.error).toBeTruthy();
    });
  });

  describe('Concurrent Booking Scenarios', () => {
    it('should handle concurrent booking attempts for the same seats', async () => {
      const user1 = testUsers[0];
      const user2 = testUsers[1];
      const token1 = authTokens[user1.id];
      const token2 = authTokens[user2.id];
      
      // Select seats that haven't been booked yet
      const availableSeats = testSeats.filter(seat => !seat.bookingId);
      const selectedSeats = availableSeats.slice(0, 2);
      
      // Create payment orders for both users
      const orderResponse1 = await supertest(app)
        .post('/api/payments/order')
        .set('Authorization', `Bearer ${token1}`)
        .send({
          amount: 100,
          currency: 'INR'
        });
      
      const orderId1 = orderResponse1.body.data.id;
      
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
              razorpayOrderId: orderId1,
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

    it('should release seats after reservation timeout', async () => {
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
      
      // Step 4: Create payment order
      const orderResponse = await supertest(app)
        .post('/api/payments/order')
        .set('Authorization', `Bearer ${token2}`)
        .send({
          amount: 100,
          currency: 'INR'
        });
      
      const orderId = orderResponse.body.data.id;
      
      // Step 5: Complete the booking
      const bookingResponse = await supertest(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${token2}`)
        .send({
          eventId: testEvent.id,
          seatIds: selectedSeats.map(seat => seat.id),
          paymentMethod: PaymentMethod.CREDIT_CARD,
          paymentDetails: {
            razorpayOrderId: orderId,
            razorpayPaymentId: 'pay_test123',
            razorpaySignature: 'valid_signature'
          }
        });
      
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
  
  describe('Wallet Payment Flow', () => {
    it('should successfully complete booking with wallet payment', async () => {
      const user = testUsers[0];
      const token = authTokens[user.id];
      
      // Add funds to user's wallet
      const userRepo = AppDataSource.getRepository(User);
      await userRepo.update(user.id, { walletBalance: 500 });
      
      // Select seats that haven't been booked yet
      const availableSeats = testSeats.filter(seat => !seat.bookingId);
      const selectedSeats = availableSeats.slice(0, 2);
      
      // Step 1: Reserve seats
      await supertest(app)
        .post('/api/bookings/reserve-seats')
        .set('Authorization', `Bearer ${token}`)
        .send({
          eventId: testEvent.id,
          seatIds: selectedSeats.map(seat => seat.id)
        });
      
      // Step 2: Create booking with wallet payment
      const bookingResponse = await supertest(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${token}`)
        .send({
          eventId: testEvent.id,
          seatIds: selectedSeats.map(seat => seat.id),
          paymentMethod: PaymentMethod.WALLET
        });
      
      expect(bookingResponse.status).toBe(201);
      expect(bookingResponse.body.success).toBe(true);
      expect(bookingResponse.body.data.status).toBe(BookingStatus.CONFIRMED);
      
      // Store booking for cleanup
      const bookingId = bookingResponse.body.data.id;
      const bookingRepo = AppDataSource.getRepository(Booking);
      const booking = await bookingRepo.findOne({ where: { id: bookingId } });
      if (booking) {
        testBookings.push(booking);
      }
      
      // Verify wallet balance was deducted
      const updatedUser = await userRepo.findOne({ where: { id: user.id } });
      expect(updatedUser?.walletBalance).toBeLessThan(500);
    });
    
    it('should handle insufficient wallet balance', async () => {
      const user = testUsers[1];
      const token = authTokens[user.id];
      
      // Set user's wallet balance to a low amount
      const userRepo = AppDataSource.getRepository(User);
      await userRepo.update(user.id, { walletBalance: 1 });
      
      // Select seats that haven't been booked yet
      const availableSeats = testSeats.filter(seat => !seat.bookingId);
      const selectedSeats = availableSeats.slice(0, 2);
      
      // Step 1: Reserve seats
      await supertest(app)
        .post('/api/bookings/reserve-seats')
        .set('Authorization', `Bearer ${token}`)
        .send({
          eventId: testEvent.id,
          seatIds: selectedSeats.map(seat => seat.id)
        });
      
      // Step 2: Attempt booking with insufficient wallet balance
      const bookingResponse = await supertest(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${token}`)
        .send({
          eventId: testEvent.id,
          seatIds: selectedSeats.map(seat => seat.id),
          paymentMethod: PaymentMethod.WALLET
        });
      
      // Should fail due to insufficient balance
      expect(bookingResponse.status).toBe(400);
      expect(bookingResponse.body.success).toBe(false);
      expect(bookingResponse.body.error).toContain('Insufficient wallet balance');
    });
  });
}); 