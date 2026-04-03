import api from './axios';

export const liveClassesAPI = {
  getAll: async (params = {}) => {
    const { data } = await api.get('/live-classes', { params });
    return data;
  },
  create: async (payload) => {
    const { data } = await api.post('/live-classes', payload);
    return data;
  },
  update: async (id, payload) => {
    const { data } = await api.put(`/live-classes/${id}`, payload);
    return data;
  },
  cancel: async (id, reason = '') => {
    const { data } = await api.patch(`/live-classes/${id}/cancel`, { reason });
    return data;
  },
  remove: async (id) => {
    const { data } = await api.delete(`/live-classes/${id}`);
    return data;
  },
  join: async (id) => {
    const { data } = await api.post(`/live-classes/${id}/join`);
    return data;
  },
  leave: async (id) => {
    const { data } = await api.post(`/live-classes/${id}/leave`);
    return data;
  },
  attendance: async (id) => {
    const { data } = await api.get(`/live-classes/${id}/attendance`);
    return data;
  },
};