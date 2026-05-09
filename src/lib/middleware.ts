import { NextFunction, Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SECRET_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

const supabase = createClient(
  supabaseUrl,
  supabaseKey,
  {
    db: { schema: 'connect' }
  }
);

/**
 * Supabase Auth Middleware
 */
export async function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: Missing token' });
  }

  const token = authHeader.split(' ')[1];

  try {
    // 1. Verify token with Supabase
    const { data: { user: sbUser }, error } = await supabase.auth.getUser(token);
    
    if (error || !sbUser) {
      return res.status(401).json({ error: 'Unauthorized: Invalid token' });
    }

    // 2. Fetch RBAC profile from Supabase DB
    const refinedEmail = (sbUser.email || '').toLowerCase().trim();
    const { data: userProfile, error: profileError } = await supabase
      .from('User')
      .select('id, email, role, workspaceId, workspace(name)')
      .eq('email', refinedEmail)
      .single();

    const adminEmail = (process.env.ADMIN_EMAIL || 'admin@transferlegacy.com').toLowerCase().trim();
    const isSuperAdmin = refinedEmail === adminEmail;

    if (!userProfile && !isSuperAdmin) {
      return res.status(403).json({ error: 'Forbidden: No authorized profile found. Please contact an administrator.' });
    }

    // 3. Attach to request
    req.user = {
      id: userProfile?.id || 'SUPER_ADMIN_ID',
      email: sbUser.email || '',
      role: isSuperAdmin ? 'SUPER_ADMIN' : (userProfile?.role || 'VIEWER'),
      workspaceId: userProfile?.workspaceId || 'GLOBAL'
    };
    
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(401).json({ error: 'Unauthorized: Auth processing failed' });
  }
}

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        role: string;
        workspaceId: string;
      };
    }
  }
}
