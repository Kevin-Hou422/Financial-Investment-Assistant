import api from './api';

export const marketService = {
  getPrice: async (symbol) => {
    const response = await api.get(`/market/price/${symbol}`);
    return response.data;
  },
  getMarketSnapshot: async () => {
    const response = await api.get('/market/snapshot');
    return response.data;
  }
};