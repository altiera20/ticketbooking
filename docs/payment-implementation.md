# Payment Implementation Documentation

This document outlines the payment processing implementation for the Universal Ticket Booking System.

## Overview

The payment system supports two payment methods:
1. Credit Card payments via Razorpay
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
   - `/api/payments/order`: Create a Razorpay order
   - `/api/payments/verify`: Verify a Razorpay payment
   - `/api/payments/webhook`: Handle Razorpay webhooks
   - `/api/payments/wallet/topup`: Add funds to a user's wallet
   - `/api/payments/wallet/transactions`: Get user's wallet transaction history

### Frontend Components

1. **Services**:
   - `PaymentService`: Client-side service for payment operations

2. **Components**:
   - `RazorpayCheckout`: Component for handling Razorpay checkout
   - `PaymentForm`: Form for entering payment details
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
  "refundedAt" timestamp,
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

1. User selects credit card as payment method on the frontend
2. Frontend creates a Razorpay order via `/api/payments/order` endpoint
3. Frontend opens Razorpay checkout modal with the order ID
4. User enters payment details (card, UPI, wallet, etc.) in the Razorpay modal
5. After successful payment, Razorpay returns payment ID and signature
6. Frontend sends booking request with Razorpay payment details to `/api/bookings` endpoint
7. Backend verifies the Razorpay signature
8. If valid, backend creates a Payment record with status `COMPLETED`
9. Backend returns booking confirmation to frontend
10. Frontend shows booking confirmation to user

### Wallet Payment Flow

1. User selects wallet as payment method
2. Frontend checks if wallet balance is sufficient
3. If insufficient, frontend shows top-up prompt
4. If sufficient, frontend sends booking request to `/api/bookings` endpoint
5. Backend checks wallet balance in a database transaction
6. If sufficient, backend deducts amount from wallet balance
7. Backend creates a WalletTransaction record for the debit
8. Backend creates a Payment record with status `COMPLETED`
9. Backend returns booking confirmation to frontend
10. Frontend updates displayed wallet balance and shows booking confirmation

### Wallet Top-Up Flow

1. User enters amount to add to wallet
2. Frontend creates a Razorpay order via `/api/payments/order` endpoint
3. Frontend opens Razorpay checkout modal with the order ID
4. User completes payment through Razorpay
5. After successful payment, Razorpay returns payment ID and signature
6. Frontend sends verification request to `/api/payments/verify` endpoint
7. Backend verifies the signature and adds amount to user's wallet
8. Backend creates a WalletTransaction record for the credit
9. Backend returns updated wallet balance to frontend
10. Frontend updates displayed wallet balance

## Refund Process

1. When a booking is cancelled, the system initiates a refund
2. If original payment was via wallet, amount is credited back to user's wallet
3. If original payment was via credit card, a Razorpay refund is processed
4. Payment status is updated to `REFUNDED`
5. For wallet refunds, a WalletTransaction record is created for the credit

## Webhook Handling

1. Razorpay sends webhook events to `/api/payments/webhook` endpoint
2. Backend verifies the webhook signature using the webhook secret
3. Backend processes different event types:
   - `payment.captured`: Update payment status to COMPLETED
   - `payment.failed`: Update payment status to FAILED
   - `refund.processed`: Update payment status to REFUNDED

## Security Considerations

1. **PCI Compliance**: Card data is handled by Razorpay and never stored on our servers
2. **Database Transactions**: Wallet operations use database transactions to ensure data integrity
3. **Signature Verification**: All Razorpay payments are verified using cryptographic signatures
4. **Input Validation**: All payment inputs are validated on both frontend and backend
5. **Error Handling**: Comprehensive error handling for payment failures
6. **Logging**: Payment operations are logged for audit purposes (excluding sensitive data)

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
   RAZORPAY_KEY_ID=rzp_test_your_razorpay_test_key
   RAZORPAY_KEY_SECRET=your_razorpay_secret_key
   RAZORPAY_WEBHOOK_SECRET=your_razorpay_webhook_secret
   ```

3. Run migrations:
   ```
   npm run migration:run
   ```

4. Start the application:
   ```
   npm run dev
   ```

5. Test credit card payments with Razorpay test cards:
   - Success: 4111 1111 1111 1111
   - Authentication Required: 4120 0000 0000 0007
   - Failure: 5104 0600 0000 0008 