import { Seat } from './event.types';

export interface CreateBookingRequest {
  eventId: string;
  seatIds: string[];
  paymentMethod: 'CREDIT_CARD' | 'WALLET';
  paymentDetails?: {
    cardNumber?: string;
    expiryDate?: string;
    cvv?: string;
    cardHolderName?: string;
    razorpayOrderId?: string;
    razorpayPaymentId?: string;
    razorpaySignature?: string;
  };
}

export interface BookingResponse {
  id: string;
  eventId: string;
  userId: string;
  status: string;
  quantity: number;
  totalAmount: number;
  bookingDate: string;
  referenceNumber: string;
  seats: Seat[];
  payment: {
    id: string;
    amount: number;
    status: string;
    method: string;
    transactionId?: string;
  };
  event: {
    id: string;
    title: string;
    description: string;
    date: string;
    venue: string;
    category: string;
    price: number;
    totalSeats: number;
    availableSeats: number;
  };
}
