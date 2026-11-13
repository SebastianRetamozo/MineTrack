import { Request, Response } from 'express'
import { AppError, asyncHandler } from '../middleware/errorHandler.js'
import { createEquipmentTypeSchema, updateEquipmentTypeSchema, paginationSchema } from '../utils/validation.js'
import { prisma } from '../lib/prisma.js'

export const getEquipmentTypes = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit } = paginationSchema.parse(req.query)
  const skip = (page - 1) * limit

  const [equipmentTypes, total] = await Promise.all([
    prisma.equipmentType.findMany({
      skip,
      take: limit,
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: { equipment: true },
        },
      },
    }),
    prisma.equipmentType.count(),
  ])

  res.json({
    data: equipmentTypes,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  })
})

export const getEquipmentTypeById = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params

  const equipmentType = await prisma.equipmentType.findUnique({
    where: { id },
    include: {
      equipment: {
        select: {
          id: true,
          code: true,
          horometer: true,
          lastMaintenanceHorometer: true,
          appliedIntervalHours: true,
        },
      },
    },
  })

  if (!equipmentType) {
    throw AppError.notFound('Equipment type not found')
  }

  res.json(equipmentType)
})

export const createEquipmentType = asyncHandler(async (req: Request, res: Response) => {
  const data = createEquipmentTypeSchema.parse(req.body)

  const equipmentType = await prisma.equipmentType.create({
    data: {
      name: data.name,
      maintenanceIntervalHours: data.maintenanceIntervalHours,
    },
  })

  res.status(201).json(equipmentType)
})

export const updateEquipmentType = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params
  const data = updateEquipmentTypeSchema.parse(req.body)

  const equipmentType = await prisma.equipmentType.update({
    where: { id },
    data,
  })

  res.json(equipmentType)
})

export const deleteEquipmentType = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params

  // Check if equipment type has associated equipment
  const equipmentCount = await prisma.equipment.count({
    where: { equipmentTypeId: id },
  })

  if (equipmentCount > 0) {
    throw AppError.badRequest('Cannot delete equipment type with associated equipment')
  }

  await prisma.equipmentType.delete({
    where: { id },
  })

  res.status(204).send()
})