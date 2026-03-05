import api from './api';

export const marketService = {
  getPrice: async (symbol, assetType = 'stock') => {
    const response = await api.get(`/market/price/${symbol}`, {
      params: { asset_type: assetType },
    });
    return response.data;
  },
  getMarketSnapshot: async () => {
    const response = await api.get('/market/snapshot');
    return response.data;
  },
};