import api from './api';

export const newsService = {
  list: async () => {
    const res = await api.get('/news');
    return res.data.items || [];
  },
  listWithMeta: async () => {
    const res = await api.get('/news');
    return res.data;
  },
};
