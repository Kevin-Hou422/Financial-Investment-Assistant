import api from './api';

export const riskService = {
  getMetrics: async () => {
    const res = await api.get('/risk/metrics');
    return res.data;
  },
};

