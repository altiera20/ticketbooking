import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

// Types
export interface WalletTransaction {
  id: string;
  userId: string;
  type: 'credit' | 'debit';
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
  transactions: WalletTransaction[];
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

class PaymentService {
  private api = axios.create({
    baseURL: API_BASE_URL,
    timeout: 30000,
  });

  constructor() {
    // Add auth token to requests
    this.api.interceptors.request.use((config) => {
      const token = localStorage.getItem('authToken');
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });

    // Handle auth errors
    this.api.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          localStorage.removeItem('authToken');
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    );
  }

  /**
   * Top up wallet with credit card
   */
  async topUpWallet(request: TopUpWalletRequest): Promise<{ balance: number; transactionId: string }> {
    try {
      const response = await this.api.post<ApiResponse<{ balance: number; transactionId: string }>>('/payments/wallet/topup', request);
      if (response.data.success && response.data.data) {
        return response.data.data;
      }
      throw new Error(response.data.error || 'Failed to top up wallet');
    } catch (error: any) {
      throw new Error(error.response?.data?.error || error.message || 'Failed to top up wallet');
    }
  }

  /**
   * Get wallet transactions
   */
  async getWalletTransactions(): Promise<WalletTransaction[]> {
    try {
      const response = await this.api.get<ApiResponse<WalletTransaction[]>>('/payments/wallet/transactions');
      if (response.data.success && response.data.data) {
        return response.data.data;
      }
      throw new Error(response.data.error || 'Failed to fetch wallet transactions');
    } catch (error: any) {
      throw new Error(error.response?.data?.error || error.message || 'Failed to fetch wallet transactions');
    }
  }

  /**
   * Process a payment
   */
  async processPayment(
    bookingId: string,
    amount: number,
    paymentMethod: 'CREDIT_CARD' | 'WALLET',
    paymentDetails?: {
      cardNumber: string;
      expiryDate: string;
      cvv: string;
      cardHolderName: string;
    }
  ): Promise<{ id: string; transactionId: string; status: string }> {
    try {
      const response = await this.api.post<ApiResponse<{ id: string; transactionId: string; status: string }>>('/payments/charge', {
        bookingId,
        amount,
        paymentMethod,
        paymentDetails,
      });
      if (response.data.success && response.data.data) {
        return response.data.data;
      }
      throw new Error(response.data.error || 'Failed to process payment');
    } catch (error: any) {
      throw new Error(error.response?.data?.error || error.message || 'Failed to process payment');
    }
  }

  /**
   * Validate credit card number using Luhn algorithm
   */
  validateCardNumber(cardNumber: string): boolean {
    const cleanedCardNumber = cardNumber.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    
    if (cleanedCardNumber.length < 13 || cleanedCardNumber.length > 19) {
      return false;
    }

    let sum = 0;
    let shouldDouble = false;

    for (let i = cleanedCardNumber.length - 1; i >= 0; i--) {
      let digit = parseInt(cleanedCardNumber.charAt(i), 10);

      if (shouldDouble) {
        digit *= 2;
        if (digit > 9) {
          digit -= 9;
        }
      }

      sum += digit;
      shouldDouble = !shouldDouble;
    }

    return sum % 10 === 0;
  }

  /**
   * Validate expiry date
   */
  validateExpiryDate(expiryDate: string): boolean {
    const [month, year] = expiryDate.split('/');
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear() % 100;
    const currentMonth = currentDate.getMonth() + 1;

    const expMonth = parseInt(month, 10);
    const expYear = parseInt(year, 10);

    if (expMonth < 1 || expMonth > 12) {
      return false;
    }

    if (expYear < currentYear || (expYear === currentYear && expMonth < currentMonth)) {
      return false;
    }

    return true;
  }

  /**
   * Format card number with spaces
   */
  formatCardNumber(cardNumber: string): string {
    const cleaned = cardNumber.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    const parts = [];
    
    for (let i = 0; i < cleaned.length; i += 4) {
      parts.push(cleaned.substr(i, 4));
    }
    
    return parts.join(' ');
  }

  /**
   * Get card type based on number
   */
  getCardType(cardNumber: string): string {
    const cleaned = cardNumber.replace(/\s+/g, '');
    
    // Visa
    if (/^4/.test(cleaned)) {
      return 'Visa';
    }
    
    // Mastercard
    if (/^5[1-5]/.test(cleaned)) {
      return 'Mastercard';
    }
    
    // American Express
    if (/^3[47]/.test(cleaned)) {
      return 'American Express';
    }
    
    // Discover
    if (/^6(?:011|5)/.test(cleaned)) {
      return 'Discover';
    }
    
    return '';
  }
}

export default new PaymentService(); 