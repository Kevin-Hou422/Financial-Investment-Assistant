import api from './api';

export const reportService = {
  getAssetsReport: async () => {
    const res = await api.get('/reports/assets');
    return res.data;
  },
  getPerformanceReport: async () => {
    const res = await api.get('/reports/performance');
    return res.data;
  },
  exportCsvUrl: () => `${api.defaults.baseURL}/reports/export/csv`,
};

