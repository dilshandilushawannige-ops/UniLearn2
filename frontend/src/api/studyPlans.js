import api from './axios';

export const studyPlansAPI = {
  generate: async (payload) => {
    const { data } = await api.post('/studyplans/generate', payload);
    return data;
  },
  getAll: async (params = {}) => {
    const { data } = await api.get('/studyplans', { params });
    return data;
  },
  getById: async (id) => {
    const { data } = await api.get(`/studyplans/${id}`);
    return data;
  },
  updateProgress: async (id, payload) => {
    const { data } = await api.patch(`/studyplans/${id}/progress`, payload);
    return data;
  },
  delete: async (id) => {
    const { data } = await api.delete(`/studyplans/${id}`);
    return data;
  },
};
