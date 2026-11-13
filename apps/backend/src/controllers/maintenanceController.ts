import { Request, Response } from 'express'
import { PrismaClient } from '@prisma/client'
import { AppError, asyncHandler } from '../middleware/errorHandler.js'
import { equipmentIdParamSchema, registerMaintenanceSchema, paginationSchema } from '../utils/validation.js'

const prisma = new PrismaClient()

export const getMaintenanceHistory = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit } = paginationSchema.parse(req.query)
  const { equipmentId, startDate, endDate } = req.query
  const skip = (page - 1) * limit

  const where: any = {}
  if (equipmentId) where.equipmentId = equipmentId
  if (startDate || endDate) {
    where.performedAt = {}
    if (startDate) where.performedAt.gte = new Date(startDate as string)
    if (endDate) where.performedAt.lte = new Date(endDate as string)
  }

  const [maintenance, total] = await Promise.all([
    prisma.maintenance.findMany({
      where,
      skip,
      take: limit,
      orderBy: { performedAt: 'desc' },
      include: {
        equipment: {
          select: { id: true, code: true, equipmentType: { select: { name: true } } },
        },
      },
    }),
    prisma.maintenance.count({ where }),
  ])

  res.json({
    data: maintenance,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  })
})

export const getEquipmentMaintenance = asyncHandler(async (req: Request, res: Response) => {
  const { id } = equipmentIdParamSchema.parse(req.params)
  const { page, limit } = paginationSchema.parse(req.query)
  const skip = (page - 1) * limit

  const equipment = await prisma.equipment.findUnique({
    where: { id },
  })

  if (!equipment) {
    throw AppError.notFound('Equipment not found')
  }

  const [maintenance, total] = await Promise.all([
    prisma.maintenance.findMany({
      where: { equipmentId: id },
      skip,
      take: limit,
      orderBy: { performedAt: 'desc' },
    }),
    prisma.maintenance.count({ where: { equipmentId: id } }),
  ])

  res.json({
    data: maintenance,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  })
})

export const registerMaintenance = asyncHandler(async (req: Request, res: Response) => {
  const { id } = equipmentIdParamSchema.parse(req.params)
  const data = registerMaintenanceSchema.parse(req.body)

  // Use transaction to ensure atomicity
  const result = await prisma.$transaction(async (tx) => {
    const equipment = await tx.equipment.findUnique({
      where: { id },
      include: { equipmentType: true },
    })

    if (!equipment) {
      throw AppError.notFound('Equipment not found')
    }

    // Validate horometerAtMaintenance
    if (data.horometerAtMaintenance < equipment.horometer) {
      throw AppError.badRequest('Maintenance horometer cannot be less than current equipment horometer')
    }

    if (data.horometerAtMaintenance < equipment.lastMaintenanceHorometer) {
      throw AppError.badRequest('Maintenance horometer cannot be less than last maintenance horometer')
    }

    // Create maintenance record
    const maintenance = await tx.maintenance.create({
      data: {
        equipmentId: id,
        horometerAtMaintenance: data.horometerAtMaintenance,
        description: data.description,
      },
    })

    // Update equipment: lastMaintenanceHorometer and appliedIntervalHours
    // The appliedIntervalHours is updated to the equipment type's current default interval
    await tx.equipment.update({
      where: { id },
      data: {
        lastMaintenanceHorometer: data.horometerAtMaintenance,
        appliedIntervalHours: equipment.equipmentType.maintenanceIntervalHours,
        horometer: data.horometerAtMaintenance, // Horometer is updated to the maintenance reading
      },
    })

    return { maintenance, equipment }
  })

  // Fetch updated equipment with progress
  const updatedEquipment = await prisma.equipment.findUnique({
    where: { id },
    include: { equipmentType: true },
  })

  function calculateMaintenanceProgress(eq: any) {
    const hoursSinceMaintenance = eq.horometer - eq.lastMaintenanceHorometer
    const progress = eq.appliedIntervalHours > 0
      ? (hoursSinceMaintenance / eq.appliedIntervalHours) * 100
      : 0
    return {
      hoursSinceMaintenance,
      progress: Math.min(Math.round(progress * 100) / 100, 100),
      maintenanceRequired: hoursSinceMaintenance >= eq.appliedIntervalHours,
    }
  }

  res.status(201).json({
    maintenance: result.maintenance,
    equipment: {
      ...updatedEquipment!,
      maintenanceProgress: calculateMaintenanceProgress(updatedEquipment!),
    },
  })
})