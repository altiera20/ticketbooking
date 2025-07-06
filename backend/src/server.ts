import 'reflect-metadata';
import './config/env';
import 'module-alias/register';
import app from './app';
import config from './config';
import { AppDataSource } from './config/database';
import { connectRedis } from './config/redis';
import { createServer } from 'http';
import { Server } from 'socket.io';

// Create HTTP server
const httpServer = createServer(app);

// Handle server errors
httpServer.on('error', (error: NodeJS.ErrnoException) => {
  if (error.syscall !== 'listen') {
    throw error;
  }

  const bind = typeof config.port === 'string' ? 'Pipe ' + config.port : 'Port ' + config.port;

  // Handle specific listen errors with friendly messages
  switch (error.code) {
    case 'EACCES':
      console.error(`${bind} requires elevated privileges`);
      process.exit(1);
      break;
    case 'EADDRINUSE':
      console.error(`${bind} is already in use`);
      process.exit(1);
      break;
    default:
      throw error;
  }
});

// Handle server errors
httpServer.on('error', (error: NodeJS.ErrnoException) => {
  if (error.syscall !== 'listen') {
    throw error;
  }

  const bind = typeof config.port === 'string' ? 'Pipe ' + config.port : 'Port ' + config.port;

  // Handle specific listen errors with friendly messages
  switch (error.code) {
    case 'EACCES':
      console.error(`${bind} requires elevated privileges`);
      process.exit(1);
      break;
    case 'EADDRINUSE':
      console.error(`${bind} is already in use`);
      process.exit(1);
      break;
    default:
      throw error;
  }
});

// Handle server errors
httpServer.on('error', (error: NodeJS.ErrnoException) => {
  if (error.syscall !== 'listen') {
    throw error;
  }

  const bind = typeof config.port === 'string' ? 'Pipe ' + config.port : 'Port ' + config.port;

  // Handle specific listen errors with friendly messages
  switch (error.code) {
    case 'EACCES':
      console.error(`${bind} requires elevated privileges`);
      process.exit(1);
      break;
    case 'EADDRINUSE':
      console.error(`${bind} is already in use`);
      process.exit(1);
      break;
    default:
      throw error;
  }
});

// Socket.IO setup
const io = new Server(httpServer, {
  cors: {
    origin: config.clientUrl,
    methods: ['GET', 'POST'],
  },
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

// Database connections and server startup
const startServer = async () => {
  console.log('Attempting to start server...');
  try {
    console.log('Connecting to database...');
    // Initialize TypeORM connection
    await AppDataSource.initialize();
    console.log('Database connected successfully');

    // Try to connect to Redis, but don't fail if it's not available
    try {
      console.log('Connecting to Redis...');
      // Connect to Redis
      await connectRedis();
      console.log('Redis connected successfully');
    } catch (redisError: any) {
      console.warn('⚠️ Redis connection failed, continuing without Redis:', redisError.message);
    }

    const port = config.port;
    console.log(`Server will listen on port: ${port}`);
    if (!port) {
      console.error('Error: Port is not defined!');
      process.exit(1);
    }

    // Start HTTP server
    httpServer.listen(port, () => {
      console.log(`🚀 Server running on port ${config.port}`);
      console.log(`📱 Environment: ${config.nodeEnv}`);
      console.log(`🔗 Client URL: ${config.clientUrl}`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

// Handle unhandled promise rejections
process.on('unhandledRejection', (err: Error) => {
  console.error('Unhandled rejection:', err);
  httpServer.close(() => process.exit(1));
});

// Handle uncaught exceptions
process.on('uncaughtException', (err: Error) => {
  console.error('Uncaught exception:', err);
  httpServer.close(() => process.exit(1));
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  httpServer.close(() => {
    console.log('Process terminated');
  });
});

// Start the server
startServer().catch(err => {
  console.error('Caught unhandled error during server startup:', err);
  process.exit(1);
});

export { io, httpServer };