import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:3000/api',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor to include auth token
api.interceptors.request.use(
  (config) => {
    // Check for both possible token keys
    const token = localStorage.getItem('authToken') || localStorage.getItem('accessToken');
    
    // Debug token
    console.log('Auth token being used:', token ? token.substring(0, 10) + '...' : 'No token found');
    
    if (token) {
      // Ensure headers object exists
      config.headers = config.headers || {};
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      console.error('API Error:', error.response.data);
      
      // Handle authentication errors
      if (error.response.status === 401) {
        console.error('Authentication error detected');
        // Optionally clear tokens on auth error
        // localStorage.removeItem('authToken');
        // localStorage.removeItem('accessToken');
      }
      
      return Promise.reject(error.response.data);
    } else if (error.request) {
      // The request was made but no response was received
      console.error('Network Error:', error.request);
      return Promise.reject(new Error('Network error occurred'));
    } else {
      // Something happened in setting up the request that triggered an Error
      console.error('Request Error:', error.message);
      return Promise.reject(error);
    }
  }
);

export default api;
