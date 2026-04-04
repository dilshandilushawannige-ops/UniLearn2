import api from './axios';

export const moderationAPI = {
  report: async (payload) => {
    const { data } = await api.post('/moderation/reports', payload);
    return data;
  },
  getItems: async (params = {}) => {
    const { data } = await api.get('/moderation/items', { params });
    return data;
  },
  restoreItem: async (id) => {
    const { data } = await api.post(`/moderation/items/${id}/restore`);
    return data;
  },
  deleteContent: async (id) => {
    const { data } = await api.delete(`/moderation/items/${id}/content`);
    return data;
  },
  suspendUser: async (userId, payload) => {
    const { data } = await api.post(`/moderation/users/${userId}/suspend`, payload);
    return data;
  },
  unsuspendUser: async (userId) => {
    const { data } = await api.post(`/moderation/users/${userId}/unsuspend`);
    return data;
  },
};