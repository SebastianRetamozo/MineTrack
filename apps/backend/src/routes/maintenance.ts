import { Router, Request, Response, NextFunction } from 'express'
import { asyncHandler } from '../middleware/errorHandler.js'
import * as controller from '../controllers/maintenanceController.js'

const router = Router()

router.get('/', asyncHandler(controller.getMaintenanceHistory as (req: Request, res: Response, next: NextFunction) => Promise<void>))
router.get('/equipment/:id', asyncHandler(controller.getEquipmentMaintenance as (req: Request, res: Response, next: NextFunction) => Promise<void>))
router.post('/equipment/:id', asyncHandler(controller.registerMaintenance as (req: Request, res: Response, next: NextFunction) => Promise<void>))

export default router