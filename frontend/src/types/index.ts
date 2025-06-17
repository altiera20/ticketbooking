import { ReactNode } from 'react';

// Common Types
export type ButtonVariant = 'primary' | 'secondary' | 'accent' | 'success' | 'error' | 'warning' | 'outline' | 'ghost';
export type ButtonSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';
export type InputVariant = 'default' | 'outlined' | 'filled';
export type InputSize = 'sm' | 'md' | 'lg';

// User Types
export enum UserRole {
  USER = 'user',
  VENDOR = 'vendor',
  ADMIN = 'admin',
}

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: UserRole;
  walletBalance: number;
  profilePicture?: string;
  phone?: string;
  isEmailVerified: boolean;
  isActive: boolean;
  vendorProfile?: VendorProfile;
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
  vendorId: string;
  title: string;
  description: string;
  type: EventType;
  venue: string;
  eventDate: string;
  price: number;
  totalSeats: number;
  availableSeats: number;
  status: EventStatus;
  seats?: Seat[];
  createdAt: string;
  updatedAt: string;
}

export interface Seat {
  id: string;
  eventId: string;
  seatNumber: string;
  row: string;
  section: string;
  status: 'available' | 'reserved' | 'booked';
  bookingId?: string;
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
  onClick?: () => void;
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