import axios from 'axios';

const api = axios.create({
  // Use relative baseURL so Vite proxy can forward to backend.
  // You can override with VITE_API_BASE_URL if needed.
  baseURL: import.meta?.env?.VITE_API_BASE_URL || '/api',
});

export const getAssets = (params = {}) => {
  const q = new URLSearchParams();
  if (params.type) q.set('type', params.type);
  if (params.exchange) q.set('exchange', params.exchange);
  const query = q.toString();
  return api.get(`/assets${query ? `?${query}` : ''}`);
};
export const createAsset = (data) => api.post('/assets', data);
export const updateAsset = (id, data) => api.put(`/assets/${id}`, data);
export const deleteAsset = (id) => api.delete(`/assets/${id}`);
export const getStrategy = () => api.get('/strategy');

export default api;