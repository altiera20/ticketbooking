import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { IsString, IsEnum } from 'class-validator';
import { Event } from './Event.model';
import { Booking } from './Booking.model';

@Entity('seats')
export class Seat {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Event, event => event.seats)
  @JoinColumn({ name: 'eventId' })
  event: Event;

  @Column({ type: 'uuid' })
  eventId: string;

  @Column({ type: 'varchar', length: 10 })
  @IsString()
  seatNumber: string;

  @Column({ type: 'varchar', length: 10 })
  @IsString()
  row: string;

  @Column({ type: 'varchar', length: 50 })
  @IsString()
  section: string;

  @Column({ type: 'varchar', length: 20 })
  @IsEnum(['available', 'reserved', 'booked'])
  status: string;

  @ManyToOne(() => Booking, booking => booking.seats, { nullable: true })
  @JoinColumn({ name: 'bookingId' })
  booking?: Booking;

  @Column({ type: 'uuid', nullable: true })
  bookingId?: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
} 