import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import sharp from 'sharp';
import { Request } from 'express';
import config from '../config';
import logger from '../utils/logger.utils';

// Define file size limits
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const PROFILE_PIC_SIZE = 500; // 500x500px

// Define allowed file types
const ALLOWED_FILE_TYPES = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'];

// Create uploads directory if it doesn't exist
const UPLOAD_DIR = path.join(__dirname, '../../uploads');
const PROFILE_PICS_DIR = path.join(UPLOAD_DIR, 'profile-pictures');

// Create directories if they don't exist
[UPLOAD_DIR, PROFILE_PICS_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    logger.info(`Created directory: ${dir}`);
  }
});

// Storage configuration for multer
const storage = multer.diskStorage({
  destination: (_req: Request, _file: Express.Multer.File, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (_req: Request, file: Express.Multer.File, cb) => {
    const uniqueFilename = `${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, uniqueFilename);
  },
});

// File filter function
const fileFilter = (_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  if (ALLOWED_FILE_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Unsupported file type. Allowed types: ${ALLOWED_FILE_TYPES.join(', ')}`));
  }
};

// Create multer upload instance
export const upload = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter,
});

class UploadService {
  /**
   * Process and optimize profile picture
   * @param filePath Path to the uploaded file
   * @returns Path to the processed file
   */
  async processProfilePicture(filePath: string): Promise<string> {
    try {
      logger.info(`Processing profile picture: ${filePath}`);
      
      // Check if the original file exists
      if (!fs.existsSync(filePath)) {
        logger.error(`Original file does not exist: ${filePath}`);
        throw new Error('Original file not found');
      }
      
      const filename = path.basename(filePath);
      const outputPath = path.join(PROFILE_PICS_DIR, filename);
      
      logger.info(`Output path for processed image: ${outputPath}`);
      
      // Ensure profile-pictures directory exists
      if (!fs.existsSync(PROFILE_PICS_DIR)) {
        logger.info(`Creating profile pictures directory: ${PROFILE_PICS_DIR}`);
        fs.mkdirSync(PROFILE_PICS_DIR, { recursive: true });
      }
      
      // Process image with sharp
      logger.info('Starting image processing with Sharp');
      await sharp(filePath)
        .resize(PROFILE_PIC_SIZE, PROFILE_PIC_SIZE, {
          fit: 'cover',
          position: 'center',
        })
        .jpeg({ quality: 80 })
        .toFile(outputPath);
      
      logger.info('Image processing completed');
      
      // Delete the original file
      logger.info(`Deleting original file: ${filePath}`);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      
      // Return the relative path for storage in DB
      const relativePath = `uploads/profile-pictures/${filename}`;
      logger.info(`Returning relative path: ${relativePath}`);
      return relativePath;
    } catch (error) {
      logger.error('Error processing profile picture:', error);
      if (error instanceof Error) {
        throw new Error(`Failed to process profile picture: ${error.message}`);
      }
      throw new Error('Failed to process profile picture due to an unknown error');
    }
  }

  /**
   * Delete a file from the uploads directory
   * @param filePath Relative path to the file
   */
  async deleteFile(filePath: string): Promise<void> {
    try {
      const fullPath = path.resolve(UPLOAD_DIR, '..', filePath);
      
      // Check if file exists before attempting to delete
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
        logger.info(`Deleted file: ${filePath}`);
      }
    } catch (error) {
      logger.error(`Error deleting file ${filePath}:`, error);
      throw new Error('Failed to delete file');
    }
  }

  /**
   * Validate image dimensions
   * @param filePath Path to the image file
   * @param minWidth Minimum width in pixels
   * @param minHeight Minimum height in pixels
   * @returns Boolean indicating if image meets minimum dimensions
   */
  async validateImageDimensions(
    filePath: string,
    minWidth: number = 200,
    minHeight: number = 200
  ): Promise<boolean> {
    try {
      const metadata = await sharp(filePath).metadata();
      
      if (!metadata.width || !metadata.height) {
        return false;
      }
      
      return metadata.width >= minWidth && metadata.height >= minHeight;
    } catch (error) {
      logger.error('Error validating image dimensions:', error);
      return false;
    }
  }
}

export default new UploadService();
