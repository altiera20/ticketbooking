import { z } from 'zod';
import { UserRole } from '../types/common.types';

const passwordSchema = z.string()
  .min(8, 'Password must be at least 8 characters')
  .max(100, 'Password must not exceed 100 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character');

export const registerSchema = z.object({
  body: z.object({
    firstName: z.string()
      .min(2, 'First name must be at least 2 characters')
      .max(100, 'First name must not exceed 100 characters')
      .regex(/^[a-zA-Z\s]*$/, 'First name must contain only letters and spaces'),
    lastName: z.string()
      .min(2, 'Last name must be at least 2 characters')
      .max(100, 'Last name must not exceed 100 characters')
      .regex(/^[a-zA-Z\s]*$/, 'Last name must contain only letters and spaces'),
    email: z.string()
      .email('Invalid email address')
      .max(255, 'Email must not exceed 255 characters'),
    password: passwordSchema,
    confirmPassword: z.string(),
    role: z.nativeEnum(UserRole).optional(),
    phone: z.string()
      .regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number format')
      .optional(),
  }).refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  }),
});

export const loginSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(1, 'Password is required'),
  }),
});

export const forgotPasswordSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email address'),
  }),
});

export const resetPasswordSchema = z.object({
  body: z.object({
    token: z.string(),
    password: passwordSchema,
    confirmPassword: z.string(),
  }).refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  }),
});

export const updateProfileSchema = z.object({
  body: z.object({
    firstName: z.string()
      .min(2, 'First name must be at least 2 characters')
      .max(100, 'First name must not exceed 100 characters')
      .regex(/^[a-zA-Z\s]*$/, 'First name must contain only letters and spaces')
      .optional(),
    lastName: z.string()
      .min(2, 'Last name must be at least 2 characters')
      .max(100, 'Last name must not exceed 100 characters')
      .regex(/^[a-zA-Z\s]*$/, 'Last name must contain only letters and spaces')
      .optional(),
    phone: z.string()
      .regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number format')
      .optional(),
    currentPassword: z.string().optional(),
    newPassword: passwordSchema.optional(),
    confirmNewPassword: z.string().optional(),
  }).refine((data) => {
    if (data.newPassword) {
      return data.currentPassword && data.newPassword === data.confirmNewPassword;
    }
    return true;
  }, {
    message: "Current password is required and new passwords must match",
    path: ["confirmNewPassword"],
  }),
});
