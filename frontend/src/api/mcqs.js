import api from './axios';

export const mcqsAPI = {
  generate: async (payload) => {
    const { data } = await api.post('/mcqs/generate', payload);
    return data;
  },
  getAll: async (params = {}) => {
    const { data } = await api.get('/mcqs', { params });
    return data;
  },
  getById: async (id) => {
    const { data } = await api.get(`/mcqs/${id}`);
    return data;
  },
  submit: async (id, answers) => {
    const { data } = await api.post(`/mcqs/${id}/submit`, { answers });
    return data;
  },
};
