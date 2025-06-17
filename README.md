# Universal Ticket Booking System

A comprehensive ticket booking platform for movies, concerts, and train journeys built with React, TypeScript, and Tailwind CSS.

## Features

- **User Authentication**: Secure login and registration system with role-based access (User, Vendor, Admin)
- **Event Browsing**: Browse events with filtering by type, price, date, and venue
- **Responsive Design**: Fully responsive UI that works on mobile, tablet, and desktop
- **Dark/Light Mode**: Toggle between dark and light themes
- **Vendor Dashboard**: Vendors can manage their events and track bookings
- **Accessible UI**: Built with accessibility in mind, following WCAG guidelines
- **State Management**: Centralized state management with Redux Toolkit and RTK Query
- **Seat Selection and Booking**: Users can select seats and book events
- **Payment Processing**: Integrated with Stripe for credit card payments and a wallet system
- **Booking Management**: Users can manage their bookings
- **User Profile Management**: Users can manage their profile information
- **Admin Dashboard**: Admin can manage users, events, and bookings

## Payment System

The application supports two payment methods:

1. **Credit Card Payments**: Integrated with Stripe for secure, PCI-compliant payment processing
2. **Wallet Payments**: Users can pre-fund their wallet and use it for quick bookings

### Wallet Features

- View current balance
- Top up wallet using credit card
- View transaction history
- Automatic refunds to wallet for cancelled bookings

For detailed documentation on the payment implementation, see [Payment Implementation Documentation](./docs/payment-implementation.md).

## Tech Stack

- **Frontend**:
  - React 18
  - TypeScript
  - Redux Toolkit & RTK Query
  - React Router v6
  - Tailwind CSS
  - React Hook Form with Zod validation
  - React Hot Toast for notifications

## Getting Started

### Prerequisites

- Node.js (v14.0.0 or later)
- npm or yarn

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/universal-ticket-booking.git
   cd universal-ticket-booking
   ```

2. Install dependencies:
   ```bash
   cd frontend
   npm install
   # or
   yarn install
   ```

3. Start the development server:
   ```bash
   npm start
   # or
   yarn start
   ```

4. Open your browser and navigate to `http://localhost:3000`

## Project Structure

```
frontend/
├── public/             # Public assets
├── src/
│   ├── components/     # Reusable components
│   │   ├── auth/       # Authentication components
│   │   ├── common/     # Common UI components
│   │   └── event/      # Event-related components
│   ├── hooks/          # Custom React hooks
│   ├── layouts/        # Page layouts
│   ├── pages/          # Page components
│   ├── store/          # Redux store setup
│   │   ├── api.ts      # RTK Query API setup
│   │   └── slices/     # Redux slices
│   ├── types/          # TypeScript type definitions
│   ├── utils/          # Utility functions
│   ├── App.tsx         # Main App component
│   └── index.tsx       # Entry point
├── tailwind.config.js  # Tailwind CSS configuration
└── tsconfig.json       # TypeScript configuration
```

## License

This project is licensed under the MIT License - see the LICENSE file for details.
