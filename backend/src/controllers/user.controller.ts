import { Request, Response } from 'express';
import { AppDataSource } from '../config/database';
import { User } from '../models/User.model';
import { Booking } from '../models/Booking.model';
import { Payment } from '../models/Payment.model';
import { AppError } from '../middleware/error.middleware';
import { z } from 'zod';
import * as bcrypt from 'bcryptjs';

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

  // Get user profile
  public getProfile = async (req: Request, res: Response): Promise<Response> => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new AppError(401, 'Unauthorized');
      }

      const user = await this.userRepository.findOne({
        where: { id: userId },
        relations: ['vendorProfile'],
      });

      if (!user) {
        throw new AppError(404, 'User not found');
      }

      return res.json({
        user: {
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          phone: user.phone,
          role: user.role,
          walletBalance: user.walletBalance,
          isEmailVerified: user.isEmailVerified,
          vendorProfile: user.vendorProfile,
        },
      });
    } catch (error) {
      if (error instanceof AppError) {
        return res.status(error.statusCode).json({ message: error.message });
      }
      return res.status(500).json({ message: 'Internal server error' });
    }
  };

  // Update user profile
  public updateProfile = async (req: Request, res: Response): Promise<Response> => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new AppError(401, 'Unauthorized');
      }

      const user = await this.userRepository.findOne({ where: { id: userId } });
      if (!user) {
        throw new AppError(404, 'User not found');
      }

      const { firstName, lastName, phone } = req.body;

      // Update basic info
      if (firstName) user.firstName = firstName;
      if (lastName) user.lastName = lastName;
      if (phone) user.phone = phone;

      await this.userRepository.save(user);

      return res.json({
        message: 'Profile updated successfully',
        user: {
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          phone: user.phone,
          role: user.role,
          walletBalance: user.walletBalance,
        },
      });
    } catch (error) {
      if (error instanceof AppError) {
        return res.status(error.statusCode).json({ message: error.message });
      }
      return res.status(500).json({ message: 'Internal server error' });
    }
  };

  // Change password
  public changePassword = async (req: Request, res: Response): Promise<Response> => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new AppError(401, 'Unauthorized');
      }

      const user = await this.userRepository.findOne({ where: { id: userId } });
      if (!user) {
        throw new AppError(404, 'User not found');
      }

      const { currentPassword, newPassword } = req.body;

      // Verify current password
      const isPasswordValid = await user.comparePassword(currentPassword);
      if (!isPasswordValid) {
        throw new AppError(401, 'Current password is incorrect');
      }

      // Update password
      user.password = newPassword;
      await this.userRepository.save(user);

      return res.json({ message: 'Password changed successfully' });
    } catch (error) {
      if (error instanceof AppError) {
        return res.status(error.statusCode).json({ message: error.message });
      }
      return res.status(500).json({ message: 'Internal server error' });
    }
  };

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
