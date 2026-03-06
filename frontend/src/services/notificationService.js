import api from './api';

export const notificationService = {
  list: async () => {
    const res = await api.get('/notifications');
    return res.data.items || [];
  },
};

