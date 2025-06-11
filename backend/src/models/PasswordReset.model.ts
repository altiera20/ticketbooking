import { Schema, model, Document } from 'mongoose';
import crypto from 'crypto';
import config from '../config';
import logger from '../utils/logger.utils';

export interface IPasswordReset extends Document {
  userId: Schema.Types.ObjectId;
  email: string;
  token: string;
  createdAt: Date;
  expiresAt: Date;
  isValid(token: string): boolean;
  isExpired(): boolean;
}

const passwordResetSchema = new Schema<IPasswordReset>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  email: {
    type: String,
    required: true,
    lowercase: true,
  },
  token: {
    type: String,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 3600, // Auto-delete after 1 hour (in seconds)
  },
  expiresAt: {
    type: Date,
    required: true,
  },
});

// Check if token is valid
passwordResetSchema.methods.isValid = function(token: string): boolean {
  return this.token === token;
};

// Check if token is expired
passwordResetSchema.methods.isExpired = function(): boolean {
  return Date.now() > this.expiresAt.getTime();
};

// Static methods
passwordResetSchema.statics.generateToken = function(): string {
  return crypto.randomBytes(32).toString('hex');
};

passwordResetSchema.statics.createResetToken = async function(userId: Schema.Types.ObjectId, email: string): Promise<{ token: string; expiresAt: Date }> {
  try {
    // Remove any existing tokens for this user
    await this.deleteMany({ userId });
    
    const token = this.generateToken();
    const expiresAt = new Date(Date.now() + config.passwordResetExpiry);
    
    await this.create({
      userId,
      email,
      token,
      expiresAt,
    });
    
    return { token, expiresAt };
  } catch (error) {
    logger.error('Error creating password reset token:', error);
    throw error;
  }
};

passwordResetSchema.statics.findByToken = async function(token: string): Promise<IPasswordReset | null> {
  try {
    const resetToken = await this.findOne({ token });
    
    if (!resetToken) {
      return null;
    }
    
    // Check if token is expired
    if (resetToken.isExpired()) {
      await resetToken.remove();
      return null;
    }
    
    return resetToken;
  } catch (error) {
    logger.error('Error finding password reset token:', error);
    throw error;
  }
};

passwordResetSchema.statics.cleanupExpiredTokens = async function(): Promise<number> {
  try {
    const result = await this.deleteMany({ expiresAt: { $lt: new Date() } });
    return result.deletedCount || 0;
  } catch (error) {
    logger.error('Error cleaning up expired tokens:', error);
    throw error;
  }
};

const PasswordReset = model<IPasswordReset>('PasswordReset', passwordResetSchema);

export default PasswordReset;