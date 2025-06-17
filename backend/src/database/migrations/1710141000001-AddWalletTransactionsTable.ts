import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddWalletTransactionsTable1710141000001 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create enum type for transaction type
    await queryRunner.query(`
      CREATE TYPE "transaction_type_enum" AS ENUM ('credit', 'debit');
    `);

    // Create wallet_transactions table
    await queryRunner.query(`
      CREATE TABLE "wallet_transactions" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "userId" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "type" transaction_type_enum NOT NULL,
        "amount" decimal(10,2) NOT NULL,
        "description" varchar(255) NOT NULL,
        "bookingId" uuid REFERENCES "bookings"("id") ON DELETE SET NULL,
        "referenceId" varchar(255),
        "metadata" jsonb,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now()
      );

      CREATE INDEX "idx_wallet_transactions_userId" ON "wallet_transactions"("userId");
      CREATE INDEX "idx_wallet_transactions_bookingId" ON "wallet_transactions"("bookingId");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop wallet_transactions table
    await queryRunner.query(`
      DROP TABLE IF EXISTS "wallet_transactions";
    `);

    // Drop enum type
    await queryRunner.query(`
      DROP TYPE IF EXISTS "transaction_type_enum";
    `);
  }
} 