// frontend/src/services/booking.service.ts

import axios from 'axios';
import api from './api';
import { CreateBookingRequest, BookingResponse } from '../types/booking.types';

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

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface ReserveSeatRequest {
  eventId: string;
  seatIds: string[];
}

class BookingService {
  /**
   * Temporarily reserve seats
   * @param eventIdOrRequest - Either the event ID or a ReserveSeatRequest object
   * @param seatIds - Array of seat IDs (optional if eventIdOrRequest is a ReserveSeatRequest)
   * @returns Reserved seats
   */
  async reserveSeats(eventIdOrRequest: string | ReserveSeatRequest, seatIds?: string[]): Promise<Seat[]> {
    try {
      // Check if auth token exists
      const token = localStorage.getItem('authToken') || localStorage.getItem('accessToken');
      if (!token) {
        throw new Error('Authentication required to reserve seats');
      }
      
      let request: ReserveSeatRequest;
      
      if (typeof eventIdOrRequest === 'string' && seatIds) {
        // Called with eventId and seatIds
        request = {
          eventId: eventIdOrRequest,
          seatIds: seatIds
        };
      } else if (typeof eventIdOrRequest === 'object') {
        // Called with ReserveSeatRequest object
        request = eventIdOrRequest;
      } else {
        throw new Error('Invalid arguments');
      }
      
      console.log('Reserving seats with token:', token.substring(0, 10) + '...');
      
      // Use axios directly to ensure headers are set properly
      const response = await api.post<{ success: boolean; data: Seat[] }>('/bookings/reserve-seats', request, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.data.success && response.data.data) {
        return response.data.data;
      }
      
      throw new Error('Failed to reserve seats');
    } catch (error: any) {
      console.error('Reserve seats error:', error);
      if (error.response?.status === 401) {
        // Handle authentication error
        console.log('Authentication error when reserving seats');
        // Force user to login again
        localStorage.removeItem('authToken');
        localStorage.removeItem('accessToken');
        throw new Error('Your session has expired. Please log in again.');
      }
      throw new Error(error.response?.data?.error || error.message || 'Failed to reserve seats');
    }
  }

  /**
   * Create a new booking
   * @param bookingData - Booking data including payment details
   * @returns Booking response
   */
  async createBooking(bookingData: CreateBookingRequest): Promise<BookingResponse> {
    try {
      // Check if auth token exists
      const token = localStorage.getItem('authToken') || localStorage.getItem('accessToken');
      if (!token) {
        throw new Error('Authentication required');
      }
      
      console.log('Creating booking with data:', JSON.stringify(bookingData, null, 2));
      
      const response = await api.post<{ success: boolean; data: BookingResponse }>('/bookings', bookingData);
      
      console.log('Booking API response:', response.data);
      
      if (response.data.success && response.data.data) {
        return response.data.data;
      }
      
      throw new Error('Failed to create booking');
    } catch (error: any) {
      console.error('Create booking error:', error);
      
      // Check for specific error responses
      if (error.response) {
        console.log('Error response status:', error.response.status);
        console.log('Error response data:', error.response.data);
        
        if (error.response.status === 401) {
          throw new Error('Authentication required. Please log in again.');
        } else if (error.response.status === 400) {
          const errorMessage = error.response.data?.error || 'Invalid booking request';
          throw new Error(errorMessage);
        }
      }
      
      throw new Error('Failed to create booking');
    }
  }

  /**
   * Get user bookings
   * @param page - Page number
   * @param limit - Items per page
   * @returns List of bookings
   */
  async getUserBookings(page = 1, limit = 10): Promise<{ bookings: BookingResponse[]; total: number }> {
    try {
      const response = await api.get<{ 
        success: boolean; 
        data: { bookings: BookingResponse[]; total: number } 
      }>('/bookings/user', {
        params: { page, limit }
      });
      
      if (response.data.success && response.data.data) {
        return response.data.data;
      }
      
      throw new Error('Failed to get bookings');
    } catch (error) {
      console.error('Get user bookings error:', error);
      throw new Error('Failed to get bookings');
    }
  }

  /**
   * Get booking by ID
   * @param id - Booking ID
   * @returns Booking details
   */
  async getBookingById(id: string): Promise<BookingResponse> {
    try {
      const response = await api.get<{ success: boolean; data: BookingResponse }>(`/bookings/${id}`);
      
      if (response.data.success && response.data.data) {
        return response.data.data;
      }
      
      throw new Error('Booking not found');
    } catch (error) {
      console.error('Get booking error:', error);
      throw new Error('Failed to get booking details');
    }
  }

  /**
   * Cancel booking
   * @param id - Booking ID
   * @returns Cancellation result
   */
  async cancelBooking(id: string): Promise<{ success: boolean; message: string }> {
    try {
      const response = await api.post<{ 
        success: boolean; 
        message: string 
      }>(`/bookings/${id}/cancel`);
      
      return {
        success: response.data.success,
        message: response.data.message || 'Booking cancelled successfully'
      };
    } catch (error) {
      console.error('Cancel booking error:', error);
      throw new Error('Failed to cancel booking');
    }
  }

  /**
   * Get user's wallet balance
   */
  async getWalletBalance(): Promise<number> {
    try {
      console.log('Requesting wallet balance from API');
      const response = await api.get<ApiResponse<{ balance: number }>>('/users/wallet');
      console.log('Wallet balance API response:', response.data);
      
      if (response.data.success && response.data.data) {
        const balance = response.data.data.balance;
        console.log('Retrieved wallet balance:', balance);
        return balance;
      }
      
      console.error('Failed to get wallet balance:', response.data.error);
      throw new Error(response.data.error || 'Failed to fetch wallet balance');
    } catch (error: any) {
      console.error('Wallet balance API error:', error);
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

export default new BookingService();