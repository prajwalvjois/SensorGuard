import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('sg_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Handle 401 globally
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('sg_token');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export const authAPI = {
  login: (data) => api.post('/auth/login', data),
  register: (data) => api.post('/auth/register', data),
  me: () => api.get('/auth/me'),
};

export const alertsAPI = {
  list: (params) => api.get('/alerts', { params }),
  stats: () => api.get('/alerts/stats'),
  acknowledge: (id) => api.patch(`/alerts/${id}/acknowledge`),
};

export const sensorsAPI = {
  history: () => api.get('/sensors/history'),
  status: () => api.get('/sensors/status'),
  triggerAttack: (type) => api.post('/sensors/trigger-attack', { type }),
};

export default api;
