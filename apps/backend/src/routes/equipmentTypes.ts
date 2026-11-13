import { Router, Request, Response, NextFunction } from 'express'
import { asyncHandler } from '../middleware/errorHandler.js'
import * as controller from '../controllers/equipmentTypeController.js'

const router = Router()

router.get('/', asyncHandler(controller.getEquipmentTypes as (req: Request, res: Response, next: NextFunction) => Promise<void>))
router.get('/:id', asyncHandler(controller.getEquipmentTypeById as (req: Request, res: Response, next: NextFunction) => Promise<void>))
router.post('/', asyncHandler(controller.createEquipmentType as (req: Request, res: Response, next: NextFunction) => Promise<void>))
router.put('/:id', asyncHandler(controller.updateEquipmentType as (req: Request, res: Response, next: NextFunction) => Promise<void>))
router.delete('/:id', asyncHandler(controller.deleteEquipmentType as (req: Request, res: Response, next: NextFunction) => Promise<void>))

export default router