import { Router } from 'express';
import authRoutes from './auth.routes';
import userRoutes from './user.routes';
import eventRoutes from './event.routes';
import { apiRateLimiter } from '../middleware/auth.middleware';

const router = Router();

// Apply rate limiting to all API routes
router.use(apiRateLimiter);

// Mount route groups
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/events', eventRoutes);

export default router;
