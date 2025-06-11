import { Request, Response } from 'express';
import { AppDataSource } from '../config/database';
import { Event } from '../models/Event.model';
import { Seat } from '../models/Seat.model';
import { AppError } from '../middleware/error.middleware';
import { z } from 'zod';
import { EventType } from '../types/common.types';

export class EventController {
  private eventRepository = AppDataSource.getRepository(Event);
  private seatRepository = AppDataSource.getRepository(Seat);

  // Validation schemas
  public getEventsSchema = z.object({
    query: z.object({
      page: z.string().optional().transform(val => val ? parseInt(val) : 1),
      limit: z.string().optional().transform(val => val ? parseInt(val) : 10),
      type: z.nativeEnum(EventType).optional(),
      minPrice: z.string().optional().transform(val => val ? parseFloat(val) : undefined),
      maxPrice: z.string().optional().transform(val => val ? parseFloat(val) : undefined),
      date: z.string().optional().transform(val => val ? new Date(val) : undefined),
      venue: z.string().optional(),
      search: z.string().optional(),
      sortBy: z.enum(['price', 'date', 'title']).optional().default('date'),
      sortOrder: z.enum(['asc', 'desc']).optional().default('asc'),
    }),
  });

  public getEventByIdSchema = z.object({
    params: z.object({
      id: z.string().uuid('Invalid event ID'),
    }),
  });

  public createEventSchema = z.object({
    body: z.object({
      title: z.string().min(3, 'Title must be at least 3 characters').max(255),
      description: z.string().min(10, 'Description must be at least 10 characters'),
      type: z.nativeEnum(EventType),
      venue: z.string().min(3, 'Venue must be at least 3 characters').max(255),
      eventDate: z.string().transform(val => new Date(val)),
      price: z.number().min(0, 'Price cannot be negative'),
      totalSeats: z.number().int().min(1, 'Event must have at least 1 seat'),
      seatMap: z.array(
        z.object({
          row: z.string().min(1).max(10),
          seatNumbers: z.array(z.string().min(1).max(10)),
          section: z.string().min(1).max(50),
        })
      ),
    }).refine(
      data => {
        // Ensure event date is in the future
        return new Date(data.eventDate) > new Date();
      },
      {
        message: 'Event date must be in the future',
        path: ['eventDate'],
      }
    ),
  });

  public updateEventSchema = z.object({
    params: z.object({
      id: z.string().uuid('Invalid event ID'),
    }),
    body: z.object({
      title: z.string().min(3).max(255).optional(),
      description: z.string().min(10).optional(),
      venue: z.string().min(3).max(255).optional(),
      eventDate: z.string().transform(val => new Date(val)).optional(),
      price: z.number().min(0).optional(),
      status: z.enum(['draft', 'published', 'cancelled', 'completed']).optional(),
    }).refine(
      data => {
        // If event date is provided, ensure it's in the future
        if (data.eventDate) {
          return new Date(data.eventDate) > new Date();
        }
        return true;
      },
      {
        message: 'Event date must be in the future',
        path: ['eventDate'],
      }
    ),
  });

  public deleteEventSchema = z.object({
    params: z.object({
      id: z.string().uuid('Invalid event ID'),
    }),
  });

  // Get events with filtering and pagination
  public getEvents = async (req: Request, res: Response): Promise<Response> => {
    try {
      const {
        page = 1,
        limit = 10,
        type,
        minPrice,
        maxPrice,
        date,
        venue,
        search,
        sortBy = 'date',
        sortOrder = 'asc',
      } = req.query;

      const skip = (Number(page) - 1) * Number(limit);

      // Build query
      const queryBuilder = this.eventRepository.createQueryBuilder('event')
        .where('event.status = :status', { status: 'published' });

      // Apply filters
      if (type) {
        queryBuilder.andWhere('event.type = :type', { type });
      }

      if (minPrice !== undefined) {
        queryBuilder.andWhere('event.price >= :minPrice', { minPrice });
      }

      if (maxPrice !== undefined) {
        queryBuilder.andWhere('event.price <= :maxPrice', { maxPrice });
      }

      if (date) {
        const startDate = new Date(date as string);
        const endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + 1);
        
        queryBuilder.andWhere('event.eventDate >= :startDate AND event.eventDate < :endDate', {
          startDate,
          endDate,
        });
      }

      if (venue) {
        queryBuilder.andWhere('LOWER(event.venue) LIKE :venue', {
          venue: `%${(venue as string).toLowerCase()}%`,
        });
      }

      if (search) {
        queryBuilder.andWhere(
          '(LOWER(event.title) LIKE :search OR LOWER(event.description) LIKE :search)',
          { search: `%${(search as string).toLowerCase()}%` }
        );
      }

      // Apply sorting
      switch (sortBy) {
        case 'price':
          queryBuilder.orderBy('event.price', sortOrder === 'desc' ? 'DESC' : 'ASC');
          break;
        case 'title':
          queryBuilder.orderBy('event.title', sortOrder === 'desc' ? 'DESC' : 'ASC');
          break;
        case 'date':
        default:
          queryBuilder.orderBy('event.eventDate', sortOrder === 'desc' ? 'DESC' : 'ASC');
          break;
      }

      // Get results with pagination
      const [events, total] = await queryBuilder
        .skip(skip)
        .take(Number(limit))
        .getManyAndCount();

      return res.json({
        events,
        pagination: {
          total,
          page: Number(page),
          limit: Number(limit),
          pages: Math.ceil(total / Number(limit)),
        },
      });
    } catch (error) {
      if (error instanceof AppError) {
        return res.status(error.statusCode).json({ message: error.message });
      }
      return res.status(500).json({ message: 'Internal server error' });
    }
  };

  // Get event by ID
  public getEventById = async (req: Request, res: Response): Promise<Response> => {
    try {
      const { id } = req.params;

      const event = await this.eventRepository.findOne({
        where: { id },
        relations: ['seats'],
      });

      if (!event) {
        throw new AppError(404, 'Event not found');
      }

      return res.json({ event });
    } catch (error) {
      if (error instanceof AppError) {
        return res.status(error.statusCode).json({ message: error.message });
      }
      return res.status(500).json({ message: 'Internal server error' });
    }
  };

  // Create new event
  public createEvent = async (req: Request, res: Response): Promise<Response> => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new AppError(401, 'Unauthorized');
      }

      const {
        title,
        description,
        type,
        venue,
        eventDate,
        price,
        totalSeats,
        seatMap,
      } = req.body;

      // Create event
      const event = this.eventRepository.create({
        title,
        description,
        type,
        venue,
        eventDate,
        price,
        totalSeats,
        availableSeats: totalSeats,
        vendorId: userId,
        status: 'draft',
      });

      await this.eventRepository.save(event);

      // Create seats based on seat map
      const seats: Seat[] = [];
      for (const section of seatMap) {
        for (const seatNumber of section.seatNumbers) {
          const seat = this.seatRepository.create({
            eventId: event.id,
            seatNumber,
            row: section.row,
            section: section.section,
            status: 'available',
          });
          seats.push(seat);
        }
      }

      await this.seatRepository.save(seats);

      return res.status(201).json({
        message: 'Event created successfully',
        event: {
          ...event,
          seats,
        },
      });
    } catch (error) {
      if (error instanceof AppError) {
        return res.status(error.statusCode).json({ message: error.message });
      }
      return res.status(500).json({ message: 'Internal server error' });
    }
  };

  // Update event
  public updateEvent = async (req: Request, res: Response): Promise<Response> => {
    try {
      const { id } = req.params;
      const userId = req.user?.id;
      
      if (!userId) {
        throw new AppError(401, 'Unauthorized');
      }

      const event = await this.eventRepository.findOne({ where: { id } });
      
      if (!event) {
        throw new AppError(404, 'Event not found');
      }

      // Check if user is the vendor who created the event
      if (event.vendorId !== userId && req.user?.role !== 'admin') {
        throw new AppError(403, 'You are not authorized to update this event');
      }

      // Update event fields
      const {
        title,
        description,
        venue,
        eventDate,
        price,
        status,
      } = req.body;

      if (title) event.title = title;
      if (description) event.description = description;
      if (venue) event.venue = venue;
      if (eventDate) event.eventDate = eventDate;
      if (price !== undefined) event.price = price;
      if (status) event.status = status;

      await this.eventRepository.save(event);

      return res.json({
        message: 'Event updated successfully',
        event,
      });
    } catch (error) {
      if (error instanceof AppError) {
        return res.status(error.statusCode).json({ message: error.message });
      }
      return res.status(500).json({ message: 'Internal server error' });
    }
  };

  // Delete event
  public deleteEvent = async (req: Request, res: Response): Promise<Response> => {
    try {
      const { id } = req.params;
      const userId = req.user?.id;
      
      if (!userId) {
        throw new AppError(401, 'Unauthorized');
      }

      const event = await this.eventRepository.findOne({ where: { id } });
      
      if (!event) {
        throw new AppError(404, 'Event not found');
      }

      // Check if user is the vendor who created the event
      if (event.vendorId !== userId && req.user?.role !== 'admin') {
        throw new AppError(403, 'You are not authorized to delete this event');
      }

      // Check if event has any bookings
      const hasBookings = await AppDataSource.getRepository('bookings')
        .createQueryBuilder('booking')
        .where('booking.eventId = :eventId', { eventId: id })
        .getCount();

      if (hasBookings > 0) {
        // Instead of deleting, mark as cancelled
        event.status = 'cancelled';
        await this.eventRepository.save(event);
        
        return res.json({
          message: 'Event has existing bookings and has been cancelled instead of deleted',
          event,
        });
      }

      // If no bookings, delete the event
      await this.eventRepository.remove(event);

      return res.json({
        message: 'Event deleted successfully',
      });
    } catch (error) {
      if (error instanceof AppError) {
        return res.status(error.statusCode).json({ message: error.message });
      }
      return res.status(500).json({ message: 'Internal server error' });
    }
  };
}
