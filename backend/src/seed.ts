import { AppDataSource } from './config/database';
import { Event } from './models/Event.model';
import { User } from './models/User.model';
import { Seat } from './models/Seat.model';
import { EventType, UserRole } from './types/common.types';
import { v4 as uuidv4 } from 'uuid';

async function seedEvents() {
  try {
    // Initialize database connection
    await AppDataSource.initialize();
    console.log('Database connection established');

    // Check if we already have events
    const eventCount = await AppDataSource.getRepository(Event).count();
    if (eventCount > 0) {
      console.log(`Database already has ${eventCount} events. Skipping seed.`);
      return;
    }

    // Get or create a vendor user
    let vendor = await AppDataSource.getRepository(User).findOne({
      where: { email: 'vendor@example.com' }
    });

    if (!vendor) {
      vendor = new User();
      vendor.id = uuidv4();
      vendor.firstName = 'Test';
      vendor.lastName = 'Vendor';
      vendor.email = 'vendor@example.com';
      vendor.password = '$2b$10$XvRMN9XDwQQsJVqYkwMnwOUVxcLiLm.VXAUEKPgKrVp9B9Dw1dvTK'; // hashed 'password123'
      vendor.role = UserRole.VENDOR;
      vendor.isEmailVerified = true;
      vendor.walletBalance = 0;
      vendor.isActive = true;
      await AppDataSource.getRepository(User).save(vendor);
      console.log('Created vendor user');
    }

    // Create sample events
    const events = [
      {
        title: 'Dunki - Hindi Movie',
        description: 'Shah Rukh Khan stars in this heartwarming tale about friendship and dreams. A story that takes you on a journey across borders and cultures.',
        type: EventType.MOVIE,
        venue: 'PVR IMAX, Lower Parel, Mumbai',
        eventDate: new Date('2024-04-15T18:30:00'),
        price: 350,
        totalSeats: 200,
        availableSeats: 200,
        status: 'published',
        vendorId: vendor.id
      },
      {
        title: 'IPL 2024: Mumbai Indians vs Chennai Super Kings',
        description: 'Watch the epic clash between Mumbai Indians and Chennai Super Kings in IPL 2024. Experience the thrill of T20 cricket at its best!',
        type: EventType.SPORTS,
        venue: 'Wankhede Stadium, Mumbai',
        eventDate: new Date('2024-04-20T19:30:00'),
        price: 1000,
        totalSeats: 1000,
        availableSeats: 1000,
        status: 'published',
        vendorId: vendor.id
      },
      {
        title: 'Arijit Singh Live in Concert',
        description: 'Experience the magic of Arijit Singh live in concert. An evening filled with soulful melodies and unforgettable moments.',
        type: EventType.CONCERT,
        venue: 'DY Patil Stadium, Navi Mumbai',
        eventDate: new Date('2024-05-01T20:00:00'),
        price: 2500,
        totalSeats: 800,
        availableSeats: 800,
        status: 'published',
        vendorId: vendor.id
      },
      {
        title: 'Zakir Hussain - Classical Music Night',
        description: 'Witness the maestro Zakir Hussain in a mesmerizing tabla performance, accompanied by other renowned classical musicians.',
        type: EventType.CONCERT,
        venue: 'NCPA Tata Theatre, Mumbai',
        eventDate: new Date('2024-04-25T19:00:00'),
        price: 3000,
        totalSeats: 300,
        availableSeats: 300,
        status: 'published',
        vendorId: vendor.id
      },
      {
        title: 'Vir Das Stand-Up Comedy Show',
        description: 'Join Vir Das for an evening of laughter and wit as he brings his latest stand-up comedy special.',
        type: EventType.COMEDY,
        venue: 'St. Andrews Auditorium, Bandra',
        eventDate: new Date('2024-04-28T20:30:00'),
        price: 1500,
        totalSeats: 400,
        availableSeats: 400,
        status: 'published',
        vendorId: vendor.id
      },
      {
        title: 'Bharatanatyam by Malavika Sarukkai',
        description: 'A classical Bharatanatyam performance by the renowned dancer Malavika Sarukkai, presenting traditional and contemporary pieces.',
        type: EventType.CULTURAL,
        venue: 'Prithvi Theatre, Juhu',
        eventDate: new Date('2024-05-05T18:30:00'),
        price: 1200,
        totalSeats: 150,
        availableSeats: 150,
        status: 'published',
        vendorId: vendor.id
      },
      {
        title: 'Mumbai to Delhi Rajdhani Express',
        description: 'Premium train journey from Mumbai to Delhi with excellent amenities and comfortable seating.',
        type: EventType.TRAIN,
        venue: 'Mumbai Central Station',
        eventDate: new Date('2024-04-22T16:30:00'),
        price: 2200,
        totalSeats: 300,
        availableSeats: 300,
        status: 'published',
        vendorId: vendor.id
      },
      {
        title: 'Durga Puja Cultural Festival',
        description: 'Celebrate Durga Puja with traditional Bengali cultural performances, food festival, and various cultural activities.',
        type: EventType.CULTURAL,
        venue: 'Shivaji Park, Dadar',
        eventDate: new Date('2024-10-12T10:00:00'),
        price: 200,
        totalSeats: 1000,
        availableSeats: 1000,
        status: 'published',
        vendorId: vendor.id
      }
    ];

    // Save events
    for (const eventData of events) {
      const event = new Event();
      Object.assign(event, eventData);
      
      const savedEvent = await AppDataSource.getRepository(Event).save(event);
      console.log(`Created event: ${savedEvent.title}`);
      
      // Create seats for each event
      const seats: Seat[] = [];
      const sections = ['A', 'B', 'C', 'D'];
      const rows = ['1', '2', '3', '4', '5'];
      
      for (const section of sections) {
        for (const row of rows) {
          for (let seatNum = 1; seatNum <= Math.floor(savedEvent.totalSeats / (sections.length * rows.length)); seatNum++) {
            const seat = new Seat();
            seat.eventId = savedEvent.id;
            seat.seatNumber = seatNum.toString().padStart(2, '0');
            seat.row = row;
            seat.section = section;
            seat.status = 'available';
            seat.price = savedEvent.price;
            seats.push(seat);
          }
        }
      }
      
      await AppDataSource.getRepository(Seat).save(seats);
      console.log(`Created ${seats.length} seats for event: ${savedEvent.title}`);
    }

    console.log('Seed completed successfully');
  } catch (error) {
    console.error('Error during seeding:', error);
  } finally {
    // Close the connection
    await AppDataSource.destroy();
    // process.exit(0);
  }
}

// Run the seed function
// seedEvents();