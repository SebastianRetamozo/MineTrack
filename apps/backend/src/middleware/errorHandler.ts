import { Request, Response, NextFunction } from 'express'

export class AppError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public code?: string,
    public details?: unknown
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

interface ZodError extends Error {
  errors: any[]
}

export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction) {
  console.error('Error:', err)

  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      error: err.message,
      code: err.code,
      details: err.details,
    })
  }

  // Prisma errors
  if (err.name === 'PrismaClientKnownRequestError') {
    const prismaErr = err as any
    if (prismaErr.code === 'P2002') {
      const field = prismaErr.meta?.target?.[0] || 'field'
      return res.status(409).json({
        error: `Duplicate value for ${field}`,
        code: 'CONFLICT',
        details: { field },
      })
    }
    if (prismaErr.code === 'P2003') {
      return res.status(400).json({
        error: 'Foreign key constraint failed',
        code: 'BAD_REQUEST',
        details: prismaErr.meta,
      })
    }
    if (prismaErr.code === 'P2025') {
      return res.status(404).json({
        error: 'Record not found',
        code: 'NOT_FOUND',
      })
    }
  }

  // Validation errors (Zod)
  if (err.name === 'ZodError') {
    const zodErr = err as ZodError
    return res.status(400).json({
      error: 'Validation failed',
      code: 'VALIDATION_ERROR',
      details: zodErr.errors,
    })
  }

  return res.status(500).json({
    error: 'Internal server error',
    code: 'INTERNAL_ERROR',
  })
}

export function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next)
  }
}