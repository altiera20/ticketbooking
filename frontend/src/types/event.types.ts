export interface Event {
  id: string;
  title: string;
  description: string;
  eventDate: string;
  venue: string;
  category: string;
  price: number;
  totalSeats: number;
  availableSeats: number;
  imageUrl?: string;
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
