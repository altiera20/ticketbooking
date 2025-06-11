import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import { User } from '../models/User.model';
import { Vendor } from '../models/Vendor.model';
import { Event } from '../models/Event.model';
import { Booking } from '../models/Booking.model';
import { Seat } from '../models/Seat.model';
import { Payment } from '../models/Payment.model';

config();

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'ticket_booking',
  synchronize: process.env.NODE_ENV === 'development',
  logging: process.env.NODE_ENV === 'development',
  entities: [User, Vendor, Event, Booking, Seat, Payment],
  migrations: ['src/database/migrations/*.ts'],
  subscribers: [],
});
