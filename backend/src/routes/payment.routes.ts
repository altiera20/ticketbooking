import { Router } from 'express';
import { PaymentController } from '../controllers/payment.controller';
import { validate } from '../middleware/validation.middleware';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();
const paymentController = new PaymentController();

// All payment routes require authentication
router.use(authenticate);

// Process a payment
router.post(
  '/charge',
  validate(paymentController.chargePaymentSchema),
  paymentController.chargePayment
);

// Top up wallet
router.post(
  '/wallet/topup',
  validate(paymentController.topUpWalletSchema),
  paymentController.topUpWallet
);

// Get wallet transactions
router.get(
  '/wallet/transactions',
  validate(paymentController.getWalletTransactionsSchema),
  paymentController.getWalletTransactions
);

export default router; 