# API Services

This directory contains service classes that handle API communication between the frontend and backend.

## Services Overview

### Event Service (`event.service.ts`)

Handles event-related API operations:

- `getEvents(filters)`: Fetches events with optional filters and pagination
- `getEventById(id)`: Fetches a single event by ID
- `createEvent(data)`: Creates a new event (vendor only)
- `updateEvent(id, data)`: Updates an existing event (vendor only)
- `deleteEvent(id)`: Deletes an event (vendor only)

### Booking Service (`booking.service.ts`)

Handles booking-related API operations:

- `getEventSeats(eventId)`: Fetches available seats for an event
- `reserveSeats(request)`: Temporarily reserves seats for a user
- `createBooking(request)`: Creates a new booking with payment
- `getUserBookings()`: Fetches the current user's bookings
- `getBookingById(id)`: Fetches a single booking by ID
- `cancelBooking(id)`: Cancels a booking
- `getWalletBalance()`: Fetches the user's wallet balance

Also includes utility functions for payment processing:
- `validateCardNumber(cardNumber)`: Validates credit card numbers using Luhn algorithm
- `validateExpiryDate(expiryDate)`: Validates expiry date format and checks if it's in the future
- `formatCardNumber(cardNumber)`: Formats card numbers with spaces for display
- `getCardType(cardNumber)`: Detects card type (Visa, MasterCard, etc.) based on number pattern

### Auth Service (`auth.service.ts`)

Handles authentication-related API operations:

- `login(email, password)`: Authenticates a user and returns tokens
- `register(userData)`: Registers a new user
- `logout()`: Logs out the current user
- `forgotPassword(email)`: Initiates password reset process
- `resetPassword(token, password)`: Resets password with a valid token
- `refreshToken()`: Refreshes the authentication token

## Implementation Details

All services follow a similar pattern:

1. Create an Axios instance with base URL and timeout
2. Add interceptors for authentication and error handling
3. Implement methods that map to API endpoints
4. Handle errors consistently and return typed responses

## Error Handling

Services include comprehensive error handling:

- API errors are caught and transformed into user-friendly messages
- Network errors are handled gracefully
- Authentication errors trigger automatic logout
- All errors are properly logged for debugging

## Usage Example

```typescript
import { eventService } from '../services/event.service';

// In a React component
const fetchEvents = async () => {
  try {
    const { events, pagination } = await eventService.getEvents({
      type: 'CONCERT',
      sortBy: 'date',
      sortOrder: 'asc',
      page: 1
    });
    setEvents(events);
    setPagination(pagination);
  } catch (error) {
    setError(error.message);
  } finally {
    setLoading(false);
  }
};
``` 