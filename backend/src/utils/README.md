# Utilities

This directory contains utility functions and helper modules used throughout the application.

## PDF Utilities (`pdf.utils.ts`)

Provides functionality for generating PDF tickets with QR codes.

### Functions

#### `generateTicketPDF(booking, event, seats)`

Generates a PDF ticket for a booking.

**Parameters:**
- `booking`: Booking object with details like reference number, date, etc.
- `event`: Event object with details like title, venue, date, etc.
- `seats`: Array of seat objects booked

**Returns:**
- Buffer containing the PDF data

**Features:**
- Creates a professional-looking ticket with event details
- Includes a QR code containing the booking reference number
- Displays seat information
- Includes event date, time, and venue
- Shows booking reference number and purchase date

### Implementation Details

The PDF utility uses the following libraries:
- **PDFKit**: For PDF generation
- **QRCode**: For generating QR codes
- **fs**: For file system operations (temporary file handling)

The generated PDF includes:
1. Event header with title and type
2. Event details section (date, time, venue)
3. Booking information (reference number, purchase date)
4. Seat information (section, row, seat numbers)
5. QR code for verification
6. Terms and conditions

### Example Usage

```typescript
import { generateTicketPDF } from '../utils/pdf.utils';
import { Booking, Event, Seat } from '../types';

// In a controller method
async function downloadTicket(req, res) {
  try {
    const booking: Booking = await getBookingById(req.params.id);
    const event: Event = await getEventById(booking.eventId);
    const seats: Seat[] = await getBookingSeats(booking.id);
    
    // Generate PDF
    const pdfBuffer = await generateTicketPDF(booking, event, seats);
    
    // Set response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="ticket-${booking.referenceNumber}.pdf"`);
    
    // Send PDF
    res.send(pdfBuffer);
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate ticket' });
  }
}
```

### PDF Layout

The generated PDF has the following layout:

```
+--------------------------------------+
| UNIVERSAL TICKET BOOKING             |
+--------------------------------------+
| EVENT TITLE                          |
| Event Type                           |
+--------------------------------------+
| Date: DD/MM/YYYY     Time: HH:MM AM  |
| Venue: Venue Name                    |
+--------------------------------------+
| BOOKING DETAILS                      |
| Reference: ABC123                    |
| Purchased: DD/MM/YYYY                |
+--------------------------------------+
| SEATS                                |
| Section A, Row 3, Seat 12            |
| Section A, Row 3, Seat 13            |
+--------------------------------------+
|                                      |
|             [QR CODE]                |
|                                      |
+--------------------------------------+
| Terms and conditions apply           |
+--------------------------------------+
``` 