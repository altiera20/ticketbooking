import { Router } from 'express';
import { UserController } from '../controllers/user.controller';
import { upload } from '../services/upload.service';
import { authenticate as authMiddleware } from '../middleware/auth.middleware';
import { validate as validateRequest } from '../middleware/validation.middleware';
import rateLimit from 'express-rate-limit';
import config from '../config';

const router = Router();
const userController = new UserController();

// Rate limiting for profile update endpoints
const profileUpdateLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: 10, // 10 requests per window
  message: { message: 'Too many requests, please try again later' },
});

// Rate limiting for password change endpoint
const passwordChangeLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: 5, // 5 requests per window
  message: { message: 'Too many password change attempts, please try again later' },
});

// Rate limiting for account deletion
const accountDeletionLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: 3, // 3 requests per window
  message: { message: 'Too many account deletion attempts, please try again later' },
});

// Profile routes
router.get('/profile', authMiddleware, userController.getProfile);
router.put('/profile', authMiddleware, profileUpdateLimiter, userController.updateProfile);
router.post(
  '/profile/picture',
  authMiddleware,
  profileUpdateLimiter,
  upload.single('file'),
  userController.uploadProfilePicture
);

// Password change route
router.put(
  '/password',
  authMiddleware,
  passwordChangeLimiter,
  validateRequest(userController.changePasswordSchema),
  userController.changePassword
);

// Account deletion route
router.delete(
  '/account',
  authMiddleware,
  accountDeletionLimiter,
  userController.deleteAccount
);

// User bookings route
router.get('/bookings', authMiddleware, userController.getUserBookings);

// User transactions route
router.get('/transactions', authMiddleware, userController.getUserTransactions);

export default router;
