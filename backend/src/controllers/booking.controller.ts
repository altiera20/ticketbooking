// backend/src/controllers/booking.controller.ts

import { Request, Response } from 'express';
import { Repository } from 'typeorm';
import { AppDataSource } from '../config/database';
import { Booking } from '../models/Booking.model';
import { Seat } from '../models/Seat.model';
import { Event } from '../models/Event.model';
import { User } from '../models/User.model';
import { PaymentService } from '../services/payment.service';
import emailService from '../services/email.service';
import { 
  BookingStatus, 
  CreateBookingRequest, 
  ProcessPaymentRequest,
  ApiResponse,
  BookingResponse,
  PaymentMethod
} from '../types/common.types';
import { AppError } from '../middleware/error.middleware';
import { z } from 'zod';
import { redis } from '../config/redis';
import { v4 as uuidv4 } from 'uuid';
import { generatePDF } from '../utils/pdf.utils';
import { In, IsNull } from 'typeorm';

export class BookingController {
  private bookingRepository: Repository<Booking>;
  private seatRepository: Repository<Seat>;
  private eventRepository: Repository<Event>;
  private userRepository: Repository<User>;
  private paymentService: PaymentService;
  private seatReservations: Map<string, { userId: string; expiresAt: number }>;
  private reservationTimeout: number = 10 * 60 * 1000; // 10 minutes in milliseconds

  constructor() {
    this.bookingRepository = AppDataSource.getRepository(Booking);
    this.seatRepository = AppDataSource.getRepository(Seat);
    this.eventRepository = AppDataSource.getRepository(Event);
    this.userRepository = AppDataSource.getRepository(User);
    this.paymentService = new PaymentService();
    this.seatReservations = new Map();
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
        razorpayOrderId: z.string().optional(),
        razorpayPaymentId: z.string().optional(),
        razorpaySignature: z.string().optional(),
      }).optional(),
    }).refine(
      data => {
        // If payment method is credit card, Razorpay details are required
        if (data.paymentMethod === PaymentMethod.CREDIT_CARD) {
          return data.paymentDetails && 
                 data.paymentDetails.razorpayOrderId && 
                 data.paymentDetails.razorpayPaymentId && 
                 data.paymentDetails.razorpaySignature;
        }
        return true;
      },
      {
        message: 'Razorpay payment details are required for credit card payments',
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

  // Add the missing schema
  public getEventByIdSchema = z.object({
    params: z.object({
      id: z.string().uuid('Invalid event ID'),
    }),
  });

  /**
   * Get event seats
   */
  getEventSeats = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      
      const seats = await this.seatRepository.find({
        where: { eventId: id },
        order: { row: 'ASC', seatNumber: 'ASC' }
      });
      
      res.json({ 
        success: true, 
        data: seats 
      });
    } catch (error) {
      console.error('Get event seats error:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Internal server error' 
      });
    }
  };

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
        { id: In(bookingData.seatIds) },
        { bookingId: savedBooking.id }
      );

      // Process payment
      try {
        // For Razorpay credit card payments, verify the payment signature
        if (bookingData.paymentMethod === PaymentMethod.CREDIT_CARD && 
            bookingData.paymentDetails?.razorpayOrderId && 
            bookingData.paymentDetails?.razorpayPaymentId && 
            bookingData.paymentDetails?.razorpaySignature) {
          
          const isValid = this.paymentService.verifyPaymentSignature(
            bookingData.paymentDetails.razorpayOrderId,
            bookingData.paymentDetails.razorpayPaymentId,
            bookingData.paymentDetails.razorpaySignature
          );
          
          if (!isValid) {
            // Payment signature verification failed
            await this.cleanupFailedBooking(savedBooking.id, bookingData.seatIds);
            res.status(400).json({ 
              success: false, 
              error: 'Payment verification failed' 
            } as ApiResponse<null>);
            return;
          }
          
          // Create a payment record
          const payment = await this.paymentService.processPayment(
            savedBooking.id,
            totalAmount,
            bookingData.paymentMethod,
            {
              transactionId: bookingData.paymentDetails.razorpayPaymentId,
              orderId: bookingData.paymentDetails.razorpayOrderId
            }
          );
          
          if (payment.status === 'completed') {
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
            // Payment failed
            await this.cleanupFailedBooking(savedBooking.id, bookingData.seatIds);
            res.status(400).json({ 
              success: false, 
              error: 'Payment processing failed' 
            } as ApiResponse<null>);
          }
        } else {
          // For wallet payments or other methods
          const payment = await this.paymentService.processPayment(
            savedBooking.id,
            totalAmount,
            bookingData.paymentMethod,
            bookingData.paymentDetails
          );

          if (payment.status === 'completed') {
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
      const eventDate = new Date(booking.event.eventDate);
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
        { bookingId: undefined }
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
        id: In(seatIds),
        eventId,
        bookingId: IsNull()
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
    try {
      // Delete the booking
    await this.bookingRepository.delete(bookingId);

      // Free up the seats
    await this.seatRepository.update(
        { id: In(seatIds) },
        { bookingId: undefined }
    );

      // Remove seat reservations
    seatIds.forEach(seatId => {
      this.seatReservations.delete(seatId);
    });
    } catch (error) {
      console.error('Cleanup failed booking error:', error);
    }
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
        date: booking.event.eventDate,
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
      
      await emailService.sendBookingConfirmation(
        user.email,
        user.firstName,
        referenceNumber,
        event.title,
        event.eventDate,
        Buffer.from('Ticket PDF content') // In a real app, generate a PDF ticket here
      );
    } catch (error) {
      console.error('Send booking confirmation error:', error);
    }
  }
}