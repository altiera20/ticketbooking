import { Request, Response } from 'express';
import { AppDataSource } from '../config/database';
import { User } from '../models/User.model';
import { Booking } from '../models/Booking.model';
import { Payment } from '../models/Payment.model';
import { AppError } from '../middleware/error.middleware';
import { z } from 'zod';
import * as bcrypt from 'bcryptjs';
import { upload } from '../services/upload.service';
import userService from '../services/user.service';
import logger from '../utils/logger.utils';

export class UserController {
  private userRepository = AppDataSource.getRepository(User);
  private bookingRepository = AppDataSource.getRepository(Booking);
  private paymentRepository = AppDataSource.getRepository(Payment);

  // Validation schemas
  public changePasswordSchema = z.object({
    body: z.object({
      currentPassword: z.string().min(1, 'Current password is required'),
      newPassword: z.string()
        .min(8, 'Password must be at least 8 characters')
        .max(100, 'Password must not exceed 100 characters')
        .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
        .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
        .regex(/[0-9]/, 'Password must contain at least one number')
        .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
      confirmPassword: z.string().min(1, 'Confirm password is required'),
    }).refine((data) => data.newPassword === data.confirmPassword, {
      message: "Passwords don't match",
      path: ["confirmPassword"],
    }),
  });

  /**
   * Get user profile
   * @route GET /api/users/profile
   */
  async getProfile(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      
      if (!userId) {
        res.status(401).json({ message: 'Unauthorized' });
        return;
      }
      
      const user = await userService.getUserById(userId);
      
      if (!user) {
        res.status(404).json({ message: 'User not found' });
        return;
      }
      
      // Remove sensitive data
      const { password, ...userProfile } = user;
      
      res.status(200).json({ user: userProfile });
    } catch (error) {
      logger.error('Error getting user profile:', error);
      res.status(500).json({ message: 'Failed to get user profile' });
    }
  }

  /**
   * Update user profile
   * @route PUT /api/users/profile
   */
  async updateProfile(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      
      if (!userId) {
        res.status(401).json({ message: 'Unauthorized' });
        return;
      }
      
      const { firstName, lastName, phone } = req.body;
      
      const updatedUser = await userService.updateProfile(userId, {
        firstName,
        lastName,
        phone,
      });
      
      // Remove sensitive data
      const { password, ...userProfile } = updatedUser;
      
      res.status(200).json({ 
        message: 'Profile updated successfully',
        user: userProfile
      });
    } catch (error) {
      logger.error('Error updating user profile:', error);
      res.status(500).json({ message: 'Failed to update profile' });
    }
  }

  /**
   * Upload profile picture
   * @route POST /api/users/profile/picture
   */
  async uploadProfilePicture(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      
      if (!userId) {
        res.status(401).json({ message: 'Unauthorized' });
        return;
      }
      
      if (!req.file) {
        res.status(400).json({ message: 'No file uploaded' });
        return;
      }
      
      const updatedUser = await userService.updateProfilePicture(userId, req.file.path);
      
      // Remove sensitive data
      const { password, ...userProfile } = updatedUser;
      
      res.status(200).json({ 
        message: 'Profile picture updated successfully',
        user: userProfile
      });
    } catch (error) {
      logger.error('Error uploading profile picture:', error);
      res.status(500).json({ message: 'Failed to upload profile picture' });
    }
  }

  /**
   * Change password
   * @route PUT /api/users/password
   */
  async changePassword(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      
      if (!userId) {
        res.status(401).json({ message: 'Unauthorized' });
        return;
      }
      
      const { currentPassword, newPassword } = req.body;
      
      if (!currentPassword || !newPassword) {
        res.status(400).json({ message: 'Current password and new password are required' });
        return;
      }
      
      // Password validation
      if (newPassword.length < 8) {
        res.status(400).json({ message: 'New password must be at least 8 characters long' });
        return;
      }
      
      await userService.changePassword(userId, { currentPassword, newPassword });
      
      res.status(200).json({ message: 'Password changed successfully' });
    } catch (error) {
      if (error instanceof Error && error.message === 'Current password is incorrect') {
        res.status(400).json({ message: error.message });
      } else {
        logger.error('Error changing password:', error);
        res.status(500).json({ message: 'Failed to change password' });
      }
    }
  }

  /**
   * Delete user account
   * @route DELETE /api/users/account
   */
  async deleteAccount(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      
      if (!userId) {
        res.status(401).json({ message: 'Unauthorized' });
        return;
      }
      
      await userService.deleteAccount(userId);
      
      res.status(200).json({ message: 'Account deleted successfully' });
    } catch (error) {
      logger.error('Error deleting account:', error);
      res.status(500).json({ message: 'Failed to delete account' });
    }
  }

  // Get user bookings with pagination
  public getUserBookings = async (req: Request, res: Response): Promise<Response> => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new AppError(401, 'Unauthorized');
      }

      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const skip = (page - 1) * limit;

      const [bookings, total] = await this.bookingRepository.findAndCount({
        where: { userId },
        relations: ['event', 'seats', 'payment'],
        order: { createdAt: 'DESC' },
        take: limit,
        skip,
      });

      return res.json({
        bookings,
        pagination: {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      if (error instanceof AppError) {
        return res.status(error.statusCode).json({ message: error.message });
      }
      return res.status(500).json({ message: 'Internal server error' });
    }
  };

  // Get user transactions with pagination
  public getUserTransactions = async (req: Request, res: Response): Promise<Response> => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new AppError(401, 'Unauthorized');
      }

      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const skip = (page - 1) * limit;

      // Get payments through bookings
      const [payments, total] = await this.paymentRepository
        .createQueryBuilder('payment')
        .innerJoin('payment.booking', 'booking')
        .where('booking.userId = :userId', { userId })
        .orderBy('payment.createdAt', 'DESC')
        .take(limit)
        .skip(skip)
        .getManyAndCount();

      return res.json({
        transactions: payments,
        pagination: {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      if (error instanceof AppError) {
        return res.status(error.statusCode).json({ message: error.message });
      }
      return res.status(500).json({ message: 'Internal server error' });
    }
  };
}
