import { Router } from 'express';
import authRoutes from './auth.routes';
import userRoutes from './user.routes';
import eventRoutes from './event.routes';
import bookingRoutes from './booking.routes';
import paymentRoutes from './payment.routes';
import { apiRateLimiter } from '../middleware/auth.middleware';

const router = Router();

// Apply rate limiting to all API routes
router.use(apiRateLimiter);

// Mount route groups
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/events', eventRoutes);
router.use('/bookings', bookingRoutes);
router.use('/payments', paymentRoutes);

export default router;
