import { PrismaClient } from '@prisma/client'
import 'dotenv/config'

const prisma = new PrismaClient()

async function seed() {
  console.log('Seeding equipment types...')

  const equipmentTypes = [
    {
      name: 'Truck',
      maintenanceIntervalHours: 250,
    },
    {
      name: 'Excavator',
      maintenanceIntervalHours: 500,
    },
    {
      name: 'Drilling Machine',
      maintenanceIntervalHours: 300,
    },
  ]

  for (const et of equipmentTypes) {
    const existing = await prisma.equipmentType.findUnique({
      where: { name: et.name },
    })

    if (existing) {
      console.log(`Equipment type "${et.name}" already exists, updating interval...`)
      await prisma.equipmentType.update({
        where: { name: et.name },
        data: { maintenanceIntervalHours: et.maintenanceIntervalHours },
      })
    } else {
      await prisma.equipmentType.create({
        data: et,
      })
      console.log(`Created equipment type: ${et.name} (interval: ${et.maintenanceIntervalHours}h)`)
    }
  }

  console.log('Seeding completed!')
}

seed()
  .catch(e => {
    console.error('Seeding failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })