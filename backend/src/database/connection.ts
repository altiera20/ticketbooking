import { DataSource } from 'typeorm';
import config from '../config';
import path from 'path';
import { User } from '../models/User.model';
import { Booking } from '../models/Booking.model';
import { Event } from '../models/Event.model';
import { Payment } from '../models/Payment.model';
import { Seat } from '../models/Seat.model';
import { Vendor } from '../models/Vendor.model';

const AppDataSource = new DataSource({
  type: 'postgres',
  host: config.db.host,
  port: config.db.port,
  username: config.db.username,
  password: config.db.password,
  database: config.db.database,
  synchronize: false,
  logging: config.nodeEnv === 'development',
  entities: [User, Booking, Event, Payment, Seat, Vendor],
  migrations: [path.join(__dirname, '../migrations/**/*.{ts,js}')],
  subscribers: [path.join(__dirname, '../subscribers/**/*.{ts,js}')],
});

export const connectDatabase = async (): Promise<void> => {
  try {
    await AppDataSource.initialize();
    console.log('Data Source has been initialized!');
  } catch (error) {
    console.error('Error during Data Source initialization:', error);
    throw error;
  }
};

export { AppDataSource };
