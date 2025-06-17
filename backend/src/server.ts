import 'reflect-metadata';
import app from './app';
import config from './config';
import { AppDataSource } from './database/connection';
import { connectRedis } from './config/redis';
import { createServer } from 'http';
import { Server } from 'socket.io';

// Create HTTP server
const httpServer = createServer(app);

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
  try {
    // Initialize TypeORM connection
    await AppDataSource.initialize();
    console.log('✅ Database connected successfully');
    
    // Connect to Redis
    await connectRedis();
    console.log('✅ Redis connected successfully');
    
    // Start HTTP server
    httpServer.listen(config.port, () => {
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
startServer();

export { io, httpServer };