import type { Request, Response, NextFunction } from 'express';
import { hasPermission, type Role } from '../modules/auth/rbac.util.ts';

export function requirePermission(permission: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized: Missing user context' });
    }
    
    const role = req.user.role as Role;
    if (hasPermission(role, permission)) {
      return next();
    }
    
    return res.status(403).json({ error: 'Forbidden: Insufficient permissions' });
  };
}
