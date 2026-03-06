import api from './api';

export const cashflowService = {
  list: async () => {
    const res = await api.get('/cashflows');
    return res.data;
  },
  create: async (data) => {
    const res = await api.post('/cashflows', data);
    return res.data;
  },
  remove: async (id) => {
    const res = await api.delete(`/cashflows/${id}`);
    return res.data;
  },
};

