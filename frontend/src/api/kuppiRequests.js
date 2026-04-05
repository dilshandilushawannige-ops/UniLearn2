import api from './axios';

export const kuppiRequestsAPI = {
  getAll: async (params = {}) => {
    const { data } = await api.get('/kuppi-requests', { params });
    return data;
  },
  create: async (payload) => {
    const { data } = await api.post('/kuppi-requests', payload);
    return data;
  },
  updateStatus: async (id, payload) => {
    const { data } = await api.patch(`/kuppi-requests/${id}/status`, payload);
    return data;
  },
  createSession: async (id, payload) => {
    const { data } = await api.post(`/kuppi-requests/${id}/session`, payload);
    return data;
  },
  createSessionFromRequest: async (payload) => {
    const { data } = await api.post('/kuppi/sessions', payload);
    return data;
  },
  reportSession: async (id, payload) => {
    const { data } = await api.post(`/kuppi-requests/${id}/report`, payload);
    return data;
  },
};