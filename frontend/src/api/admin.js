import api from './axios';

export const adminAPI = {
  getDashboardStats: async () => {
    const { data } = await api.get('/admin/dashboard-stats');
    return data;
  },
};