import { NextFunction, Request, Response } from 'express';
import { AuthService } from '../modules/auth/auth.service';
import { Role } from '@prisma/client';
import { hasPermission } from '../modules/auth/rbac.util';

/**
 * Production-grade Auth and RBAC Middleware
 */
export async function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: Missing token' });
  }

  const token = authHeader.split(' ')[1];
  const payload = await AuthService.verifyToken(token);

  if (!payload) {
    return res.status(401).json({ error: 'Unauthorized: Invalid token' });
  }

  // Attach context to request
  req.user = payload;
  next();
}

/**
 * RBAC Permission Guard
 */
export function requirePermission(permission: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

    if (!hasPermission(req.user.role as Role, permission)) {
      return res.status(403).json({ 
        error: 'Forbidden: Insufficient permissions',
        required: permission 
      });
    }

    next();
  };
}

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        role: Role;
        workspaceId: string;
      };
    }
  }
}
