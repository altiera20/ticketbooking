import { Repository } from 'typeorm';
import { AppDataSource } from '../config/database';
import { Payment } from '../models/Payment.model';
import { User } from '../models/User.model';
import { Booking } from '../models/Booking.model';
import { WalletTransaction, TransactionType } from '../models/WalletTransaction.model';
import { PaymentMethod, PaymentStatus } from '../types/common.types';
import Stripe from 'stripe';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY environment variable is not set');
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

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
    // Use a transaction to ensure wallet balance and transaction are updated atomically
    return AppDataSource.transaction(async (transactionalEntityManager) => {
      // Get user from booking
      const booking = await this.bookingRepository.findOne({
        where: { id: bookingId },
        relations: ['user']
      });

      if (!booking) {
        throw new Error('Booking not found');
      }

      const user = booking.user;
      
      // Check if user has sufficient wallet balance
      if (user.walletBalance < amount) {
        return { success: false };
      }

      // Deduct amount from wallet
      user.walletBalance -= amount;
      await transactionalEntityManager.save(user);

      // Record wallet transaction
      const transaction = new WalletTransaction();
      transaction.userId = user.id;
      transaction.type = TransactionType.DEBIT;
      transaction.amount = amount;
      transaction.description = `Payment for booking #${bookingId}`;
      transaction.bookingId = bookingId;
      
      const savedTransaction = await transactionalEntityManager.save(transaction);

      return {
        success: true,
        transactionId: `WALLET_${savedTransaction.id}`
      };
    });
  }

  /**
   * Process credit card payment using Stripe
   */
  private async processCreditCardPayment(
    amount: number,
    paymentDetails: any
  ): Promise<{ success: boolean; transactionId?: string }> {
    try {
      // Create a payment method using the card details
      const paymentMethod = await stripe.paymentMethods.create({
        type: 'card',
        card: {
          number: paymentDetails.cardNumber.replace(/\s+/g, ''),
          exp_month: parseInt(paymentDetails.expiryDate.split('/')[0], 10),
          exp_year: parseInt(`20${paymentDetails.expiryDate.split('/')[1]}`, 10),
          cvc: paymentDetails.cvv,
        },
      });

      // Create a payment intent
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // Stripe uses cents
        currency: 'usd',
        payment_method: paymentMethod.id,
        confirm: true,
        return_url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/booking-confirmation`,
      });

      if (paymentIntent.status === 'succeeded' || paymentIntent.status === 'processing') {
        return {
          success: true,
          transactionId: paymentIntent.id
        };
      }

      return { success: false };
    } catch (error) {
      console.error('Stripe payment error:', error);
      return { success: false };
    }
  }

  /**
   * Top up user wallet using credit card
   */
  async topUpWallet(
    userId: string,
    amount: number,
    paymentDetails: any
  ): Promise<{ success: boolean; balance?: number; transactionId?: string }> {
    try {
      // Process credit card payment
      const result = await this.processCreditCardPayment(amount, paymentDetails);
      
      if (!result.success) {
        return { success: false };
      }

      // Update user wallet balance
      return AppDataSource.transaction(async (transactionalEntityManager) => {
        const user = await this.userRepository.findOne({
          where: { id: userId }
        });

        if (!user) {
          throw new Error('User not found');
        }

        // Add amount to wallet
        user.walletBalance += amount;
        await transactionalEntityManager.save(user);

        // Record wallet transaction
        const transaction = new WalletTransaction();
        transaction.userId = userId;
        transaction.type = TransactionType.CREDIT;
        transaction.amount = amount;
        transaction.description = 'Wallet top up';
        transaction.referenceId = result.transactionId;
        
        const savedTransaction = await transactionalEntityManager.save(transaction);

        return {
          success: true,
          balance: user.walletBalance,
          transactionId: savedTransaction.id
        };
      });
    } catch (error) {
      console.error('Wallet top up error:', error);
      return { success: false };
    }
  }

  /**
   * Get wallet transactions for a user
   */
  async getWalletTransactions(userId: string): Promise<WalletTransaction[]> {
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
    return AppDataSource.transaction(async (transactionalEntityManager) => {
      const user = payment.booking.user;
      
      // Add amount back to wallet
      user.walletBalance += payment.amount;
      await transactionalEntityManager.save(user);

      // Record refund transaction
      const transaction = new WalletTransaction();
      transaction.userId = user.id;
      transaction.type = TransactionType.CREDIT;
      transaction.amount = payment.amount;
      transaction.description = `Refund for booking #${payment.bookingId}`;
      transaction.bookingId = payment.bookingId;
      
      await transactionalEntityManager.save(transaction);
    });
  }

  /**
   * Process credit card refund through Stripe
   */
  private async processCreditCardRefund(payment: Payment): Promise<void> {
    if (!payment.transactionId) {
      throw new Error('No transaction ID found for refund');
    }

    try {
      await stripe.refunds.create({
        payment_intent: payment.transactionId,
      });
    } catch (error) {
      console.error('Stripe refund error:', error);
      throw new Error('Failed to process refund');
    }
  }

  /**
   * Get payment by booking ID
   */
  async getPaymentByBookingId(bookingId: string): Promise<Payment | null> {
    return this.paymentRepository.findOne({
      where: { bookingId }
    });
  }

  /**
   * Get payment by ID
   */
  async getPaymentById(paymentId: string): Promise<Payment | null> {
    return this.paymentRepository.findOne({
      where: { id: paymentId }
    });
  }
} 