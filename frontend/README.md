# Universal Ticket Booking - Frontend

This directory contains the React frontend application for the Universal Ticket Booking system.

## Architecture

The frontend is built with:
- **React**: UI library
- **TypeScript**: Type-safe JavaScript
- **React Router**: For navigation
- **Tailwind CSS**: For styling
- **Axios**: For API requests

## Directory Structure

```
frontend/
├── public/             # Static assets
├── src/
│   ├── components/     # Reusable UI components
│   │   ├── booking/    # Booking-specific components
│   │   ├── common/     # Common UI components
│   │   └── event/      # Event-specific components
│   ├── contexts/       # React contexts
│   ├── pages/          # Page components
│   ├── services/       # API services
│   ├── store/          # Redux store
│   ├── types/          # TypeScript types
│   ├── utils/          # Utility functions
│   ├── App.tsx         # Main app component
│   └── index.tsx       # Entry point
└── package.json        # Dependencies
```

## Recent Changes - Booking Implementation

### API Integration

The frontend now connects to the backend API for all data operations:

1. **Event Service**: Fetches events with filtering and pagination
2. **Booking Service**: Handles seat reservations, bookings, and payments

### New Components

1. **SeatSelection**: Interactive seat map for selecting seats
2. **PaymentForm**: Form for credit card or wallet payments

### New Pages

1. **EventDetail**: Shows event details and allows seat selection
2. **Booking**: Handles payment and booking confirmation

### Authentication

Added AuthContext for user authentication and protected routes.

## Running the Application

1. Install dependencies:
```
npm install
```

2. Start the development server:
```
npm start
```

3. Build for production:
```
npm run build
```

## Environment Variables

Create a `.env` file with:

```
REACT_APP_API_URL=http://localhost:3001/api
``` 