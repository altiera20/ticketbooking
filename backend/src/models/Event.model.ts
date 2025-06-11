import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { IsEnum, IsString, IsNumber, Min, IsDate } from 'class-validator';
import { EventType } from '../types/common.types';
import { User } from './User.model';
import { Booking } from './Booking.model';
import { Seat } from './Seat.model';

@Entity('events')
export class Event {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, user => user.events)
  @JoinColumn({ name: 'vendorId' })
  vendor: User;

  @Column({ type: 'uuid' })
  vendorId: string;

  @Column({ type: 'varchar', length: 255 })
  @IsString()
  title: string;

  @Column({ type: 'text' })
  @IsString()
  description: string;

  @Column({ type: 'enum', enum: EventType })
  @IsEnum(EventType)
  type: EventType;

  @Column({ type: 'varchar', length: 255 })
  @IsString()
  venue: string;

  @Column({ type: 'timestamp' })
  @IsDate()
  eventDate: Date;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  @IsNumber()
  @Min(0)
  price: number;

  @Column({ type: 'int' })
  @IsNumber()
  @Min(0)
  totalSeats: number;

  @Column({ type: 'int' })
  @IsNumber()
  @Min(0)
  availableSeats: number;

  @Column({ type: 'varchar', length: 20, default: 'draft' })
  @IsEnum(['draft', 'published', 'cancelled', 'completed'])
  status: string;

  @OneToMany(() => Booking, booking => booking.event)
  bookings: Booking[];

  @OneToMany(() => Seat, seat => seat.event)
  seats: Seat[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
