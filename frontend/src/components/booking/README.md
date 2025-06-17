# Booking Components

This directory contains React components related to the booking functionality.

## Components Overview

### SeatSelection (`SeatSelection.tsx`)

An interactive seat map component that allows users to select seats for an event.

**Features:**
- Displays seats grouped by section and row
- Shows seat status (available, selected, booked, reserved)
- Handles seat selection with visual feedback
- Responsive design for different screen sizes

**Props:**
- `seats`: Array of seat objects from the API
- `selectedSeats`: Array of currently selected seats
- `onSeatSelect`: Callback function when a seat is selected

**Usage Example:**
```tsx
<SeatSelection
  seats={seats}
  selectedSeats={selectedSeats}
  onSeatSelect={handleSeatSelect}
/>
```

### PaymentForm (`PaymentForm.tsx`)

A form component for collecting payment details.

**Features:**
- Credit card number input with formatting and validation
- Card type detection (Visa, MasterCard, etc.)
- Expiry date input with formatting
- CVV input
- Cardholder name input

**Props:**
- `paymentDetails`: Object containing card details
- `onChange`: Callback function when input values change

**Usage Example:**
```tsx
<PaymentForm
  paymentDetails={paymentDetails}
  onChange={handlePaymentDetailsChange}
/>
```

## Implementation Details

### SeatSelection

The SeatSelection component organizes seats into a visual representation:

1. Seats are grouped by section and row
2. Each seat is rendered as a button with appropriate styling based on status
3. Available seats can be clicked to toggle selection
4. Selected seats are highlighted
5. Booked or reserved seats are disabled

The component uses a color-coded system:
- Green: Available seats
- Blue: Selected seats
- Gray: Booked seats
- Yellow: Reserved seats

### PaymentForm

The PaymentForm component handles payment information collection:

1. Formats credit card numbers with spaces (e.g., "4242 4242 4242 4242")
2. Validates card numbers using the Luhn algorithm
3. Formats expiry dates as MM/YY
4. Restricts CVV to numeric input
5. Detects and displays card type based on number pattern

## Styling

Components use Tailwind CSS for styling with a consistent design language:
- Consistent color scheme (primary blue, success green, error red)
- Responsive layouts that work on mobile and desktop
- Accessible form controls with proper labeling
- Visual feedback for interactive elements 