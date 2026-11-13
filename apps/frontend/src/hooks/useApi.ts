import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  equipmentTypeApi,
  equipmentApi,
  maintenanceApi,
} from '../api/endpoints';
import type {
  EquipmentTypeListParams,
  EquipmentListParams,
  MaintenanceListParams,
  CreateEquipmentTypeData,
  UpdateEquipmentTypeData,
  CreateEquipmentData,
  UpdateEquipmentData,
  RegisterMaintenanceData,
} from '../types';

const EQUIPMENT_TYPES_KEY = ['equipmentTypes'];
const EQUIPMENT_KEY = ['equipment'];
const MAINTENANCE_KEY = ['maintenance'];

export function useEquipmentTypes(params?: EquipmentTypeListParams) {
  return useQuery({
    queryKey: [...EQUIPMENT_TYPES_KEY, params],
    queryFn: () => equipmentTypeApi.list(params),
  });
}

export function useEquipmentType(id: string) {
  return useQuery({
    queryKey: [...EQUIPMENT_TYPES_KEY, id],
    queryFn: () => equipmentTypeApi.get(id),
    enabled: !!id,
  });
}

export function useCreateEquipmentType() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateEquipmentTypeData) => equipmentTypeApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: EQUIPMENT_TYPES_KEY });
    },
  });
}

export function useUpdateEquipmentType() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateEquipmentTypeData }) =>
      equipmentTypeApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: EQUIPMENT_TYPES_KEY });
    },
  });
}

export function useDeleteEquipmentType() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => equipmentTypeApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: EQUIPMENT_TYPES_KEY });
      queryClient.invalidateQueries({ queryKey: EQUIPMENT_KEY });
    },
  });
}

export function useEquipment(params?: EquipmentListParams) {
  return useQuery({
    queryKey: [EQUIPMENT_KEY, params],
    queryFn: () => equipmentApi.list(params),
  });
}

export function useEquipmentById(id: string) {
  return useQuery({
    queryKey: [...EQUIPMENT_KEY, id],
    queryFn: () => equipmentApi.get(id),
    enabled: !!id,
  });
}

export function useCreateEquipment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateEquipmentData) => equipmentApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: EQUIPMENT_KEY });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useUpdateEquipment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateEquipmentData }) =>
      equipmentApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: EQUIPMENT_KEY });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useDeleteEquipment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => equipmentApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: EQUIPMENT_KEY });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useMaintenance(params?: MaintenanceListParams) {
  return useQuery({
    queryKey: [MAINTENANCE_KEY, params],
    queryFn: () => maintenanceApi.list(params),
  });
}

export function useEquipmentMaintenance(equipmentId: string, params?: MaintenanceListParams) {
  return useQuery({
    queryKey: [MAINTENANCE_KEY, 'equipment', equipmentId, params],
    queryFn: () => maintenanceApi.getEquipmentHistory(equipmentId, params),
    enabled: !!equipmentId,
  });
}

export function useRegisterMaintenance() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ equipmentId, data }: { equipmentId: string; data: RegisterMaintenanceData }) =>
      maintenanceApi.register(equipmentId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: EQUIPMENT_KEY });
      queryClient.invalidateQueries({ queryKey: [MAINTENANCE_KEY] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: [...EQUIPMENT_KEY, variables.equipmentId] });
      queryClient.invalidateQueries({ queryKey: [MAINTENANCE_KEY, 'equipment', variables.equipmentId] });
    },
  });
}