import { Router } from 'express'
import * as controller from '../controllers/equipmentController.js'

const router = Router()

router.get('/', controller.getEquipment)
router.get('/:id', controller.getEquipmentById)
router.post('/', controller.createEquipment)
router.put('/:id', controller.updateEquipment)
router.delete('/:id', controller.deleteEquipment)

export default router