import { PrismaClient } from '@prisma/client'
import 'dotenv/config'

const prisma = new PrismaClient()

async function main() {
  const tables = await prisma.$queryRaw<Array<{table_name: string}>>`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
    ORDER BY table_name
  `
  console.log('Existing tables:', tables.map(t => t.table_name))

  // Check row counts
  for (const t of tables) {
    const count = await prisma.$queryRaw<Array<{count: bigint}>>`
      SELECT COUNT(*) as count FROM "${t.table_name}"
    `
    console.log(`  ${t.table_name}: ${count[0].count} rows`)
  }

  await prisma.$disconnect()
}

main().catch(e => { console.error(e); process.exit(1) })