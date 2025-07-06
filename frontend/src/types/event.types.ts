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
  eventId: string;
  section: string;
  row: string;
  seatNumber: string;
  price: number;
  status: 'available' | 'booked' | 'reserved';
  bookingId?: string;
}

export interface EventCardProps {
  event: Event;
  onClick?: (event: Event) => void;
  variant?: 'default' | 'compact' | 'detailed';
  className?: string;
}

export enum EventType {
  MOVIE = 'movie',
  CONCERT = 'concert',
  TRAIN = 'train',
  SPORTS = 'sports',
  COMEDY = 'comedy',
  CULTURAL = 'cultural'
}
