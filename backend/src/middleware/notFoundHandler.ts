import { Request, Response } from 'express';

export const notFoundHandler = (req: Request, res: Response): void => {
  res.status(404).json({
    success: false,
    error: {
      message: `路由 ${req.originalUrl} 不存在`,
      code: 'NOT_FOUND'
    }
  });
}; 