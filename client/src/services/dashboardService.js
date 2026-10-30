import api from './api.js';

export const dashboardService = {
  getMetrics: async (periodDays = 7) => {
    const res = await api.get(`/reports/dashboard?days=${periodDays}`);
    return res.data;
  }
};
