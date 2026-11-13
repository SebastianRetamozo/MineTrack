import { Router } from 'express'
import * as controller from '../controllers/equipmentTypeController.js'

const router = Router()

router.get('/', controller.getEquipmentTypes)
router.get('/:id', controller.getEquipmentTypeById)
router.post('/', controller.createEquipmentType)
router.put('/:id', controller.updateEquipmentType)
router.delete('/:id', controller.deleteEquipmentType)

export default router