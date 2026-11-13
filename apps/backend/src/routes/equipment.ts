import { Router, Request, Response, NextFunction } from 'express'
import { asyncHandler } from '../middleware/errorHandler.js'
import * as controller from '../controllers/equipmentController.js'

const router = Router()

router.get('/', asyncHandler(controller.getEquipment as (req: Request, res: Response, next: NextFunction) => Promise<void>))
router.get('/:id', asyncHandler(controller.getEquipmentById as (req: Request, res: Response, next: NextFunction) => Promise<void>))
router.post('/', asyncHandler(controller.createEquipment as (req: Request, res: Response, next: NextFunction) => Promise<void>))
router.put('/:id', asyncHandler(controller.updateEquipment as (req: Request, res: Response, next: NextFunction) => Promise<void>))
router.delete('/:id', asyncHandler(controller.deleteEquipment as (req: Request, res: Response, next: NextFunction) => Promise<void>))

export default router