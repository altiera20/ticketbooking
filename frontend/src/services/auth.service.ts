import api from './api';
import { User, RegisterFormData } from '../types';

// Define the backend response structure
interface AuthResponse {
  message: string;
  accessToken: string;
  refreshToken: string;
  user: User;
}

class AuthService {
  async login(email: string, password: string): Promise<{ user: User; token: string; refreshToken: string }> {
    try {
      const response = await api.post<AuthResponse>('/auth/login', {
        email,
        password
      });

      // Extract data from the backend response format
      const { user, accessToken, refreshToken } = response.data;
      
      if (!user || !accessToken) {
        throw new Error('Login failed: Invalid response format');
      }
      
      // Store token in localStorage with both keys for compatibility
      localStorage.setItem('authToken', accessToken);
      localStorage.setItem('accessToken', accessToken);
      
      console.log('Auth token stored after login:', accessToken.substring(0, 10) + '...');
      
      if (refreshToken) {
        localStorage.setItem('refreshToken', refreshToken);
      }

      return { 
        user,
        token: accessToken,
        refreshToken
      };
    } catch (error: any) {
      throw new Error(error.response?.data?.message || error.message || 'Failed to login');
    }
  }

  async register(userData: RegisterFormData): Promise<{ user: User; token: string; refreshToken: string }> {
    try {
      // Only include the fields expected by the backend API
      const registerData = {
        firstName: userData.firstName,
        lastName: userData.lastName,
        email: userData.email,
        password: userData.password,
        role: userData.role,
        phone: userData.phone
        // Note: confirmPassword and agreeToTerms are not needed by the backend
      };

      const response = await api.post<AuthResponse>('/auth/register', registerData);

      // Extract data from the backend response format
      const { user, accessToken, refreshToken } = response.data;
      
      if (!user || !accessToken) {
        throw new Error('Registration failed: Invalid response format');
      }

      return { 
        user,
        token: accessToken,
        refreshToken
      };
    } catch (error: any) {
      throw new Error(error.response?.data?.message || error.message || 'Failed to register');
    }
  }
}

export default new AuthService();




