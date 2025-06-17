// frontend/src/services/booking.service.ts

import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

// Types
export interface Seat {
  id: string;
  seatNumber: string;
  row: string;
  section: string;
  price: number;
  status: 'available' | 'reserved' | 'booked';
}

export interface Event {
  id: string;
  title: string;
  description: string;
  date: string;
  venue: string;
  category: string;
  price: number;
  totalSeats: number;
  availableSeats: number;
}

export interface Booking {
  id: string;
  eventId: string;
  userId: string;
  status: 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'EXPIRED';
  quantity: number;
  totalAmount: number;
  bookingDate: string;
  referenceNumber: string;
  seats: Seat[];
  payment: Payment;
  event: Event;
}

export interface Payment {
  id: string;
  amount: number;
  status: 'PENDING' | 'COMPLETED' | 'FAILED' | 'REFUNDED';
  method: 'CREDIT_CARD' | 'WALLET';
  transactionId?: string;
}

export interface CreateBookingRequest {
  eventId: string;
  seatIds: string[];
  paymentMethod: 'CREDIT_CARD' | 'WALLET';
  paymentDetails?: {
    cardNumber?: string;
    expiryDate?: string;
    cvv?: string;
    cardHolderName?: string;
  };
}

export interface ReserveSeatRequest {
  eventId: string;
  seatIds: string[];
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

class BookingService {
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
   * Get available seats for an event
   */
  async getEventSeats(eventId: string): Promise<Seat[]> {
    try {
      const response = await this.api.get<ApiResponse<Seat[]>>(`/events/${eventId}/seats`);
      if (response.data.success && response.data.data) {
        return response.data.data;
      }
      throw new Error(response.data.error || 'Failed to fetch seats');
    } catch (error: any) {
      throw new Error(error.response?.data?.error || error.message || 'Failed to fetch seats');
    }
  }

  /**
   * Temporarily reserve seats
   */
  async reserveSeats(request: ReserveSeatRequest): Promise<Seat[]> {
    try {
      const response = await this.api.post<ApiResponse<Seat[]>>('/bookings/reserve-seats', request);
      if (response.data.success && response.data.data) {
        return response.data.data;
      }
      throw new Error(response.data.error || 'Failed to reserve seats');
    } catch (error: any) {
      throw new Error(error.response?.data?.error || error.message || 'Failed to reserve seats');
    }
  }

  /**
   * Create a new booking
   */
  async createBooking(request: CreateBookingRequest): Promise<Booking> {
    try {
      const response = await this.api.post<ApiResponse<Booking>>('/bookings', request);
      if (response.data.success && response.data.data) {
        return response.data.data;
      }
      throw new Error(response.data.error || 'Failed to create booking');
    } catch (error: any) {
      throw new Error(error.response?.data?.error || error.message || 'Failed to create booking');
    }
  }

  /**
   * Get user's bookings
   */
  async getUserBookings(): Promise<Booking[]> {
    try {
      const response = await this.api.get<ApiResponse<Booking[]>>('/bookings');
      if (response.data.success && response.data.data) {
        return response.data.data;
      }
      throw new Error(response.data.error || 'Failed to fetch bookings');
    } catch (error: any) {
      throw new Error(error.response?.data?.error || error.message || 'Failed to fetch bookings');
    }
  }

  /**
   * Get booking details by ID
   */
  async getBookingById(bookingId: string): Promise<Booking> {
    try {
      const response = await this.api.get<ApiResponse<Booking>>(`/bookings/${bookingId}`);
      if (response.data.success && response.data.data) {
        return response.data.data;
      }
      throw new Error(response.data.error || 'Failed to fetch booking');
    } catch (error: any) {
      throw new Error(error.response?.data?.error || error.message || 'Failed to fetch booking');
    }
  }

  /**
   * Cancel a booking
   */
  async cancelBooking(bookingId: string): Promise<void> {
    try {
      const response = await this.api.delete<ApiResponse<null>>(`/bookings/${bookingId}`);
      if (!response.data.success) {
        throw new Error(response.data.error || 'Failed to cancel booking');
      }
    } catch (error: any) {
      throw new Error(error.response?.data?.error || error.message || 'Failed to cancel booking');
    }
  }

  /**
   * Get user's wallet balance
   */
  async getWalletBalance(): Promise<number> {
    try {
      const response = await this.api.get<ApiResponse<{ balance: number }>>('/users/wallet');
      if (response.data.success && response.data.data) {
        return response.data.data.balance;
      }
      throw new Error(response.data.error || 'Failed to fetch wallet balance');
    } catch (error: any) {
      throw new Error(error.response?.data?.error || error.message || 'Failed to fetch wallet balance');
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
   * Format card number for display
   */
  formatCardNumber(cardNumber: string): string {
    const cleaned = cardNumber.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    const match = cleaned.match(/(\d{1,4})/g);
    return match ? match.join(' ') : '';
  }

  /**
   * Get card type from card number
   */
  getCardType(cardNumber: string): string {
    const cleaned = cardNumber.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    
    if (/^4/.test(cleaned)) return 'visa';
    if (/^5[1-5]/.test(cleaned)) return 'mastercard';
    if (/^3[47]/.test(cleaned)) return 'amex';
    if (/^6/.test(cleaned)) return 'discover';
    
    return 'unknown';
  }
}

export const bookingService = new BookingService();
export default bookingService;