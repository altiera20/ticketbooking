import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';

import apiRoutes from './routes';
import { errorHandler } from './middleware/error.middleware';
import config from './config';
import corsOptions from './config/cors';
import { rateLimiter } from './middleware/rate-limit.middleware';

// Initialize express app
const app = express();

// Apply middleware
app.use(helmet({
  contentSecurityPolicy: false // Disable CSP for development
})); // Security headers
app.use(cors(corsOptions));
app.use(compression()); // Compress responses
app.use(express.json()); // Parse JSON bodies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies
app.use(morgan('dev')); // HTTP request logger
app.use(cookieParser()); // Parse cookies
app.use(rateLimiter);

// API routes
app.use('/api', apiRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ status: 'error', message: 'Route not found' });
});

// Global error handler
app.use(errorHandler);



// Export app for testing
export default app;