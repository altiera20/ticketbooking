# Controllers

This directory contains Express.js controllers that handle HTTP requests and responses.

## Booking Controller (`booking.controller.ts`)

Handles all booking-related API endpoints.

### Methods

#### `getEventSeats`
- **Route**: GET /api/events/:id/seats
- **Description**: Fetches all seats for a specific event with their availability status
- **Parameters**: eventId (URL parameter)
- **Response**: Array of seat objects with status (available, reserved, booked)
- **Error Handling**: Handles invalid event ID, not found events

#### `reserveSeats`
- **Route**: POST /api/bookings/reserve-seats
- **Description**: Temporarily reserves seats for a user (10-minute hold)
- **Parameters**: eventId, seatIds (array of seat IDs)
- **Response**: Array of reserved seat objects
- **Error Handling**: Handles already reserved/booked seats, invalid seat IDs

#### `createBooking`
- **Route**: POST /api/bookings
- **Description**: Creates a new booking with payment processing
- **Parameters**: 
  - eventId: ID of the event
  - seatIds: Array of seat IDs
  - paymentMethod: 'CREDIT_CARD' or 'WALLET'
  - paymentDetails: Credit card information (if applicable)
- **Response**: Booking object with reference number
- **Error Handling**: Handles payment failures, expired reservations, insufficient wallet balance

#### `getUserBookings`
- **Route**: GET /api/bookings
- **Description**: Fetches all bookings for the authenticated user
- **Parameters**: Optional query parameters for filtering
- **Response**: Array of booking objects
- **Error Handling**: Handles authentication errors

#### `getBookingById`
- **Route**: GET /api/bookings/:id
- **Description**: Fetches a single booking by ID
- **Parameters**: bookingId (URL parameter)
- **Response**: Booking object with detailed information
- **Error Handling**: Handles not found bookings, unauthorized access

#### `cancelBooking`
- **Route**: DELETE /api/bookings/:id
- **Description**: Cancels a booking and processes refund
- **Parameters**: bookingId (URL parameter)
- **Response**: Success message
- **Error Handling**: Handles not found bookings, already cancelled bookings, refund failures

#### `downloadTicket`
- **Route**: GET /api/bookings/:id/ticket
- **Description**: Generates and downloads a PDF ticket
- **Parameters**: bookingId (URL parameter)
- **Response**: PDF file stream
- **Error Handling**: Handles not found bookings, PDF generation errors

### Implementation Details

The booking controller implements several key features:

1. **Temporary Seat Reservation**:
   - Uses Redis to store temporary seat reservations
   - Sets 10-minute expiry on reservations
   - Prevents double-booking of seats

2. **Payment Processing**:
   - Supports wallet payments (internal balance)
   - Supports credit card payments (external provider)
   - Validates payment details
   - Handles payment failures

3. **Email Notifications**:
   - Sends booking confirmation emails with PDF tickets
   - Sends booking cancellation emails with refund details

4. **PDF Ticket Generation**:
   - Generates PDF tickets with event details
   - Includes QR code for verification
   - Provides downloadable ticket files

5. **Error Handling**:
   - Implements comprehensive error handling
   - Returns appropriate HTTP status codes
   - Provides descriptive error messages

### Usage Example

```typescript
// Example request to create a booking
const response = await fetch('/api/bookings', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    eventId: '123',
    seatIds: ['seat1', 'seat2'],
    paymentMethod: 'CREDIT_CARD',
    paymentDetails: {
      cardNumber: '4242424242424242',
      expiryDate: '12/25',
      cvv: '123',
      cardHolderName: 'John Doe'
    }
  })
});

const booking = await response.json();
console.log(booking.referenceNumber);
``` 