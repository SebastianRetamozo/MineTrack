import type { NextFunction, Request, Response } from 'express'

export function getSafeRouteLabel(req: Request): string {
  const routePath = req.route?.path
  if (routePath !== undefined) {
    return `${req.baseUrl}${String(routePath)}` || '/'
  }

  if (req.path === '/' || req.path === '/api' || req.path === '/health') {
    return req.path
  }
  return req.path.startsWith('/api/') ? '/api/<unmatched>' : '<unmatched>'
}

export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  res.once('finish', () => {
    if (res.locals.serverErrorLogged) return

    const isRelevant = req.path !== '/health' && (req.path === '/'
      || req.path === '/api'
      || req.path.startsWith('/api/')
      || res.statusCode >= 400)

    if (isRelevant) {
      console.info(`[http] ${req.method} ${getSafeRouteLabel(req)} ${res.statusCode}`)
    }
  })

  next()
}

export function logServerError(req: Request, res: Response, errorLabel: string): void {
  res.locals.serverErrorLogged = true
  console.error(
    `[error] ${req.method} ${getSafeRouteLabel(req)} ${res.statusCode} ${errorLabel}`,
  )
}
