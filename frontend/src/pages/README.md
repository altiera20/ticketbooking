# Pages

This directory contains React components that represent full pages in the application.

## Recently Updated Pages

### Events (`Events.tsx`)

The main page for browsing and filtering events.

**Key Features:**
- Fetches events from the API with pagination
- Supports filtering by event type, price range, date, venue, etc.
- Implements grid and list view options
- Handles loading, error, and empty states
- Includes retry mechanism for failed API calls

### EventDetail (`EventDetail.tsx`)

Displays detailed information about a specific event and allows seat selection.

**Key Features:**
- Fetches event details and available seats from the API
- Displays event information (title, description, date, venue, price)
- Includes interactive seat selection component
- Handles temporary seat reservation
- Implements comprehensive error handling for both event and seat loading
- Provides retry mechanisms for failed API calls

### Booking (`Booking.tsx`)

Handles the booking process after seat selection.

**Key Features:**
- Receives selected event and seats from EventDetail page
- Offers payment options (wallet or credit card)
- Validates payment details
- Processes booking through the API
- Displays booking confirmation with details
- Handles various error states during the booking process

## Implementation Details

### API Integration

All pages use the service layer to communicate with the backend:

```typescript
// Example from EventDetail.tsx
const fetchEventDetails = async () => {
  try {
    setLoading(true);
    setError(null);

    // Fetch event details
    const eventData = await eventService.getEventById(id!);
    setEvent(eventData);

    // Fetch seats
    await fetchEventSeats();
  } catch (err) {
    console.error('Error loading event details:', err);
    setError(err.message || 'Failed to load event details');
  } finally {
    setLoading(false);
  }
};
```

### Error Handling

Pages implement comprehensive error handling:

1. **Loading States**: Show loading indicators during API calls
2. **Error States**: Display user-friendly error messages
3. **Retry Mechanisms**: Allow users to retry failed operations
4. **Empty States**: Handle cases where no data is available

### State Management

Pages use React hooks for state management:

- `useState`: For local component state
- `useEffect`: For side effects like API calls
- `useNavigate` and `useParams`: For routing
- `useAuth`: For authentication state

### Responsive Design

All pages are designed to work on various screen sizes:

- Mobile-first approach
- Responsive grid layouts
- Adaptive UI elements

## Routing

Pages are connected through React Router in `App.tsx`:

```tsx
<Routes>
  <Route path="/events" element={<Events />} />
  <Route path="/events/:id" element={<EventDetail />} />
  <Route 
    path="/booking" 
    element={
      <ProtectedRoute>
        <Booking />
      </ProtectedRoute>
    } 
  />
</Routes>
``` 