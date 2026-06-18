import { Request, Response, NextFunction } from 'express';
import { Role } from '@prisma/client';

export function requireRole(roles: Role[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized', message: 'Authentication required', statusCode: 401 });
      return;
    }

    if (!roles.includes(req.user.role as Role)) {
      res.status(403).json({
        error: 'Forbidden',
        message: `Access restricted to: ${roles.join(', ')}`,
        statusCode: 403,
      });
      return;
    }

    next();
  };
}
