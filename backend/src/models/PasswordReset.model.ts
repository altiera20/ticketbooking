import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, BeforeInsert } from 'typeorm';
import { User } from './User.model';
import crypto from 'crypto';
import config from '../config';
import logger from '../utils/logger.utils';

@Entity('password_resets')
export class PasswordReset {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  user: User;

  @Column()
  email: string;

  @Column()
  token: string;

  @CreateDateColumn()
  createdAt: Date;

  @Column()
  expiresAt: Date;

  @BeforeInsert()
  generateToken() {
    this.token = crypto.randomBytes(32).toString('hex');
    this.expiresAt = new Date(Date.now() + config.passwordResetExpiry);
  }

  isValid(token: string): boolean {
    return this.token === token;
  }

  isExpired(): boolean {
    return Date.now() > this.expiresAt.getTime();
  }

  static async createResetToken(user: User): Promise<PasswordReset> {
    try {
      const resetToken = new PasswordReset();
      resetToken.user = user;
      resetToken.email = user.email;
      resetToken.generateToken();
      
      return resetToken;
    } catch (error) {
      logger.error('Error creating password reset token:', error);
      throw error;
    }
  }
}