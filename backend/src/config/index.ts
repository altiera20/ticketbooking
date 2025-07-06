import dotenv from 'dotenv';


interface JWTConfig {
  secret: string;
  accessExpiresIn: string;
  refreshExpiresIn: string;
}

interface DBConfig {
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
}

interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  password: string;
  fromEmail: string;
  fromName: string;
}

interface RateLimitConfig {
  windowMs: number;
  max: number;
}

export interface AppConfig {
  port: number | string;
  nodeEnv: string;
  jwt: JWTConfig;
  db: DBConfig;
  email: EmailConfig;
  clientUrl: string;
  appName: string;
  passwordResetExpiry: number;
  rateLimit: RateLimitConfig;
}

const config: AppConfig = {
  port: process.env.PORT || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',
  
  // JWT Configuration
  jwt: {
    secret: process.env.JWT_SECRET || 'your-secret-key',
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },
  
  // Database Configuration
  db: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || 'ticket_booking',
  },
  
  // Email Configuration
  email: {
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.EMAIL_PORT || '587', 10),
    secure: process.env.EMAIL_SECURE === 'true',
    user: process.env.EMAIL_USER || 'your-email@gmail.com',
    password: process.env.EMAIL_PASSWORD || 'your-email-password',
    fromEmail: process.env.EMAIL_FROM || 'no-reply@ticketbooking.com',
    fromName: process.env.EMAIL_FROM_NAME || 'Ticket Booking System',
  },
  
  // Client URL for redirects and links
  clientUrl: process.env.CLIENT_URL || 'http://localhost:3000',
  
  // Application Name
  appName: process.env.APP_NAME || 'Universal Ticket Booking',
  
  // Password Reset Token Expiry (in milliseconds)
  passwordResetExpiry: parseInt(process.env.PASSWORD_RESET_EXPIRY || '3600000', 10), // 1 hour
  
  // Rate Limiting
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10), // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_MAX || '100', 10), // limit each IP to 100 requests per windowMs
  },
};

export default config;