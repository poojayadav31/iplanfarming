import api from './api';
import type { Farm, FarmFormPayload, Zone, ZonePayload } from '../types/farm';

interface FarmsResponse {
  success: boolean;
  data: {
    farms: Farm[];
  };
}

interface FarmResponse {
  success: boolean;
  data: {
    farm: Farm;
  };
}

interface ZonesResponse {
  success: boolean;
  data: {
    zones: Zone[];
  };
}

export const farmService = {
  async createFarm(payload: FarmFormPayload): Promise<Farm> {
    const { data } = await api.post<FarmResponse>('/farms', payload);
    return data.data.farm;
  },

  async getFarms(): Promise<Farm[]> {
    const { data } = await api.get<FarmsResponse>('/farms');
    return data.data.farms;
  },

  async getFarmById(farmId: string): Promise<Farm> {
    const { data } = await api.get<FarmResponse>(`/farms/${farmId}`);
    return data.data.farm;
  },

  async deleteFarm(farmId: string): Promise<void> {
    await api.delete(`/farms/${farmId}`);
  },

  async saveZones(farmId: string, zones: ZonePayload[]): Promise<Zone[]> {
    const { data } = await api.post<ZonesResponse>(`/farms/${farmId}/zones`, { zones });
    return data.data.zones;
  },

  async getZones(farmId: string): Promise<Zone[]> {
    const { data } = await api.get<ZonesResponse>(`/farms/${farmId}/zones`);
    return data.data.zones;
  },
};
