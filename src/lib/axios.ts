import axios from 'axios';

const api = axios.create({
  baseURL:
    import.meta.env.VITE_API_BASE_URL ||
    'https://vedaapi.mindsmiratus.in/api',
  headers: {
    'Content-Type': 'application/json',
    // Added the X-Api-Key header pulling from the .env file
    'X-Api-Key': import.meta.env.VITE_INTERNAL_API_KEY,
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const message = error?.response?.data?.details;

    if (message?.includes('not authenticated') || error.status === 401) {
      localStorage.clear();
      window.location.href = '/login';
    }

    return Promise.reject(error);
  }
);

export default api;