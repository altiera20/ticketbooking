import { Request, Response } from 'express';
import { AppDataSource } from '../config/database';
import { User } from '../models/User.model';
import { redis } from '../config/redis';
import { UserRole } from '../types/common.types';
import { AppError } from '../middleware/error.middleware';
import emailService from '../services/email.service';
import { generateTokens, verifyToken } from '../utils/jwt.utils';

export class AuthController {
  private userRepository = AppDataSource.getRepository(User);
  private INITIAL_WALLET_BALANCE = 1000; // Initial credits for new users

  public register = async (req: Request, res: Response): Promise<Response> => {
    try {
      const { firstName, lastName, email, password, role = UserRole.USER, phone } = req.body;

      const existingUser = await this.userRepository.findOne({ where: { email } });
      if (existingUser) {
        throw new AppError(400, 'Email already registered');
      }

      const user = this.userRepository.create({
        firstName,
        lastName,
        email,
        password,
        role,
        phone,
        walletBalance: this.INITIAL_WALLET_BALANCE,
      });

      await this.userRepository.save(user);

      // Generate tokens
      const { accessToken, refreshToken } = generateTokens(user);

      // Store refresh token in Redis
      await redis.set(`refresh_token:${user.id}`, refreshToken, 'EX', 7 * 24 * 60 * 60); // 7 days

      // Send welcome email
      await emailService.sendWelcomeEmail(user.email, user.firstName);

      return res.status(201).json({
        message: 'Registration successful',
        accessToken,
        refreshToken,
        user: {
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
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

  public login = async (req: Request, res: Response): Promise<Response> => {
    try {
      const { email, password } = req.body;

      const user = await this.userRepository.findOne({ where: { email } });
      if (!user) {
        throw new AppError(401, 'Invalid credentials');
      }

      const isPasswordValid = await user.comparePassword(password);
      if (!isPasswordValid) {
        throw new AppError(401, 'Invalid credentials');
      }

      if (!user.isActive) {
        throw new AppError(401, 'Account is inactive');
      }

      // Generate tokens
      const { accessToken, refreshToken } = generateTokens(user);

      // Store refresh token in Redis
      await redis.set(`refresh_token:${user.id}`, refreshToken, 'EX', 7 * 24 * 60 * 60);

      return res.status(200).json({
        message: 'Login successful',
        accessToken,
        refreshToken,
        user: {
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
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

  public refreshToken = async (req: Request, res: Response): Promise<Response> => {
    try {
      const { refreshToken } = req.body;
      if (!refreshToken) {
        throw new AppError(400, 'Refresh token is required');
      }

      const decoded = verifyToken(refreshToken, 'refresh');
      const storedToken = await redis.get(`refresh_token:${decoded.userId}`);

      if (!storedToken || storedToken !== refreshToken) {
        throw new AppError(401, 'Invalid refresh token');
      }

      const user = await this.userRepository.findOne({ where: { id: decoded.userId } });
      if (!user) {
        throw new AppError(401, 'User not found');
      }

      // Generate new tokens
      const tokens = generateTokens(user);

      // Update refresh token in Redis
      await redis.set(`refresh_token:${user.id}`, tokens.refreshToken, 'EX', 7 * 24 * 60 * 60);

      return res.json(tokens);
    } catch (error) {
      if (error instanceof AppError) {
        return res.status(error.statusCode).json({ message: error.message });
      }
      return res.status(500).json({ message: 'Internal server error' });
    }
  };

  public verifyEmail = async (req: Request, res: Response): Promise<Response> => {
    try {
      const { token } = req.params;
      const decoded = verifyToken(token, 'email-verification');

      const user = await this.userRepository.findOne({ where: { id: decoded.userId } });
      if (!user) {
        throw new AppError(404, 'User not found');
      }

      if (user.isEmailVerified) {
        throw new AppError(400, 'Email already verified');
      }

      user.isEmailVerified = true;
      await this.userRepository.save(user);

      return res.json({ message: 'Email verified successfully' });
    } catch (error) {
      if (error instanceof AppError) {
        return res.status(error.statusCode).json({ message: error.message });
      }
      return res.status(500).json({ message: 'Internal server error' });
    }
  };

  public forgotPassword = async (req: Request, res: Response): Promise<Response> => {
    try {
      const { email } = req.body;

      const user = await this.userRepository.findOne({ where: { email } });
      if (!user) {
        // Return success even if user doesn't exist for security
        return res.json({ message: 'If your email is registered, you will receive a password reset link' });
      }

      // Generate password reset token
      const resetToken = generateTokens(user).accessToken;

      // Send password reset email
      await emailService.sendPasswordResetEmail(user.email, resetToken, user.firstName);

      return res.json({ message: 'If your email is registered, you will receive a password reset link' });
    } catch (error) {
      return res.status(500).json({ message: 'Internal server error' });
    }
  };

  public resetPassword = async (req: Request, res: Response): Promise<Response> => {
    try {
      const { token, password } = req.body;
      const decoded = verifyToken(token, 'password-reset');

      const user = await this.userRepository.findOne({ where: { id: decoded.userId } });
      if (!user) {
        throw new AppError(404, 'User not found');
      }

      user.password = password;
      await this.userRepository.save(user);

      // Invalidate all refresh tokens
      await redis.del(`refresh_token:${user.id}`);

      return res.json({ message: 'Password reset successful' });
    } catch (error) {
      if (error instanceof AppError) {
        return res.status(error.statusCode).json({ message: error.message });
      }
      return res.status(500).json({ message: 'Internal server error' });
    }
  };

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

      const { firstName, lastName, phone, currentPassword, newPassword } = req.body;

      // Update basic info
      if (firstName) user.firstName = firstName;
      if (lastName) user.lastName = lastName;
      if (phone) user.phone = phone;

      // Update password if provided
      if (newPassword) {
        const isCurrentPasswordValid = await user.comparePassword(currentPassword);
        if (!isCurrentPasswordValid) {
          throw new AppError(401, 'Current password is incorrect');
        }
        user.password = newPassword;
      }

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

  public logout = async (req: Request, res: Response): Promise<Response> => {
    try {
      const userId = req.user?.id;
      if (userId) {
        // Remove refresh token from Redis
        await redis.del(`refresh_token:${userId}`);
      }

      return res.json({ message: 'Logged out successfully' });
    } catch (error) {
      return res.status(500).json({ message: 'Internal server error' });
    }
  };
}
