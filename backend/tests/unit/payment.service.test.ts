import { PaymentService } from '../../src/services/payment.service';
import { PaymentMethod, PaymentStatus } from '../../src/types/common.types';
import { TransactionType } from '../../src/models/WalletTransaction.model';
import { AppDataSource } from '../../src/config/database';
import { Payment } from '../../src/models/Payment.model';
import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { WalletTransaction } from '../../src/models/WalletTransaction.model';
import { User } from '../../src/models/User.model';
import { Booking } from '../../src/models/Booking.model';

// Mock repositories
const mockPaymentRepo = {
  save: jest.fn(),
  findOne: jest.fn()
};

const mockUserRepo = {
  findOne: jest.fn(),
  save: jest.fn()
};

const mockWalletTransactionRepo = {
  save: jest.fn(),
  find: jest.fn()
};

const mockBookingRepo = {
  findOne: jest.fn()
};

// Mock Razorpay
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
        refund: jest.fn().mockResolvedValue({ id: 'ref_test123' })
      }
    };
  });
});

// Mock AppDataSource
jest.mock('../../src/config/database', () => ({
  AppDataSource: {
    getRepository: jest.fn((entity) => {
      if (entity === Payment) return mockPaymentRepo;
      if (entity === User) return mockUserRepo;
      if (entity === WalletTransaction) return mockWalletTransactionRepo;
      if (entity === Booking) return mockBookingRepo;
      return {};
    }),
    transaction: jest.fn(async (cb) => await cb({
      save: async (entity) => entity
    }))
  }
}));

describe('PaymentService', () => {
  let paymentService: PaymentService;

  beforeEach(() => {
    jest.clearAllMocks();
    paymentService = new PaymentService();
  });

  describe('processPayment', () => {
    it('should process a wallet payment successfully', async () => {
      // Mock data
      const bookingId = 'booking-123';
      const amount = 100;
      const method = PaymentMethod.WALLET;
      
      // Mock booking and user
      mockBookingRepo.findOne.mockResolvedValue({
        id: bookingId,
        userId: 'user-123'
      });
      
      mockUserRepo.findOne.mockResolvedValue({
        id: 'user-123',
        walletBalance: 200
      });
      
      // Mock wallet transaction
      mockWalletTransactionRepo.save.mockResolvedValue({
        id: 'transaction-123',
        userId: 'user-123',
        amount,
        type: 'debit',
        description: `Payment for booking #${bookingId}`,
        bookingId
      });
      
      // Mock payment repo save
      mockPaymentRepo.save.mockImplementation((payment: Payment) => Promise.resolve(payment));

      // Execute
      const result = await paymentService.processPayment(bookingId, amount, method);

      // Assertions
      expect(result.status).toBe(PaymentStatus.COMPLETED);
      expect(result.bookingId).toBe(bookingId);
      expect(result.amount).toBe(amount);
      expect(result.paymentMethod).toBe(method);
      expect(result.transactionId).toBeTruthy();
      expect(mockPaymentRepo.save).toHaveBeenCalled();
    });

    it('should process a credit card payment successfully', async () => {
      // Mock data
      const bookingId = 'booking-123';
      const amount = 100;
      const method = PaymentMethod.CREDIT_CARD;
      const paymentDetails = {
        razorpayOrderId: 'order_123',
        razorpayPaymentId: 'pay_123'
      };
      
      // Mock payment repo save
      mockPaymentRepo.save.mockImplementation((payment: Payment) => Promise.resolve(payment));

      // Execute
      const result = await paymentService.processPayment(bookingId, amount, method, paymentDetails);

      // Assertions
      expect(result.status).toBe(PaymentStatus.COMPLETED);
      expect(result.bookingId).toBe(bookingId);
      expect(result.amount).toBe(amount);
      expect(result.paymentMethod).toBe(method);
      expect(result.transactionId).toBeTruthy();
      expect(mockPaymentRepo.save).toHaveBeenCalled();
    });

    it('should handle wallet payment failure when balance is insufficient', async () => {
      // Mock data
      const bookingId = 'booking-123';
      const amount = 100;
      const method = PaymentMethod.WALLET;
      
      // Mock booking and user with insufficient balance
      mockBookingRepo.findOne.mockResolvedValue({
        id: bookingId,
        userId: 'user-123'
      });
      
      mockUserRepo.findOne.mockResolvedValue({
        id: 'user-123',
        walletBalance: 50 // Less than amount
      });
      
      // Mock payment repo save
      mockPaymentRepo.save.mockImplementation((payment: Payment) => Promise.resolve(payment));

      // Execute
      const result = await paymentService.processPayment(bookingId, amount, method);

      // Assertions
      expect(result.status).toBe(PaymentStatus.FAILED);
      expect(mockPaymentRepo.save).toHaveBeenCalled();
    });
  });

  describe('createPaymentOrder', () => {
    it('should create a Razorpay order successfully', async () => {
      // Mock data
      const amount = 100;
      const currency = 'INR';
      const receipt = 'receipt_123';
      
      // Execute
      const result = await paymentService.createPaymentOrder(amount, currency, receipt);
      
      // Assertions
      expect(result).toBeDefined();
      expect(result.id).toBe('order_test123');
      expect(result.amount).toBe(10000);
      expect(result.currency).toBe('INR');
    });
  });

  describe('verifyPaymentSignature', () => {
    it('should verify a valid payment signature', () => {
      // Mock crypto for testing
      const crypto = require('crypto');
      const originalCreateHmac = crypto.createHmac;
      
      crypto.createHmac = jest.fn().mockReturnValue({
        update: jest.fn().mockReturnThis(),
        digest: jest.fn().mockReturnValue('valid_signature')
      });
      
      // Test data
      const orderId = 'order_123';
      const paymentId = 'pay_123';
      const signature = 'valid_signature';
      
      // Execute
      const result = paymentService.verifyPaymentSignature(orderId, paymentId, signature);
      
      // Restore original crypto
      crypto.createHmac = originalCreateHmac;
      
      // Assertions
      expect(result).toBe(true);
    });
    
    it('should reject an invalid payment signature', () => {
      // Mock crypto for testing
      const crypto = require('crypto');
      const originalCreateHmac = crypto.createHmac;
      
      crypto.createHmac = jest.fn().mockReturnValue({
        update: jest.fn().mockReturnThis(),
        digest: jest.fn().mockReturnValue('valid_signature')
      });
      
      // Test data
      const orderId = 'order_123';
      const paymentId = 'pay_123';
      const signature = 'invalid_signature';
      
      // Execute
      const result = paymentService.verifyPaymentSignature(orderId, paymentId, signature);
      
      // Restore original crypto
      crypto.createHmac = originalCreateHmac;
      
      // Assertions
      expect(result).toBe(false);
    });
  });

  describe('refundPayment', () => {
    it('should process a refund for a credit card payment', async () => {
      // Mock data
      const paymentId = 'payment-123';
      
      // Mock payment
      mockPaymentRepo.findOne.mockResolvedValue({
        id: paymentId,
        bookingId: 'booking-123',
        paymentMethod: PaymentMethod.CREDIT_CARD,
        status: PaymentStatus.COMPLETED,
        amount: 100,
        transactionId: 'pay_123',
        booking: {
          id: 'booking-123',
          user: {
            id: 'user-123'
          }
        }
      });
      
      // Mock payment repo save
      mockPaymentRepo.save.mockImplementation((payment: Payment) => Promise.resolve(payment));

      // Execute
      const result = await paymentService.refundPayment(paymentId);

      // Assertions
      expect(result.status).toBe(PaymentStatus.REFUNDED);
      expect(result.refundedAt).toBeDefined();
      expect(mockPaymentRepo.save).toHaveBeenCalled();
    });
  });
}); 