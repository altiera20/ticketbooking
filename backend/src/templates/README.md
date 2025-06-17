# Email Templates

This directory contains HTML email templates used for sending notifications to users.

## Booking-Related Templates

### Booking Confirmation (`booking-confirmation.html`)

Sent to users when a booking is successfully completed.

**Template Variables:**
- `{{userName}}`: User's first name
- `{{eventTitle}}`: Title of the booked event
- `{{eventDate}}`: Date and time of the event
- `{{eventVenue}}`: Venue where the event will take place
- `{{bookingReference}}`: Unique booking reference number
- `{{seatDetails}}`: Details of the booked seats
- `{{totalAmount}}`: Total amount paid
- `{{paymentMethod}}`: Method of payment (Credit Card or Wallet)
- `{{purchaseDate}}`: Date when the booking was made
- `{{ticketDownloadLink}}`: Link to download the PDF ticket

**Features:**
- Responsive design that works on mobile and desktop
- Clear presentation of booking details
- Prominent display of booking reference number
- Button link to download PDF ticket
- Contact information for support

### Booking Cancellation (`booking-cancellation.html`)

Sent to users when a booking is cancelled.

**Template Variables:**
- `{{userName}}`: User's first name
- `{{eventTitle}}`: Title of the cancelled event
- `{{bookingReference}}`: Booking reference number
- `{{refundAmount}}`: Amount refunded to the user
- `{{refundMethod}}`: Method of refund (Credit Card or Wallet)
- `{{cancellationDate}}`: Date when the booking was cancelled
- `{{refundProcessingTime}}`: Estimated time for refund processing

**Features:**
- Clear notification of cancellation
- Details of the refund process
- Information about refund processing time
- Links to browse other events
- Contact information for support

## Implementation Details

The email templates are designed with the following considerations:

1. **Responsive Design**: Templates use responsive HTML/CSS that works across email clients
2. **Consistent Branding**: All templates follow the Universal Ticket Booking brand guidelines
3. **Accessibility**: Templates are designed with accessibility in mind
4. **Plain Text Fallback**: Each HTML template has a plain text version for email clients that don't support HTML

## Usage

The templates are used by the email service (`email.service.ts`) to send notifications:

```typescript
import { sendEmail } from '../services/email.service';

// In a controller after booking is completed
await sendEmail({
  to: user.email,
  subject: 'Booking Confirmation - Universal Ticket Booking',
  template: 'booking-confirmation',
  data: {
    userName: user.firstName,
    eventTitle: event.title,
    eventDate: formattedDate,
    eventVenue: event.venue,
    bookingReference: booking.referenceNumber,
    seatDetails: formattedSeats,
    totalAmount: formatCurrency(booking.totalAmount),
    paymentMethod: booking.payment.method,
    purchaseDate: formatDate(booking.bookingDate),
    ticketDownloadLink: `${config.appUrl}/api/bookings/${booking.id}/ticket`
  }
});
```

## Template Preview

To preview the templates during development:

1. Install a tool like `mjml` or `premailer` to process the HTML
2. Open the processed HTML file in a browser
3. Use email testing tools like Litmus or Email on Acid for comprehensive testing 