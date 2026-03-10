import api from './api';

export const marketService = {
  getPrice: async (symbol, assetType = 'stock', exchange = null) => {
    const params = { asset_type: assetType };
    if (exchange) params.exchange = exchange;
    const response = await api.get(`/market/price/${symbol}`, { params });
    return response.data;
  },
  getMarketSnapshot: async () => {
    const response = await api.get('/market/snapshot');
    return response.data;
  },
};