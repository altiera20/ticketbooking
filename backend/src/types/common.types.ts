export enum UserRole {
  USER = 'user',
  VENDOR = 'vendor',
  ADMIN = 'admin',
}

export enum EventType {
  MOVIE = 'movie',
  CONCERT = 'concert',
  TRAIN = 'train',
}

export enum BookingStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  CANCELLED = 'cancelled',
  EXPIRED = 'expired',
  COMPLETED = 'completed'
}

export enum PaymentStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  FAILED = 'failed',
  REFUNDED = 'refunded'
}

export enum SeatStatus {
  AVAILABLE = 'available',
  RESERVED = 'reserved',
  BOOKED = 'booked',
}

export interface PaginationParams {
  page: number;
  limit: number;
}

export interface PaginationResult<T> {
  data: T[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}

export interface BaseEntity {
  id: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Timestamps {
  createdAt: Date;
  updatedAt: Date;
}

export enum PaymentMethod {
  CREDIT_CARD = 'CREDIT_CARD',
  WALLET = 'WALLET'
}

export interface CreateBookingRequest {
  eventId: string;
  seatIds: string[];
  paymentMethod: PaymentMethod;
  paymentDetails?: {
    cardNumber?: string;
    expiryDate?: string;
    cvv?: string;
    cardHolderName?: string;
  };
}

export interface BookingResponse {
  id: string;
  eventId: string;
  userId: string;
  status: BookingStatus;
  quantity: number;
  totalAmount: number;
  bookingDate: Date;
  referenceNumber: string;
  seats: SeatResponse[];
  payment: PaymentResponse;
  event: EventResponse;
}

export interface SeatResponse {
  id: string;
  seatNumber: string;
  row: string;
  section: string;
  price: number;
  isBooked: boolean;
}

export interface PaymentResponse {
  id: string;
  amount: number;
  status: PaymentStatus;
  method: PaymentMethod;
  transactionId?: string;
}

export interface EventResponse {
  id: string;
  title: string;
  description: string;
  date: Date;
  venue: string;
  category: string;
  price: number;
  totalSeats: number;
  availableSeats: number;
}

export interface SeatReservationRequest {
  eventId: string;
  seatIds: string[];
}

export interface ProcessPaymentRequest {
  bookingId: string;
  paymentMethod: PaymentMethod;
  paymentDetails?: {
    cardNumber?: string;
    expiryDate?: string;
    cvv?: string;
    cardHolderName?: string;
    razorpayOrderId?: string;
    razorpayPaymentId?: string;
    razorpaySignature?: string;
    transactionId?: string;
    orderId?: string;
  };
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}