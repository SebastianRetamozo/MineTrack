import { createHash } from 'node:crypto'
import { spawnSync } from 'node:child_process'
import { createRequire } from 'node:module'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { delimiter, dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const SCRIPT_PATH = fileURLToPath(import.meta.url)
const BACKEND_DIR = join(ROOT, 'apps', 'backend')
const FRONTEND_DIR = join(ROOT, 'apps', 'frontend')
const MIGRATIONS_DIR = join(BACKEND_DIR, 'prisma', 'migrations')
const HEALTH_TIMEOUT_MS = 5 * 60 * 1000
const HEALTH_POLL_INTERVAL_MS = 5 * 1000
const REQUEST_TIMEOUT_MS = 10 * 1000
const INTERNAL_RESULT_PREFIX = 'MINETRACK_DEPLOY_RESULT:'

class DeployFailure extends Error {
  constructor(stage, message) {
    super(message)
    this.stage = stage
  }
}

function fail(stage, message) {
  throw new DeployFailure(stage, message)
}

function emitInternalResult(result) {
  process.stdout.write(`${INTERNAL_RESULT_PREFIX}${JSON.stringify(result)}\n`)
}

function parseInternalResult(output) {
  const lines = output.split(/\r?\n/)
  for (let index = lines.length - 1; index >= 0; index -= 1) {
    if (!lines[index].startsWith(INTERNAL_RESULT_PREFIX)) continue
    try {
      return JSON.parse(lines[index].slice(INTERNAL_RESULT_PREFIX.length))
    } catch {
      return null
    }
  }
  return null
}

function parseJsonOutput(output) {
  const text = output.trim()
  if (!text) return null

  try {
    return JSON.parse(text)
  } catch {
    for (let index = text.length - 1; index >= 0; index -= 1) {
      if (text[index] !== '{' && text[index] !== '[') continue
      try {
        return JSON.parse(text.slice(index))
      } catch {
        continue
      }
    }
  }
  return null
}

function runInternalMode(mode) {
  if (mode === '--internal-check-railway-env') {
    const missing = ['DATABASE_URL', 'DIRECT_URL', 'FRONTEND_URL', 'NODE_ENV']
      .filter((name) => !process.env[name]?.trim())
    const mismatched = []
    if (process.env.FRONTEND_URL !== process.argv[3]) mismatched.push('FRONTEND_URL')
    if (process.env.NODE_ENV !== 'production') mismatched.push('NODE_ENV')
    const result = { ok: missing.length === 0 && mismatched.length === 0, missing, mismatched }
    emitInternalResult(result)
    if (!result.ok) process.exitCode = 2
    return
  }

  if (mode === '--internal-check-vercel-env') {
    const missing = ['VITE_API_URL'].filter((name) => !process.env[name]?.trim())
    const mismatched = []
    if (process.env.VITE_API_URL !== process.argv[3]) mismatched.push('VITE_API_URL')
    const result = { ok: missing.length === 0 && mismatched.length === 0, missing, mismatched }
    emitInternalResult(result)
    if (!result.ok) process.exitCode = 2
    return
  }

  if (mode === '--internal-inspect-migrations') {
    inspectDatabaseMigrationState()
      .then((result) => {
        emitInternalResult(result)
        if (!result.ok) process.exitCode = 2
      })
      .catch(() => {
        emitInternalResult({ ok: false, reason: 'database migration state could not be inspected' })
        process.exitCode = 2
      })
    return
  }

  if (mode === '--internal-check-local-migrations') {
    const unsafe = listLocalMigrations()
      .map((migration) => ({
        name: migration.name,
        reason: inspectMigrationSql(migration.name),
      }))
      .filter((migration) => migration.reason)
    const result = { ok: unsafe.length === 0, unsafe }
    emitInternalResult(result)
    if (!result.ok) process.exitCode = 2
    return
  }

  return false
}

async function inspectDatabaseMigrationState() {
  if (!process.env.DIRECT_URL?.trim()) {
    return { ok: false, reason: 'DIRECT_URL is missing' }
  }

  const backendRequire = createRequire(join(BACKEND_DIR, 'package.json'))
  const { Client } = backendRequire('pg')
  const directUrl = new URL(process.env.DIRECT_URL)
  const schema = directUrl.searchParams.get('schema') || 'public'
  const client = new Client({
    connectionString: process.env.DIRECT_URL,
    connectionTimeoutMillis: 10_000,
    application_name: 'minetrack-deploy-preflight',
  })

  let connected = false
  try {
    await client.connect()
    connected = true

    const migrationsTable = await client.query(
      `SELECT EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = $1 AND table_name = '_prisma_migrations'
      ) AS present`,
      [schema],
    )
    const applicationTables = await client.query(
      `SELECT table_name
       FROM information_schema.tables
       WHERE table_schema = $1 AND table_name = ANY($2::text[])`,
      [schema, ['equipment_types', 'equipment', 'maintenance']],
    )
    const localMigrations = listLocalMigrations()

    if (localMigrations.length === 0) {
      return { ok: false, reason: 'no local Prisma migrations were found' }
    }

    if (!migrationsTable.rows[0].present) {
      if (applicationTables.rows.length > 0) {
        return { ok: false, reason: 'application tables exist without a Prisma migration baseline' }
      }
      return { ok: true, pending: localMigrations.map((migration) => migration.name) }
    }

    const quotedSchema = `"${schema.replaceAll('"', '""')}"`
    const migrationRows = await client.query(
      `SELECT migration_name, checksum, finished_at, rolled_back_at
       FROM ${quotedSchema}."_prisma_migrations"
       ORDER BY started_at`,
    )
    if (migrationRows.rows.length === 0 && applicationTables.rows.length > 0) {
      return { ok: false, reason: 'application tables exist without recorded migrations' }
    }

    const localByName = new Map(localMigrations.map((migration) => [migration.name, migration]))
    const appliedNames = new Set()

    for (const row of migrationRows.rows) {
      if (!row.finished_at || row.rolled_back_at) {
        return { ok: false, reason: 'the database contains an unfinished or rolled-back migration' }
      }

      const localMigration = localByName.get(row.migration_name)
      if (!localMigration) {
        return { ok: false, reason: 'the database contains a migration missing from the repository' }
      }

      const localChecksum = createHash('sha256')
        .update(readFileSync(localMigration.filePath))
        .digest('hex')
      if (localChecksum !== row.checksum) {
        return { ok: false, reason: 'an applied migration checksum differs from the repository' }
      }
      appliedNames.add(row.migration_name)
    }

    if (appliedNames.size !== migrationRows.rows.length) {
      return { ok: false, reason: 'the database contains duplicate migration records' }
    }

    const recordedSequence = localMigrations
      .filter((migration) => appliedNames.has(migration.name))
      .map((migration) => migration.name)
    if (recordedSequence.length !== appliedNames.size
      || recordedSequence.some((name, index) => name !== localMigrations[index]?.name)) {
      return { ok: false, reason: 'the database migration history is not a continuous sequence' }
    }

    if (appliedNames.size > 0 && applicationTables.rows.length !== 3) {
      return { ok: false, reason: 'the application tables do not match the recorded migration history' }
    }

    return {
      ok: true,
      pending: localMigrations
        .filter((migration) => !appliedNames.has(migration.name))
        .map((migration) => migration.name),
    }
  } finally {
    if (connected) await client.end()
  }
}

function listLocalMigrations() {
  return readdirSync(MIGRATIONS_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => ({
      name: entry.name,
      filePath: join(MIGRATIONS_DIR, entry.name, 'migration.sql'),
    }))
    .filter((migration) => existsSync(migration.filePath))
    .sort((left, right) => left.name.localeCompare(right.name))
}

function inspectMigrationSql(migrationName) {
  const migration = listLocalMigrations().find((item) => item.name === migrationName)
  if (!migration) return 'migration file is missing'

  const sql = readFileSync(migration.filePath, 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/--[^\r\n]*/g, '')
  const statements = sql.split(';').map((statement) => statement.trim()).filter(Boolean)

  if (statements.length === 0) return 'migration contains no SQL statements'

  for (const statement of statements) {
    if (/^(?:INSERT|UPDATE|DELETE|TRUNCATE|MERGE|COPY|CALL|DO)\b/i.test(statement)) {
      return 'migration contains a data-changing statement'
    }
    if (/\bDROP\b/i.test(statement) || /\bRENAME\b/i.test(statement)) {
      return 'migration contains a destructive or renaming operation'
    }
    if (/\bAS\s+SELECT\b/i.test(statement)) {
      return 'migration contains a data-copying statement'
    }

    if (/^CREATE\s+TABLE\b/i.test(statement)) continue
    if (/^CREATE\s+(?:UNIQUE\s+)?INDEX\b/i.test(statement)) continue
    if (/^CREATE\s+TYPE\b/i.test(statement)) continue

    if (/^ALTER\s+TABLE\b/i.test(statement)) {
      if (/\bADD\s+COLUMN\b/i.test(statement)) {
        if (/\b(?:DEFAULT|NOT\s+NULL)\b/i.test(statement)) {
          return 'migration adds a column with a default or not-null constraint'
        }
        continue
      }
      if (/\bADD\s+(?:CONSTRAINT|FOREIGN\s+KEY|PRIMARY\s+KEY|UNIQUE|CHECK)\b/i.test(statement)) {
        continue
      }
    }

    return 'migration contains an operation that requires manual review'
  }

  return null
}

function readConfig() {
  const requiredNames = [
    'RAILWAY_TOKEN',
    'RAILWAY_PROJECT_ID',
    'RAILWAY_ENVIRONMENT_ID',
    'RAILWAY_SERVICE_ID',
    'VERCEL_TOKEN',
    'VERCEL_ORG_ID',
    'VERCEL_PROJECT_ID',
    'VERCEL_TARGET_ENVIRONMENT',
    'MINETRACK_BACKEND_URL',
    'MINETRACK_FRONTEND_URL',
  ]
  const missing = requiredNames.filter((name) => !process.env[name]?.trim())
  if (missing.length > 0) {
    fail('preflight', `faltan variables de configuración: ${missing.join(', ')}`)
  }

  const idNames = [
    'RAILWAY_PROJECT_ID',
    'RAILWAY_ENVIRONMENT_ID',
    'RAILWAY_SERVICE_ID',
    'VERCEL_ORG_ID',
    'VERCEL_PROJECT_ID',
  ]
  const invalidIds = idNames.filter((name) => !/^[A-Za-z0-9_-]+$/.test(process.env[name]))
  if (invalidIds.length > 0) {
    fail('preflight', `IDs inválidos: ${invalidIds.join(', ')}`)
  }

  if (process.env.VERCEL_TARGET_ENVIRONMENT !== 'production') {
    fail('preflight', 'VERCEL_TARGET_ENVIRONMENT debe especificarse como production para este despliegue')
  }

  return {
    railwayProjectId: process.env.RAILWAY_PROJECT_ID,
    railwayEnvironmentId: process.env.RAILWAY_ENVIRONMENT_ID,
    railwayServiceId: process.env.RAILWAY_SERVICE_ID,
    vercelOrgId: process.env.VERCEL_ORG_ID,
    vercelProjectId: process.env.VERCEL_PROJECT_ID,
    vercelEnvironment: process.env.VERCEL_TARGET_ENVIRONMENT,
    backendUrl: readHttpsOrigin('MINETRACK_BACKEND_URL'),
    frontendUrl: readHttpsOrigin('MINETRACK_FRONTEND_URL'),
  }
}

function readHttpsOrigin(name) {
  let url
  try {
    url = new URL(process.env[name])
  } catch {
    fail('preflight', `${name} debe ser una URL HTTPS válida`)
  }

  if (
    url.protocol !== 'https:'
    || url.username
    || url.password
    || url.pathname !== '/'
    || url.search
    || url.hash
  ) {
    fail('preflight', `${name} debe ser un origen HTTPS sin credenciales, ruta, query ni fragmento`)
  }
  return url.origin
}

function findExecutable(name) {
  const pathEntries = (process.env.PATH || '').split(delimiter).filter(Boolean)
  const extensions = process.platform === 'win32'
    ? (process.env.PATHEXT || '.COM;.EXE;.BAT;.CMD').split(';')
    : ['']

  for (const directory of pathEntries) {
    for (const extension of extensions) {
      const candidate = join(directory, `${name}${extension}`)
      if (existsSync(candidate)) return candidate
    }
  }
  fail('preflight', `no se encontró la CLI ${name}; instálala antes de ejecutar el despliegue`)
}

function invoke(command, args, options = {}) {
  const shell = process.platform === 'win32' && /\.(?:cmd|bat)$/i.test(command)
  return spawnSync(command, args, {
    cwd: options.cwd || ROOT,
    env: options.env || process.env,
    encoding: 'utf8',
    windowsHide: true,
    shell,
    stdio: options.capture ? ['ignore', 'pipe', 'pipe'] : 'ignore',
    maxBuffer: 10 * 1024 * 1024,
  })
}

function requireCommandSuccess(result, stage, commandName) {
  if (result.error || result.status !== 0) {
    const status = result.error
      ? 'no pudo iniciarse'
      : `código ${Number.isInteger(result.status) ? result.status : 'desconocido'}`
    fail(stage, `${commandName} falló (${status}); salida suprimida para proteger variables del entorno`)
  }
}

function verifyCli(cli, name) {
  const result = invoke(cli, ['--version'], { capture: true })
  requireCommandSuccess(result, 'preflight', `${name} CLI`)
}

function parseCliResult(result, stage, cliName) {
  const output = `${result.stdout || ''}\n${result.stderr || ''}`
  const payload = parseInternalResult(output)
  if (result.error || result.status !== 0) {
    if (payload?.ok === false) return payload
    requireCommandSuccess(result, stage, `${cliName} no pudo completar la comprobación remota`)
  }
  if (!payload) fail(stage, `${cliName} no devolvió un resultado de preflight verificable`)
  return payload
}

function railwayTargetArgs(config) {
  return [
    '--project', config.railwayProjectId,
    '--environment', config.railwayEnvironmentId,
    '--service', config.railwayServiceId,
  ]
}

function runRailwayReadOnlyCheck(cli, config, mode, extraArgs = []) {
  const result = invoke(cli, [
    'run',
    '--no-local',
    ...railwayTargetArgs(config),
    process.execPath,
    SCRIPT_PATH,
    mode,
    ...extraArgs,
  ], {
    capture: true,
  })
  return parseCliResult(result, 'preflight Railway', 'Railway')
}

function runVercelReadOnlyCheck(cli, config, mode, expectedApiUrl) {
  const result = invoke(cli, [
    '--scope', config.vercelOrgId,
    '--project', config.vercelProjectId,
    'env', 'run',
    `--environment=${config.vercelEnvironment}`,
    '--',
    process.execPath,
    SCRIPT_PATH,
    mode,
    expectedApiUrl,
  ], {
    cwd: FRONTEND_DIR,
    capture: true,
  })
  return parseCliResult(result, 'preflight Vercel', 'Vercel')
}

function verifyRailwayBackendDomain(cli, config) {
  const result = invoke(cli, [
    'domain', 'list',
    ...railwayTargetArgs(config),
    '--json',
  ], { capture: true })
  requireCommandSuccess(result, 'preflight Railway', 'Railway no pudo inspeccionar los dominios del servicio')

  const payload = parseJsonOutput(result.stdout || '')
  const domains = Array.isArray(payload) ? payload : payload?.domains
  if (!Array.isArray(domains)) {
    fail('preflight Railway', 'Railway no devolvió una lista de dominios verificable')
  }

  const expectedHost = new URL(config.backendUrl).hostname.toLowerCase()
  const matches = domains.some((entry) => {
    const domain = typeof entry === 'string'
      ? entry
      : entry?.domain ?? entry?.hostname ?? entry?.host
    return typeof domain === 'string'
      && domain.toLowerCase().replace(/\.$/, '') === expectedHost
  })
  if (!matches) {
    fail('preflight Railway', 'MINETRACK_BACKEND_URL no pertenece al servicio Railway seleccionado')
  }
}

async function verifyVercelFrontendDomain(config) {
  const host = new URL(config.frontendUrl).hostname
  const query = new URLSearchParams({ teamId: config.vercelOrgId })
  const endpoint = new URL(
    `/v9/projects/${encodeURIComponent(config.vercelProjectId)}/domains/${encodeURIComponent(host)}?${query}`,
    'https://api.vercel.com',
  )

  let response
  try {
    response = await fetch(endpoint, {
      headers: { Authorization: `Bearer ${process.env.VERCEL_TOKEN}` },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    })
  } catch {
    fail('preflight Vercel', 'no se pudo validar el dominio del proyecto configurado')
  }

  if (!response.ok) {
    await response.body?.cancel()
    fail(
      'preflight Vercel',
      `el dominio frontend no está asociado al proyecto Vercel configurado (HTTP ${response.status})`,
    )
  }

  let domain
  try {
    domain = await response.json()
  } catch {
    fail('preflight Vercel', 'Vercel devolvió datos de dominio no verificables')
  }
  if (domain.projectId !== config.vercelProjectId || domain.name?.toLowerCase() !== host.toLowerCase()
    || domain.verified !== true) {
    fail('preflight Vercel', 'el dominio frontend no está verificado para el proyecto Vercel configurado')
  }
}

function verifyRemoteEnvironment(result, provider) {
  if (!result.ok) {
    const missing = result.missing?.length ? `faltan: ${result.missing.join(', ')}` : ''
    const mismatched = result.mismatched?.length
      ? `valores incorrectos: ${result.mismatched.join(', ')}`
      : ''
    const detail = [missing, mismatched].filter(Boolean).join('; ')
    fail(`preflight ${provider}`, detail || 'no se pudieron validar las variables requeridas')
  }
}

function runBuild(config) {
  const npmCli = process.env.npm_execpath
  if (!npmCli || !existsSync(npmCli)) {
    fail('build local', 'ejecuta este flujo mediante npm run deploy para localizar npm')
  }

  const env = { ...process.env, VITE_API_URL: `${config.backendUrl}/api` }
  for (const name of ['RAILWAY_TOKEN', 'RAILWAY_API_TOKEN', 'VERCEL_TOKEN', 'DATABASE_URL', 'DIRECT_URL']) {
    delete env[name]
  }

  const result = spawnSync(process.execPath, [npmCli, 'run', 'build'], {
    cwd: ROOT,
    env,
    stdio: 'inherit',
    windowsHide: true,
  })
  requireCommandSuccess(result, 'build local', 'npm run build')
}

function inspectPendingMigrations(result) {
  if (!result.ok || !Array.isArray(result.pending)) {
    fail('preflight migraciones', result.reason || 'el estado de las migraciones es ambiguo')
  }

  for (const migrationName of result.pending) {
    const reason = inspectMigrationSql(migrationName)
    if (reason) {
      fail(
        'revisión de migraciones',
        `${migrationName}: ${reason}; solicita revisión manual antes de ejecutar migrate deploy`,
      )
    }
  }
  return result.pending
}

function runRailwayMutation(cli, config, args, stage, commandName) {
  const [command, ...commandArgs] = args
  const result = invoke(cli, [command, ...railwayTargetArgs(config), ...commandArgs])
  requireCommandSuccess(result, stage, commandName)
}

function sleep(milliseconds) {
  return new Promise((resolvePromise) => setTimeout(resolvePromise, milliseconds))
}

function requireJsonResult(output, stage, provider) {
  const result = parseJsonOutput(output)
  if (!result) fail(stage, `${provider} no devolvió una identidad JSON verificable`)
  return result
}

function getRailwayDeploymentId(output) {
  const result = requireJsonResult(output, 'despliegue backend', 'Railway')
  const deploymentId = result.deploymentId ?? result.id
  if (typeof deploymentId !== 'string' || !deploymentId.trim()) {
    fail('despliegue backend', 'Railway no devolvió el ID del nuevo deployment; no se puede verificar su identidad')
  }
  return deploymentId
}

async function waitForRailwayDeployment(cli, config, deploymentId) {
  const expiresAt = Date.now() + HEALTH_TIMEOUT_MS

  while (Date.now() < expiresAt) {
    const result = invoke(cli, [
      'deployment', 'list',
      ...railwayTargetArgs(config),
      '--limit', '100',
      '--json',
    ], { capture: true })
    requireCommandSuccess(result, 'verificación deployment backend', 'Railway no pudo consultar sus deployments')

    const deployments = requireJsonResult(
      result.stdout || '',
      'verificación deployment backend',
      'Railway',
    )
    if (!Array.isArray(deployments)) {
      fail('verificación deployment backend', 'Railway devolvió un listado de deployments inválido')
    }

    const deployment = deployments.find((item) => item?.id === deploymentId)
    if (deployment) {
      const state = String(deployment.status || '').toUpperCase()
      if (state === 'SUCCESS') {
        if (deployments[0]?.id !== deploymentId) {
          fail(
            'verificación deployment backend',
            'el deployment nuevo ya no es el más reciente del servicio; no se puede asociar /health con certeza',
          )
        }
        return
      }
      if (['FAILED', 'CRASHED', 'REMOVED', 'REMOVING'].includes(state)) {
        fail('verificación deployment backend', `el deployment Railway terminó con estado ${state}`)
      }
    }

    await sleep(HEALTH_POLL_INTERVAL_MS)
  }

  fail(
    'verificación deployment backend',
    `Railway no confirmó como SUCCESS el deployment ${deploymentId} antes del timeout`,
  )
}

async function deployRailway(cli, config) {
  const result = invoke(cli, [
    'up',
    ROOT,
    ...railwayTargetArgs(config),
    '--detach',
    '--json',
  ], { capture: true })
  requireCommandSuccess(result, 'despliegue backend', 'Railway deploy')
  return getRailwayDeploymentId(result.stdout || '')
}

function getVercelDeploymentIdentity(output) {
  const result = requireJsonResult(output, 'despliegue frontend', 'Vercel')
  const id = result.id ?? result.deploymentId
  const url = result.url ?? result.deploymentUrl
  if (typeof id !== 'string' || !id.trim() || typeof url !== 'string' || !url.trim()) {
    fail(
      'despliegue frontend',
      'Vercel no devolvió el ID y la URL del nuevo deployment; no se puede verificar su identidad',
    )
  }

  let deploymentUrl
  try {
    deploymentUrl = new URL(url.startsWith('http') ? url : `https://${url}`)
  } catch {
    fail('despliegue frontend', 'Vercel devolvió una URL de deployment inválida')
  }
  if (deploymentUrl.protocol !== 'https:' || deploymentUrl.username || deploymentUrl.password) {
    fail('despliegue frontend', 'Vercel devolvió una URL de deployment no verificable')
  }

  return { id, url: deploymentUrl.origin }
}

function getVercelAliases(deployment) {
  if (!Array.isArray(deployment.aliases)) return []
  return deployment.aliases
    .map((alias) => typeof alias === 'string'
      ? alias
      : alias?.alias ?? alias?.domain ?? alias?.url)
    .filter((alias) => typeof alias === 'string')
    .map((alias) => {
      try {
        return new URL(alias.startsWith('http') ? alias : `https://${alias}`).hostname.toLowerCase()
      } catch {
        return ''
      }
    })
}

async function waitForVercelDeployment(cli, config, identity) {
  const expectedHost = new URL(config.frontendUrl).hostname.toLowerCase()
  const expiresAt = Date.now() + HEALTH_TIMEOUT_MS
  let lastState = 'deployment no visible'

  while (Date.now() < expiresAt) {
    const result = invoke(cli, [
      'inspect',
      identity.id,
      '--json',
      '--scope', config.vercelOrgId,
    ], { capture: true })
    requireCommandSuccess(result, 'verificación deployment frontend', 'Vercel inspect')

    const deployment = requireJsonResult(
      result.stdout || '',
      'verificación deployment frontend',
      'Vercel',
    )
    if (deployment.id !== identity.id) {
      fail('verificación deployment frontend', 'Vercel inspect devolvió una identidad distinta a la recién desplegada')
    }

    lastState = String(deployment.readyState || 'desconocido').toUpperCase()
    if (['ERROR', 'CANCELED'].includes(lastState)) {
      fail('verificación deployment frontend', `el deployment Vercel terminó con estado ${lastState}`)
    }

    const hasExpectedAlias = getVercelAliases(deployment).includes(expectedHost)
    if (lastState === 'READY' && deployment.target === 'production' && hasExpectedAlias) {
      const inspectedUrl = deployment.url
      if (typeof inspectedUrl !== 'string') {
        fail('verificación deployment frontend', 'Vercel inspect no devolvió la URL del deployment')
      }
      const normalizedUrl = new URL(
        inspectedUrl.startsWith('http') ? inspectedUrl : `https://${inspectedUrl}`,
      ).origin
      if (normalizedUrl !== identity.url) {
        fail('verificación deployment frontend', 'Vercel inspect devolvió una URL distinta a la del deploy')
      }
      return
    }

    await sleep(HEALTH_POLL_INTERVAL_MS)
  }

  fail(
    'verificación deployment frontend',
    `Vercel no confirmó identidad READY de producción con el alias configurado (último estado: ${lastState})`,
  )
}

async function request(url) {
  return fetch(url, { signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) })
}

async function backendHealthCheck(url) {
  let response
  try {
    response = await request(url)
  } catch {
    return { ok: false, detail: 'sin respuesta HTTP' }
  }

  if (response.status !== 200) {
    await response.body?.cancel()
    return { ok: false, detail: `HTTP ${response.status}` }
  }

  try {
    const body = await response.json()
    if (body.status === 'ok' && body.database?.connected === true) {
      return { ok: true }
    }
    return { ok: false, detail: 'health no confirma status ok y base de datos conectada' }
  } catch {
    return { ok: false, detail: 'respuesta de health no es JSON válido' }
  }
}

async function frontendCheck(url) {
  let response
  try {
    response = await request(url)
  } catch {
    return { ok: false, detail: 'sin respuesta HTTP' }
  }

  const contentType = response.headers.get('content-type') || ''
  await response.body?.cancel()
  if (!response.ok) return { ok: false, detail: `HTTP ${response.status}` }
  if (!contentType.toLowerCase().includes('text/html')) {
    return { ok: false, detail: 'la respuesta no es HTML' }
  }
  return { ok: true }
}

async function waitFor(check, url, stage) {
  const expiresAt = Date.now() + HEALTH_TIMEOUT_MS
  let lastDetail = 'sin respuesta'

  while (Date.now() < expiresAt) {
    const result = await check(url)
    if (result.ok) return
    lastDetail = result.detail
    await sleep(HEALTH_POLL_INTERVAL_MS)
  }

  fail(stage, `tiempo de espera agotado (${lastDetail})`)
}

async function deploy() {
  if (Number(process.versions.node.split('.')[0]) < 20) {
    fail('preflight', 'se requiere Node.js 20 o superior')
  }
  if (!process.env.npm_execpath || !process.env.npm_config_user_agent?.includes('npm/')) {
    fail('preflight', 'ejecuta este flujo mediante npm run deploy')
  }

  const config = readConfig()
  const npmCli = findExecutable('npm')
  const railwayCli = findExecutable('railway')
  const vercelCli = findExecutable('vercel')

  console.log('[deploy] Verificando Node.js, npm y CLIs...')
  verifyCli(npmCli, 'npm')
  verifyCli(railwayCli, 'Railway')
  verifyCli(vercelCli, 'Vercel')

  console.log('[deploy] Validando autenticación, destinos y variables remotas...')
  verifyRailwayBackendDomain(railwayCli, config)
  verifyRemoteEnvironment(
    runRailwayReadOnlyCheck(
      railwayCli,
      config,
      '--internal-check-railway-env',
      [config.frontendUrl],
    ),
    'Railway',
  )

  const expectedApiUrl = `${config.backendUrl}/api`
  verifyRemoteEnvironment(
    runVercelReadOnlyCheck(vercelCli, config, '--internal-check-vercel-env', expectedApiUrl),
    'Vercel',
  )
  await verifyVercelFrontendDomain(config)

  console.log('[deploy] Compilando backend y frontend...')
  runBuild(config)

  console.log('[deploy] Inspeccionando el historial y las migraciones pendientes...')
  const migrationState = runRailwayReadOnlyCheck(
    railwayCli,
    config,
    '--internal-inspect-migrations',
  )
  const pendingMigrations = inspectPendingMigrations(migrationState)
  console.log(
    pendingMigrations.length === 0
      ? '[deploy] No hay migraciones pendientes.'
      : `[deploy] ${pendingMigrations.length} migración(es) pendiente(s), sin operaciones no permitidas.`,
  )

  if (pendingMigrations.length > 0) {
    console.log('[deploy] Aplicando exclusivamente prisma migrate deploy...')
    const npmCli = process.env.npm_execpath
    runRailwayMutation(
      railwayCli,
      config,
      [
        'run',
        '--no-local',
        process.execPath,
        npmCli,
        'run',
        'prisma:migrate:deploy',
        '--workspace=apps/backend',
      ],
      'migraciones',
      'prisma migrate deploy',
    )
  }

  console.log('[deploy] Desplegando backend en Railway...')
  const railwayDeploymentId = await deployRailway(railwayCli, config)
  console.log(`[deploy] Railway aceptó deployment id=${railwayDeploymentId}; esperando SUCCESS...`)
  await waitForRailwayDeployment(railwayCli, config, railwayDeploymentId)

  console.log('[deploy] Esperando health del backend...')
  await waitFor(backendHealthCheck, `${config.backendUrl}/health`, 'health backend')

  console.log('[deploy] Desplegando frontend en Vercel...')
  const frontendDeploy = invoke(vercelCli, [
    '--cwd', FRONTEND_DIR,
    '--scope', config.vercelOrgId,
    '--project', config.vercelProjectId,
    '--prod',
    '--yes',
    '--non-interactive',
    '--json',
  ], { capture: true })
  requireCommandSuccess(frontendDeploy, 'despliegue frontend', 'Vercel deploy')
  const vercelDeployment = getVercelDeploymentIdentity(frontendDeploy.stdout || '')
  console.log(`[deploy] Vercel devolvió deployment id=${vercelDeployment.id}; verificando identidad...`)
  await waitForVercelDeployment(vercelCli, config, vercelDeployment)

  console.log('[deploy] Verificando deployment frontend y servicios publicados...')
  await waitFor(frontendCheck, vercelDeployment.url, 'verificación deployment frontend')
  await waitFor(frontendCheck, config.frontendUrl, 'verificación frontend')
  const finalBackendHealth = await backendHealthCheck(`${config.backendUrl}/health`)
  if (!finalBackendHealth.ok) {
    fail('verificación backend final', finalBackendHealth.detail)
  }

  console.log(
    `[deploy] Railway deployment ${railwayDeploymentId} y Vercel deployment ${vercelDeployment.id} verificados.`,
  )
}

const internalMode = process.argv[2]
if (internalMode?.startsWith('--internal-')) {
  const handled = runInternalMode(internalMode)
  if (handled === false) {
    emitInternalResult({ ok: false, reason: 'unsupported internal check' })
    process.exitCode = 2
  }
} else {
  deploy().catch((error) => {
    const stage = error instanceof DeployFailure ? error.stage : 'despliegue'
    const message = error instanceof DeployFailure
      ? error.message
      : 'fallo inesperado; no se muestran detalles que puedan contener variables sensibles'
    console.error(`[deploy][${stage}] ${message}`)
    process.exitCode = 1
  })
}
