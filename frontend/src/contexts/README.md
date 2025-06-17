# Contexts

This directory contains React Context providers that manage global state across the application.

## AuthContext (`AuthContext.tsx`)

Manages user authentication state throughout the application.

### Features

- Provides user authentication state to all components
- Handles login, registration, and logout operations
- Stores authentication tokens securely
- Persists user session across page refreshes
- Provides user profile information

### API

#### Context Provider

```tsx
// In App.tsx
import { AuthProvider } from './contexts/AuthContext';

const App: React.FC = () => {
  return (
    <AuthProvider>
      {/* Your app components */}
    </AuthProvider>
  );
};
```

#### Hook Usage

```tsx
// In any component
import { useAuth } from '../contexts/AuthContext';

const MyComponent: React.FC = () => {
  const { user, isAuthenticated, login, logout } = useAuth();
  
  // Use authentication state and methods
  return (
    <div>
      {isAuthenticated ? (
        <>
          <p>Welcome, {user?.firstName}!</p>
          <button onClick={logout}>Logout</button>
        </>
      ) : (
        <button onClick={() => login('user@example.com', 'password')}>Login</button>
      )}
    </div>
  );
};
```

### Context State

The AuthContext provides the following state:

- `user`: The currently authenticated user object (or null)
- `token`: JWT authentication token (or null)
- `isAuthenticated`: Boolean indicating if a user is logged in
- `isLoading`: Boolean indicating if authentication operations are in progress

### Methods

- `login(email, password)`: Authenticates a user with credentials
- `register(userData)`: Registers a new user
- `logout()`: Logs out the current user
- `updateUser(userData)`: Updates the current user's information

### Implementation Details

1. **Token Storage**: Authentication tokens are stored in localStorage for persistence
2. **Session Management**: User session is maintained across page refreshes
3. **Error Handling**: Authentication errors are properly caught and can be displayed to users
4. **Loading States**: Loading indicators during authentication operations

### Protected Routes

The AuthContext is used with the ProtectedRoute component to restrict access to authenticated users:

```tsx
// In App.tsx
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  return <>{children}</>;
};

// Usage
<Route
  path="/booking"
  element={
    <ProtectedRoute>
      <Booking />
    </ProtectedRoute>
  }
/>
``` 