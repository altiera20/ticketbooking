import { BookingController } from '../../src/controllers/booking.controller';
import { AppDataSource } from '../../src/config/database';
import { Seat } from '../../src/models/Seat.model';
import { mockTime, delay } from '../utils/concurrency-utils';
import { In, IsNull } from 'typeorm';
import { jest } from '@jest/globals';

// Mock TypeORM
jest.mock('../../src/config/database', () => ({
  AppDataSource: {
    getRepository: jest.fn(),
    transaction: jest.fn((cb) => cb({
      findOne: jest.fn(),
      save: jest.fn()
    }))
  }
}));

// Mock services
jest.mock('../../src/services/payment.service', () => ({
  PaymentService: jest.fn().mockImplementation(() => ({
    processPayment: jest.fn().mockResolvedValue({ status: 'COMPLETED' }),
    refundPayment: jest.fn().mockResolvedValue({ status: 'REFUNDED' })
  }))
}));

jest.mock('../../src/services/email.service', () => ({
  EmailService: jest.fn().mockImplementation(() => ({
    sendBookingConfirmation: jest.fn().mockResolvedValue(true),
    sendBookingCancellation: jest.fn().mockResolvedValue(true)
  }))
}));

describe('Seat Service', () => {
  let bookingController: BookingController;
  let mockSeatRepo: any;
  let mockEventRepo: any;
  let mockBookingRepo: any;
  let mockUserRepo: any;
  
  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Setup mock repositories
    mockSeatRepo = {
      find: jest.fn(),
      findOne: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
      delete: jest.fn()
    };
    
    mockEventRepo = {
      find: jest.fn(),
      findOne: jest.fn(),
      save: jest.fn(),
      update: jest.fn()
    };
    
    mockBookingRepo = {
      find: jest.fn(),
      findOne: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
      delete: jest.fn()
    };
    
    mockUserRepo = {
      findOne: jest.fn()
    };
    
    // Mock getRepository to return our mocks
    (AppDataSource.getRepository as jest.Mock).mockImplementation((entity: any) => {
      if (entity.name === 'Seat') return mockSeatRepo;
      if (entity.name === 'Event') return mockEventRepo;
      if (entity.name === 'Booking') return mockBookingRepo;
      if (entity.name === 'User') return mockUserRepo;
      return {};
    });
    
    // Create booking controller instance
    bookingController = new BookingController();
  });
  
  describe('reserveSeats', () => {
    it('should successfully reserve available seats', async () => {
      // Mock data
      const userId = 'user-123';
      const eventId = 'event-123';
      const seatIds = ['seat-1', 'seat-2'];
      
      // Mock seat repository response
      const mockSeats = seatIds.map(id => ({
        id,
        eventId,
        isBooked: false,
        status: 'available'
      }));
      
      mockSeatRepo.find.mockResolvedValue(mockSeats);
      
      // Call the private method using any type assertion
      const result = await (bookingController as any).reserveSeats(seatIds, userId, eventId);
      
      // Assertions
      expect(result.success).toBe(true);
      expect(result.seats).toEqual(mockSeats);
      expect(mockSeatRepo.find).toHaveBeenCalledWith({
        where: { 
          id: In(seatIds),
          eventId,
          bookingId: IsNull()
        }
      });
    });
    
    it('should fail if some seats are not available', async () => {
      // Mock data
      const userId = 'user-123';
      const eventId = 'event-123';
      const seatIds = ['seat-1', 'seat-2'];
      
      // Mock seat repository to return only one seat
      mockSeatRepo.find.mockResolvedValue([{ id: 'seat-1', eventId, isBooked: false }]);
      
      // Call the private method
      const result = await (bookingController as any).reserveSeats(seatIds, userId, eventId);
      
      // Assertions
      expect(result.success).toBe(false);
      expect(result.error).toBe('Some seats are not available');
    });
    
    it('should fail if seats are already reserved by another user', async () => {
      // Mock data
      const userId = 'user-123';
      const otherUserId = 'user-456';
      const eventId = 'event-123';
      const seatIds = ['seat-1', 'seat-2'];
      
      // Mock seat repository response
      const mockSeats = seatIds.map(id => ({
        id,
        eventId,
        isBooked: false,
        status: 'available'
      }));
      
      mockSeatRepo.find.mockResolvedValue(mockSeats);
      
      // Set up a reservation for one of the seats
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
      (bookingController as any).seatReservations.set('seat-1', { 
        userId: otherUserId, 
        expiresAt 
      });
      
      // Call the private method
      const result = await (bookingController as any).reserveSeats(seatIds, userId, eventId);
      
      // Assertions
      expect(result.success).toBe(false);
      expect(result.error).toBe('Some seats are temporarily reserved by another user');
    });
    
    it('should allow same user to reserve seats they already reserved', async () => {
      // Mock data
      const userId = 'user-123';
      const eventId = 'event-123';
      const seatIds = ['seat-1', 'seat-2'];
      
      // Mock seat repository response
      const mockSeats = seatIds.map(id => ({
        id,
        eventId,
        isBooked: false,
        status: 'available'
      }));
      
      mockSeatRepo.find.mockResolvedValue(mockSeats);
      
      // Set up a reservation for one of the seats by the same user
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
      (bookingController as any).seatReservations.set('seat-1', { 
        userId, 
        expiresAt 
      });
      
      // Call the private method
      const result = await (bookingController as any).reserveSeats(seatIds, userId, eventId);
      
      // Assertions
      expect(result.success).toBe(true);
      expect(result.seats).toEqual(mockSeats);
    });
  });
  
  describe('cleanupExpiredReservations', () => {
    it('should remove expired reservations', () => {
      // Setup reservations
      const now = new Date();
      const pastDate = new Date(now.getTime() - 1000); // 1 second in the past
      const futureDate = new Date(now.getTime() + 1000); // 1 second in the future
      
      // Add some reservations
      (bookingController as any).seatReservations.set('seat-1', { 
        userId: 'user-1', 
        expiresAt: pastDate // Expired
      });
      
      (bookingController as any).seatReservations.set('seat-2', { 
        userId: 'user-2', 
        expiresAt: futureDate // Not expired
      });
      
      // Call the cleanup method
      (bookingController as any).cleanupExpiredReservations();
      
      // Assertions
      expect((bookingController as any).seatReservations.has('seat-1')).toBe(false);
      expect((bookingController as any).seatReservations.has('seat-2')).toBe(true);
    });
    
    it('should handle empty reservations map', () => {
      // Clear reservations
      (bookingController as any).seatReservations.clear();
      
      // Call the cleanup method
      (bookingController as any).cleanupExpiredReservations();
      
      // Assertions - should not throw any errors
      expect((bookingController as any).seatReservations.size).toBe(0);
    });
  });
  
  describe('seat reservation timeout', () => {
    it('should automatically release seats after timeout period', async () => {
      // Mock data
      const userId = 'user-123';
      const eventId = 'event-123';
      const seatIds = ['seat-1', 'seat-2'];
      
      // Mock seat repository response
      const mockSeats = seatIds.map(id => ({
        id,
        eventId,
        isBooked: false,
        status: 'available'
      }));
      
      mockSeatRepo.find.mockResolvedValue(mockSeats);
      
      // Reserve seats
      await (bookingController as any).reserveSeats(seatIds, userId, eventId);
      
      // Verify seats are reserved
      for (const seatId of seatIds) {
        expect((bookingController as any).seatReservations.has(seatId)).toBe(true);
      }
      
      // Mock time to be after expiration (15 minutes + 1 second)
      const futureTime = new Date(Date.now() + 15 * 60 * 1000 + 1000);
      const restoreTime = mockTime(futureTime);
      
      // Run cleanup
      (bookingController as any).cleanupExpiredReservations();
      
      // Restore original time
      restoreTime();
      
      // Verify seats are released
      for (const seatId of seatIds) {
        expect((bookingController as any).seatReservations.has(seatId)).toBe(false);
      }
    });
  });
}); 