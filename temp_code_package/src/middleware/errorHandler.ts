import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

export interface AppError extends Error {
  statusCode?: number;
  isOperational?: boolean;
}

export const errorHandler = (
  err: AppError,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  let error = { ...err };
  error.message = err.message;

  // 记录错误日志
  logger.error('Error:', {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
  });

  // Sequelize错误处理
  if (err.name === 'SequelizeValidationError') {
    const message = '数据验证失败';
    error = { message, statusCode: 400 } as AppError;
  }

  if (err.name === 'SequelizeUniqueConstraintError') {
    const message = '数据已存在';
    error = { message, statusCode: 400 } as AppError;
  }

  if (err.name === 'SequelizeForeignKeyConstraintError') {
    const message = '关联数据不存在';
    error = { message, statusCode: 400 } as AppError;
  }

  // JWT错误处理
  if (err.name === 'JsonWebTokenError') {
    const message = '无效的令牌';
    error = { message, statusCode: 401 } as AppError;
  }

  if (err.name === 'TokenExpiredError') {
    const message = '令牌已过期';
    error = { message, statusCode: 401 } as AppError;
  }

  // 默认错误响应
  const statusCode = error.statusCode || 500;
  const message = error.message || '服务器内部错误';

  res.status(statusCode).json({
    success: false,
    error: {
      message,
      ...(process.env['NODE_ENV'] === 'development' && { stack: err.stack }),
    },
  });
};
