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

# Razorpay Payment Implementation

This document outlines how Razorpay payment processing is implemented in the Universal Ticket Booking application.

## Overview

The application uses Razorpay for payment processing, which provides a secure and reliable way to handle online payments. The implementation follows Razorpay's recommended integration pattern using order creation, client-side checkout, and server-side verification.

## Environment Variables

The following environment variables need to be set for Razorpay to work properly:

```
# Backend (.env)
RAZORPAY_KEY_ID=your-razorpay-key-id
RAZORPAY_KEY_SECRET=your-razorpay-key-secret
RAZORPAY_WEBHOOK_SECRET=your-razorpay-webhook-secret

# Frontend (.env)
REACT_APP_RAZORPAY_KEY_ID=your-razorpay-key-id
```

## Backend Implementation

### Payment Service (`payment.service.ts`)

The payment service handles all Razorpay-related operations:

1. **Order Creation**: Creates a payment order in Razorpay that can be used by the frontend to initiate the payment process.
2. **Payment Processing**: Processes payments after they are completed on the frontend.
3. **Payment Verification**: Verifies the payment signature to ensure the payment is legitimate.
4. **Refund Processing**: Handles refunds when a booking is canceled.
5. **Webhook Handling**: Processes Razorpay webhook events for payment status updates.

### Payment Controller (`payment.controller.ts`)

The payment controller exposes REST API endpoints for:

1. **Creating Payment Orders**: `POST /api/payments/order`
2. **Verifying Payments**: `POST /api/payments/verify`
3. **Handling Webhooks**: `POST /api/payments/webhook`
4. **Managing Wallet**: `POST /api/payments/wallet/topup`, `GET /api/payments/wallet/balance`, etc.

## Frontend Implementation

### RazorpayCheckout Component (`RazorpayCheckout.tsx`)

This component handles the client-side integration with Razorpay:

1. **Loading the Razorpay Script**: Dynamically loads the Razorpay checkout script.
2. **Initializing Checkout**: Opens the Razorpay checkout modal with the order details.
3. **Handling Callbacks**: Processes success and error callbacks from the Razorpay checkout.

### Payment Service (`payment.service.ts`)

The frontend payment service provides methods to:

1. **Create Orders**: Calls the backend API to create a payment order.
2. **Verify Payments**: Verifies the payment after completion.
3. **Process Payments**: Handles the complete payment flow.
4. **Manage Wallet**: Provides methods for wallet top-up and checking balance.

## Payment Flow

1. **Order Creation**:
   - The frontend requests a payment order from the backend.
   - The backend creates an order in Razorpay and returns the order ID.

2. **Payment Initiation**:
   - The frontend initializes the Razorpay checkout with the order ID.
   - The user completes the payment in the Razorpay checkout modal.

3. **Payment Verification**:
   - After successful payment, Razorpay provides a payment ID and signature.
   - The frontend sends these details to the backend for verification.
   - The backend verifies the signature to ensure the payment is legitimate.

4. **Booking Confirmation**:
   - If the payment is verified, the booking is confirmed.
   - The user receives a confirmation email with booking details.

5. **Webhook Processing**:
   - Razorpay sends webhook events for payment status updates.
   - The backend processes these events to update payment and booking status.

## Testing

The implementation includes unit tests for the payment service and integration tests for the booking flow with Razorpay payments. The tests use mocked Razorpay responses to simulate the payment flow without making actual API calls to Razorpay.

## Error Handling

The implementation includes comprehensive error handling for:

1. **Payment Failures**: When a payment fails, the booking is not confirmed and the seats are released.
2. **Verification Failures**: If the payment signature verification fails, the payment is considered invalid.
3. **Network Issues**: Timeouts and network errors are handled gracefully.

## Security Considerations

1. **Signature Verification**: All payments are verified using cryptographic signatures.
2. **Webhook Authentication**: Webhooks are authenticated using the webhook secret.
3. **Environment Variables**: Sensitive keys are stored in environment variables, not in the code.

## Future Improvements

1. **Payment Analytics**: Implement analytics to track payment success rates and failures.
2. **Multiple Payment Methods**: Add support for UPI, net banking, and other payment methods.
3. **Subscription Support**: Add support for recurring payments and subscriptions.
4. **International Payments**: Add support for multiple currencies and international payments. 