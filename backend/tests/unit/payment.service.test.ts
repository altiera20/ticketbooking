import { PaymentService } from '../../src/services/payment.service';
import { PaymentMethod, PaymentStatus } from '../../src/types/common.types';
import { TransactionType } from '../../src/models/WalletTransaction.model';
import { AppDataSource } from '../../src/config/database';

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

// Mock Stripe
jest.mock('stripe', () => {
  return jest.fn().mockImplementation(() => {
    return {
      paymentMethods: {
        create: jest.fn().mockResolvedValue({ id: 'pm_test123' })
      },
      paymentIntents: {
        create: jest.fn().mockResolvedValue({ 
          id: 'pi_test123', 
          status: 'succeeded' 
        })
      },
      refunds: {
        create: jest.fn().mockResolvedValue({ id: 'ref_test123' })
      }
    };
  });
});

describe('PaymentService', () => {
  let paymentService: PaymentService;
  let mockPaymentRepo: any;
  let mockUserRepo: any;
  let mockWalletTransactionRepo: any;
  let mockBookingRepo: any;

  beforeEach(() => {
    // Setup mocks
    mockPaymentRepo = {
      findOne: jest.fn(),
      save: jest.fn()
    };
    mockUserRepo = {
      findOne: jest.fn(),
      save: jest.fn()
    };
    mockWalletTransactionRepo = {
      find: jest.fn(),
      findOne: jest.fn(),
      save: jest.fn()
    };
    mockBookingRepo = {
      findOne: jest.fn()
    };

    // Mock getRepository to return our mocks
    (AppDataSource.getRepository as jest.Mock).mockImplementation((entity: any) => {
      if (entity.name === 'Payment') return mockPaymentRepo;
      if (entity.name === 'User') return mockUserRepo;
      if (entity.name === 'WalletTransaction') return mockWalletTransactionRepo;
      if (entity.name === 'Booking') return mockBookingRepo;
      return {};
    });

    paymentService = new PaymentService();
  });

  describe('processPayment', () => {
    it('should process a wallet payment successfully', async () => {
      // Mock data
      const bookingId = 'booking-123';
      const amount = 100;
      const method = PaymentMethod.WALLET;
      
      // Mock booking and user
      const mockUser = { id: 'user-123', walletBalance: 200 };
      const mockBooking = { id: bookingId, user: mockUser };
      
      // Mock transaction result
      const mockTransaction = { id: 'transaction-123' };
      
      // Setup mocks
      mockBookingRepo.findOne.mockResolvedValue(mockBooking);
      mockWalletTransactionRepo.save.mockResolvedValue(mockTransaction);
      mockPaymentRepo.save.mockImplementation(payment => Promise.resolve(payment));
      
      // Mock transaction callback
      (AppDataSource.transaction as jest.Mock).mockImplementation((cb) => {
        return cb({
          findOne: jest.fn().mockResolvedValue(mockBooking),
          save: jest.fn().mockResolvedValue(mockTransaction)
        });
      });

      // Execute
      const result = await paymentService.processPayment(bookingId, amount, method);

      // Assertions
      expect(result.status).toBe(PaymentStatus.COMPLETED);
      expect(result.bookingId).toBe(bookingId);
      expect(result.amount).toBe(amount);
      expect(result.paymentMethod).toBe(method);
      expect(result.transactionId).toContain('WALLET_');
      expect(mockPaymentRepo.save).toHaveBeenCalled();
    });

    it('should process a credit card payment successfully', async () => {
      // Mock data
      const bookingId = 'booking-123';
      const amount = 100;
      const method = PaymentMethod.CREDIT_CARD;
      const paymentDetails = {
        cardNumber: '4242424242424242',
        expiryDate: '12/25',
        cvv: '123',
        cardHolderName: 'Test User'
      };
      
      // Mock payment repo save
      mockPaymentRepo.save.mockImplementation(payment => Promise.resolve(payment));

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

    it('should handle wallet payment with insufficient balance', async () => {
      // Mock data
      const bookingId = 'booking-123';
      const amount = 200;
      const method = PaymentMethod.WALLET;
      
      // Mock booking and user with insufficient balance
      const mockUser = { id: 'user-123', walletBalance: 100 };
      const mockBooking = { id: bookingId, user: mockUser };
      
      // Setup mocks
      mockBookingRepo.findOne.mockResolvedValue(mockBooking);
      mockPaymentRepo.save.mockImplementation(payment => Promise.resolve(payment));
      
      // Mock transaction callback
      (AppDataSource.transaction as jest.Mock).mockImplementation((cb) => {
        return cb({
          findOne: jest.fn().mockResolvedValue(mockBooking),
          save: jest.fn()
        });
      });

      // Execute
      const result = await paymentService.processPayment(bookingId, amount, method);

      // Assertions
      expect(result.status).toBe(PaymentStatus.FAILED);
      expect(mockPaymentRepo.save).toHaveBeenCalled();
    });
  });

  describe('topUpWallet', () => {
    it('should top up wallet successfully', async () => {
      // Mock data
      const userId = 'user-123';
      const amount = 100;
      const paymentDetails = {
        cardNumber: '4242424242424242',
        expiryDate: '12/25',
        cvv: '123',
        cardHolderName: 'Test User'
      };
      
      // Mock user
      const mockUser = { id: userId, walletBalance: 50 };
      
      // Setup mocks
      mockUserRepo.findOne.mockResolvedValue(mockUser);
      
      // Mock transaction callback
      (AppDataSource.transaction as jest.Mock).mockImplementation((cb) => {
        return cb({
          findOne: jest.fn().mockResolvedValue(mockUser),
          save: jest.fn().mockImplementation(entity => Promise.resolve(entity))
        });
      });

      // Execute
      const result = await paymentService.topUpWallet(userId, amount, paymentDetails);

      // Assertions
      expect(result.success).toBe(true);
      expect(result.balance).toBe(150); // 50 + 100
      expect(result.transactionId).toBeTruthy();
    });
  });

  describe('refundPayment', () => {
    it('should refund a wallet payment', async () => {
      // Mock data
      const paymentId = 'payment-123';
      const bookingId = 'booking-123';
      const amount = 100;
      
      // Mock payment, booking and user
      const mockUser = { id: 'user-123', walletBalance: 100 };
      const mockBooking = { id: bookingId, user: mockUser };
      const mockPayment = { 
        id: paymentId, 
        bookingId, 
        amount, 
        paymentMethod: PaymentMethod.WALLET, 
        status: PaymentStatus.COMPLETED,
        booking: mockBooking
      };
      
      // Setup mocks
      mockPaymentRepo.findOne.mockResolvedValue(mockPayment);
      
      // Mock transaction callback
      (AppDataSource.transaction as jest.Mock).mockImplementation((cb) => {
        return cb({
          findOne: jest.fn().mockResolvedValue(mockPayment),
          save: jest.fn().mockImplementation(entity => Promise.resolve(entity))
        });
      });

      // Execute
      const result = await paymentService.refundPayment(paymentId);

      // Assertions
      expect(result.status).toBe(PaymentStatus.REFUNDED);
    });

    it('should refund a credit card payment', async () => {
      // Mock data
      const paymentId = 'payment-123';
      const bookingId = 'booking-123';
      const amount = 100;
      const transactionId = 'pi_test123';
      
      // Mock payment, booking and user
      const mockUser = { id: 'user-123' };
      const mockBooking = { id: bookingId, user: mockUser };
      const mockPayment = { 
        id: paymentId, 
        bookingId, 
        amount, 
        paymentMethod: PaymentMethod.CREDIT_CARD, 
        status: PaymentStatus.COMPLETED,
        transactionId,
        booking: mockBooking
      };
      
      // Setup mocks
      mockPaymentRepo.findOne.mockResolvedValue(mockPayment);
      
      // Mock transaction callback
      (AppDataSource.transaction as jest.Mock).mockImplementation((cb) => {
        return cb({
          findOne: jest.fn().mockResolvedValue(mockPayment),
          save: jest.fn().mockImplementation(entity => Promise.resolve(entity))
        });
      });

      // Execute
      const result = await paymentService.refundPayment(paymentId);

      // Assertions
      expect(result.status).toBe(PaymentStatus.REFUNDED);
    });
  });
}); 