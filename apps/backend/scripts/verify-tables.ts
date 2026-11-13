import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function verifyTables() {
  const tables = await prisma.$queryRaw`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name IN ('equipment_types', 'equipment', 'maintenance')
  `
  console.log('Tables:', tables)
}

verifyTables()
  .catch(e => console.error('Error:', e))
  .finally(async () => await prisma.$disconnect())