import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateInitialTables1710141000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create enum types
    await queryRunner.query(`
      CREATE TYPE "user_role_enum" AS ENUM ('user', 'vendor', 'admin');
      CREATE TYPE "event_type_enum" AS ENUM ('movie', 'concert', 'train');
      CREATE TYPE "booking_status_enum" AS ENUM ('pending', 'confirmed', 'cancelled', 'completed');
    `);

    // Create users table
    await queryRunner.query(`
      CREATE TABLE "users" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "firstName" varchar(100) NOT NULL,
        "lastName" varchar(100) NOT NULL,
        "email" varchar(255) NOT NULL UNIQUE,
        "password" varchar(255) NOT NULL,
        "role" user_role_enum NOT NULL DEFAULT 'user',
        "walletBalance" decimal(10,2) NOT NULL DEFAULT 0,
        "profilePicture" varchar(255),
        "phone" varchar(15),
        "isEmailVerified" boolean NOT NULL DEFAULT false,
        "isActive" boolean NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now()
      );

      CREATE INDEX "idx_users_email" ON "users"("email");
      CREATE INDEX "idx_users_role" ON "users"("role");
    `);

    // Create vendors table
    await queryRunner.query(`
      CREATE TABLE "vendors" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "userId" uuid NOT NULL UNIQUE,
        "businessName" varchar(255) NOT NULL,
        "businessLicense" varchar(255) NOT NULL,
        "verifiedAt" TIMESTAMP,
        "isVerified" boolean NOT NULL DEFAULT false,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "fk_vendors_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
      );

      CREATE INDEX "idx_vendors_business_name" ON "vendors"("businessName");
      CREATE INDEX "idx_vendors_verified" ON "vendors"("isVerified");
    `);

    // Create events table
    await queryRunner.query(`
      CREATE TABLE "events" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "vendorId" uuid NOT NULL,
        "title" varchar(255) NOT NULL,
        "description" text NOT NULL,
        "type" event_type_enum NOT NULL,
        "venue" varchar(255) NOT NULL,
        "eventDate" TIMESTAMP NOT NULL,
        "price" decimal(10,2) NOT NULL,
        "totalSeats" integer NOT NULL,
        "availableSeats" integer NOT NULL,
        "status" varchar(20) NOT NULL DEFAULT 'draft',
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "fk_events_vendor" FOREIGN KEY ("vendorId") REFERENCES "users"("id") ON DELETE CASCADE
      );

      CREATE INDEX "idx_events_type" ON "events"("type");
      CREATE INDEX "idx_events_status" ON "events"("status");
      CREATE INDEX "idx_events_event_date" ON "events"("eventDate");
    `);

    // Create bookings table
    await queryRunner.query(`
      CREATE TABLE "bookings" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "userId" uuid NOT NULL,
        "eventId" uuid NOT NULL,
        "status" booking_status_enum NOT NULL DEFAULT 'pending',
        "quantity" integer NOT NULL,
        "totalAmount" decimal(10,2) NOT NULL,
        "bookingDate" TIMESTAMP NOT NULL DEFAULT now(),
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "fk_bookings_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "fk_bookings_event" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE
      );

      CREATE INDEX "idx_bookings_user" ON "bookings"("userId");
      CREATE INDEX "idx_bookings_event" ON "bookings"("eventId");
      CREATE INDEX "idx_bookings_status" ON "bookings"("status");
    `);

    // Create seats table
    await queryRunner.query(`
      CREATE TABLE "seats" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "eventId" uuid NOT NULL,
        "seatNumber" varchar(10) NOT NULL,
        "row" varchar(10) NOT NULL,
        "section" varchar(50) NOT NULL,
        "status" varchar(20) NOT NULL DEFAULT 'available',
        "bookingId" uuid,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "fk_seats_event" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE,
        CONSTRAINT "fk_seats_booking" FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE SET NULL
      );

      CREATE INDEX "idx_seats_event_status" ON "seats"("eventId", "status");
      CREATE UNIQUE INDEX "idx_seats_event_number" ON "seats"("eventId", "seatNumber");
    `);

    // Create payments table
    await queryRunner.query(`
      CREATE TABLE "payments" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "bookingId" uuid NOT NULL UNIQUE,
        "paymentMethod" varchar(50) NOT NULL,
        "transactionId" varchar(255) NOT NULL,
        "amount" decimal(10,2) NOT NULL,
        "status" varchar(20) NOT NULL DEFAULT 'pending',
        "paidAt" TIMESTAMP,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "fk_payments_booking" FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE CASCADE
      );

      CREATE INDEX "idx_payments_status" ON "payments"("status");
      CREATE INDEX "idx_payments_transaction" ON "payments"("transactionId");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop tables in reverse order
    await queryRunner.query(`DROP TABLE IF EXISTS "payments" CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS "seats" CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS "bookings" CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS "events" CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS "vendors" CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS "users" CASCADE;`);

    // Drop enum types
    await queryRunner.query(`
      DROP TYPE IF EXISTS "booking_status_enum";
      DROP TYPE IF EXISTS "event_type_enum";
      DROP TYPE IF EXISTS "user_role_enum";
    `);
  }
} 