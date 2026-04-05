import api from './axios';

export const notificationsAPI = {
  getAll: async () => {
    const { data } = await api.get('/notifications');
    return data;
  },
  dismiss: async (id) => {
    const { data } = await api.patch(`/notifications/${id}/dismiss`);
    return data;
  },
  clearAll: async () => {
    const { data } = await api.post('/notifications/clear-all');
    return data;
  },
  markAllRead: async () => {
    const { data } = await api.post('/notifications/mark-read-all');
    return data;
  },
};