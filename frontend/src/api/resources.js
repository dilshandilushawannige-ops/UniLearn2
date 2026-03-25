import api from './axios';

export const resourcesAPI = {
  // Upload a new resource (multipart/form-data)
  create: async (formData) => {
    const { data } = await api.post('/resources', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  },
  getAll: async (params = {}) => {
    const { data } = await api.get('/resources', { params });
    return data;
  },
  getById: async (id) => {
    const { data } = await api.get(`/resources/${id}`);
    return data;
  },
  rateResource: async (id, rating) => {
    const { data } = await api.post(`/resources/${id}/rate`, { rating });
    return data;
  },
};
