import { AppDataSource } from '../../src/config/database';
import { User } from '../../src/models/User.model';
import { Event } from '../../src/models/Event.model';
import { Seat } from '../../src/models/Seat.model';
import { Booking } from '../../src/models/Booking.model';
import { Payment } from '../../src/models/Payment.model';
import { UserRole } from '../../src/types/common.types';
import { EventType } from '../../src/types/common.types';
import { BookingStatus } from '../../src/types/common.types';
import { PaymentMethod, PaymentStatus } from '../../src/types/common.types';
import { generateTestId } from './db-utils';
import * as bcrypt from 'bcryptjs';

/**
 * Create a test user
 */
export async function createTestUser(
  overrides: Partial<User> = {}
): Promise<User> {
  const userRepository = AppDataSource.getRepository(User);
  
  const testId = generateTestId();
  const user = userRepository.create({
    firstName: `Test${testId}`,
    lastName: 'User',
    email: `test.user.${testId}@example.com`,
    password: await bcrypt.hash('Password123!', 10),
    role: UserRole.USER,
    walletBalance: 1000,
    isEmailVerified: true,
    isActive: true,
    ...overrides,
  });
  
  return await userRepository.save(user);
}

/**
 * Create a test vendor
 */
export async function createTestVendor(
  overrides: Partial<User> = {}
): Promise<User> {
  return createTestUser({
    role: UserRole.VENDOR,
    ...overrides,
  });
}

/**
 * Create a test event
 */
export async function createTestEvent(
  vendor?: User,
  overrides: Partial<Event> = {}
): Promise<Event> {
  const eventRepository = AppDataSource.getRepository(Event);
  
  // Create vendor if not provided
  if (!vendor) {
    vendor = await createTestVendor();
  }
  
  const testId = generateTestId();
  const eventDate = new Date();
  eventDate.setDate(eventDate.getDate() + 7); // One week from now
  
  const event = eventRepository.create({
    vendorId: vendor.id,
    title: `Test Event ${testId}`,
    description: 'This is a test event for automated testing',
    type: EventType.MOVIE,
    venue: 'Test Venue',
    eventDate: eventDate,
    price: 50,
    totalSeats: 100,
    availableSeats: 100,
    status: 'published',
    ...overrides,
  });
  
  return await eventRepository.save(event);
}

/**
 * Create test seats for an event
 */
export async function createTestSeats(
  event: Event,
  count: number = 10,
  overrides: Partial<Seat> = {}
): Promise<Seat[]> {
  const seatRepository = AppDataSource.getRepository(Seat);
  const seats: Seat[] = [];
  
  for (let i = 1; i <= count; i++) {
    const row = String.fromCharCode(64 + Math.ceil(i / 10)); // A, B, C, etc.
    const seatNumber = String(i % 10 === 0 ? 10 : i % 10);
    
    const seat = seatRepository.create({
      eventId: event.id,
      seatNumber,
      row,
      section: 'Main',
      status: 'available',
      ...overrides,
    });
    
    seats.push(await seatRepository.save(seat));
  }
  
  return seats;
}

/**
 * Create a test booking
 */
export async function createTestBooking(
  user: User,
  event: Event,
  seats: Seat[],
  overrides: Partial<Booking> = {}
): Promise<Booking> {
  const bookingRepository = AppDataSource.getRepository(Booking);
  const seatRepository = AppDataSource.getRepository(Seat);
  
  // Calculate total amount
  const totalAmount = seats.reduce((sum, seat) => sum + event.price, 0);
  
  // Create booking
  const booking = bookingRepository.create({
    userId: user.id,
    eventId: event.id,
    status: BookingStatus.CONFIRMED,
    quantity: seats.length,
    totalAmount,
    bookingDate: new Date(),
    ...overrides,
  });
  
  const savedBooking = await bookingRepository.save(booking);
  
  // Update seats with booking ID
  for (const seat of seats) {
    seat.bookingId = savedBooking.id;
    seat.status = 'booked';
    await seatRepository.save(seat);
  }
  
  return savedBooking;
}

/**
 * Create a test payment
 */
export async function createTestPayment(
  booking: Booking,
  overrides: Partial<Payment> = {}
): Promise<Payment> {
  const paymentRepository = AppDataSource.getRepository(Payment);
  
  const payment = paymentRepository.create({
    bookingId: booking.id,
    paymentMethod: PaymentMethod.CREDIT_CARD,
    transactionId: `test_transaction_${Date.now()}`,
    amount: booking.totalAmount,
    status: PaymentStatus.COMPLETED,
    paidAt: new Date(),
    ...overrides,
  });
  
  return await paymentRepository.save(payment);
}

/**
 * Clean up test data
 */
export async function cleanupTestData(
  entities: { 
    users?: User[], 
    events?: Event[], 
    bookings?: Booking[],
    payments?: Payment[]
  }
): Promise<void> {
  const paymentRepository = AppDataSource.getRepository(Payment);
  const bookingRepository = AppDataSource.getRepository(Booking);
  const seatRepository = AppDataSource.getRepository(Seat);
  const eventRepository = AppDataSource.getRepository(Event);
  const userRepository = AppDataSource.getRepository(User);
  
  // Delete payments
  if (entities.payments?.length) {
    for (const payment of entities.payments) {
      await paymentRepository.delete(payment.id);
    }
  }
  
  // Delete bookings
  if (entities.bookings?.length) {
    for (const booking of entities.bookings) {
      // Free up seats
      const seats = await seatRepository.find({ where: { bookingId: booking.id } });
      for (const seat of seats) {
        seat.bookingId = undefined;
        seat.status = 'available';
        await seatRepository.save(seat);
      }
      
      // Delete booking
      await bookingRepository.delete(booking.id);
    }
  }
  
  // Delete events and their seats
  if (entities.events?.length) {
    for (const event of entities.events) {
      await seatRepository.delete({ eventId: event.id });
      await eventRepository.delete(event.id);
    }
  }
  
  // Delete users
  if (entities.users?.length) {
    for (const user of entities.users) {
      await userRepository.delete(user.id);
    }
  }
} 