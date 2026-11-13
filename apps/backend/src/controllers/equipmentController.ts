import { Request, Response } from 'express'
import { PrismaClient } from '@prisma/client'
import { AppError, asyncHandler } from '../middleware/errorHandler.js'
import { createEquipmentSchema, updateEquipmentSchema, equipmentIdParamSchema, paginationSchema } from '../utils/validation.js'

const prisma = new PrismaClient()

function calculateMaintenanceProgress(equipment: any) {
  const hoursSinceMaintenance = equipment.horometer - equipment.lastMaintenanceHorometer
  const progress = equipment.appliedIntervalHours > 0
    ? (hoursSinceMaintenance / equipment.appliedIntervalHours) * 100
    : 0
  const maintenanceRequired = hoursSinceMaintenance >= equipment.appliedIntervalHours

  return {
    hoursSinceMaintenance,
    progress: Math.min(Math.round(progress * 100) / 100, 100),
    maintenanceRequired,
  }
}

export const getEquipment = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit } = paginationSchema.parse(req.query)
  const { equipmentTypeId, status, maintenanceRequired } = req.query
  const skip = (page - 1) * limit

  const where: any = {}
  if (equipmentTypeId) where.equipmentTypeId = equipmentTypeId
  if (status) where.status = status

  const [equipment, total] = await Promise.all([
    prisma.equipment.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        equipmentType: {
          select: { id: true, name: true, maintenanceIntervalHours: true },
        },
      },
    }),
    prisma.equipment.count({ where }),
  ])

  // Add maintenance progress info
  const equipmentWithProgress = equipment.map(eq => ({
    ...eq,
    maintenanceProgress: calculateMaintenanceProgress(eq),
  }))

  // Filter by maintenanceRequired if specified
  let filtered = equipmentWithProgress
  if (maintenanceRequired === 'true') {
    filtered = equipmentWithProgress.filter(eq => eq.maintenanceProgress.maintenanceRequired)
  } else if (maintenanceRequired === 'false') {
    filtered = equipmentWithProgress.filter(eq => !eq.maintenanceProgress.maintenanceRequired)
  }

  res.json({
    data: filtered,
    pagination: {
      page,
      limit,
      total: filtered.length,
      totalPages: Math.ceil(filtered.length / limit),
    },
  })
})

export const getEquipmentById = asyncHandler(async (req: Request, res: Response) => {
  const { id } = equipmentIdParamSchema.parse(req.params)

  const equipment = await prisma.equipment.findUnique({
    where: { id },
    include: {
      equipmentType: true,
      maintenance: {
        orderBy: { performedAt: 'desc' },
        take: 10,
      },
    },
  })

  if (!equipment) {
    throw AppError.notFound('Equipment not found')
  }

  res.json({
    ...equipment,
    maintenanceProgress: calculateMaintenanceProgress(equipment),
  })
})

export const createEquipment = asyncHandler(async (req: Request, res: Response) => {
  const data = createEquipmentSchema.parse(req.body)

  // Verify equipment type exists
  const equipmentType = await prisma.equipmentType.findUnique({
    where: { id: data.equipmentTypeId },
  })

  if (!equipmentType) {
    throw AppError.notFound('Equipment type not found')
  }

  // Use equipment type's maintenance interval if not provided
  const appliedIntervalHours = data.appliedIntervalHours ?? equipmentType.maintenanceIntervalHours

  const equipment = await prisma.equipment.create({
    data: {
      code: data.code,
      equipmentTypeId: data.equipmentTypeId,
      horometer: data.horometer,
      lastMaintenanceHorometer: data.horometer, // Initially same as horometer
      appliedIntervalHours,
    },
    include: { equipmentType: true },
  })

  res.status(201).json({
    ...equipment,
    maintenanceProgress: calculateMaintenanceProgress(equipment),
  })
})

export const updateEquipment = asyncHandler(async (req: Request, res: Response) => {
  const { id } = equipmentIdParamSchema.parse(req.params)
  const data = updateEquipmentSchema.parse(req.body)

  // Check if equipment exists
  const existing = await prisma.equipment.findUnique({
    where: { id },
    include: { equipmentType: true },
  })

  if (!existing) {
    throw AppError.notFound('Equipment not found')
  }

  // Validate horometer cannot decrease
  if (data.horometer !== undefined && data.horometer < existing.horometer) {
    throw AppError.badRequest('Horometer cannot decrease')
  }

  // If equipment type is being changed, verify it exists
  if (data.equipmentTypeId && data.equipmentTypeId !== existing.equipmentTypeId) {
    const equipmentType = await prisma.equipmentType.findUnique({
      where: { id: data.equipmentTypeId },
    })
    if (!equipmentType) {
      throw AppError.notFound('Equipment type not found')
    }
  }

  const equipment = await prisma.equipment.update({
    where: { id },
    data,
    include: { equipmentType: true },
  })

  res.json({
    ...equipment,
    maintenanceProgress: calculateMaintenanceProgress(equipment),
  })
})

export const deleteEquipment = asyncHandler(async (req: Request, res: Response) => {
  const { id } = equipmentIdParamSchema.parse(req.params)

  const existing = await prisma.equipment.findUnique({
    where: { id },
  })

  if (!existing) {
    throw AppError.notFound('Equipment not found')
  }

  await prisma.equipment.delete({
    where: { id },
  })

  res.status(204).send()
})