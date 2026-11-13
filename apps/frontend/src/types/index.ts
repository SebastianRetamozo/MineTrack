export interface EquipmentType {
  id: string;
  name: string;
  maintenanceIntervalHours: number;
  createdAt: string;
  updatedAt: string;
  _count?: {
    equipment: number;
  };
}

export interface Equipment {
  id: string;
  code: string;
  equipmentTypeId: string;
  equipmentType?: EquipmentType;
  horometer: number;
  lastMaintenanceHorometer: number;
  appliedIntervalHours: number;
  createdAt: string;
  updatedAt: string;
  maintenanceProgress?: MaintenanceProgress;
  maintenance?: Maintenance[];
}

export interface MaintenanceProgress {
  hoursSinceMaintenance: number;
  progress: number;
  maintenanceRequired: boolean;
}

export interface Maintenance {
  id: string;
  equipmentId: string;
  equipment?: {
    id: string;
    code: string;
    equipmentType: {
      name: string;
    };
  };
  horometerAtMaintenance: number;
  description?: string;
  performedAt: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ApiError {
  error: string;
  code: string;
  details?: unknown;
}

export interface DashboardStats {
  totalEquipment: number;
  equipmentRequiringMaintenance: number;
  equipmentNormalCycle: number;
  equipmentByType: Array<{
    type: string;
    count: number;
  }>;
  recentMaintenance: Maintenance[];
}

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