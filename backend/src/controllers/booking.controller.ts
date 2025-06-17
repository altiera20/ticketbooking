// backend/src/controllers/booking.controller.ts

import { Request, Response } from 'express';
import { Repository } from 'typeorm';
import { AppDataSource } from '../config/database';
import { Booking } from '../models/Booking.model';
import { Seat } from '../models/Seat.model';
import { Event } from '../models/Event.model';
import { User } from '../models/User.model';
import { PaymentService } from '../services/payment.service';
import { EmailService } from '../services/email.service';
import { 
  BookingStatus, 
  CreateBookingRequest, 
  ProcessPaymentRequest,
  ApiResponse,
  BookingResponse 
} from '../types/common.types';
import { AppError } from '../middleware/error.middleware';
import { z } from 'zod';
import { redis } from '../config/redis';
import { v4 as uuidv4 } from 'uuid';
import { generatePDF } from '../utils/pdf.utils';
import { In } from 'typeorm';

export class BookingController {
  private bookingRepository: Repository<Booking>;
  private seatRepository: Repository<Seat>;
  private eventRepository: Repository<Event>;
  private userRepository: Repository<User>;
  private paymentService: PaymentService;
  private emailService: EmailService;

  // Temporary seat reservations (in production, use Redis)
  private seatReservations = new Map<string, { userId: string; expiresAt: Date }>();

  constructor() {
    this.bookingRepository = AppDataSource.getRepository(Booking);
    this.seatRepository = AppDataSource.getRepository(Seat);
    this.eventRepository = AppDataSource.getRepository(Event);
    this.userRepository = AppDataSource.getRepository(User);
    this.paymentService = new PaymentService();
    this.emailService = new EmailService();

    // Clean up expired reservations every minute
    setInterval(() => {
      this.cleanupExpiredReservations();
    }, 60000);
  }

  // Validation schemas
  public createBookingSchema = z.object({
    body: z.object({
      eventId: z.string().uuid('Invalid event ID'),
      seatIds: z.array(z.string().uuid('Invalid seat ID')).min(1, 'At least one seat is required'),
      paymentMethod: z.enum([PaymentMethod.CREDIT_CARD, PaymentMethod.WALLET]),
      paymentDetails: z.object({
        cardNumber: z.string().optional(),
        expiryDate: z.string().optional(),
        cvv: z.string().optional(),
        cardHolderName: z.string().optional(),
      }).optional(),
    }).refine(
      data => {
        // If payment method is credit card, payment details are required
        if (data.paymentMethod === PaymentMethod.CREDIT_CARD) {
          return data.paymentDetails && 
                 data.paymentDetails.cardNumber && 
                 data.paymentDetails.expiryDate && 
                 data.paymentDetails.cvv && 
                 data.paymentDetails.cardHolderName;
        }
        return true;
      },
      {
        message: 'Payment details are required for credit card payments',
        path: ['paymentDetails'],
      }
    ),
  });

  public getBookingByIdSchema = z.object({
    params: z.object({
      id: z.string().uuid('Invalid booking ID'),
    }),
  });

  public cancelBookingSchema = z.object({
    params: z.object({
      id: z.string().uuid('Invalid booking ID'),
    }),
  });

  public reserveSeatsSchema = z.object({
    body: z.object({
      eventId: z.string().uuid('Invalid event ID'),
      seatIds: z.array(z.string().uuid('Invalid seat ID')).min(1, 'At least one seat is required'),
    }),
  });

  /**
   * Create a new booking
   */
  createBooking = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user?.id;
      const bookingData: CreateBookingRequest = req.body;

      if (!userId) {
        res.status(401).json({ 
          success: false, 
          error: 'Authentication required' 
        } as ApiResponse<null>);
        return;
      }

      // Validate request
      const validation = this.validateBookingRequest(bookingData);
      if (!validation.isValid) {
        res.status(400).json({ 
          success: false, 
          error: validation.error 
        } as ApiResponse<null>);
        return;
      }

      // Check if event exists
      const event = await this.eventRepository.findOne({
        where: { id: bookingData.eventId }
      });

      if (!event) {
        res.status(404).json({ 
          success: false, 
          error: 'Event not found' 
        } as ApiResponse<null>);
        return;
      }

      // Check if seats are available and reserve them
      const seatReservationResult = await this.reserveSeats(
        bookingData.seatIds, 
        userId, 
        bookingData.eventId
      );

      if (!seatReservationResult.success) {
        res.status(400).json({ 
          success: false, 
          error: seatReservationResult.error 
        } as ApiResponse<null>);
        return;
      }

      // Calculate total amount
      const totalAmount = seatReservationResult.seats!.reduce(
        (sum, seat) => sum + seat.price, 0
      );

      // Create booking
      const booking = new Booking();
      booking.userId = userId;
      booking.eventId = bookingData.eventId;
      booking.quantity = bookingData.seatIds.length;
      booking.totalAmount = totalAmount;
      booking.bookingDate = new Date();
      booking.status = BookingStatus.PENDING;

      const savedBooking = await this.bookingRepository.save(booking);

      // Update seats with booking ID
      await this.seatRepository.update(
        { id: { $in: bookingData.seatIds } } as any,
        { bookingId: savedBooking.id, isBooked: true }
      );

      // Process payment
      try {
        const payment = await this.paymentService.processPayment(
          savedBooking.id,
          totalAmount,
          bookingData.paymentMethod,
          bookingData.paymentDetails
        );

        if (payment.status === 'COMPLETED') {
          booking.status = BookingStatus.CONFIRMED;
          await this.bookingRepository.save(booking);

          // Remove seat reservations
          bookingData.seatIds.forEach(seatId => {
            this.seatReservations.delete(seatId);
          });

          // Send confirmation email
          const user = await this.userRepository.findOne({ where: { id: userId } });
          if (user) {
            await this.sendBookingConfirmation(user, savedBooking, event);
          }

          const bookingResponse = await this.getBookingDetails(savedBooking.id);
          res.status(201).json({ 
            success: true, 
            data: bookingResponse,
            message: 'Booking created successfully' 
          } as ApiResponse<BookingResponse>);
        } else {
          // Payment failed, cleanup
          await this.cleanupFailedBooking(savedBooking.id, bookingData.seatIds);
          res.status(400).json({ 
            success: false, 
            error: 'Payment processing failed' 
          } as ApiResponse<null>);
        }
      } catch (paymentError) {
        // Payment failed, cleanup
        await this.cleanupFailedBooking(savedBooking.id, bookingData.seatIds);
        res.status(400).json({ 
          success: false, 
          error: 'Payment processing failed' 
        } as ApiResponse<null>);
      }
    } catch (error) {
      console.error('Create booking error:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Internal server error' 
      } as ApiResponse<null>);
    }
  };

  /**
   * Get user's bookings
   */
  getUserBookings = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({ 
          success: false, 
          error: 'Authentication required' 
        } as ApiResponse<null>);
        return;
      }

      const bookings = await this.bookingRepository.find({
        where: { userId },
        relations: ['event', 'seats', 'payment'],
        order: { createdAt: 'DESC' }
      });

      const bookingResponses = bookings.map(booking => this.mapBookingToResponse(booking));

      res.json({ 
        success: true, 
        data: bookingResponses 
      } as ApiResponse<BookingResponse[]>);
    } catch (error) {
      console.error('Get user bookings error:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Internal server error' 
      } as ApiResponse<null>);
    }
  };

  /**
   * Get booking details
   */
  getBookingById = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({ 
          success: false, 
          error: 'Authentication required' 
        } as ApiResponse<null>);
        return;
      }

      const booking = await this.getBookingDetails(id);

      if (!booking) {
        res.status(404).json({ 
          success: false, 
          error: 'Booking not found' 
        } as ApiResponse<null>);
        return;
      }

      // Check if user owns this booking
      if (booking.userId !== userId) {
        res.status(403).json({ 
          success: false, 
          error: 'Access denied' 
        } as ApiResponse<null>);
        return;
      }

      res.json({ 
        success: true, 
        data: booking 
      } as ApiResponse<BookingResponse>);
    } catch (error) {
      console.error('Get booking error:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Internal server error' 
      } as ApiResponse<null>);
    }
  };

  /**
   * Cancel booking
   */
  cancelBooking = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({ 
          success: false, 
          error: 'Authentication required' 
        } as ApiResponse<null>);
        return;
      }

      const booking = await this.bookingRepository.findOne({
        where: { id },
        relations: ['seats', 'payment', 'event']
      });

      if (!booking) {
        res.status(404).json({ 
          success: false, 
          error: 'Booking not found' 
        } as ApiResponse<null>);
        return;
      }

      if (booking.userId !== userId) {
        res.status(403).json({ 
          success: false, 
          error: 'Access denied' 
        } as ApiResponse<null>);
        return;
      }

      if (booking.status === BookingStatus.CANCELLED) {
        res.status(400).json({ 
          success: false, 
          error: 'Booking is already cancelled' 
        } as ApiResponse<null>);
        return;
      }

      // Check if cancellation is allowed (e.g., not too close to event date)
      const eventDate = new Date(booking.event.date);
      const now = new Date();
      const hoursUntilEvent = (eventDate.getTime() - now.getTime()) / (1000 * 60 * 60);

      if (hoursUntilEvent < 24) {
        res.status(400).json({ 
          success: false, 
          error: 'Cannot cancel booking less than 24 hours before event' 
        } as ApiResponse<null>);
        return;
      }

      // Cancel booking
      booking.status = BookingStatus.CANCELLED;
      await this.bookingRepository.save(booking);

      // Free up seats
      await this.seatRepository.update(
        { bookingId: booking.id },
        { bookingId: null, isBooked: false }
      );

      // Process refund if payment was completed
      if (booking.payment && booking.payment.status === 'COMPLETED') {
        await this.paymentService.refundPayment(booking.payment.id);
      }

      res.json({ 
        success: true, 
        message: 'Booking cancelled successfully' 
      } as ApiResponse<null>);
    } catch (error) {
      console.error('Cancel booking error:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Internal server error' 
      } as ApiResponse<null>);
    }
  };

  /**
   * Reserve seats temporarily
   */
  reserveSeatsTemporarily = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user?.id;
      const { eventId, seatIds } = req.body;

      if (!userId) {
        res.status(401).json({ 
          success: false, 
          error: 'Authentication required' 
        } as ApiResponse<null>);
        return;
      }

      const result = await this.reserveSeats(seatIds, userId, eventId);

      if (result.success) {
        res.json({ 
          success: true, 
          data: result.seats,
          message: 'Seats reserved temporarily for 15 minutes' 
        } as ApiResponse<any>);
      } else {
        res.status(400).json({ 
          success: false, 
          error: result.error 
        } as ApiResponse<null>);
      }
    } catch (error) {
      console.error('Reserve seats error:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Internal server error' 
      } as ApiResponse<null>);
    }
  };

  // Private helper methods

  private validateBookingRequest(data: CreateBookingRequest): { isValid: boolean; error?: string } {
    if (!data.eventId) {
      return { isValid: false, error: 'Event ID is required' };
    }

    if (!data.seatIds || data.seatIds.length === 0) {
      return { isValid: false, error: 'At least one seat must be selected' };
    }

    if (!data.paymentMethod) {
      return { isValid: false, error: 'Payment method is required' };
    }

    if (data.paymentMethod === 'CREDIT_CARD' && !data.paymentDetails) {
      return { isValid: false, error: 'Payment details are required for credit card payments' };
    }

    return { isValid: true };
  }

  private async reserveSeats(
    seatIds: string[], 
    userId: string, 
    eventId: string
  ): Promise<{ success: boolean; error?: string; seats?: any[] }> {
    // Check if seats exist and are available
    const seats = await this.seatRepository.find({
      where: { 
        id: { $in: seatIds } as any,
        eventId,
        isBooked: false 
      }
    });

    if (seats.length !== seatIds.length) {
      return { success: false, error: 'Some seats are not available' };
    }

    // Check for existing reservations
    for (const seatId of seatIds) {
      const reservation = this.seatReservations.get(seatId);
      if (reservation && reservation.userId !== userId && reservation.expiresAt > new Date()) {
        return { success: false, error: 'Some seats are temporarily reserved by another user' };
      }
    }

    // Reserve seats for 15 minutes
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
    seatIds.forEach(seatId => {
      this.seatReservations.set(seatId, { userId, expiresAt });
    });

    return { success: true, seats };
  }

  private cleanupExpiredReservations(): void {
    const now = new Date();
    for (const [seatId, reservation] of this.seatReservations.entries()) {
      if (reservation.expiresAt <= now) {
        this.seatReservations.delete(seatId);
      }
    }
  }

  private async cleanupFailedBooking(bookingId: string, seatIds: string[]): Promise<void> {
    // Remove booking
    await this.bookingRepository.delete(bookingId);

    // Free up seats
    await this.seatRepository.update(
      { id: { $in: seatIds } as any },
      { bookingId: null, isBooked: false }
    );

    // Remove reservations
    seatIds.forEach(seatId => {
      this.seatReservations.delete(seatId);
    });
  }

  private async getBookingDetails(bookingId: string): Promise<BookingResponse | null> {
    const booking = await this.bookingRepository.findOne({
      where: { id: bookingId },
      relations: ['event', 'seats', 'payment', 'user']
    });

    if (!booking) return null;

    return this.mapBookingToResponse(booking);
  }

  private mapBookingToResponse(booking: any): BookingResponse {
    return {
      id: booking.id,
      eventId: booking.eventId,
      userId: booking.userId,
      status: booking.status,
      quantity: booking.quantity,
      totalAmount: booking.totalAmount,
      bookingDate: booking.bookingDate,
      referenceNumber: `BK${booking.id.substr(-8).toUpperCase()}`,
      seats: booking.seats?.map((seat: any) => ({
        id: seat.id,
        seatNumber: seat.seatNumber,
        row: seat.row,
        section: seat.section,
        price: seat.price,
        isBooked: seat.isBooked
      })) || [],
      payment: booking.payment ? {
        id: booking.payment.id,
        amount: booking.payment.amount,
        status: booking.payment.status,
        method: booking.payment.method,
        transactionId: booking.payment.transactionId
      } : {} as any,
      event: booking.event ? {
        id: booking.event.id,
        title: booking.event.title,
        description: booking.event.description,
        date: booking.event.date,
        venue: booking.event.venue,
        category: booking.event.category,
        price: booking.event.price,
        totalSeats: booking.event.totalSeats,
        availableSeats: booking.event.availableSeats
      } : {} as any
    };
  }

  private async sendBookingConfirmation(user: User, booking: Booking, event: Event): Promise<void> {
    try {
      const referenceNumber = `BK${booking.id.substr(-8).toUpperCase()}`;
      
      await this.emailService.sendEmail({
        to: user.email,
        subject: `Booking Confirmation - ${event.title}`,
        html: `
          <h2>Booking Confirmation</h2>
          <p>Dear ${user.firstName},</p>
          <p>Your booking has been confirmed!</p>
          <h3>Booking Details:</h3>
          <ul>
            <li><strong>Reference Number:</strong> ${referenceNumber}</li>
            <li><strong>Event:</strong> ${event.title}</li>
            <li><strong>Date:</strong> ${event.date}</li>
            <li><strong>Venue:</strong> ${event.venue}</li>
            <li><strong>Quantity:</strong> ${booking.quantity} seat(s)</li>
            <li><strong>Total Amount:</strong> $${booking.totalAmount}</li>
          </ul>
          <p>Thank you for your booking!</p>
        `
      });
    } catch (error) {
      console.error('Failed to send booking confirmation email:', error);
    }
  }
}