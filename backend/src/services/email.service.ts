import nodemailer from 'nodemailer';
import { User } from '../models/User.model';
import { generateEmailVerificationToken, generatePasswordResetToken } from '../utils/jwt.utils';

class EmailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  async sendVerificationEmail(user: User): Promise<void> {
    const token = generateEmailVerificationToken(user.id);
    const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${token}`;

    await this.transporter.sendMail({
      from: process.env.SMTP_FROM || 'noreply@ticketbooking.com',
      to: user.email,
      subject: 'Verify Your Email',
      html: `
        <h1>Welcome to Universal Ticket Booking!</h1>
        <p>Please click the link below to verify your email address:</p>
        <a href="${verificationUrl}">Verify Email</a>
        <p>This link will expire in 24 hours.</p>
        <p>If you didn't create an account, please ignore this email.</p>
      `,
    });
  }

  async sendPasswordResetEmail(user: User): Promise<void> {
    const token = generatePasswordResetToken(user.id);
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;

    await this.transporter.sendMail({
      from: process.env.SMTP_FROM || 'noreply@ticketbooking.com',
      to: user.email,
      subject: 'Reset Your Password',
      html: `
        <h1>Password Reset Request</h1>
        <p>You requested to reset your password. Click the link below to set a new password:</p>
        <a href="${resetUrl}">Reset Password</a>
        <p>This link will expire in 1 hour.</p>
        <p>If you didn't request this, please ignore this email.</p>
      `,
    });
  }

  async sendWelcomeEmail(user: User): Promise<void> {
    await this.transporter.sendMail({
      from: process.env.SMTP_FROM || 'noreply@ticketbooking.com',
      to: user.email,
      subject: 'Welcome to Universal Ticket Booking',
      html: `
        <h1>Welcome to Universal Ticket Booking!</h1>
        <p>Dear ${user.firstName},</p>
        <p>Thank you for joining Universal Ticket Booking. We're excited to have you on board!</p>
        <p>You've received ${user.walletBalance} credits in your wallet to start booking tickets.</p>
        <p>Explore our platform and find amazing events!</p>
      `,
    });
  }
}

export const emailService = new EmailService();
