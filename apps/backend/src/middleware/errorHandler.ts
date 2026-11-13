import { Prisma } from '@prisma/client'
import type { NextFunction, Request, RequestHandler, Response } from 'express'
import { ZodError } from 'zod'
import { logServerError } from './requestLogger.js'

export class AppError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public code?: string,
    public details?: unknown,
  ) {
    super(message)
    Object.setPrototypeOf(this, AppError.prototype)
  }

  static badRequest(message: string, details?: unknown) {
    return new AppError(400, message, 'BAD_REQUEST', details)
  }

  static notFound(message: string) {
    return new AppError(404, message, 'NOT_FOUND')
  }

  static conflict(message: string) {
    return new AppError(409, message, 'CONFLICT')
  }

  static internal(message: string) {
    return new AppError(500, message, 'INTERNAL_ERROR')
  }
}

function isClientRequestError(error: unknown): error is Error & { status: number } {
  if (typeof error !== 'object' || error === null || !('status' in error)) return false
  const status = error.status
  return typeof status === 'number' && status >= 400 && status < 500
}

function getErrorLabel(error: unknown): string {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return `Prisma code=${error.code}`
  }
  if (error instanceof Error) return error.name || 'Error'
  return 'UnknownError'
}

export function errorHandler(
  error: unknown,
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  if (res.headersSent) {
    next(error)
    return
  }

  let statusCode = 500
  let response: { error: string; code: string; details?: unknown } = {
    error: 'Internal server error',
    code: 'INTERNAL_ERROR',
  }

  if (error instanceof AppError) {
    statusCode = error.statusCode
    if (statusCode < 500) {
      response = {
        error: error.message,
        code: error.code ?? 'REQUEST_ERROR',
      }
    }
  } else if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') {
      statusCode = 409
      response = {
        error: 'A record with the provided unique value already exists',
        code: 'CONFLICT',
      }
    } else if (error.code === 'P2003') {
      statusCode = 400
      response = {
        error: 'A related record is invalid or still in use',
        code: 'BAD_REQUEST',
      }
    } else if (error.code === 'P2025') {
      statusCode = 404
      response = {
        error: 'Record not found',
        code: 'NOT_FOUND',
      }
    }
  } else if (error instanceof ZodError) {
    statusCode = 400
    response = {
      error: 'Validation failed',
      code: 'VALIDATION_ERROR',
      details: error.issues.map((issue) => ({
        path: issue.path,
        message: issue.message,
      })),
    }
  } else if (isClientRequestError(error)) {
    statusCode = error.status
    response = statusCode === 413
      ? { error: 'Request body is too large', code: 'PAYLOAD_TOO_LARGE' }
      : { error: 'Invalid request', code: 'BAD_REQUEST' }
  }

  res.status(statusCode)
  if (statusCode >= 500) {
    logServerError(req, res, getErrorLabel(error))
  }
  res.json(response)
}

type AsyncRequestHandler = (
  req: Request,
  res: Response,
  next: NextFunction,
) => Promise<unknown>

export function asyncHandler(handler: AsyncRequestHandler): RequestHandler {
  return (req, res, next) => {
    void Promise.resolve()
      .then(() => handler(req, res, next))
      .catch(next)
  }
}
