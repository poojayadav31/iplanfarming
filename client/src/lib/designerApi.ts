import api from './api';
import type { SavedFarmDesign, FarmDesignData } from '../types/designer';

export interface CreateDesignPayload {
  name: string;
  status?: 'DRAFT' | 'FINAL';
  gridSizeMeters?: number;
  designData: FarmDesignData;
  previewImage?: string | null;
  notes?: string | null;
}

export interface UpdateDesignPayload {
  name?: string;
  status?: 'DRAFT' | 'FINAL';
  gridSizeMeters?: number;
  designData?: FarmDesignData;
  previewImage?: string | null;
  notes?: string | null;
  incrementVersion?: boolean;
}

export const designerApi = {
  listDesigns: async (farmId: string): Promise<SavedFarmDesign[]> => {
    const res = await api.get<{ success: boolean; data: SavedFarmDesign[] }>(`/farms/${farmId}/designs`);
    return res.data.data;
  },

  getDesign: async (farmId: string, designId: string): Promise<SavedFarmDesign> => {
    const res = await api.get<{ success: boolean; data: SavedFarmDesign }>(`/farms/${farmId}/designs/${designId}`);
    return res.data.data;
  },

  createDesign: async (farmId: string, payload: CreateDesignPayload): Promise<SavedFarmDesign> => {
    const res = await api.post<{ success: boolean; data: SavedFarmDesign; message: string }>(`/farms/${farmId}/designs`, payload);
    return res.data.data;
  },

  updateDesign: async (farmId: string, designId: string, payload: UpdateDesignPayload): Promise<SavedFarmDesign> => {
    const res = await api.put<{ success: boolean; data: SavedFarmDesign; message: string }>(`/farms/${farmId}/designs/${designId}`, payload);
    return res.data.data;
  },

  deleteDesign: async (farmId: string, designId: string): Promise<void> => {
    await api.delete(`/farms/${farmId}/designs/${designId}`);
  },

  duplicateDesign: async (farmId: string, designId: string): Promise<SavedFarmDesign> => {
    const res = await api.post<{ success: boolean; data: SavedFarmDesign; message: string }>(`/farms/${farmId}/designs/${designId}/duplicate`);
    return res.data.data;
  },
};
