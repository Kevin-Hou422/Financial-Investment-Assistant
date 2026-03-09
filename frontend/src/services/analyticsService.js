import api from './api';

export const analyticsService = {
  getSummary: async () => {
    const res = await api.get('/analytics/summary');
    return res.data;
  },
};

