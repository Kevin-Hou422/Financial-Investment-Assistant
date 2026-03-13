import axios from 'axios';

const api = axios.create({ baseURL: '/api' });

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('ai_invest_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auto-logout on 401
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('ai_invest_token');
      localStorage.removeItem('ai_invest_user');
      window.location.href = '/';
    }
    return Promise.reject(err);
  }
);

export default api;

// ─── Asset helpers ────────────────────────────────────────────────────────────
export const getAssets = (params = {}) => api.get('/assets', { params });
export const createAsset = (data) => api.post('/assets', data);
export const updateAsset = (id, data) => api.put(`/assets/${id}`, data);
export const deleteAsset = (id) => api.delete(`/assets/${id}`);

// ─── Strategy ─────────────────────────────────────────────────────────────────
export const getStrategy = () => api.get('/strategy');
