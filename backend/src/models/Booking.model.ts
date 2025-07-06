import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany, OneToOne, JoinColumn } from 'typeorm';
import { IsEnum, IsNumber, Min } from 'class-validator';
import { BookingStatus } from '../types/common.types';
import { User } from './User.model';
import { Event } from './Event.model';
import { Seat } from './Seat.model';
import { Payment } from './Payment.model';

@Entity('bookings')
export class Booking {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, user => user.bookings)
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ type: 'uuid' })
  userId: string;

  @ManyToOne(() => Event, event => event.bookings)
  @JoinColumn({ name: 'eventId' })
  event: Event;

  @Column({ type: 'uuid' })
  eventId: string;

  @Column({ type: 'enum', enum: BookingStatus, default: BookingStatus.PENDING })
  @IsEnum(BookingStatus)
  status: BookingStatus;

  @Column({ type: 'int' })
  @IsNumber()
  @Min(1)
  quantity: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  @IsNumber()
  @Min(0)
  totalAmount: number;

  @Column({ type: 'timestamp' })
  bookingDate: Date;

  @Column({ type: 'varchar', length: 50, nullable: true })
  referenceNumber: string;

  @OneToMany(() => Seat, seat => seat.booking)
  seats: Seat[];

  @OneToOne(() => Payment, payment => payment.booking)
  payment: Payment;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
