import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: {
    'Content-Type': 'application/json'
  },
  timeout: 15000
});

// Request Interceptor: Attach JWT Bearer Token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Normalized Response & Auth Guard
api.interceptors.response.use(
  (response) => {
    return response.data;
  },
  (error) => {
    const status = error.response ? error.response.status : null;
    const responseData = error.response ? error.response.data : null;

    // Handle session expiration / unauthorized access
    if (status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      
      // Notify application if not on login page
      if (window.location.pathname !== '/login') {
        window.dispatchEvent(new CustomEvent('auth:session-expired'));
      }
    }

    // Normalized error object
    const normalizedError = {
      status,
      code: responseData?.error?.code || 'NETWORK_ERROR',
      message: responseData?.error?.message || error.message || 'An unexpected error occurred.',
      details: responseData?.error?.details || []
    };

    return Promise.reject(normalizedError);
  }
);

export default api;
