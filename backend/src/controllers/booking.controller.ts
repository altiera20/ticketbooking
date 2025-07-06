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
  PaymentMethod,
  PaymentStatus,
  SeatStatus
} from '../types/common.types';
import { AppError } from '../middleware/error.middleware';
import { z } from 'zod';
import { redis } from '../config/redis';
import { v4 as uuidv4 } from 'uuid';
import { generatePDF } from '../utils/pdf.utils';
import { In, IsNull } from 'typeorm';

export class BookingController {
  private paymentService: PaymentService;
  private seatReservations: Map<string, { userId: string; expiresAt: number }>;
  private reservationTimeout: number = 10 * 60 * 1000; // 10 minutes in milliseconds

  constructor() {
    // Initialize services that do not depend on database connection here
    this.paymentService = new PaymentService();
    this.seatReservations = new Map();
  }

  // Repositories are now accessed within each method to avoid race conditions on startup
  private getBookingRepository = () => AppDataSource.getRepository(Booking);
  private getSeatRepository = () => AppDataSource.getRepository(Seat);
  private getEventRepository = () => AppDataSource.getRepository(Event);
  private getUserRepository = () => AppDataSource.getRepository(User);

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
      
      const seats = await this.getSeatRepository().find({
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
      
      console.log('Creating booking with data:', JSON.stringify(bookingData, null, 2));
      console.log('User ID:', userId);

      if (!userId) {
        console.log('Authentication required - no user ID found');
        res.status(401).json({ 
          success: false, 
          error: 'Authentication required' 
        } as ApiResponse<null>);
        return;
      }

      // Validate request
      const validation = this.validateBookingRequest(bookingData);
      if (!validation.isValid) {
        console.log('Validation failed:', validation.error);
        res.status(400).json({ 
          success: false, 
          error: validation.error 
        } as ApiResponse<null>);
        return;
      }

      // Check if event exists
      const event = await this.getEventRepository().findOne({
        where: { id: bookingData.eventId }
      });

      if (!event) {
        console.log('Event not found:', bookingData.eventId);
        res.status(404).json({ 
          success: false, 
          error: 'Event not found' 
        } as ApiResponse<null>);
        return;
      }
      
      console.log('Event found:', event.title);

      // Check if seats are available and reserve them
      const seatReservationResult = await this.reserveSeats(
        bookingData.seatIds, 
        userId, 
        bookingData.eventId
      );

      if (!seatReservationResult.success) {
        console.log('Seat reservation failed:', seatReservationResult.error);
        res.status(400).json({ 
          success: false, 
          error: seatReservationResult.error 
        } as ApiResponse<null>);
        return;
      }
      
      console.log('Seats reserved successfully:', seatReservationResult.seats?.length);

      // Calculate total amount
      const totalAmount = seatReservationResult.seats!.reduce(
        (sum, seat) => sum + seat.price, 0
      );
      
      console.log('Total amount calculated:', totalAmount);

      // Create booking
      const booking = new Booking();
      booking.userId = userId;
      booking.eventId = bookingData.eventId;
      booking.quantity = bookingData.seatIds.length;
      booking.totalAmount = totalAmount;
      booking.bookingDate = new Date();
      booking.status = BookingStatus.PENDING;
      booking.referenceNumber = `BK-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      
      console.log('Booking object created:', booking);

      const savedBooking = await this.getBookingRepository().save(booking);
      console.log('Booking saved with ID:', savedBooking.id);

      // Update seats with booking ID
      await this.getSeatRepository().update(
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
          
          if (payment.status === PaymentStatus.COMPLETED) {
            booking.status = BookingStatus.CONFIRMED;
            await this.getBookingRepository().save(booking);
            
            // Remove seat reservations
            bookingData.seatIds.forEach(seatId => {
              this.seatReservations.delete(seatId);
            });
            
            // Send confirmation email
            const user = await this.getUserRepository().findOne({ where: { id: userId } });
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
            
            // Get the error message from payment metadata if available
            const errorMessage = payment.metadata?.error || 'Payment processing failed';
            
            console.error('Payment error during booking:', errorMessage);
            
            res.status(400).json({ 
              success: false, 
              error: errorMessage 
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

          if (payment.status === PaymentStatus.COMPLETED) {
            booking.status = BookingStatus.CONFIRMED;
            await this.getBookingRepository().save(booking);

            // Remove seat reservations
            bookingData.seatIds.forEach(seatId => {
              this.seatReservations.delete(seatId);
            });

            // Send confirmation email
            const user = await this.getUserRepository().findOne({ where: { id: userId } });
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
            
            // Get the error message from payment metadata if available
            const errorMessage = payment.metadata?.error || 'Payment processing failed';
            
            console.error('Payment error during booking:', errorMessage);
            
            res.status(400).json({ 
              success: false, 
              error: errorMessage 
            } as ApiResponse<null>);
          }
        }
      } catch (paymentError) {
        // Payment failed, cleanup
        await this.cleanupFailedBooking(savedBooking.id, bookingData.seatIds);
        
        // Get detailed error message
        const errorMessage = paymentError instanceof Error 
          ? paymentError.message 
          : 'Payment processing failed';
        
        console.error('Payment error during booking:', errorMessage);
        
        res.status(400).json({ 
          success: false, 
          error: errorMessage 
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

      const bookings = await this.getBookingRepository().find({
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

      const booking = await this.getBookingRepository().findOne({
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
      await this.getBookingRepository().save(booking);

      // Free up seats
      await this.getSeatRepository().update(
        { bookingId: booking.id },
        { bookingId: undefined }
      );

      // Process refund if payment was completed
      if (booking.payment && booking.payment.status === PaymentStatus.COMPLETED) {
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
    console.log('Validating booking request:', JSON.stringify(data, null, 2));
    
    if (!data.eventId) {
      return { isValid: false, error: 'Event ID is required' };
    }

    if (!data.seatIds || data.seatIds.length === 0) {
      return { isValid: false, error: 'At least one seat must be selected' };
    }

    if (!data.paymentMethod) {
      return { isValid: false, error: 'Payment method is required' };
    }

    // For credit card payments, we need payment details
    if (data.paymentMethod === PaymentMethod.CREDIT_CARD) {
      if (!data.paymentDetails) {
        return { isValid: false, error: 'Payment details are required for credit card payments' };
      }
      
      // For mock payments, we'll be lenient with validation
      const isMockPayment = data.paymentDetails.razorpayOrderId?.includes('mock') || 
                           data.paymentDetails.razorpayPaymentId?.includes('mock') ||
                           data.paymentDetails.razorpaySignature?.includes('mock');
      
      if (isMockPayment) {
        console.log('Mock payment detected, skipping detailed validation');
        return { isValid: true };
      }
      
      // For real payments, validate all required fields
      if (!data.paymentDetails.razorpayOrderId || 
          !data.paymentDetails.razorpayPaymentId || 
          !data.paymentDetails.razorpaySignature) {
        return { 
          isValid: false, 
          error: 'Razorpay payment details (orderId, paymentId, signature) are required' 
        };
      }
    }

    return { isValid: true };
  }

  private async reserveSeats(
    seatIds: string[], 
    userId: string, 
    eventId: string
  ): Promise<{ success: boolean; error?: string; seats?: any[] }> {
    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const seats = await queryRunner.manager.find(Seat, {
        where: { id: In(seatIds), eventId: eventId },
        lock: { mode: 'pessimistic_write' }
      });

      if (seats.length !== seatIds.length) {
        throw new Error('Some seats not found or do not belong to the specified event');
      }

      const now = Date.now();
      for (const seat of seats) {
        const reservation = this.seatReservations.get(seat.id);
        if (seat.status !== SeatStatus.AVAILABLE && (!reservation || reservation.expiresAt <= now)) {
          throw new Error(`Seat ${seat.seatNumber} is not available`);
        }
        if (reservation && reservation.userId !== userId && reservation.expiresAt > now) {
          throw new Error(`Seat ${seat.seatNumber} is currently reserved by another user`);
        }
      }
      
      const reservationExpiry = Date.now() + this.reservationTimeout;
      for (const seat of seats) {
        this.seatReservations.set(seat.id, {
          userId,
          expiresAt: reservationExpiry,
        });
      }

      await queryRunner.commitTransaction();
      return { success: true, seats };
    } catch (error: any) {
      await queryRunner.rollbackTransaction();
      return { success: false, error: error.message };
    } finally {
      await queryRunner.release();
    }
  }

  private async cleanupExpiredReservations(): Promise<void> {
    const now = Date.now();
    for (const [seatId, reservation] of this.seatReservations.entries()) {
      if (reservation.expiresAt <= now) {
        await this.getSeatRepository().update({ id: seatId }, { status: SeatStatus.AVAILABLE, bookingId: undefined });
        this.seatReservations.delete(seatId);
        console.log(`Reservation for seat ${seatId} expired and has been released.`);
      }
    }
  }

  private async cleanupFailedBooking(bookingId: string, seatIds: string[]): Promise<void> {
    try {
      // Release the seats
      await this.getSeatRepository().update(
        { id: In(seatIds) },
        { status: SeatStatus.AVAILABLE, bookingId: undefined }
      );

      // Mark the booking as failed/cancelled
      await this.getBookingRepository().update(
        { id: bookingId },
        { status: BookingStatus.CANCELLED }
      );
    } catch (error) {
      console.error(`Failed to clean up booking ${bookingId}:`, error);
    }
  }

  private async getBookingDetails(bookingId: string): Promise<BookingResponse | null> {
    const booking = await this.getBookingRepository().findOne({
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
      referenceNumber: booking.id.substring(0, 8).toUpperCase(),
      seats: booking.seats.map((seat: Seat) => ({
        id: seat.id,
        seatNumber: seat.seatNumber,
        row: seat.row,
        section: seat.section,
        price: seat.price,
        isBooked: seat.status === SeatStatus.BOOKED,
      })),
      payment: {
        id: booking.payment?.id || '',
        amount: booking.payment?.amount || 0,
        status: booking.payment?.status || PaymentStatus.PENDING,
        method: booking.payment?.paymentMethod || PaymentMethod.WALLET,
        transactionId: booking.payment?.transactionId,
      },
      event: {
        id: booking.event.id,
        title: booking.event.title,
        description: booking.event.description,
        date: booking.event.eventDate,
        venue: booking.event.venue,
        category: booking.event.type,
        price: booking.event.price,
        totalSeats: booking.event.totalSeats,
        availableSeats: booking.event.availableSeats,
      },
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