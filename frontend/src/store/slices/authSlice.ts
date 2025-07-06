import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { User } from '../../types';

interface AuthState {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

// Get initial auth state from localStorage
const getInitialAuthState = (): AuthState => {
  if (typeof window !== 'undefined') {
    const storedUser = localStorage.getItem('user');
    const storedToken = localStorage.getItem('authToken') || localStorage.getItem('accessToken');
    const storedRefreshToken = localStorage.getItem('refreshToken');
    
    if (storedUser && storedToken) {
      console.log('Found stored auth token, initializing authenticated state');
      
      // Ensure both token keys are set for compatibility
      localStorage.setItem('authToken', storedToken);
      localStorage.setItem('accessToken', storedToken);
      
      return {
        user: JSON.parse(storedUser),
        token: storedToken,
        refreshToken: storedRefreshToken,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      };
    } else {
      console.log('No valid auth token found in storage');
    }
  }
  
  return {
    user: null,
    token: null,
    refreshToken: null,
    isAuthenticated: false,
    isLoading: false,
    error: null,
  };
};

const initialState: AuthState = getInitialAuthState();

export const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    loginStart: (state) => {
      state.isLoading = true;
      state.error = null;
    },
    loginSuccess: (state, action: PayloadAction<{ user: User; token: string; refreshToken?: string }>) => {
      state.isLoading = false;
      state.user = action.payload.user;
      state.token = action.payload.token;
      state.refreshToken = action.payload.refreshToken || null;
      state.isAuthenticated = true;
      state.error = null;
      
      // Save to localStorage with both keys for compatibility
      localStorage.setItem('user', JSON.stringify(action.payload.user));
      localStorage.setItem('authToken', action.payload.token);
      localStorage.setItem('accessToken', action.payload.token);
      if (action.payload.refreshToken) {
        localStorage.setItem('refreshToken', action.payload.refreshToken);
      }
    },
    loginFailure: (state, action: PayloadAction<string>) => {
      state.isLoading = false;
      state.error = action.payload;
    },
    logout: (state) => {
      state.user = null;
      state.token = null;
      state.refreshToken = null;
      state.isAuthenticated = false;
      
      // Clear localStorage
      localStorage.removeItem('user');
      localStorage.removeItem('authToken');
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
    },
    updateUserProfile: (state, action: PayloadAction<Partial<User>>) => {
      if (state.user) {
        state.user = { ...state.user, ...action.payload };
        localStorage.setItem('user', JSON.stringify(state.user));
      }
    },
  },
});

export const { 
  loginStart, 
  loginSuccess, 
  loginFailure, 
  logout,
  updateUserProfile
} = authSlice.actions;

export default authSlice.reducer; 