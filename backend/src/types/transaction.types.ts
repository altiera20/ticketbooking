import { TransactionType } from '../models/WalletTransaction.model';

export interface WalletTransactionResponse {
  id: string;
  userId: string;
  type: TransactionType;
  amount: number;
  description: string;
  bookingId?: string;
  referenceId?: string;
  createdAt: string;
}

export interface TopUpWalletRequest {
  amount: number;
  paymentMethod: 'CREDIT_CARD';
  paymentDetails: {
    cardNumber: string;
    expiryDate: string;
    cvv: string;
    cardHolderName: string;
  };
}

export interface WalletBalanceResponse {
  balance: number;
  transactions: WalletTransactionResponse[];
}

export interface PaymentRequestBody {
  amount: number;
  paymentMethod: 'CREDIT_CARD' | 'WALLET';
  paymentDetails?: {
    cardNumber?: string;
    expiryDate?: string;
    cvv?: string;
    cardHolderName?: string;
  };
  bookingId?: string;
  description?: string;
}
