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

describe('Booking Flow Integration Tests', () => {
  let testUsers: User[] = [];
  let testEvent: Event;
  let testSeats: Seat[] = [];
  let testBookings: Booking[] = [];
  let testPayments: Payment[] = [];
  let authTokens: { [key: string]: string } = {};
  
  beforeAll(async () => {
    // Create test users
    testUsers.push(await createTestUser());
    testUsers.push(await createTestUser());
    
    // Create auth tokens
    for (const user of testUsers) {
      authTokens[user.id] = sign(
        { userId: user.id, role: user.role, type: 'access' },
        process.env.JWT_ACCESS_SECRET || 'access-secret',
        { expiresIn: '1h' }
      );
    }
    
    // Create test event
    testEvent = await createTestEvent();
    
    // Create test seats
    testSeats = await createTestSeats(testEvent, 10);
  });
  
  afterAll(async () => {
    // Clean up test data
    await cleanupTestData({
      users: testUsers,
      events: [testEvent],
      bookings: testBookings,
      payments: testPayments
    });
  });
  
  describe('End-to-End Booking Flow', () => {
    it('should successfully complete the booking flow', async () => {
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
      const bookingResponse = await supertest(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${token}`)
        .send({
          eventId: testEvent.id,
          seatIds: selectedSeats.map(seat => seat.id),
          paymentMethod: PaymentMethod.CREDIT_CARD,
          paymentDetails: {
            cardNumber: '4242424242424242',
            expiryDate: '12/25',
            cvv: '123',
            cardHolderName: 'Test User'
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
      
      // Step 3: Verify booking details
      const getBookingResponse = await supertest(app)
        .get(`/api/bookings/${bookingId}`)
        .set('Authorization', `Bearer ${token}`);
      
      expect(getBookingResponse.status).toBe(200);
      expect(getBookingResponse.body.success).toBe(true);
      expect(getBookingResponse.body.data.id).toBe(bookingId);
      expect(getBookingResponse.body.data.seats).toHaveLength(2);
      
      // Step 4: Verify seats are now booked
      for (const seat of selectedSeats) {
        const seatRepo = AppDataSource.getRepository(Seat);
        const updatedSeat = await seatRepo.findOne({ where: { id: seat.id } });
        expect(updatedSeat?.bookingId).toBe(bookingId);
        expect(updatedSeat?.status).toBe('booked');
      }
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
              cardNumber: '4242424242424242',
              expiryDate: '12/25',
              cvv: '123',
              cardHolderName: 'Test User 1'
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
      
      // Store successful booking for cleanup
      if (successResponses.length > 0) {
        const bookingId = successResponses[0].body.data.id;
        const bookingRepo = AppDataSource.getRepository(Booking);
        const booking = await bookingRepo.findOne({ where: { id: bookingId } });
        if (booking) {
          testBookings.push(booking);
        }
      }
      
      // Verify seats are booked by the successful request
      for (const seat of selectedSeats) {
        const seatRepo = AppDataSource.getRepository(Seat);
        const updatedSeat = await seatRepo.findOne({ where: { id: seat.id } });
        expect(updatedSeat?.bookingId).toBeTruthy();
        expect(updatedSeat?.status).toBe('booked');
      }
    });
  });
  
  describe('Reservation Timeout Scenario', () => {
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
      
      // Step 2: Wait for reservation to expire (15 minutes + buffer)
      // Note: In a real test, we would mock time or use a shorter timeout for testing
      // Here we'll simulate the cleanup process directly
      
      // Advance time by 16 minutes
      await advanceTime(16 * 60 * 1000, async () => {
        // Trigger a request that would cause cleanup
        await supertest(app)
          .get('/api/events')
          .set('Authorization', `Bearer ${token}`);
          
        // Wait a bit for cleanup to complete
        await delay(100);
      });
      
      // Step 3: Try to book the same seats with another user
      const user2 = testUsers[1];
      const token2 = authTokens[user2.id];
      
      const bookingResponse = await supertest(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${token2}`)
        .send({
          eventId: testEvent.id,
          seatIds: selectedSeats.map(seat => seat.id),
          paymentMethod: PaymentMethod.CREDIT_CARD,
          paymentDetails: {
            cardNumber: '4242424242424242',
            expiryDate: '12/25',
            cvv: '123',
            cardHolderName: 'Test User 2'
          }
        });
      
      // The second user should be able to book now
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
      
      // Step 2: Attempt booking with insufficient wallet balance
      // First, ensure wallet balance is 0
      const userRepo = AppDataSource.getRepository(User);
      await userRepo.update(user.id, { walletBalance: 0 });
      
      // Try to book with wallet payment
      const bookingResponse = await supertest(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${token}`)
        .send({
          eventId: testEvent.id,
          seatIds: selectedSeats.map(seat => seat.id),
          paymentMethod: PaymentMethod.WALLET
        });
      
      // Payment should fail
      expect(bookingResponse.status).toBe(400);
      expect(bookingResponse.body.success).toBe(false);
      
      // Step 3: Verify seats are released
      for (const seat of selectedSeats) {
        const seatRepo = AppDataSource.getRepository(Seat);
        const updatedSeat = await seatRepo.findOne({ where: { id: seat.id } });
        expect(updatedSeat?.bookingId).toBeNull();
        expect(updatedSeat?.status).toBe('available');
      }
      
      // Reset wallet balance for other tests
      await userRepo.update(user.id, { walletBalance: 1000 });
    });
  });
}); 