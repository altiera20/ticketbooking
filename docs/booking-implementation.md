# Booking Implementation

This document outlines the implementation of the event booking functionality in the Universal Ticket Booking system.

## Architecture Overview

The booking system follows a layered architecture:

1. **Frontend**: React components for seat selection, payment, and booking confirmation
2. **API Layer**: Express.js routes and controllers that handle booking requests
3. **Service Layer**: Business logic for booking processing, payment handling, and notifications
4. **Data Layer**: Database models and Redis for temporary seat reservations

## Booking Flow

```mermaid
sequenceDiagram
    participant User
    participant Frontend
    participant API
    participant Redis
    participant Database
    participant EmailService
    participant PaymentService
    
    User->>Frontend: Select Event
    Frontend->>API: GET /events/:id
    API->>Database: Query Event
    Database-->>API: Event Details
    API-->>Frontend: Event Data
    Frontend->>User: Display Event Details
    
    User->>Frontend: Select Seats
    Frontend->>API: GET /events/:id/seats
    API->>Database: Query Available Seats
    Database-->>API: Seat Data
    API-->>Frontend: Available Seats
    Frontend->>User: Display Seat Map
    
    User->>Frontend: Choose Seats
    Frontend->>API: POST /bookings/reserve-seats
    API->>Redis: Store Temporary Reservation
    Redis-->>API: Reservation Confirmed
    API-->>Frontend: Seats Reserved
    
    User->>Frontend: Enter Payment Details
    Frontend->>API: POST /bookings
    API->>Redis: Check Reservation Validity
    Redis-->>API: Reservation Status
    API->>PaymentService: Process Payment
    PaymentService-->>API: Payment Result
    
    alt Payment Successful
        API->>Database: Create Booking Record
        Database-->>API: Booking Created
        API->>EmailService: Send Confirmation Email
        EmailService-->>User: Booking Confirmation
        API-->>Frontend: Booking Confirmation
        Frontend->>User: Display Success
    else Payment Failed
        API->>Redis: Release Reserved Seats
        API-->>Frontend: Payment Error
        Frontend->>User: Display Error
    end
```

## Key Components

### Frontend Components

1. **SeatSelection**: Interactive seat map for selecting seats
   - Displays seat availability status (available, selected, booked, reserved)
   - Handles seat selection with visual feedback
   - Groups seats by section and row

2. **PaymentForm**: Form for collecting payment details
   - Supports credit card and wallet payment methods
   - Validates credit card details
   - Formats card numbers and expiry dates
   - Detects card type (Visa, MasterCard, etc.)

3. **Booking Page**: Handles the booking process
   - Shows booking summary
   - Integrates payment form
   - Displays booking confirmation
   - Handles error states

### Backend Components

1. **Booking Controller**: Handles API requests
   - Seat availability checking
   - Temporary seat reservation
   - Booking creation
   - Booking retrieval
   - Booking cancellation

2. **Redis Integration**: Manages temporary seat reservations
   - Stores seat IDs with expiration time
   - Prevents double-booking
   - Automatically releases seats after timeout

3. **Payment Processing**: Handles payment methods
   - Wallet balance checking and deduction
   - Credit card validation and processing
   - Refund processing for cancellations

4. **Email Notifications**: Sends booking-related emails
   - Booking confirmation with ticket details
   - Booking cancellation with refund information

5. **PDF Ticket Generation**: Creates downloadable tickets
   - Includes event details and seat information
   - Generates QR code for verification
   - Formatted for printing

## Database Schema

```mermaid
erDiagram
    User ||--o{ Booking : places
    Event ||--o{ Booking : has
    Booking ||--o{ BookingSeat : contains
    Booking ||--|| Payment : has
    Seat ||--o{ BookingSeat : reserved_in
    
    User {
        uuid id PK
        string email
        string firstName
        string lastName
        decimal walletBalance
        string role
    }
    
    Event {
        uuid id PK
        uuid vendorId FK
        string title
        string description
        string type
        string venue
        datetime eventDate
        decimal price
        int totalSeats
        int availableSeats
        string status
    }
    
    Seat {
        uuid id PK
        uuid eventId FK
        string seatNumber
        string row
        string section
        decimal price
    }
    
    Booking {
        uuid id PK
        uuid userId FK
        uuid eventId FK
        string status
        int quantity
        decimal totalAmount
        datetime bookingDate
        string referenceNumber
    }
    
    BookingSeat {
        uuid id PK
        uuid bookingId FK
        uuid seatId FK
    }
    
    Payment {
        uuid id PK
        uuid bookingId FK
        decimal amount
        string status
        string method
        string transactionId
    }
```

## API Endpoints

### Seat Management

- **GET /api/events/:id/seats**: Fetches available seats for an event
- **POST /api/bookings/reserve-seats**: Temporarily reserves seats

### Booking Management

- **POST /api/bookings**: Creates a new booking
- **GET /api/bookings**: Fetches user's bookings
- **GET /api/bookings/:id**: Fetches a specific booking
- **DELETE /api/bookings/:id**: Cancels a booking
- **GET /api/bookings/:id/ticket**: Downloads a PDF ticket

## Error Handling

The booking system implements comprehensive error handling:

1. **Frontend**:
   - Loading states for API operations
   - Error messages for failed operations
   - Retry mechanisms for transient errors
   - Validation for user inputs

2. **Backend**:
   - Input validation using middleware
   - Appropriate HTTP status codes for errors
   - Descriptive error messages
   - Transaction rollback for failed operations
   - Logging for debugging

## Future Improvements

1. **Seat Locking**: Implement more sophisticated seat locking mechanism
2. **Payment Gateway Integration**: Add support for multiple payment providers
3. **Group Bookings**: Allow booking adjacent seats as a group
4. **Dynamic Pricing**: Implement price adjustments based on demand
5. **Mobile Tickets**: Add support for mobile wallet tickets (Apple Wallet, Google Pay)
6. **Booking Modifications**: Allow users to modify existing bookings 