import { Repository } from 'typeorm';
import { AppDataSource } from '../config/database';
import { Payment } from '../models/Payment.model';
import { User } from '../models/User.model';
import { Booking } from '../models/Booking.model';
import { WalletTransaction, TransactionType } from '../models/WalletTransaction.model';
import { PaymentMethod, PaymentStatus, BookingStatus } from '../types/common.types';
import Razorpay from 'razorpay';

if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
  throw new Error('RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET environment variables are not set');
}

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

export class PaymentService {
  private paymentRepository: Repository<Payment>;
  private userRepository: Repository<User>;
  private walletTransactionRepository: Repository<WalletTransaction>;
  private bookingRepository: Repository<Booking>;

  constructor() {
    this.paymentRepository = AppDataSource.getRepository(Payment);
    this.userRepository = AppDataSource.getRepository(User);
    this.walletTransactionRepository = AppDataSource.getRepository(WalletTransaction);
    this.bookingRepository = AppDataSource.getRepository(Booking);
  }

  /**
   * Process payment for a booking
   */
  async processPayment(
    bookingId: string,
    amount: number,
    method: PaymentMethod,
    paymentDetails?: any
  ): Promise<Payment> {
    const payment = new Payment();
    payment.bookingId = bookingId;
    payment.amount = amount;
    payment.paymentMethod = method;
    payment.status = PaymentStatus.PENDING;
    payment.transactionId = '';

    try {
      if (method === PaymentMethod.WALLET) {
        // Process wallet payment
        const result = await this.processWalletPayment(bookingId, amount);
        payment.status = result.success ? PaymentStatus.COMPLETED : PaymentStatus.FAILED;
        if (result.transactionId) {
          payment.transactionId = result.transactionId;
        }
        if (result.success) {
          payment.paidAt = new Date();
        }
      } else if (method === PaymentMethod.CREDIT_CARD) {
        // Process credit card payment
        const result = await this.processCreditCardPayment(amount, paymentDetails);
        payment.status = result.success ? PaymentStatus.COMPLETED : PaymentStatus.FAILED;
        if (result.transactionId) {
          payment.transactionId = result.transactionId;
        }
        if (result.success) {
          payment.paidAt = new Date();
        }
      }

      return await this.paymentRepository.save(payment);
    } catch (error) {
      payment.status = PaymentStatus.FAILED;
      await this.paymentRepository.save(payment);
      throw error;
    }
  }

  /**
   * Process wallet payment
   */
  private async processWalletPayment(
    bookingId: string,
    amount: number
  ): Promise<{ success: boolean; transactionId?: string }> {
    try {
      const booking = await this.bookingRepository.findOne({
        where: { id: bookingId },
        relations: ['user']
      });

      if (!booking) {
        throw new Error('Booking not found');
      }

      const userId = booking.userId;
      const user = await this.userRepository.findOne({ where: { id: userId } });

      if (!user) {
        throw new Error('User not found');
      }

      // Check if user has sufficient balance
      if (user.walletBalance < amount) {
        return { success: false };
      }

      // Create transaction
      const transaction = new WalletTransaction();
      transaction.userId = userId;
      transaction.amount = amount;
      transaction.type = TransactionType.DEBIT;
      transaction.description = `Payment for booking #${bookingId}`;
      transaction.bookingId = bookingId;

      // Save transaction and update user balance in a transaction
      await AppDataSource.transaction(async transactionalEntityManager => {
        await transactionalEntityManager.save(transaction);
        user.walletBalance -= amount;
        await transactionalEntityManager.save(user);
      });

      return {
        success: true,
        transactionId: transaction.id
      };
    } catch (error) {
      console.error('Wallet payment error:', error);
      return { success: false };
    }
  }

  /**
   * Process credit card payment using Razorpay
   */
  private async processCreditCardPayment(
    amount: number,
    paymentDetails: any
  ): Promise<{ success: boolean; transactionId?: string; orderId?: string }> {
    try {
      // Create a Razorpay order
      const order = await razorpay.orders.create({
        amount: Math.round(amount * 100), // Razorpay uses paise/cents
        currency: 'INR', // Change to your currency
        receipt: `receipt_${Date.now()}`,
        payment_capture: 1 // Auto-capture
      });

      // For direct server-side payments, we would need to use the payment details
      // However, in production, it's recommended to use Razorpay's checkout form
      // on the frontend and verify the payment signature on the backend
      // This is a simplified version for compatibility with the existing flow
      
      if (order && order.id) {
        return {
          success: true,
          transactionId: order.id,
          orderId: order.id
        };
      }

      return { success: false };
    } catch (error) {
      console.error('Razorpay payment error:', error);
      return { success: false };
    }
  }

  /**
   * Create a payment order
   */
  async createPaymentOrder(
    amount: number,
    currency: string = 'INR',
    receipt?: string,
    notes?: Record<string, string>
  ): Promise<any> {
    try {
      const order = await razorpay.orders.create({
        amount: Math.round(amount * 100), // Razorpay uses paise/cents
        currency,
        receipt: receipt || `receipt_${Date.now()}`,
        notes
      });
      
      return order;
    } catch (error) {
      console.error('Create payment order error:', error);
      throw new Error('Failed to create payment order');
    }
  }

  /**
   * Top up user's wallet
   */
  async topUpWallet(
    userId: string,
    amount: number,
    paymentDetails: any
  ): Promise<{ success: boolean; balance?: number; transactionId?: string; orderId?: string; error?: string }> {
    try {
      // Process credit card payment
      const paymentResult = await this.processCreditCardPayment(amount, paymentDetails);

      if (!paymentResult.success) {
        return { success: false, error: 'Payment processing failed' };
      }

      // Get user
      const user = await this.userRepository.findOne({ where: { id: userId } });

      if (!user) {
        return { success: false, error: 'User not found' };
      }

      // Create transaction
      const transaction = new WalletTransaction();
      transaction.userId = userId;
      transaction.amount = amount;
      transaction.type = TransactionType.CREDIT;
      transaction.description = 'Wallet top-up';
      transaction.referenceId = paymentResult.transactionId;

      // Save transaction and update user balance in a transaction
      await AppDataSource.transaction(async transactionalEntityManager => {
        await transactionalEntityManager.save(transaction);
        user.walletBalance += amount;
        await transactionalEntityManager.save(user);
      });

      return {
        success: true,
        balance: user.walletBalance,
        transactionId: paymentResult.transactionId,
        orderId: paymentResult.orderId
      };
    } catch (error) {
      console.error('Top up wallet error:', error);
      return { success: false, error: 'Failed to top up wallet' };
    }
  }

  /**
   * Get user's wallet balance
   */
  async getWalletBalance(userId: string): Promise<number> {
    const user = await this.userRepository.findOne({ where: { id: userId } });

    if (!user) {
      throw new Error('User not found');
    }

    return user.walletBalance;
  }

  /**
   * Get user's transaction history
   */
  async getTransactionHistory(userId: string): Promise<WalletTransaction[]> {
    return this.walletTransactionRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' }
    });
  }

  /**
   * Refund a payment
   */
  async refundPayment(paymentId: string): Promise<Payment> {
    const payment = await this.paymentRepository.findOne({
      where: { id: paymentId },
      relations: ['booking', 'booking.user']
    });

    if (!payment) {
      throw new Error('Payment not found');
    }

    if (payment.status !== PaymentStatus.COMPLETED) {
      throw new Error('Payment cannot be refunded');
    }

    // Process refund based on payment method
    if (payment.paymentMethod === PaymentMethod.WALLET) {
      await this.processWalletRefund(payment);
    } else if (payment.paymentMethod === PaymentMethod.CREDIT_CARD) {
      await this.processCreditCardRefund(payment);
    }

    payment.status = PaymentStatus.REFUNDED;
    payment.refundedAt = new Date();

    return this.paymentRepository.save(payment);
  }

  /**
   * Process wallet refund
   */
  private async processWalletRefund(payment: Payment): Promise<void> {
    if (!payment.booking || !payment.booking.user) {
      throw new Error('Booking or user not found');
    }

    const userId = payment.booking.user.id;
    const user = await this.userRepository.findOne({ where: { id: userId } });

    if (!user) {
      throw new Error('User not found');
    }

    // Create transaction
    const transaction = new WalletTransaction();
    transaction.userId = userId;
    transaction.amount = payment.amount;
    transaction.type = TransactionType.CREDIT;
    transaction.description = `Refund for booking #${payment.bookingId}`;
    transaction.bookingId = payment.bookingId;

    // Save transaction and update user balance in a transaction
    await AppDataSource.transaction(async transactionalEntityManager => {
      await transactionalEntityManager.save(transaction);
      user.walletBalance += payment.amount;
      await transactionalEntityManager.save(user);
    });
  }

  /**
   * Process credit card refund through Razorpay
   */
  private async processCreditCardRefund(payment: Payment): Promise<void> {
    if (!payment.transactionId) {
      throw new Error('No transaction ID found for refund');
    }

    try {
      // Razorpay refund API
      await razorpay.payments.refund(payment.transactionId, {
        amount: Math.round(payment.amount * 100), // Razorpay uses paise/cents
        speed: 'normal', // or 'optimum'
        notes: {
          bookingId: payment.bookingId,
          reason: 'Booking cancellation'
        }
      });
    } catch (error) {
      console.error('Razorpay refund error:', error);
      throw new Error('Failed to process refund');
    }
  }

  /**
   * Verify Razorpay payment signature
   */
  verifyPaymentSignature(
    orderId: string,
    paymentId: string,
    signature: string
  ): boolean {
    const generatedSignature = require('crypto')
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${orderId}|${paymentId}`)
      .digest('hex');

    return generatedSignature === signature;
  }

  /**
   * Handle Razorpay webhook events
   */
  async handleRazorpayWebhook(
    event: any
  ): Promise<{ success: boolean; message: string }> {
    try {
      const eventType = event.event;
      
      // Handle payment.captured event
      if (eventType === 'payment.captured') {
        const paymentId = event.payload.payment.entity.id;
        const orderId = event.payload.payment.entity.order_id;
        
        // Find payment by orderId (stored in transactionId)
        const payment = await this.paymentRepository.findOne({
          where: { transactionId: orderId }
        });
        
        if (payment) {
          // Update payment status
          payment.status = PaymentStatus.COMPLETED;
          payment.paidAt = new Date();
          await this.paymentRepository.save(payment);
          
          // Update booking status if needed
          const booking = await this.bookingRepository.findOne({
            where: { id: payment.bookingId }
          });
          
          if (booking) {
            booking.status = BookingStatus.CONFIRMED;
            await this.bookingRepository.save(booking);
          }
        }
      }
      
      // Handle payment.failed event
      if (eventType === 'payment.failed') {
        const orderId = event.payload.payment.entity.order_id;
        
        // Find payment by orderId (stored in transactionId)
        const payment = await this.paymentRepository.findOne({
          where: { transactionId: orderId }
        });
        
        if (payment) {
          // Update payment status
          payment.status = PaymentStatus.FAILED;
          await this.paymentRepository.save(payment);
        }
      }
      
      return { success: true, message: 'Webhook processed successfully' };
    } catch (error) {
      console.error('Webhook processing error:', error);
      return { success: false, message: 'Failed to process webhook' };
    }
  }
} 
} 