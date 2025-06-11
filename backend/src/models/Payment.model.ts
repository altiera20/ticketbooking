import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToOne, JoinColumn } from 'typeorm';
import { IsEnum, IsNumber, Min, IsString } from 'class-validator';
import { Booking } from './Booking.model';

@Entity('payments')
export class Payment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @OneToOne(() => Booking, booking => booking.payment)
  @JoinColumn({ name: 'bookingId' })
  booking: Booking;

  @Column({ type: 'uuid' })
  bookingId: string;

  @Column({ type: 'varchar', length: 50 })
  @IsString()
  paymentMethod: string;

  @Column({ type: 'varchar', length: 255 })
  @IsString()
  transactionId: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  @IsNumber()
  @Min(0)
  amount: number;

  @Column({ type: 'varchar', length: 20 })
  @IsEnum(['pending', 'completed', 'failed', 'refunded'])
  status: string;

  @Column({ type: 'timestamp', nullable: true })
  paidAt?: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
} 