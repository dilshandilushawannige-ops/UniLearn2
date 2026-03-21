import api from './axios';

export const modulesAPI = {
  getModules: async (params = {}) => {
    const { data } = await api.get('/modules', { params });
    return data;
  },
};
