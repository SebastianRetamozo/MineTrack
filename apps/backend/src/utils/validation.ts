import { z } from 'zod'

export const createEquipmentTypeSchema = z.object({
  name: z.string().min(1).max(255),
  maintenanceIntervalHours: z.number().int().positive(),
})

export const updateEquipmentTypeSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  maintenanceIntervalHours: z.number().int().positive().optional(),
})

export const createEquipmentSchema = z.object({
  code: z.string().min(1).max(255),
  equipmentTypeId: z.string().uuid(),
  horometer: z.number().int().nonnegative().default(0),
  appliedIntervalHours: z.number().int().positive(),
})

export const updateEquipmentSchema = z.object({
  code: z.string().min(1).max(255).optional(),
  equipmentTypeId: z.string().uuid().optional(),
  horometer: z.number().int().nonnegative().optional(),
  appliedIntervalHours: z.number().int().positive().optional(),
})

export const registerMaintenanceSchema = z.object({
  horometerAtMaintenance: z.number().int().nonnegative(),
  description: z.string().optional(),
})

export const equipmentIdParamSchema = z.object({
  id: z.string().uuid(),
})

export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
})

export const equipmentListQuerySchema = paginationSchema.extend({
  equipmentTypeId: z.string().uuid().optional(),
  search: z.string().trim().max(255).optional(),
  status: z.enum(['required', 'soon', 'normal']).optional(),
  maintenanceRequired: z.enum(['true', 'false']).optional(),
})