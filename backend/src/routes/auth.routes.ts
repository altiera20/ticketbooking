import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { validate } from '../middleware/validation.middleware';
import {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from '../utils/validation.utils';
import {
  authenticate,
  authRateLimiter,
} from '../middleware/auth.middleware';

const router = Router();
const authController = new AuthController();

// Public routes with rate limiting
router.post(
  '/register',
  authRateLimiter,
  validate(registerSchema),
  authController.register
);

router.post(
  '/login',
  authRateLimiter,
  validate(loginSchema),
  authController.login
);

router.post(
  '/refresh-token',
  authRateLimiter,
  authController.refreshToken
);

router.post(
  '/forgot-password',
  authRateLimiter,
  validate(forgotPasswordSchema),
  authController.forgotPassword
);

router.post(
  '/reset-password',
  authRateLimiter,
  validate(resetPasswordSchema),
  authController.resetPassword
);

router.get(
  '/verify-email/:token',
  authRateLimiter,
  authController.verifyEmail
);

// Protected routes
router.use(authenticate); // Apply authentication middleware to all routes below

router.post(
  '/logout',
  authController.logout
);

export default router;
