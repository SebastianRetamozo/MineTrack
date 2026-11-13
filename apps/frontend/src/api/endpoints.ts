import { api } from './client';
import type {
  EquipmentType,
  Equipment,
  Maintenance,
  PaginatedResponse,
} from '../types';

export interface EquipmentTypeListParams {
  page?: number;
  limit?: number;
}

export interface EquipmentListParams {
  page?: number;
  limit?: number;
  equipmentTypeId?: string;
  search?: string;
  status?: 'required' | 'soon' | 'normal';
  maintenanceRequired?: boolean;
}

export interface MaintenanceListParams {
  page?: number;
  limit?: number;
  equipmentId?: string;
  startDate?: string;
  endDate?: string;
}

export interface CreateEquipmentTypeData {
  name: string;
  maintenanceIntervalHours: number;
}

export interface UpdateEquipmentTypeData {
  name?: string;
  maintenanceIntervalHours?: number;
}

export interface CreateEquipmentData {
  code: string;
  equipmentTypeId: string;
  horometer?: number;
  appliedIntervalHours: number;
}

export interface UpdateEquipmentData {
  code?: string;
  equipmentTypeId?: string;
  horometer?: number;
  appliedIntervalHours?: number;
}

export interface RegisterMaintenanceData {
  horometerAtMaintenance: number;
  description?: string;
}

export const equipmentTypeApi = {
  list: (params?: EquipmentTypeListParams) =>
    api.get<PaginatedResponse<EquipmentType>>('/equipment-types', params as Record<string, unknown>),

  get: (id: string) =>
    api.get<EquipmentType>(`/equipment-types/${id}`),

  create: (data: CreateEquipmentTypeData) =>
    api.post<EquipmentType>('/equipment-types', data),

  update: (id: string, data: UpdateEquipmentTypeData) =>
    api.put<EquipmentType>(`/equipment-types/${id}`, data),

  delete: (id: string) =>
    api.delete<void>(`/equipment-types/${id}`),
};

export const equipmentApi = {
  list: (params?: EquipmentListParams) =>
    api.get<PaginatedResponse<Equipment>>('/equipment', params as Record<string, unknown>),

  get: (id: string) =>
    api.get<Equipment>(`/equipment/${id}`),

  create: (data: CreateEquipmentData) =>
    api.post<Equipment>('/equipment', data),

  update: (id: string, data: UpdateEquipmentData) =>
    api.put<Equipment>(`/equipment/${id}`, data),

  delete: (id: string) =>
    api.delete<void>(`/equipment/${id}`),
};

export const maintenanceApi = {
  list: (params?: MaintenanceListParams) =>
    api.get<PaginatedResponse<Maintenance>>('/maintenance', params as Record<string, unknown>),

  getEquipmentHistory: (equipmentId: string, params?: MaintenanceListParams) =>
    api.get<PaginatedResponse<Maintenance>>(`/maintenance/equipment/${equipmentId}`, params as Record<string, unknown>),

  register: (equipmentId: string, data: RegisterMaintenanceData) =>
    api.post<{
      maintenance: Maintenance;
      equipment: Equipment & { maintenanceProgress: { hoursSinceMaintenance: number; progress: number; maintenanceRequired: boolean } };
    }>(`/maintenance/equipment/${equipmentId}`, data),
};