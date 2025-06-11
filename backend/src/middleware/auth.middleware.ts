import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import { AppDataSource } from '../config/database';
import { User } from '../models/User.model';
import { verifyToken } from '../utils/jwt.utils';
import { AppError } from './error.middleware';
import { UserRole } from '../types/common.types';

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}

// Rate limiting configuration
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 requests per windowMs for auth endpoints
  message: 'Too many authentication attempts. Please try again later.',
});

export const apiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per windowMs for API endpoints
  message: 'Too many requests. Please try again later.',
});

// Authentication middleware
export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      throw new AppError(401, 'No token provided');
    }

    const token = authHeader.split(' ')[1];
    const decoded = verifyToken(token, 'access');

    const user = await AppDataSource.getRepository(User).findOne({
      where: { id: decoded.userId },
    });

    if (!user) {
      throw new AppError(401, 'User not found');
    }

    if (!user.isActive) {
      throw new AppError(401, 'Account is inactive');
    }

    req.user = user;
    next();
  } catch (error) {
    next(new AppError(401, 'Invalid or expired token'));
  }
};

// Role-based authorization middleware
export const authorize = (...roles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new AppError(401, 'Unauthorized'));
      return;
    }

    if (!roles.includes(req.user.role)) {
      next(new AppError(403, 'Insufficient permissions'));
      return;
    }

    next();
  };
};

// Email verification check middleware
export const requireEmailVerified = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (!req.user) {
    next(new AppError(401, 'Unauthorized'));
    return;
  }

  if (!req.user.isEmailVerified) {
    next(new AppError(403, 'Email not verified'));
    return;
  }

  next();
};

// Vendor verification check middleware
export const requireVendorVerified = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  if (!req.user) {
    next(new AppError(401, 'Unauthorized'));
    return;
  }

  if (req.user.role !== UserRole.VENDOR) {
    next(new AppError(403, 'Not a vendor'));
    return;
  }

  const vendor = await AppDataSource.getRepository(User)
    .createQueryBuilder('user')
    .leftJoinAndSelect('user.vendorProfile', 'vendor')
    .where('user.id = :id', { id: req.user.id })
    .getOne();

  if (!vendor?.vendorProfile?.isVerified) {
    next(new AppError(403, 'Vendor not verified'));
    return;
  }

  next();
};
