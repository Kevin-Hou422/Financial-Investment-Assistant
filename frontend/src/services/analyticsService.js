import api from './api';

export const analyticsService = {
  getSummary: async () => {
    const res = await api.get('/analytics');
    return res.data;
  },
};

