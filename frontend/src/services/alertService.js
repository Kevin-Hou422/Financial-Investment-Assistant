import api from './api';

export const alertService = {
  list: async () => {
    const res = await api.get('/alerts');
    return res.data;
  },
  add: async (data) => {
    const res = await api.post('/alerts', data);
    return res.data;
  },
  remove: async (id) => {
    const res = await api.delete(`/alerts/${id}`);
    return res.data;
  },
  checkTriggered: async () => {
    const res = await api.get('/alerts/check');
    return res.data;
  },
};

