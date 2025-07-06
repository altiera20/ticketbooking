import { AppDataSource } from '../config/database';
import { User } from '../models/User.model';
import logger from '../utils/logger.utils';
import uploadService from './upload.service';
import * as bcrypt from 'bcryptjs';

interface UpdateProfileData {
  firstName?: string;
  lastName?: string;
  phone?: string;
  profilePicture?: string;
}

interface ChangePasswordData {
  currentPassword: string;
  newPassword: string;
}

class UserService {
  private userRepository = AppDataSource.getRepository(User);

  /**
   * Get user by ID
   * @param userId User ID
   * @returns User object or null if not found
   */
  async getUserById(userId: string): Promise<User | null> {
    try {
      return await this.userRepository.findOne({ where: { id: userId } });
    } catch (error) {
      logger.error('Error getting user by ID:', error);
      throw new Error('Failed to get user');
    }
  }

  /**
   * Update user profile
   * @param userId User ID
   * @param updateData Profile data to update
   * @returns Updated user object
   */
  async updateProfile(userId: string, updateData: UpdateProfileData): Promise<User> {
    try {
      const user = await this.getUserById(userId);
      
      if (!user) {
        throw new Error('User not found');
      }
      
      // Update user properties
      Object.assign(user, updateData);
      
      return await this.userRepository.save(user);
    } catch (error) {
      logger.error('Error updating user profile:', error);
      throw new Error('Failed to update profile');
    }
  }

  /**
   * Update user profile picture
   * @param userId User ID
   * @param filePath Path to uploaded profile picture
   * @returns Updated user object
   */
  async updateProfilePicture(userId: string, filePath: string): Promise<User> {
    try {
      const user = await this.getUserById(userId);
      
      if (!user) {
        throw new Error('User not found');
      }
      
      // Process the uploaded image
      const profilePicturePath = await uploadService.processProfilePicture(filePath);
      
      // Delete old profile picture if exists
      if (user.profilePicture) {
        await uploadService.deleteFile(user.profilePicture);
      }
      
      // Update user with new profile picture path
      user.profilePicture = profilePicturePath;
      
      return await this.userRepository.save(user);
    } catch (error) {
      logger.error('Error updating profile picture:', error);
      if (error instanceof Error) {
        throw new Error(error.message);
      }
      throw new Error('Failed to update profile picture');
    }
  }

  /**
   * Change user password
   * @param userId User ID
   * @param passwordData Current and new password
   * @returns True if password changed successfully
   */
  async changePassword(userId: string, passwordData: ChangePasswordData): Promise<boolean> {
    try {
      const user = await this.getUserById(userId);
      
      if (!user) {
        throw new Error('User not found');
      }
      
      // Verify current password
      const isPasswordValid = await user.comparePassword(passwordData.currentPassword);
      
      if (!isPasswordValid) {
        throw new Error('Current password is incorrect');
      }
      
      // Update password
      user.password = passwordData.newPassword;
      
      await this.userRepository.save(user);
      return true;
    } catch (error) {
      logger.error('Error changing password:', error);
      throw error;
    }
  }

  /**
   * Delete user account
   * @param userId User ID
   * @returns True if account deleted successfully
   */
  async deleteAccount(userId: string): Promise<boolean> {
    try {
      const user = await this.getUserById(userId);
      
      if (!user) {
        throw new Error('User not found');
      }
      
      // Delete profile picture if exists
      if (user.profilePicture) {
        await uploadService.deleteFile(user.profilePicture);
      }
      
      // Delete user
      await this.userRepository.remove(user);
      
      return true;
    } catch (error) {
      logger.error('Error deleting account:', error);
      throw new Error('Failed to delete account');
    }
  }
}

export default new UserService();
