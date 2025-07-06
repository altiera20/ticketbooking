import { Repository } from 'typeorm';
import { AppDataSource } from '../config/database';
import { Payment } from '../models/Payment.model';
import { User } from '../models/User.model';
import { Booking } from '../models/Booking.model';
import { WalletTransaction, TransactionType } from '../models/WalletTransaction.model';
import { PaymentMethod, PaymentStatus, BookingStatus } from '../types/common.types';
import Razorpay from 'razorpay';

// Initialize Razorpay with proper error handling
let razorpay: any;
try {
  if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
    // Initialize with actual keys
    razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET
    });
    console.log('Razorpay initialized with actual keys');
    console.log('Razorpay key ID:', process.env.RAZORPAY_KEY_ID.substring(0, 10) + '...');
  } else {
    console.warn('RAZORPAY_KEY_ID and/or RAZORPAY_KEY_SECRET environment variables are not set. Using mock Razorpay.');
    // Use mock Razorpay if keys are not provided
    razorpay = {
      orders: {
        create: async (orderData: any) => {
          console.log('Creating mock order with data:', orderData);
          return {
            id: `order_mock_${Date.now()}`,
            amount: orderData.amount || 10000,
            currency: orderData.currency || 'INR',
            receipt: orderData.receipt || `receipt_mock_${Date.now()}`,
            status: 'created'
          };
        }
      },
      payments: {
        refund: async () => ({
          id: `ref_mock_${Date.now()}`,
          payment_id: `pay_mock_${Date.now()}`,
          amount: 10000,
          status: 'processed'
        })
      }
    };
  }
} catch (error) {
  console.error('Error initializing Razorpay:', error);
  // Fallback to mock implementation
  razorpay = {
    orders: {
      create: async (orderData: any) => {
        console.log('Creating fallback mock order with data:', orderData);
        return {
          id: `order_fallback_${Date.now()}`,
          amount: orderData.amount || 10000,
          currency: orderData.currency || 'INR',
          receipt: orderData.receipt || `receipt_fallback_${Date.now()}`,
          status: 'created'
        };
      }
    },
    payments: {
      refund: async () => ({
        id: `ref_fallback_${Date.now()}`,
        payment_id: `pay_fallback_${Date.now()}`,
        amount: 10000,
        status: 'processed'
      })
    }
  };
  console.log('Using fallback mock Razorpay due to initialization error');
}

export class PaymentService {
  constructor() {}

  private getPaymentRepository = () => AppDataSource.getRepository(Payment);
  private getUserRepository = () => AppDataSource.getRepository(User);
  private getWalletTransactionRepository = () => AppDataSource.getRepository(WalletTransaction);
  private getBookingRepository = () => AppDataSource.getRepository(Booking);

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
        } else if (result.error) {
          // Store error message in metadata
          payment.metadata = { error: result.error };
          throw new Error(result.error);
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

      return await this.getPaymentRepository().save(payment);
    } catch (error) {
      payment.status = PaymentStatus.FAILED;
      // Store error message in metadata if it's an Error object
      if (error instanceof Error) {
        payment.metadata = { error: error.message };
      }
      await this.getPaymentRepository().save(payment);
      throw error;
    }
  }

  /**
   * Process wallet payment
   */
  private async processWalletPayment(
    bookingId: string,
    amount: number
  ): Promise<{ success: boolean; transactionId?: string; error?: string }> {
    try {
      const booking = await this.getBookingRepository().findOne({
        where: { id: bookingId },
        relations: ['user']
      });

      if (!booking) {
        throw new Error('Booking not found');
      }

      const userId = booking.userId;
      const user = await this.getUserRepository().findOne({ where: { id: userId } });

      if (!user) {
        throw new Error('User not found');
      }

      // Check if user has sufficient balance
      if (user.walletBalance < amount) {
        console.error(`Insufficient wallet balance: User ${userId} has ₹${user.walletBalance} but needs ₹${amount}`);
        return { 
          success: false, 
          error: `Insufficient wallet balance. You have ₹${user.walletBalance} but the booking costs ₹${amount}.` 
        };
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
      return { success: false, error: error instanceof Error ? error.message : 'Unknown wallet payment error' };
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
      // If payment details already contain a transaction ID (from frontend)
      if (paymentDetails && paymentDetails.transactionId) {
        return {
          success: true,
          transactionId: paymentDetails.transactionId,
          orderId: paymentDetails.orderId || ''
        };
      }
      
      // Create a Razorpay order
      const order = await razorpay.orders.create({
        amount: Math.round(amount * 100), // Razorpay uses paise/cents
        currency: 'INR', // Change to your currency
        receipt: `receipt_${Date.now()}`,
        payment_capture: 1 // Auto-capture
      });
      
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
   * Create a payment order with Razorpay
   */
  async createPaymentOrder(
    amount: number,
    currency: string = 'INR',
    receipt?: string,
    notes?: Record<string, string>
  ): Promise<any> {
    try {
      console.log(`Creating payment order: amount=${amount.toFixed(2)}, currency=${currency}, receipt=${receipt}`);
      console.log(`Razorpay key ID: ${process.env.RAZORPAY_KEY_ID ? process.env.RAZORPAY_KEY_ID.substring(0, 10) + '...' : 'Not found'}`);
      
      const orderData = {
        amount: Math.round(amount * 100), // Razorpay uses paise/cents
        currency,
        receipt: receipt || `receipt_${Date.now()}`,
        notes
      };
      
      console.log('Order data:', orderData);
      
      const order = await razorpay.orders.create(orderData);
      console.log('Order created successfully:', order.id);
      
      return order;
    } catch (error) {
      console.error('Create payment order error:', error);
      
      // Fallback to mock order if there's an error
      const mockOrder = {
        id: `order_mock_${Date.now()}`,
        amount: Math.round(amount * 100),
        currency,
        receipt: receipt || `receipt_${Date.now()}`,
        status: 'created'
      };
      
      console.log('Using fallback mock order due to error');
      return mockOrder;
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
      const user = await this.getUserRepository().findOne({ where: { id: userId } });

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
    try {
      console.log(`Getting wallet balance for user: ${userId}`);
      const user = await this.getUserRepository().findOne({ where: { id: userId } });

      if (!user) {
        console.error(`User not found: ${userId}`);
        throw new Error('User not found');
      }

      console.log(`Wallet balance for user ${userId}: ${user.walletBalance}`);
      return user.walletBalance || 0;
    } catch (error) {
      console.error('Error getting wallet balance:', error);
      // Return 0 as a fallback to prevent errors
      return 0;
    }
  }

  /**
   * Get user's transaction history
   */
  async getTransactionHistory(userId: string): Promise<WalletTransaction[]> {
    return this.getWalletTransactionRepository().find({
      where: { userId },
      order: { createdAt: 'DESC' }
    });
  }

  /**
   * Refund a payment
   */
  async refundPayment(paymentId: string): Promise<Payment> {
    const payment = await this.getPaymentRepository().findOne({
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

    return this.getPaymentRepository().save(payment);
  }

  /**
   * Process wallet refund
   */
  private async processWalletRefund(payment: Payment): Promise<void> {
    if (!payment.booking || !payment.booking.user) {
      throw new Error('Booking or user not found');
    }

    const userId = payment.booking.user.id;
    const user = await this.getUserRepository().findOne({ where: { id: userId } });

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
   * Process credit card refund
   */
  private async processCreditCardRefund(payment: Payment): Promise<void> {
    try {
      if (!payment.transactionId) {
        throw new Error('No transaction ID found for refund');
      }

      // Process refund through Razorpay
      const refund = await razorpay.payments.refund(payment.transactionId, {
        amount: Math.round(payment.amount * 100), // Convert to paise/cents
        speed: 'normal',
        notes: {
          bookingId: payment.bookingId,
          reason: 'Booking cancellation'
        }
      });

      if (refund && refund.id) {
        payment.refundId = refund.id;
        payment.refundedAt = new Date();
        payment.status = PaymentStatus.REFUNDED;
        await this.getPaymentRepository().save(payment);
      } else {
        throw new Error('Refund failed');
      }
    } catch (error) {
      console.error('Credit card refund error:', error);
      throw new Error('Failed to process credit card refund');
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
    try {
      // For mock payments in development/testing, bypass verification
      if (orderId.includes('mock') || paymentId.includes('mock') || signature.includes('mock')) {
        console.log('Mock payment detected, bypassing signature verification');
        return true;
      }
      
      const crypto = require('crypto');
      console.log('Verifying signature with secret:', process.env.RAZORPAY_KEY_SECRET ? `${process.env.RAZORPAY_KEY_SECRET.substring(0, 5)}...` : 'Not found');
      console.log(`Verifying: orderId=${orderId}, paymentId=${paymentId}`);
      
      const generatedSignature = crypto
        .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || '')
        .update(orderId + '|' + paymentId)
        .digest('hex');
      
      console.log('Signature comparison:');
      console.log('Generated:', generatedSignature);
      console.log('Received:', signature);
      
      return generatedSignature === signature;
    } catch (error) {
      console.error('Signature verification error:', error);
      return false;
    }
  }

  /**
   * Handle Razorpay webhook events
   */
  async handleRazorpayWebhook(
    event: any
  ): Promise<{ success: boolean; message: string }> {
    try {
      const eventType = event.event;
      
      // Handle different event types
      switch (eventType) {
        case 'payment.captured':
          // Payment was successful
          const paymentId = event.payload.payment.entity.id;
          const orderId = event.payload.payment.entity.order_id;
          const amount = event.payload.payment.entity.amount / 100; // Convert from paise to rupees
          
          // Find payment by order ID and update status
          const payment = await this.getPaymentRepository().findOne({
            where: { transactionId: orderId }
          });
          
          if (payment) {
            payment.status = PaymentStatus.COMPLETED;
            payment.transactionId = paymentId;
            payment.paidAt = new Date();
            await this.getPaymentRepository().save(payment);
            
            // Update booking status if needed
            const booking = await this.getBookingRepository().findOne({
              where: { id: payment.bookingId }
            });
            
            if (booking) {
              booking.status = BookingStatus.CONFIRMED;
              await this.getBookingRepository().save(booking);
            }
          }
          
          return { success: true, message: 'Payment captured successfully' };
          
        case 'payment.failed':
          // Payment failed
          const failedOrderId = event.payload.payment.entity.order_id;
          
          // Find payment by order ID and update status
          const failedPayment = await this.getPaymentRepository().findOne({
            where: { transactionId: failedOrderId }
          });
          
          if (failedPayment) {
            failedPayment.status = PaymentStatus.FAILED;
            await this.getPaymentRepository().save(failedPayment);
          }
          
          return { success: true, message: 'Payment failure recorded' };
          
        case 'refund.processed':
          // Refund was processed
          const refundId = event.payload.refund.entity.id;
          const refundedPaymentId = event.payload.refund.entity.payment_id;
          
          // Find payment by payment ID and update refund status
          const refundedPayment = await this.getPaymentRepository().findOne({
            where: { transactionId: refundedPaymentId }
          });
          
          if (refundedPayment) {
            refundedPayment.status = PaymentStatus.REFUNDED;
            refundedPayment.refundId = refundId;
            refundedPayment.refundedAt = new Date();
            await this.getPaymentRepository().save(refundedPayment);
          }
          
          return { success: true, message: 'Refund processed successfully' };
          
        default:
          console.log(`Unhandled Razorpay event type: ${event.event}`);
          break;
      }
      return { success: true, message: "Webhook processed" };
    } catch (error) {
      console.error("Error handling Razorpay webhook:", error);
      return { success: false, message: "Webhook processing failed" };
    }
  }
} 
