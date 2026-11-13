import { PrismaClient } from '@prisma/client'
import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const prisma = new PrismaClient()

function splitSqlStatements(sql: string): string[] {
  const statements: string[] = []
  let current = ''
  let inDollarQuote = false
  let dollarTag = ''
  let inSingleQuote = false
  let inDoubleQuote = false
  let inComment = false
  let parenDepth = 0

  for (let i = 0; i < sql.length; i++) {
    const char = sql[i]
    const nextChar = sql[i + 1]

    // Handle dollar quoting ($$ or $tag$)
    if (!inSingleQuote && !inDoubleQuote && !inComment && char === '$' && nextChar === '$') {
      if (!inDollarQuote) {
        inDollarQuote = true
        dollarTag = '$$'
        current += '$$'
        i++
        continue
      } else if (dollarTag === '$$') {
        inDollarQuote = false
        dollarTag = ''
        current += '$$'
        i++
        continue
      }
    }

    // Handle $tag$ style dollar quoting
    if (!inSingleQuote && !inDoubleQuote && !inComment && char === '$' && nextChar && nextChar.match(/[a-zA-Z_]/)) {
      let tagEnd = i + 1
      while (tagEnd < sql.length && sql[tagEnd] !== '$') {
        tagEnd++
      }
      if (tagEnd < sql.length && sql[tagEnd] === '$') {
        const tag = sql.substring(i, tagEnd + 1)
        if (!inDollarQuote) {
          inDollarQuote = true
          dollarTag = tag
          current += tag
          i = tagEnd
          continue
        } else if (dollarTag === tag) {
          inDollarQuote = false
          dollarTag = ''
          current += tag
          i = tagEnd
          continue
        }
      }
    }

    // Handle single quotes
    if (!inDollarQuote && !inDoubleQuote && !inComment && char === "'" && nextChar !== "'") {
      inSingleQuote = !inSingleQuote
    } else if (!inDollarQuote && !inDoubleQuote && !inComment && char === "'" && nextChar === "'") {
      i++
    }

    // Handle double quotes
    if (!inDollarQuote && !inSingleQuote && !inComment && char === '"') {
      inDoubleQuote = !inDoubleQuote
    }

    // Handle comments
    if (!inDollarQuote && !inSingleQuote && !inDoubleQuote && char === '-' && nextChar === '-') {
      inComment = true
    }
    if (inComment && char === '\n') {
      inComment = false
    }

    // Track parentheses depth
    if (!inDollarQuote && !inSingleQuote && !inDoubleQuote && !inComment) {
      if (char === '(') parenDepth++
      if (char === ')') parenDepth--
    }

    current += char

    // Check for statement termination (only at paren depth 0)
    if (!inDollarQuote && !inSingleQuote && !inDoubleQuote && !inComment && char === ';' && parenDepth === 0) {
      const trimmed = current.trim()
      // Only skip if the entire statement is just a comment (no actual SQL)
      const hasSql = trimmed.split('\n').some(line => {
        const t = line.trim()
        return t.length > 0 && !t.startsWith('--')
      })
      if (hasSql) {
        statements.push(trimmed)
      }
      current = ''
    }
  }

  // Add any remaining statement
  const trimmed = current.trim()
  const hasSql = trimmed.split('\n').some(line => {
    const t = line.trim()
    return t.length > 0 && !t.startsWith('--')
  })
  if (hasSql) {
    statements.push(trimmed)
  }

  return statements
}

async function runMigration() {
  const sqlPath = path.join(__dirname, 'create-tables.sql')
  const sql = fs.readFileSync(sqlPath, 'utf-8')

  const statements = splitSqlStatements(sql)

  console.log(`Found ${statements.length} statements to execute`)

  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i]
    try {
      console.log(`[${i + 1}/${statements.length}] Executing: ${statement.substring(0, 100)}...`)
      await prisma.$executeRawUnsafe(statement)
      console.log('OK')
    } catch (e) {
      console.error('Error executing statement:', e)
      console.error('Statement:', statement)
      throw e
    }
  }

  console.log('Migration completed successfully!')
}

runMigration()
  .catch(e => {
    console.error('Migration failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })