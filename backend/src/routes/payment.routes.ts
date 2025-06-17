import { Router } from 'express';
import { PaymentController } from '../controllers/payment.controller';
import { validate } from '../middleware/validation.middleware';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();
const paymentController = new PaymentController();

// All payment routes require authentication except webhook
router.use('/webhook', paymentController.webhookHandler);
router.use(authenticate);

// Top up wallet
router.post(
  '/wallet/topup',
  validate(paymentController.topUpWalletSchema),
  paymentController.topUpWallet
);

// Get wallet balance
router.get(
  '/wallet/balance',
  paymentController.getWalletBalance
);

// Get transaction history
router.get(
  '/wallet/transactions',
  paymentController.getTransactionHistory
);

// Create payment order
router.post(
  '/order',
  paymentController.createPaymentOrder
);

// Verify payment
router.post(
  '/verify',
  validate(paymentController.verifyPaymentSchema),
  paymentController.verifyPayment
);

export default router; 