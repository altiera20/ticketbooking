# Payment Implementation Documentation

This document outlines the payment processing implementation for the Universal Ticket Booking System.

## Overview

The payment system supports two payment methods:
1. Credit Card payments via Stripe
2. Wallet payments using the user's pre-funded wallet

## Architecture

### Backend Components

1. **Models**:
   - `Payment`: Stores payment information linked to bookings
   - `WalletTransaction`: Records all wallet transactions (credits and debits)

2. **Services**:
   - `PaymentService`: Handles payment processing, wallet operations, and refunds

3. **Controllers**:
   - `PaymentController`: Exposes API endpoints for payment operations

4. **Routes**:
   - `/api/payments/charge`: Process a payment for a booking
   - `/api/payments/wallet/topup`: Add funds to a user's wallet
   - `/api/payments/wallet/transactions`: Get user's wallet transaction history

### Frontend Components

1. **Services**:
   - `PaymentService`: Client-side service for payment operations

2. **Components**:
   - `PaymentForm`: Form for entering credit card details
   - `WalletCard`: Component to display wallet balance and top-up functionality

## Database Schema

### Payments Table

```sql
CREATE TABLE "payments" (
  "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  "bookingId" uuid NOT NULL REFERENCES "bookings"("id") ON DELETE CASCADE,
  "paymentMethod" varchar(50) NOT NULL,
  "transactionId" varchar(255) NOT NULL,
  "amount" decimal(10,2) NOT NULL,
  "status" varchar(20) NOT NULL,
  "paidAt" timestamp,
  "createdAt" timestamp NOT NULL DEFAULT now(),
  "updatedAt" timestamp NOT NULL DEFAULT now()
);
```

### Wallet Transactions Table

```sql
CREATE TABLE "wallet_transactions" (
  "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  "userId" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "type" transaction_type_enum NOT NULL,
  "amount" decimal(10,2) NOT NULL,
  "description" varchar(255) NOT NULL,
  "bookingId" uuid REFERENCES "bookings"("id") ON DELETE SET NULL,
  "referenceId" varchar(255),
  "metadata" jsonb,
  "createdAt" timestamp NOT NULL DEFAULT now()
);
```

## Payment Flow

### Credit Card Payment Flow

1. User enters credit card details on the frontend
2. Frontend validates the card details (format, expiry date, etc.)
3. Frontend sends payment request to `/api/payments/charge` endpoint
4. Backend creates a Stripe Payment Method using the card details
5. Backend creates a Stripe Payment Intent and confirms it
6. If successful, backend creates a Payment record with status `COMPLETED`
7. Backend returns payment confirmation to frontend
8. Frontend shows booking confirmation to user

### Wallet Payment Flow

1. User selects wallet as payment method
2. Frontend checks if wallet balance is sufficient
3. If insufficient, frontend shows top-up prompt
4. If sufficient, frontend sends payment request to `/api/payments/charge` endpoint
5. Backend checks wallet balance in a database transaction
6. If sufficient, backend deducts amount from wallet balance
7. Backend creates a WalletTransaction record for the debit
8. Backend creates a Payment record with status `COMPLETED`
9. Backend returns payment confirmation to frontend
10. Frontend updates displayed wallet balance and shows booking confirmation

### Wallet Top-Up Flow

1. User enters amount and credit card details
2. Frontend validates input and sends request to `/api/payments/wallet/topup` endpoint
3. Backend processes credit card payment via Stripe
4. If successful, backend adds amount to user's wallet balance
5. Backend creates a WalletTransaction record for the credit
6. Backend returns updated wallet balance to frontend
7. Frontend updates displayed wallet balance

## Refund Process

1. When a booking is cancelled, the system initiates a refund
2. If original payment was via wallet, amount is credited back to user's wallet
3. If original payment was via credit card, a Stripe refund is processed
4. Payment status is updated to `REFUNDED`
5. For wallet refunds, a WalletTransaction record is created for the credit

## Security Considerations

1. **PCI Compliance**: Card data is tokenized via Stripe and never stored on our servers
2. **Database Transactions**: Wallet operations use database transactions to ensure data integrity
3. **Input Validation**: All payment inputs are validated on both frontend and backend
4. **Error Handling**: Comprehensive error handling for payment failures
5. **Logging**: Payment operations are logged for audit purposes (excluding sensitive data)

## Testing

1. **Unit Tests**: Test payment service functions in isolation with mocked dependencies
2. **Integration Tests**: Test payment flow from API endpoint to database
3. **Frontend Tests**: Test payment form validation and error handling

## Local Development Setup

1. Install dependencies:
   ```
   npm install
   ```

2. Set up environment variables:
   ```
   STRIPE_SECRET_KEY=sk_test_your_stripe_test_key
   STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key
   ```

3. Run migrations:
   ```
   npm run migration:run
   ```

4. Start the application:
   ```
   npm run dev
   ```

5. Test credit card payments with Stripe test cards:
   - Success: 4242 4242 4242 4242
   - Decline: 4000 0000 0000 0002 