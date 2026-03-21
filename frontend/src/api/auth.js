import api from './axios';

export const authAPI = {
  register: async (fields) => {
    const { data } = await api.post('/auth/register', fields);
    return data;
  },
  login: async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    return data;
  },
  getMe: async () => {
    const { data } = await api.get('/auth/me');
    return data;
  },
};
