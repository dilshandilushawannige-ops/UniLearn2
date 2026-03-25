import api from './axios';

export const studyPlansAPI = {
  // ── Plan-level ────────────────────────────────────────────────────────────
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

  // ── Day-level task APIs ───────────────────────────────────────────────────
  completeTask: async (planId, dayNumber, taskType) => {
    const { data } = await api.patch(
      `/studyplans/${planId}/days/${dayNumber}/tasks/${taskType}/complete`
    );
    return data; // { plan }
  },
  generateDayMCQs: async (planId, dayNumber) => {
    const { data } = await api.post(`/studyplans/${planId}/days/${dayNumber}/generate-mcqs`);
    return data; // { mcqs }
  },
  submitDayMCQ: async (planId, dayNumber, answers) => {
    const { data } = await api.post(`/studyplans/${planId}/days/${dayNumber}/submit-mcq`, { answers });
    return data; // { score, correct, total, results, plan }
  },
  generateDaySummary: async (planId, dayNumber) => {
    const { data } = await api.post(`/studyplans/${planId}/days/${dayNumber}/generate-summary`);
    return data; // { summaryText, plan }
  },
};
