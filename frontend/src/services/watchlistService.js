import api from './api';

export const watchlistService = {
  list: async () => {
    const res = await api.get('/watchlist');
    return res.data;
  },
  add: async (data) => {
    const res = await api.post('/watchlist', data);
    return res.data;
  },
  remove: async (id) => {
    const res = await api.delete(`/watchlist/${id}`);
    return res.data;
  },
};

