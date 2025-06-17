// backend/src/routes/booking.routes.ts

import { Router } from 'express';
import { BookingController } from '../controllers/booking.controller';
import { validate } from '../middleware/validation.middleware';
import { 
  authenticate, 
  requireEmailVerified 
} from '../middleware/auth.middleware';

const router = Router();
const bookingController = new BookingController();

// All booking routes require authentication
router.use(authenticate);
router.use(requireEmailVerified);

// Get event seats
router.get(
  '/events/:id/seats',
  validate(bookingController.getEventByIdSchema),
  bookingController.getEventSeats
);

// Reserve seats temporarily
router.post(
  '/reserve-seats',
  validate(bookingController.reserveSeatsSchema),
  bookingController.reserveSeatsTemporarily
);

// Create a new booking
router.post(
  '/',
  validate(bookingController.createBookingSchema),
  bookingController.createBooking
);

// Get user's bookings
router.get(
  '/',
  bookingController.getUserBookings
);

// Get booking by ID
router.get(
  '/:id',
  validate(bookingController.getBookingByIdSchema),
  bookingController.getBookingById
);

// Cancel booking
router.delete(
  '/:id',
  validate(bookingController.cancelBookingSchema),
  bookingController.cancelBooking
);

export default router;