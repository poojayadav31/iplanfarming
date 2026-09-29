import api from './api';

export const soilService = {
  async getSoilSummary(farmId) {
    const { data } = await api.get(`/farms/${farmId}/soil-summary`);
    return data.data;
  },

  async saveSoilReport(farmId, zoneId, payload) {
    const { data } = await api.post(`/farms/${farmId}/zones/${zoneId}/soil`, payload);
    return data.data.soilReport;
  },

  async getSoilReport(farmId, zoneId) {
    const { data } = await api.get(`/farms/${farmId}/zones/${zoneId}/soil`);
    return data.data.soilReport;
  },
};
