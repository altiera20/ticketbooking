# Universal Ticket Booking - Backend

This directory contains the Express.js backend application for the Universal Ticket Booking system.

## Architecture

The backend is built with:
- **Node.js**: JavaScript runtime
- **Express.js**: Web framework
- **TypeScript**: Type-safe JavaScript
- **PostgreSQL**: Database for persistent storage
- **Redis**: For session management and temporary seat reservations
- **JWT**: For authentication

## Directory Structure

```
backend/
├── src/
│   ├── config/          # Configuration files
│   ├── controllers/     # Request handlers
│   ├── database/        # Database setup and migrations
│   │   └── migrations/  # Database migration files
│   ├── middleware/      # Express middleware
│   ├── models/          # Database models
│   ├── routes/          # API route definitions
│   ├── services/        # Business logic
│   ├── templates/       # Email templates
│   ├── types/           # TypeScript type definitions
│   ├── utils/           # Utility functions
│   └── server.ts        # Entry point
├── .env                 # Environment variables
└── package.json         # Dependencies
```

## Recent Changes - Booking Implementation

### New API Endpoints

The following booking-related endpoints have been implemented:

1. **GET /api/events/:id/seats**: Fetches available seats for an event
2. **POST /api/bookings/reserve-seats**: Temporarily reserves seats for a user
3. **POST /api/bookings**: Creates a new booking with payment
4. **GET /api/bookings**: Fetches the current user's bookings
5. **GET /api/bookings/:id**: Fetches a single booking by ID
6. **DELETE /api/bookings/:id**: Cancels a booking
7. **GET /api/users/wallet**: Fetches the user's wallet balance

### Key Components

1. **Booking Controller**: Handles booking-related requests
2. **Booking Routes**: Defines booking API endpoints
3. **Email Templates**: HTML templates for booking confirmation and cancellation emails
4. **PDF Utility**: Generates PDF tickets with QR codes

### Features Implemented

1. **Temporary Seat Reservation**: Seats are temporarily reserved for 10 minutes using Redis
2. **Payment Processing**: Support for wallet and credit card payments
3. **Booking Confirmation**: Email notifications with PDF tickets
4. **Booking Cancellation**: Refund processing and cancellation emails
5. **Error Handling**: Comprehensive error handling for all booking operations

## Running the Application

1. Install dependencies:
```
npm install
```

2. Set up environment variables in `.env`:
```
PORT=3001
NODE_ENV=development
DATABASE_URL=postgresql://username:password@localhost:5432/ticket_booking
REDIS_URL=redis://localhost:6379
JWT_SECRET=your_jwt_secret
EMAIL_FROM=noreply@example.com
```

3. Run database migrations:
```
npm run migrate
```

4. Start the development server:
```
npm run dev
```

## API Documentation

For detailed API documentation, see the [API Documentation](docs/api.md) file. 