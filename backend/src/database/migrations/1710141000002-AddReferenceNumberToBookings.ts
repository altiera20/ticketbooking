import { MigrationInterface, QueryRunner } from "typeorm";

export class AddReferenceNumberToBookings1710141000002 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "bookings" 
            ADD COLUMN IF NOT EXISTS "referenceNumber" VARCHAR(50)
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "bookings" 
            DROP COLUMN IF EXISTS "referenceNumber"
        `);
    }
} 