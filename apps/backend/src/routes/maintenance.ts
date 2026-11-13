import { Router } from 'express'
import * as controller from '../controllers/maintenanceController.js'

const router = Router()

router.get('/', controller.getMaintenanceHistory)
router.get('/equipment/:id', controller.getEquipmentMaintenance)
router.post('/equipment/:id', controller.registerMaintenance)

export default router