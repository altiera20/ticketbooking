import { Request, Response } from 'express';
import { z } from 'zod';
import { PaymentService } from '../services/payment.service';
import { PaymentMethod } from '../types/common.types';

export class PaymentController {
  private paymentService: PaymentService;

  constructor() {
    this.paymentService = new PaymentService();
  }

  // Validation schemas
  public topUpWalletSchema = z.object({
    body: z.object({
      amount: z.number().positive('Amount must be positive'),
      paymentMethod: z.enum([PaymentMethod.CREDIT_CARD]),
      paymentDetails: z.object({
        cardNumber: z.string().min(12, 'Card number is required'),
        expiryDate: z.string().min(4, 'Expiry date is required'),
        cvv: z.string().min(3, 'CVV is required'),
        cardHolderName: z.string().min(2, 'Card holder name is required'),
      }),
    }),
  });

  public verifyPaymentSchema = z.object({
    body: z.object({
      razorpay_order_id: z.string().min(1, 'Order ID is required'),
      razorpay_payment_id: z.string().min(1, 'Payment ID is required'),
      razorpay_signature: z.string().min(1, 'Signature is required'),
    }),
  });

  /**
   * Top up user wallet
   */
  topUpWallet = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user?.id;
      const { amount, paymentDetails } = req.body;

      if (!userId) {
        res.status(401).json({ 
          success: false, 
          error: 'Authentication required' 
        });
        return;
      }

      const result = await this.paymentService.topUpWallet(
        userId, 
        amount, 
        paymentDetails
      );

      if (result.success) {
        res.json({ 
          success: true, 
          data: {
            balance: result.balance,
            transactionId: result.transactionId,
            orderId: result.orderId
          },
          message: 'Wallet topped up successfully'
        });
      } else {
        res.status(400).json({ 
          success: false, 
          error: result.error || 'Failed to top up wallet'
        });
      }
    } catch (error) {
      console.error('Top up wallet error:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Internal server error' 
      });
    }
  };

  /**
   * Get user's wallet balance
   */
  getWalletBalance = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({ 
          success: false, 
          error: 'Authentication required' 
        });
        return;
      }

      const balance = await this.paymentService.getWalletBalance(userId);

      res.json({ 
        success: true, 
        data: { balance } 
      });
    } catch (error) {
      console.error('Get wallet balance error:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Internal server error' 
      });
    }
  };

  /**
   * Get user's transaction history
   */
  getTransactionHistory = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({ 
          success: false, 
          error: 'Authentication required' 
        });
        return;
      }

      const transactions = await this.paymentService.getTransactionHistory(userId);

      res.json({ 
        success: true, 
        data: transactions 
      });
    } catch (error) {
      console.error('Get transaction history error:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Internal server error' 
      });
    }
  };

  /**
   * Create payment order
   */
  createPaymentOrder = async (req: Request, res: Response): Promise<void> => {
    try {
      const { amount, currency = 'INR', receipt, notes } = req.body;

      if (!amount) {
        res.status(400).json({ 
          success: false, 
          error: 'Amount is required' 
        });
        return;
      }

      const order = await this.paymentService.createPaymentOrder(amount, currency, receipt, notes);

      res.json({ 
        success: true, 
        data: order 
      });
    } catch (error) {
      console.error('Create payment order error:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Internal server error' 
      });
    }
  };

  /**
   * Verify payment
   */
  verifyPayment = async (req: Request, res: Response): Promise<void> => {
    try {
      const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

      const isValid = this.paymentService.verifyPaymentSignature(
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature
      );

      if (isValid) {
        res.json({ 
          success: true, 
          message: 'Payment verified successfully' 
        });
      } else {
        res.status(400).json({ 
          success: false, 
          error: 'Invalid payment signature' 
        });
      }
    } catch (error) {
      console.error('Verify payment error:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Internal server error' 
      });
    }
  };

  /**
   * Handle Razorpay webhook
   */
  webhookHandler = async (req: Request, res: Response): Promise<void> => {
    try {
      // Verify webhook signature if provided
      const webhookSignature = req.headers['x-razorpay-signature'];
      
      if (webhookSignature && process.env.RAZORPAY_WEBHOOK_SECRET) {
        const crypto = require('crypto');
        const expectedSignature = crypto
          .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET)
          .update(JSON.stringify(req.body))
          .digest('hex');
        
        if (expectedSignature !== webhookSignature) {
          res.status(400).json({ 
            success: false, 
            error: 'Invalid webhook signature' 
          });
          return;
        }
      }
      
      // Process webhook event
      const result = await this.paymentService.handleRazorpayWebhook(req.body);
      
      if (result.success) {
        res.json({ 
          success: true, 
          message: result.message 
        });
      } else {
        res.status(400).json({ 
          success: false, 
          error: result.message 
        });
      }
    } catch (error) {
      console.error('Webhook handler error:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Internal server error' 
      });
    }
  };
} 