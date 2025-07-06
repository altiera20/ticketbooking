// backend/src/routes/booking.routes.ts

import { Router } from 'express';
import { BookingController } from '../controllers/booking.controller';
import { validate } from '../middleware/validation.middleware';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();
const bookingController = new BookingController();

// All booking routes require authentication
router.use(authenticate);

// Create booking
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

// Reserve seats temporarily
router.post(
  '/reserve-seats',
  validate(bookingController.reserveSeatsSchema),
  bookingController.reserveSeatsTemporarily
);

export default router;