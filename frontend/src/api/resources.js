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
  generateSummary: async (id) => {
    const { data } = await api.post(`/resources/${id}/generate-summary`);
    return data;
  },
  rateResource: async (id, rating) => {
    const { data } = await api.post(`/resources/${id}/rate`, { rating });
    return data;
  },
  recordDownload: async (id) => {
    const { data } = await api.post(`/resources/${id}/download`);
    return data;
  },
  deleteResource: async (id) => {
    const { data } = await api.delete(`/resources/${id}`);
    return data;
  },
  updateResource: async (id, updateData) => {
    const { data } = await api.put(`/resources/${id}`, updateData);
    return data;
  }
};
