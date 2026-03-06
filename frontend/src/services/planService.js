import api from './api';

export const planService = {
  list: async () => {
    const res = await api.get('/plans');
    return res.data;
  },
  create: async (data) => {
    const res = await api.post('/plans', data);
    return res.data;
  },
  update: async (id, data) => {
    const res = await api.put(`/plans/${id}`, data);
    return res.data;
  },
  remove: async (id) => {
    const res = await api.delete(`/plans/${id}`);
    return res.data;
  },
};

