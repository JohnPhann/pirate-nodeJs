import axios from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3004/api',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  },
  timeout: 10000, // 10 seconds timeout
  validateStatus: function (status) {
    return status >= 200 && status < 500; // Accept all status codes less than 500
  }
});

// Store the error handler function
let errorHandler: ((message: string, description?: string) => void) | null = null;

// Function to set the error handler
export const setErrorHandler = (handler: (message: string, description?: string) => void) => {
  errorHandler = handler;
};

// Add request interceptor
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    if (errorHandler) {
      errorHandler('Request Error', 'Failed to send request. Please try again.');
    }
    return Promise.reject(error);
  }
);

// Add a response interceptor
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (errorHandler) {
      if (error.code === 'ECONNABORTED') {
        errorHandler('Timeout Error', 'The request took too long to complete. Please try again.');
      } else if (!error.response) {
        // Network error
        errorHandler(
          'Network Error', 
          'Unable to connect to the server. Please check your internet connection and try again.'
        );
      } else if (error.response.status === 0) {
        // CORS error
        errorHandler(
          'Connection Error', 
          'Unable to connect to the server. Please check if the server is running and accessible.'
        );
      } else {
        // Other errors
        const errorMessage = error.response.data?.message || 'An error occurred';
        const errorDescription = error.response.data?.error || 'Please try again later';
        errorHandler(errorMessage, errorDescription);
      }
    }
    return Promise.reject(error);
  }
);

export default api; 