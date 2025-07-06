import { ReactNode, MouseEvent } from 'react';

// Common Types
export type ButtonVariant = 'primary' | 'secondary' | 'accent' | 'success' | 'error' | 'warning' | 'outline' | 'ghost' | 'link' | 'danger';
export type ButtonSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';
export type InputVariant = 'default' | 'outlined' | 'filled';
export type InputSize = 'sm' | 'md' | 'lg';

// User Types
export enum UserRole {
  USER = 'USER',
  VENDOR = 'VENDOR',
  ADMIN = 'ADMIN'
}

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: UserRole;
  walletBalance?: number;
  isEmailVerified?: boolean;
  isActive?: boolean;
  profilePicture?: string;
  phone?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface VendorProfile {
  id: string;
  userId: string;
  businessName: string;
  businessLicense: string;
  verifiedAt?: string;
  isVerified: boolean;
}

// Auth Types
export interface LoginFormData {
  email: string;
  password: string;
}

export interface RegisterFormData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
  role?: UserRole;
  phone?: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

// Event Types
export enum EventType {
  MOVIE = 'movie',
  CONCERT = 'concert',
  TRAIN = 'train',
}

export enum EventStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  CANCELLED = 'cancelled',
  COMPLETED = 'completed',
}

export interface Event {
  id: string;
  title: string;
  description: string;
  eventDate: string;
  venue: string;
  type: string;
  price: number;
  totalSeats: number;
  availableSeats: number;
  imageUrl?: string;
  vendorId?: string;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Seat {
  id: string;
  seatNumber: string;
  row: string;
  section: string;
  price: number;
  status: 'available' | 'reserved' | 'booked';
  eventId: string;
}

export interface EventFilters {
  type?: EventType;
  minPrice?: number;
  maxPrice?: number;
  date?: string;
  venue?: string;
  search?: string;
  sortBy?: 'price' | 'date' | 'title';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

// Component Props
export interface ButtonProps {
  children: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  type?: 'button' | 'submit' | 'reset';
  fullWidth?: boolean;
  disabled?: boolean;
  loading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  onClick?: (e: MouseEvent<HTMLButtonElement>) => void;
  className?: string;
  ariaLabel?: string;
}

export interface InputProps {
  id: string;
  name: string;
  label?: string;
  type?: string;
  placeholder?: string;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void;
  error?: string;
  variant?: InputVariant;
  size?: InputSize;
  disabled?: boolean;
  required?: boolean;
  className?: string;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  autoComplete?: string;
  maxLength?: number;
}

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  showCloseButton?: boolean;
  closeOnClickOutside?: boolean;
}

export interface EventCardProps {
  event: Event;
  onClick?: (event: Event) => void;
  variant?: 'default' | 'compact' | 'detailed';
  className?: string;
}

export interface EventListProps {
  events: Event[];
  loading?: boolean;
  error?: string;
  viewType?: 'grid' | 'list';
  onEventClick?: (event: Event) => void;
  onRetry?: () => void;
}

export interface EventFiltersProps {
  filters: EventFilters;
  onFilterChange: (filters: EventFilters) => void;
}

export interface LayoutProps {
  children: ReactNode;
}

export interface AuthLayoutProps {
  children: ReactNode;
  title: string;
  subtitle?: string;
}

// Booking related types
export enum BookingStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  CANCELLED = 'CANCELLED',
  EXPIRED = 'EXPIRED'
}

export interface Booking {
  id: string;
  eventId: string;
  userId: string;
  status: BookingStatus;
  quantity: number;
  totalAmount: number;
  bookingDate: string;
  referenceNumber: string;
  seats: Seat[];
  payment?: Payment;
  event?: Event;
  createdAt?: string;
  updatedAt?: string;
}

// Payment related types
export enum PaymentMethod {
  CREDIT_CARD = 'CREDIT_CARD',
  WALLET = 'WALLET'
}

export enum PaymentStatus {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  REFUNDED = 'REFUNDED'
}

export interface Payment {
  id: string;
  amount: number;
  status: PaymentStatus;
  method: PaymentMethod;
  transactionId?: string;
  bookingId?: string;
  userId?: string;
  createdAt?: string;
  updatedAt?: string;
}

// API response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
} 