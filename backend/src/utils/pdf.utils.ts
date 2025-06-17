import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';
import config from '../config';

interface TicketData {
  bookingId: string;
  eventTitle: string;
  eventDate: Date;
  eventVenue: string;
  seats: string[];
  customerName: string;
  totalAmount: number;
  referenceNumber: string;
}

/**
 * Generate a PDF ticket for a booking
 * @param ticketData The data to include in the ticket
 * @returns Buffer containing the PDF document
 */
export async function generatePDF(ticketData: TicketData): Promise<Buffer> {
  return new Promise<Buffer>(async (resolve, reject) => {
    try {
      const chunks: Buffer[] = [];
      const doc = new PDFDocument({
        size: 'A4',
        margin: 50,
        info: {
          Title: `Ticket - ${ticketData.eventTitle}`,
          Author: config.appName,
        },
      });

      // Collect PDF data chunks
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Generate QR code
      const qrCodeData = JSON.stringify({
        bookingId: ticketData.bookingId,
        referenceNumber: ticketData.referenceNumber,
        eventTitle: ticketData.eventTitle,
      });
      
      const qrCodeImage = await QRCode.toDataURL(qrCodeData);

      // Add header
      doc.fontSize(25)
        .font('Helvetica-Bold')
        .text(config.appName, { align: 'center' })
        .moveDown(0.5);

      // Add ticket title
      doc.fontSize(20)
        .font('Helvetica-Bold')
        .text('E-TICKET', { align: 'center' })
        .moveDown(1);

      // Add event details
      doc.fontSize(16)
        .font('Helvetica-Bold')
        .text(ticketData.eventTitle)
        .moveDown(0.5);

      doc.fontSize(12)
        .font('Helvetica')
        .text(`Date: ${formatDate(ticketData.eventDate)}`)
        .text(`Time: ${formatTime(ticketData.eventDate)}`)
        .text(`Venue: ${ticketData.eventVenue}`)
        .moveDown(1);

      // Add customer details
      doc.fontSize(12)
        .font('Helvetica-Bold')
        .text('Customer Details')
        .moveDown(0.2);

      doc.fontSize(12)
        .font('Helvetica')
        .text(`Name: ${ticketData.customerName}`)
        .text(`Reference Number: ${ticketData.referenceNumber}`)
        .moveDown(1);

      // Add seat details
      doc.fontSize(12)
        .font('Helvetica-Bold')
        .text('Seat Details')
        .moveDown(0.2);

      ticketData.seats.forEach(seat => {
        doc.fontSize(12)
          .font('Helvetica')
          .text(seat);
      });

      doc.moveDown(0.5)
        .text(`Total Amount: $${ticketData.totalAmount.toFixed(2)}`)
        .moveDown(1);

      // Add QR code
      doc.image(qrCodeImage, {
        fit: [150, 150],
        align: 'center',
      });

      doc.moveDown(0.5)
        .fontSize(10)
        .font('Helvetica')
        .text('Scan this QR code at the venue for entry', { align: 'center' })
        .moveDown(1);

      // Add footer
      doc.fontSize(10)
        .font('Helvetica')
        .text(`Generated on ${new Date().toLocaleString()}`, { align: 'center' })
        .text(`© ${new Date().getFullYear()} ${config.appName}. All rights reserved.`, { align: 'center' });

      // Finalize the PDF
      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function formatTime(date: Date): string {
  return new Date(date).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });
} 