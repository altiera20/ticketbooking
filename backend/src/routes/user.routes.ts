import { Router } from 'express';
import { UserController } from '../controllers/user.controller';
import { validate } from '../middleware/validation.middleware';
import { updateProfileSchema } from '../utils/validation.utils';
import { 
  authenticate, 
  requireEmailVerified 
} from '../middleware/auth.middleware';

const router = Router();
const userController = new UserController();

// All user routes require authentication
router.use(authenticate);
router.use(requireEmailVerified);

// Profile routes
router.get('/profile', userController.getProfile);
router.put('/profile', validate(updateProfileSchema), userController.updateProfile);
router.put('/change-password', validate(userController.changePasswordSchema), userController.changePassword);

// Booking routes
router.get('/bookings', userController.getUserBookings);

// Transaction routes
router.get('/transactions', userController.getUserTransactions);

export default router;
