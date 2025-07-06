import api from './api';

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

interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: string;
}

// Razorpay types
export interface RazorpayOrder {
  id: string;
  amount: number;
  currency: string;
  receipt: string;
  status: string;
}

export interface RazorpayOptions {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  image?: string;
  order_id: string;
  handler: (response: RazorpayResponse) => void;
  prefill?: {
    name?: string;
    email?: string;
    contact?: string;
  };
  notes?: Record<string, string>;
  theme?: {
    color?: string;
  };
}

export interface RazorpayResponse {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

export interface PaymentVerificationRequest {
  razorpayPaymentId: string;
  razorpayOrderId: string;
  razorpaySignature: string;
}

export interface WalletTopUpRequest {
  amount: number;
  paymentDetails: {
    razorpayPaymentId: string;
    razorpayOrderId: string;
    razorpaySignature: string;
  };
}

class PaymentService {
  private api;
  private razorpayKey: string;

  constructor() {
    this.api = api;

    // Set Razorpay key from environment variables
    this.razorpayKey = import.meta.env.VITE_RAZORPAY_KEY_ID || '';
    
    if (!this.razorpayKey) {
      console.warn('Razorpay key not found in environment variables');
    }
  }

  /**
   * Set auth token for API requests
   */
  setAuthToken(token: string): void {
    this.api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  }

  /**
   * Clear auth token
   */
  clearAuthToken(): void {
    delete this.api.defaults.headers.common['Authorization'];
  }

  /**
   * Get user's wallet balance
   */
  async getWalletBalance(): Promise<number> {
    try {
      const response = await this.api.get<ApiResponse<{ balance: number }>>('/payments/wallet/balance');
      if (response.data.success && response.data.data) {
        return response.data.data.balance;
      }
      throw new Error(response.data.error || 'Failed to get wallet balance');
    } catch (error: any) {
      throw new Error(error.response?.data?.error || error.message || 'Failed to get wallet balance');
    }
  }

  /**
   * Get user's wallet transactions
   */
  async getWalletTransactions(page = 1, limit = 10): Promise<{ transactions: WalletTransaction[]; total: number }> {
    try {
      const response = await this.api.get<ApiResponse<{ transactions: WalletTransaction[]; total: number }>>('/payments/wallet/transactions', {
        params: { page, limit }
      });
      if (response.data.success && response.data.data) {
        return response.data.data;
      }
      throw new Error(response.data.error || 'Failed to get wallet transactions');
    } catch (error: any) {
      throw new Error(error.response?.data?.error || error.message || 'Failed to get wallet transactions');
    }
  }

  /**
   * Create a Razorpay order
   * @param amount - Amount in the smallest currency unit (e.g., cents for USD)
   * @param currency - Currency code (default: INR)
   * @param receipt - Receipt ID
   * @returns Order details
   */
  async createOrder(amount: number, currency = 'INR', receipt?: string): Promise<RazorpayOrder> {
    try {
      // Check if auth token exists
      const token = localStorage.getItem('authToken') || localStorage.getItem('accessToken');
      console.log('Creating order with token:', token ? token.substring(0, 10) + '...' : 'No token found');
      
      if (!token) {
        throw new Error('Authentication required');
      }
      
      // Use explicit headers to ensure token is sent
      const response = await this.api.post<ApiResponse<RazorpayOrder>>(
        '/payments/order', 
        {
          amount,
          currency,
          receipt
        },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      if (response.data.success && response.data.data) {
        return response.data.data;
      }
      
      throw new Error('Failed to create order');
    } catch (error: any) {
      console.error('Create order error:', error);
      if (error.status === 'error' && error.message === 'Invalid or expired token') {
        // Clear tokens to force re-login
        localStorage.removeItem('authToken');
        localStorage.removeItem('accessToken');
        throw new Error('Your session has expired. Please log in again.');
      } else if (error.response?.status === 401) {
        // Clear tokens to force re-login
        localStorage.removeItem('authToken');
        localStorage.removeItem('accessToken');
        throw new Error('Authentication required. Please log in again.');
      }
      throw new Error('Failed to create order');
    }
  }

  /**
   * Verify a Razorpay payment
   * @param paymentDetails - Payment verification details
   * @returns Verification result
   */
  async verifyPayment(paymentDetails: PaymentVerificationRequest): Promise<{ success: boolean; message?: string }> {
    try {
      // Handle mock payments for development/testing
      if (paymentDetails.razorpayOrderId.includes('mock') || 
          paymentDetails.razorpayPaymentId.includes('mock') ||
          paymentDetails.razorpaySignature.includes('mock')) {
        console.log('Mock payment detected, bypassing verification');
        return {
          success: true,
          message: 'Mock payment accepted'
        };
      }
      
      const response = await this.api.post<ApiResponse<{ success: boolean; message?: string }>>('/payments/verify', paymentDetails);
      
      if (response.data.success && response.data.data) {
        return response.data.data;
      }
      
      throw new Error('Payment verification failed');
    } catch (error) {
      console.error('Verify payment error:', error);
      throw new Error('Payment verification failed');
    }
  }

  /**
   * Initialize Razorpay checkout
   * @param options - Razorpay options without the key
   * @returns Promise that resolves when checkout is initialized
   */
  async initRazorpayCheckout(options: Omit<RazorpayOptions, 'key'>): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      try {
        if (!(window as any).Razorpay) {
          reject(new Error('Razorpay SDK is not loaded'));
          return;
        }
        
        const rzp = new (window as any).Razorpay({
          ...options,
          key: this.razorpayKey,
          modal: {
            ondismiss: () => {
              reject(new Error('Checkout form closed'));
            },
          },
        });
        
        rzp.on('payment.failed', (response: any) => {
          reject(new Error(response.error.description));
        });
        
        rzp.open();
        resolve();
      } catch (error) {
        reject(error);
      }
    });
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
      if (paymentMethod === 'CREDIT_CARD') {
        // For Razorpay, we'll create an order and return it
        // The actual payment will be processed on the frontend using Razorpay checkout
        const order = await this.createOrder(amount);
        
        return {
          id: order.id,
          transactionId: order.id,
          status: 'pending'
        };
      } else {
        // For wallet payments, use the existing API
        const response = await this.api.post<ApiResponse<{ id: string; transactionId: string; status: string }>>('/payments/charge', {
          bookingId,
          amount,
          paymentMethod,
        });
        
        if (response.data.success && response.data.data) {
          return response.data.data;
        }
        throw new Error(response.data.error || 'Failed to process payment');
      }
    } catch (error: any) {
      throw new Error(error.response?.data?.error || error.message || 'Failed to process payment');
    }
  }

  /**
   * Top up user wallet
   * @param amount - Amount to add to wallet
   * @param paymentDetails - Payment details from Razorpay
   * @returns Updated wallet balance
   */
  async topUpWallet(amount: number, paymentDetails: PaymentVerificationRequest): Promise<{ success: boolean; balance: number }> {
    try {
      const response = await this.api.post<ApiResponse<{ success: boolean; balance: number }>>('/payments/wallet/topup', {
        amount,
        paymentDetails
      });
      
      if (response.data.success && response.data.data) {
        return response.data.data;
      }
      
      throw new Error('Wallet top-up failed');
    } catch (error) {
      console.error('Wallet top-up error:', error);
      throw new Error('Wallet top-up failed');
    }
  }

  /**
   * Validate card number using Luhn algorithm
   */
  validateCardNumber(cardNumber: string): boolean {
    // Remove spaces and non-digit characters
    const digits = cardNumber.replace(/\D/g, '');
    
    if (digits.length < 13 || digits.length > 19) {
      return false;
    }
    
    // Luhn algorithm
    let sum = 0;
    let shouldDouble = false;
    
    for (let i = digits.length - 1; i >= 0; i--) {
      let digit = parseInt(digits.charAt(i));
      
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
   * Validate expiry date (MM/YY)
   */
  validateExpiryDate(expiryDate: string): boolean {
    const regex = /^(0[1-9]|1[0-2])\/([0-9]{2})$/;
    
    if (!regex.test(expiryDate)) {
      return false;
    }
    
    const [month, year] = expiryDate.split('/');
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear() % 100;
    const currentMonth = currentDate.getMonth() + 1;
    
    const expMonth = parseInt(month, 10);
    const expYear = parseInt(year, 10);
    
    // Check if card is expired
    if (expYear < currentYear || (expYear === currentYear && expMonth < currentMonth)) {
      return false;
    }
    
    return true;
  }

  /**
   * Format card number with spaces (e.g., 4242 4242 4242 4242)
   */
  formatCardNumber(cardNumber: string): string {
    const digits = cardNumber.replace(/\D/g, '');
    const groups = [];
    
    for (let i = 0; i < digits.length; i += 4) {
      groups.push(digits.slice(i, i + 4));
    }
    
    return groups.join(' ');
  }

  /**
   * Get card type based on card number
   */
  getCardType(cardNumber: string): string {
    const digits = cardNumber.replace(/\D/g, '');
    
    if (/^4/.test(digits)) {
      return 'Visa';
    } else if (/^5[1-5]/.test(digits)) {
      return 'MasterCard';
    } else if (/^3[47]/.test(digits)) {
      return 'American Express';
    } else if (/^6(?:011|5)/.test(digits)) {
      return 'Discover';
    } else {
      return 'Unknown';
    }
  }
}

// Add Razorpay type to window object
declare global {
  interface Window {
    Razorpay: any;
  }
}

export default new PaymentService(); 