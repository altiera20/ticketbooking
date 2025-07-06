import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany, OneToOne, BeforeInsert, BeforeUpdate } from 'typeorm';
import { Exclude } from 'class-transformer';
import { IsEmail, IsEnum, IsString, MinLength, IsNumber, Min } from 'class-validator';
import * as bcrypt from 'bcryptjs';
import { UserRole } from '../types/common.types';
import { Booking } from './Booking.model';
import { Event } from './Event.model';
import { Vendor } from './Vendor.model';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100 })
  @IsString()
  firstName: string;

  @Column({ type: 'varchar', length: 100 })
  @IsString()
  lastName: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  @IsEmail()
  email: string;

  @Column({ type: 'varchar', length: 255 })
  @Exclude()
  @MinLength(8)
  password: string;

  @Column({ type: 'enum', enum: UserRole, default: UserRole.USER })
  @IsEnum(UserRole)
  role: UserRole;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  @IsNumber()
  @Min(0)
  walletBalance: number;

  @Column({ type: 'varchar', length: 255, nullable: true })
  profilePicture?: string;

  @Column({ type: 'varchar', length: 15, nullable: true })
  phone?: string;

  @Column({ type: 'boolean', default: false })
  isEmailVerified: boolean;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @OneToMany(() => Booking, booking => booking.user)
  bookings: Booking[];

  @OneToMany(() => Event, event => event.vendor)
  events: Event[];

  @OneToOne(() => Vendor, vendor => vendor.user)
  vendorProfile: Vendor;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @BeforeInsert()
  @BeforeUpdate()
  async hashPassword() {
    if (this.password) {
      console.log('Hashing password:', this.password.substring(0, 3) + '...');
      try {
        const salt = await bcrypt.genSalt(10);
        console.log('Generated salt:', salt);
        this.password = await bcrypt.hash(this.password, salt);
        console.log('Password hashed successfully');
      } catch (error) {
        console.error('Error hashing password:', error);
      }
    }
  }

  async comparePassword(candidatePassword: string): Promise<boolean> {
    console.log('Comparing passwords:');
    console.log('Candidate password:', candidatePassword);
    console.log('Stored password hash:', this.password);
    try {
      const result = await bcrypt.compare(candidatePassword, this.password);
      console.log('Comparison result:', result);
      return result;
    } catch (error) {
      console.error('Password comparison error:', error);
      return false;
    }
  }
}
